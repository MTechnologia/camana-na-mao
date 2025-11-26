import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, reportData } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY não configurada");
    }

    const lastMessage = messages[messages.length - 1];
    const messageCount = messages.filter((m: any) => m.role === 'user').length;

    // Sistema de perguntas guiadas
    let systemPrompt = `Você é um assistente especializado em coletar relatos de problemas urbanos.
    
Sua função é fazer perguntas claras e objetivas para coletar informações sobre:
1. Categoria do problema (iluminação, calçada, via pública, lixo, área verde, outro)
2. Descrição detalhada do problema
3. Gravidade (baixa, média, alta, crítica)
4. Localização (se o usuário fornecer)

Seja empático, objetivo e direto. Faça uma pergunta por vez.
Extraia informações estruturadas das respostas do usuário.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages.slice(-5) // Últimas 5 mensagens para contexto
        ],
        temperature: 0.7,
        max_tokens: 300
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
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const aiMessage = data.choices[0].message.content;

    // Extrai dados estruturados da conversa
    const updatedReportData: any = { ...reportData };
    const userText = lastMessage.content.toLowerCase();

    // Detecta categoria
    if (!updatedReportData.category) {
      if (userText.includes('iluminação') || userText.includes('poste') || userText.includes('luz')) {
        updatedReportData.category = 'iluminacao';
      } else if (userText.includes('calçada') || userText.includes('calcada')) {
        updatedReportData.category = 'calcada';
      } else if (userText.includes('buraco') || userText.includes('via') || userText.includes('rua')) {
        updatedReportData.category = 'via';
      } else if (userText.includes('lixo') || userText.includes('sujeira')) {
        updatedReportData.category = 'lixo';
      } else if (userText.includes('árvore') || userText.includes('arvore') || userText.includes('verde')) {
        updatedReportData.category = 'verde';
      } else if (messageCount === 1) {
        updatedReportData.category = 'outro';
      }
    }

    // Detecta gravidade
    if (!updatedReportData.severity) {
      if (userText.includes('crítica') || userText.includes('critica') || userText.includes('urgente') || userText.includes('grave')) {
        updatedReportData.severity = 'critical';
      } else if (userText.includes('alta') || userText.includes('séria') || userText.includes('seria')) {
        updatedReportData.severity = 'high';
      } else if (userText.includes('baixa') || userText.includes('leve')) {
        updatedReportData.severity = 'low';
      } else if (messageCount >= 3) {
        updatedReportData.severity = 'medium';
      }
    }

    // Detecta descrição
    if (messageCount >= 2 && !updatedReportData.description) {
      updatedReportData.description = lastMessage.content;
    } else if (messageCount >= 3 && updatedReportData.description) {
      updatedReportData.description += ' ' + lastMessage.content;
    }

    // Detecta localização
    if (userText.includes('localização') || userText.includes('localizacao')) {
      const coordMatch = userText.match(/-?\d+\.\d+,\s*-?\d+\.\d+/);
      if (coordMatch) {
        const [lat, lng] = coordMatch[0].split(',').map((s: string) => parseFloat(s.trim()));
        updatedReportData.latitude = lat;
        updatedReportData.longitude = lng;
        updatedReportData.location = coordMatch[0];
      }
    }

    // Determina se está completo
    const isComplete = messageCount >= 4 && 
                      updatedReportData.category && 
                      updatedReportData.description && 
                      updatedReportData.severity;

    // Opções baseadas no estágio
    let options: string[] = [];
    if (messageCount === 1 && !updatedReportData.category) {
      options = [
        "Iluminação pública",
        "Calçada danificada",
        "Buraco na rua",
        "Lixo acumulado",
        "Poda de árvore"
      ];
    }

    return new Response(
      JSON.stringify({
        message: aiMessage,
        options,
        reportData: updatedReportData,
        complete: isComplete
      }),
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
