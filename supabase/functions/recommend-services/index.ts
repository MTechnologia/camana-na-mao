import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const aiChatBaseUrl = Deno.env.get('AI_CHAT_BASE_URL') || Deno.env.get('AI_BASE_URL');
    const aiChatApiKey = Deno.env.get('AI_CHAT_API_KEY') || Deno.env.get('AI_API_KEY');
    const aiChatModel = Deno.env.get('AI_CHAT_MODEL') || 'meta-llama/Meta-Llama-3.1-8B-Instruct';

    if (!aiChatBaseUrl) {
      throw new Error("AI_CHAT_BASE_URL ou AI_BASE_URL não configurada");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Busca perfil do usuário
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    // Busca endereço principal
    const { data: address } = await supabase
      .from('user_addresses')
      .select('*')
      .eq('user_id', userId)
      .eq('is_primary', true)
      .single();

    // Busca interesses
    const { data: interests } = await supabase
      .from('user_interests')
      .select('interest_category')
      .eq('user_id', userId);

    // Busca histórico de avaliações
    const { data: ratings } = await supabase
      .from('service_ratings')
      .select('service_id, rating_stars, service:public_services(service_type)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    // Busca serviços próximos se tiver endereço
    let nearbyServices = [];
    if (address?.latitude && address?.longitude) {
      const { data } = await supabase
        .from('public_services')
        .select('*')
        .limit(50);
      
      if (data) {
        nearbyServices = data
          .map((service: any) => {
            const distance = calculateDistance(
              address.latitude,
              address.longitude,
              service.latitude,
              service.longitude
            );
            return { ...service, distance };
          })
          .filter((s: any) => s.distance <= 5000)
          .sort((a: any, b: any) => a.distance - b.distance)
          .slice(0, 20);
      }
    }

    // Monta contexto para IA
    const userContext = {
      hasProfile: !!profile,
      hasAddress: !!address,
      interests: interests?.map(i => i.interest_category) || [],
      ratingHistory: ratings || [],
      nearbyServicesCount: nearbyServices.length,
      topRatedTypes: getTopRatedServiceTypes(ratings || [])
    };

    // Usa IA para gerar recomendações personalizadas
    const aiPrompt = `Você é um sistema de recomendação de serviços públicos.

Contexto do usuário:
- Tem perfil completo: ${userContext.hasProfile}
- Tem endereço: ${userContext.hasAddress}
- Interesses: ${userContext.interests.join(', ') || 'nenhum'}
- Histórico de avaliações: ${userContext.ratingHistory.length} avaliações
- Tipos mais bem avaliados: ${userContext.topRatedTypes.join(', ') || 'nenhum'}
- Serviços próximos disponíveis: ${userContext.nearbyServicesCount}

Com base nesse contexto, analise os serviços disponíveis e retorne recomendações personalizadas.
Considere: distância, avaliações anteriores do usuário, interesses declarados, e qualidade do serviço.

Retorne no formato JSON com array "recommendations" contendo objetos com:
- service_id: ID do serviço
- reason: Explicação breve do porquê da recomendação (máximo 100 caracteres)
- confidence: número entre 0 e 1 indicando confiança na recomendação

Ordene por relevância (mais relevantes primeiro). Máximo 10 recomendações.`;

    const servicesData = nearbyServices.map((s: any) => ({
      id: s.id,
      name: s.name,
      type: s.service_type,
      distance: s.distance,
      rating: s.average_rating,
      total_ratings: s.total_ratings
    }));

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (aiChatApiKey) {
      headers['Authorization'] = `Bearer ${aiChatApiKey}`;
    }
    
    const apiUrl = `${aiChatBaseUrl.replace(/\/$/, '')}/chat/completions`;
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: aiChatModel,
        messages: [
          { role: 'system', content: 'Você é um assistente de recomendações. Retorne sempre JSON válido.' },
          { role: 'user', content: `${aiPrompt}\n\nServiços disponíveis:\n${JSON.stringify(servicesData)}` }
        ],
        temperature: 0.3
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required" }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI error: ${response.status}`);
    }

    const aiData = await response.json();
    let aiRecommendations = [];
    
    try {
      const content = aiData.choices[0].message.content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        aiRecommendations = parsed.recommendations || [];
      }
    } catch (e) {
      console.error('Error parsing AI response:', e);
    }

    // Fallback: recomendações baseadas em regras simples
    if (aiRecommendations.length === 0) {
      aiRecommendations = nearbyServices.slice(0, 10).map((s: any, i: number) => ({
        service_id: s.id,
        reason: `Serviço próximo com boa avaliação (${s.average_rating.toFixed(1)} ⭐)`,
        confidence: Math.max(0.5, 1 - (i * 0.05))
      }));
    }

    // Enriquece recomendações com dados completos dos serviços
    const enrichedRecommendations = aiRecommendations
      .map((rec: any) => {
        const service = nearbyServices.find((s: any) => s.id === rec.service_id);
        if (!service) return null;
        
        return {
          id: `rec_${service.id}`,
          service_id: service.id,
          service_name: service.name,
          service_type: service.service_type,
          reason: rec.reason,
          confidence: rec.confidence,
          distance: service.distance,
          address: service.address,
          district: service.district,
          average_rating: service.average_rating,
          total_ratings: service.total_ratings
        };
      })
      .filter(Boolean)
      .slice(0, 10);

    return new Response(
      JSON.stringify({ recommendations: enrichedRecommendations }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

function getTopRatedServiceTypes(ratings: any[]): string[] {
  const typeRatings: Record<string, { sum: number; count: number }> = {};
  
  ratings.forEach(rating => {
    const type = rating.service?.service_type;
    if (type) {
      if (!typeRatings[type]) {
        typeRatings[type] = { sum: 0, count: 0 };
      }
      typeRatings[type].sum += rating.rating_stars;
      typeRatings[type].count += 1;
    }
  });

  return Object.entries(typeRatings)
    .map(([type, data]) => ({ type, avg: data.sum / data.count }))
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 3)
    .map(item => item.type);
}
