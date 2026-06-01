import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { buildCorsHeaders } from "../_shared/cors.ts";

// Mapeamento de partidos para temas/comissões típicas
const PARTY_THEMES: Record<string, string[]> = {
  'PT': ['saude', 'educacao', 'habitacao', 'assistencia_social', 'direitos_humanos'],
  'PSOL': ['meio_ambiente', 'educacao', 'direitos_humanos', 'assistencia_social', 'cultura'],
  'PARTIDO LIBERAL': ['seguranca', 'transporte', 'economia', 'saude'],
  'PL': ['seguranca', 'transporte', 'economia', 'saude'],
  'UNIAO': ['urbanismo', 'transporte', 'economia', 'infraestrutura'],
  'MDB': ['saude', 'educacao', 'infraestrutura', 'transporte'],
  'PP': ['seguranca', 'transporte', 'economia', 'infraestrutura'],
  'PSD': ['economia', 'transporte', 'urbanismo', 'saude'],
  'PODE': ['saude', 'educacao', 'transporte', 'urbanismo'],
  'Republicanos': ['seguranca', 'economia', 'transporte', 'assistencia_social'],
  'PSB': ['meio_ambiente', 'educacao', 'cultura', 'mobilidade'],
  'NOVO': ['economia', 'transparencia', 'urbanismo', 'transporte'],
  'PV': ['meio_ambiente', 'sustentabilidade', 'mobilidade', 'cultura'],
  'Rede Sustentabilidade': ['meio_ambiente', 'sustentabilidade', 'direitos_humanos', 'cultura']
};

// Mapeamento de categorias de relato para temas
const CATEGORY_TO_THEMES: Record<string, string[]> = {
  // Categorias urbanas
  'iluminacao': ['urbanismo', 'infraestrutura'],
  'calcada': ['urbanismo', 'infraestrutura', 'acessibilidade'],
  'pavimentacao': ['urbanismo', 'infraestrutura', 'transporte'],
  'limpeza': ['meio_ambiente', 'urbanismo'],
  'lixo': ['meio_ambiente', 'urbanismo'],
  'entulho': ['meio_ambiente', 'urbanismo'],
  'alagamento': ['meio_ambiente', 'infraestrutura'],
  'enchente': ['meio_ambiente', 'infraestrutura'],
  'arvore': ['meio_ambiente', 'urbanismo'],
  'poda': ['meio_ambiente', 'urbanismo'],
  'buraco': ['urbanismo', 'transporte', 'infraestrutura'],
  'saneamento': ['infraestrutura', 'saude'],
  'esgoto': ['infraestrutura', 'saude'],
  'agua': ['infraestrutura', 'saude'],
  'praca': ['urbanismo', 'cultura'],
  'parque': ['meio_ambiente', 'urbanismo', 'cultura'],
  
  // Categorias de transporte
  'onibus': ['transporte', 'mobilidade'],
  'metro': ['transporte', 'mobilidade'],
  'trem': ['transporte', 'mobilidade'],
  'lotacao': ['transporte'],
  'atraso': ['transporte'],
  'superlotacao': ['transporte'],
  'acessibilidade_transporte': ['transporte', 'acessibilidade', 'direitos_humanos'],
  'assedio': ['seguranca', 'direitos_humanos', 'transporte'],
  'seguranca_transporte': ['seguranca', 'transporte'],
  
  // Categorias de serviço
  'ubs': ['saude'],
  'hospital': ['saude'],
  'escola': ['educacao'],
  'creche': ['educacao'],
  'cras': ['assistencia_social'],
  'atendimento': ['saude', 'educacao', 'assistencia_social'],
  
  // Categorias gerais
  'seguranca': ['seguranca'],
  'saude': ['saude'],
  'educacao': ['educacao'],
  'habitacao': ['habitacao', 'assistencia_social'],
  'cultura': ['cultura'],
  'feedback_camara': ['transparencia', 'urbanismo']
};

interface ReportData {
  category?: string;
  subcategory?: string;
  description?: string;
  report_type?: string;
  severity?: string;
  neighborhood?: string;
  region?: string;
  type?: string;
  location?: string;
  /** HU-8.3: palavras-chave da comissão escolhida (minúsculas recomendadas) */
  commission_keywords?: string[];
  /** HU-8.3: nome exibido da comissão (para casar com texto de atuação) */
  commission_name?: string;
}

