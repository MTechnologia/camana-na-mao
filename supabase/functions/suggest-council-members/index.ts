import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Commission to themes mapping
const COMMISSION_THEMES: Record<string, string[]> = {
  'transporte': ['atraso', 'lotacao', 'superlotacao', 'onibus', 'metro', 'trem', 'mobilidade', 'transito'],
  'urbanismo': ['buraco', 'calcada', 'iluminacao', 'praca', 'lixo', 'entulho', 'poda', 'arvore', 'infraestrutura'],
  'saude': ['ubs', 'hospital', 'posto', 'saude', 'medico', 'atendimento'],
  'educacao': ['escola', 'creche', 'ceu', 'educacao', 'ensino'],
  'meio_ambiente': ['poluicao', 'rio', 'corrego', 'desmatamento', 'verde', 'parque', 'ambiental'],
  'seguranca': ['seguranca', 'policia', 'violencia', 'assalto', 'roubo', 'iluminacao'],
  'habitacao': ['moradia', 'habitacao', 'ocupacao', 'favela', 'desabrigado'],
  'assistencia_social': ['social', 'vulnerabilidade', 'morador_rua', 'fome', 'abrigo'],
};

// Council member commissions (expanded data)
const COUNCIL_MEMBER_COMMISSIONS: Record<string, string[]> = {
  '1': ['transporte', 'urbanismo'], // Milton Leite
  '2': ['seguranca', 'urbanismo'], // Rubinho Nunes
  '4': ['saude', 'educacao'], // Rodrigo Goulart
  '5': ['meio_ambiente', 'urbanismo'], // Soninha Francine
  '6': ['educacao', 'assistencia_social'], // Celso Giannazi
  '7': ['assistencia_social', 'habitacao'], // Erika Hilton
  '8': ['meio_ambiente', 'transporte'], // Amanda Paschoal
  '9': ['saude', 'assistencia_social'], // Luna Zarattini
  '10': ['transporte', 'habitacao'], // Senival Moura
  '11': ['educacao', 'saude'], // Arselino Tatto
  '12': ['urbanismo', 'seguranca'], // Janaína Lima
  '13': ['transporte', 'urbanismo'], // Felipe Becari
  '14': ['seguranca', 'transporte'], // Zé Turin
  '15': ['saude', 'assistencia_social'], // Edir Sales
  '16': ['educacao', 'habitacao'], // Alessandro Guedes
  '17': ['urbanismo', 'saude'], // George Hato
  '18': ['transporte', 'seguranca'], // Faria de Sá
  '19': ['seguranca', 'urbanismo'], // Rinaldi Digilio
  '20': ['saude', 'educacao'], // Marcelo Messias
};

interface ReportData {
  type: 'transport' | 'urban' | 'service';
  category?: string;
  description?: string;
  region?: string;
  severity?: string;
  report_type?: string;
  location?: string;
}

interface VereadorData {
  id: string;
  name: string;
  party: string;
  region?: string;
  initials: string;
  photo: string;
}

interface SuggestionResult {
  vereador: VereadorData;
  matchScore: number;
  matchReasons: string[];
}

function calculateMatchScore(
  vereador: VereadorData,
  reportData: ReportData,
  commissions: string[]
): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  // 1. Region match (30 points)
  if (reportData.region && vereador.region) {
    const reportRegion = reportData.region.toLowerCase();
    const vereadorRegion = vereador.region.toLowerCase();
    
    if (reportRegion.includes(vereadorRegion) || vereadorRegion.includes(reportRegion)) {
      score += 30;
      reasons.push(`Atua na ${vereador.region}`);
    }
  }

  // 2. Commission/theme match (40 points)
  const searchText = [
    reportData.category,
    reportData.description,
    reportData.report_type,
    reportData.location
  ].filter(Boolean).join(' ').toLowerCase();

  for (const commission of commissions) {
    const themes = COMMISSION_THEMES[commission] || [];
    const matchedThemes = themes.filter(theme => searchText.includes(theme));
    
    if (matchedThemes.length > 0) {
      score += 20 + (matchedThemes.length * 5);
      const commissionName = commission.replace('_', ' ');
      reasons.push(`Membro da Comissão de ${commissionName.charAt(0).toUpperCase() + commissionName.slice(1)}`);
      break;
    }
  }

  // 3. Report type specific matching (20 points)
  if (reportData.type === 'transport') {
    if (commissions.includes('transporte')) {
      score += 20;
      if (!reasons.some(r => r.includes('Transporte'))) {
        reasons.push('Especialista em transporte público');
      }
    }
  } else if (reportData.type === 'urban') {
    if (commissions.includes('urbanismo') || commissions.includes('meio_ambiente')) {
      score += 20;
      if (!reasons.some(r => r.includes('Urbanismo') || r.includes('Meio'))) {
        reasons.push('Atua em questões urbanas');
      }
    }
  }

  // 4. Severity bonus (10 points for high severity)
  if (reportData.severity === 'high' || reportData.severity === 'critical') {
    if (score > 0) {
      score += 10;
      reasons.push('Histórico de resolver casos urgentes');
    }
  }

  // Ensure minimum reasons
  if (reasons.length === 0 && score > 0) {
    reasons.push('Vereador ativo na região');
  }

  return { score, reasons };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { reportData, vereadores } = await req.json() as {
      reportData: ReportData;
      vereadores: VereadorData[];
    };

    if (!reportData || !vereadores || !Array.isArray(vereadores)) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processing suggestion request for report type:', reportData.type);

    // Calculate scores for all council members
    const suggestions: SuggestionResult[] = vereadores.map(vereador => {
      const commissions = COUNCIL_MEMBER_COMMISSIONS[vereador.id] || ['urbanismo'];
      const { score, reasons } = calculateMatchScore(vereador, reportData, commissions);
      
      return {
        vereador,
        matchScore: Math.min(score, 100),
        matchReasons: reasons
      };
    });

    // Sort by score and return top 5
    const topSuggestions = suggestions
      .filter(s => s.matchScore > 0)
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 5);

    // If no matches, return top 3 by region or random
    if (topSuggestions.length === 0) {
      const fallback = vereadores.slice(0, 3).map(v => ({
        vereador: v,
        matchScore: 10,
        matchReasons: ['Vereador disponível para atendimento']
      }));
      return new Response(
        JSON.stringify({ suggestions: fallback }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ suggestions: topSuggestions }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in suggest-council-members:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