interface VereadorData {
  id: string;
  name: string;
  party: string;
  photo?: string;
  phone?: string;
  email?: string;
  initials?: string;
  region?: string;
  sala?: string;
  andar?: string;
  gv?: string;
  isLeader?: boolean;
  isGovernmentLeader?: boolean;
  isSubstitute?: boolean;
  isOnLeave?: boolean;
  /** Áreas/comissões (CMSP); usado para bônus quando o cidadão escolhe uma comissão */
  areas_de_atuacao?: string[];
}

interface SuggestionResult {
  vereador: VereadorData;
  matchScore: number;
  matchReasons: string[];
}

/** HU-8.5: nota mínima para aparecer no ranking (antes do fallback de líderes). */
export const MIN_SUGGESTION_SCORE = 0.5;

export function passesMinSuggestionScore(score: number): boolean {
  return Number.isFinite(score) && score >= MIN_SUGGESTION_SCORE;
}

function commissionActuationBonus(vereador: VereadorData, report: ReportData): { bonus: number; reasons: string[] } {
  const keywords = report.commission_keywords || [];
  const commissionName = (report.commission_name || "").trim();
  const areasRaw = vereador.areas_de_atuacao;
  if ((!keywords.length && !commissionName) || !areasRaw?.length) {
    return { bonus: 0, reasons: [] };
  }
  const areaText = areasRaw.map((a) => String(a).toLowerCase()).join(" | ");
  let bonus = 0;
  const reasons: string[] = [];
  for (const kw of keywords) {
    const k = String(kw).trim().toLowerCase();
    if (k.length >= 2 && areaText.includes(k)) {
      bonus += 12;
      reasons.push(`Tema da comissão (“${kw}”) aparece na atuação parlamentar`);
    }
  }
  if (commissionName) {
    const cn = commissionName.toLowerCase();
    if (areaText.includes(cn)) {
      bonus += 15;
      reasons.push("Atuação relacionada à comissão que você escolheu");
    }
  }
  return { bonus: Math.min(35, bonus), reasons };
}

// Calcula score de match entre vereador e relato
export function calculateMatchScore(vereador: VereadorData, report: ReportData): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];
  
  // Obter temas do partido
  const partyThemes = PARTY_THEMES[vereador.party] || PARTY_THEMES[vereador.party.toUpperCase()] || [];
  
  // 1. Match por categoria do relato (até 40 pontos)
  const category = report.category?.toLowerCase() || '';
  const subcategory = report.subcategory?.toLowerCase() || '';
  
  // Encontrar temas relevantes para a categoria
  let categoryThemes: string[] = [];
  for (const [cat, themes] of Object.entries(CATEGORY_TO_THEMES)) {
    if (category.includes(cat) || subcategory.includes(cat)) {
      categoryThemes = [...categoryThemes, ...themes];
    }
  }
  
  // Verificar match de temas
  const matchedThemes = partyThemes.filter(theme => categoryThemes.includes(theme));
  if (matchedThemes.length > 0) {
    score += Math.min(40, matchedThemes.length * 15);
    reasons.push(`Partido atua em: ${matchedThemes.join(', ')}`);
  }
  
  // 2. Match por descrição (até 30 pontos)
  const description = report.description?.toLowerCase() || '';
  const keywords = description.split(/\s+/).filter(w => w.length > 3);
  
  let keywordMatches = 0;
  for (const [cat, themes] of Object.entries(CATEGORY_TO_THEMES)) {
    if (keywords.some(kw => kw.includes(cat) || cat.includes(kw))) {
      const relevantThemes = themes.filter(t => partyThemes.includes(t));
      if (relevantThemes.length > 0) {
        keywordMatches++;
      }
    }
  }
  
  if (keywordMatches > 0) {
    score += Math.min(30, keywordMatches * 10);
    reasons.push('Palavras-chave coincidem com atuação do partido');
  }
  
  // 3. Líder de partido/governo (até 15 pontos)
  if (vereador.isLeader) {
    score += 10;
    reasons.push('Líder de partido');
  }
  if (vereador.isGovernmentLeader) {
    score += 15;
    reasons.push('Líder do Governo');
  }
  
  // 4. Tipo de relato (até 15 pontos)
  const reportType = (report.report_type || report.type || '').toLowerCase();
  if (reportType === 'urban' || reportType === 'urbano') {
    if (partyThemes.includes('urbanismo') || partyThemes.includes('infraestrutura')) {
      score += 15;
      reasons.push('Especialista em questões urbanas');
    }
  } else if (reportType === 'transport' || reportType === 'transporte') {
    if (partyThemes.includes('transporte') || partyThemes.includes('mobilidade')) {
      score += 15;
      reasons.push('Especialista em transporte');
    }
  } else if (reportType === 'service' || reportType === 'servico') {
    if (partyThemes.includes('saude') || partyThemes.includes('educacao')) {
      score += 15;
      reasons.push('Especialista em serviços públicos');
    }
  }
  
  // 5. Severidade alta + partido de oposição (bônus de 10 pontos)
  const severity = report.severity?.toLowerCase() || '';
  if ((severity === 'high' || severity === 'alta' || severity === 'critica') && 
      ['PSOL', 'PT', 'Rede Sustentabilidade', 'PV', 'PSB'].includes(vereador.party)) {
    score += 10;
    reasons.push('Fiscalização ativa em questões críticas');
  }

  const comm = commissionActuationBonus(vereador, report);
  score += comm.bonus;
  reasons.push(...comm.reasons);
  
  // HU-8.5: patamar mínimo (antes filtragem >= 0.5); evita lista vazia só com “ruído” < 0.5
  if (score < MIN_SUGGESTION_SCORE && partyThemes.length > 0) {
    score = MIN_SUGGESTION_SCORE;
    reasons.push('Vereador ativo na Câmara');
  }
  
  return { score: Math.min(100, score), reasons };
}

if (import.meta.main) {
  serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify JWT authentication
    const authHeader = req.headers.get('Authorization');
    console.log('[suggest-council-members] Auth header present:', !!authHeader);
    console.log('[suggest-council-members] Auth header starts with Bearer:', authHeader?.startsWith('Bearer '));
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('[suggest-council-members] Missing or invalid authorization header');
      console.error('[suggest-council-members] All headers:', Object.fromEntries(req.headers.entries()));
      return new Response(
        JSON.stringify({ error: 'Não autorizado', details: 'Token de autenticação ausente ou inválido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('[suggest-council-members] Missing environment variables');
      return new Response(
        JSON.stringify({ error: 'Erro de configuração' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user token
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('[suggest-council-members] Authentication failed:', userError);
      console.error('[suggest-council-members] User error details:', JSON.stringify(userError));
      return new Response(
        JSON.stringify({ error: 'Não autorizado', details: 'Token inválido ou expirado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[suggest-council-members] Authenticated user:', user.id);

    const { reportData, vereadores } = await req.json() as { 
      reportData: ReportData; 
      vereadores: VereadorData[] 
    };

    if (!reportData || !vereadores || !Array.isArray(vereadores)) {
      return new Response(
        JSON.stringify({ 
          error: 'Dados inválidos', 
          details: 'reportData e vereadores são obrigatórios' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log('[suggest-council-members] Processing report:', {
      category: reportData.category,
      subcategory: reportData.subcategory,
      report_type: reportData.report_type || reportData.type,
      vereadores_count: vereadores.length
    });

    // Calcular scores para todos os vereadores
    const suggestions: SuggestionResult[] = vereadores
      .filter(v => !v.isSubstitute && !v.isOnLeave) // Excluir suplentes e licenciados
      .map(vereador => {
        const { score, reasons } = calculateMatchScore(vereador, reportData);
        return {
          vereador,
          matchScore: score,
          matchReasons: reasons
        };
      })
      .filter(s => passesMinSuggestionScore(s.matchScore))
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 5); // Top 5 sugestões

    console.log('[suggest-council-members] Top suggestions:', 
      suggestions.map(s => ({ name: s.vereador.name, score: s.matchScore }))
    );

    // Se não encontrar sugestões, retornar líderes como fallback
    if (suggestions.length === 0) {
      const leaders = vereadores
        .filter(v => v.isLeader || v.isGovernmentLeader)
        .slice(0, 3)
        .map(vereador => ({
          vereador,
          matchScore: 20,
          matchReasons: ['Líder parlamentar - pode encaminhar para comissão adequada']
        }));
      
      return new Response(
        JSON.stringify({ suggestions: leaders, fallback: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ suggestions, fallback: false }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[suggest-council-members] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Erro ao processar sugestões', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
}
