import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import {
  TRANSPORT_REPORT_TRAMITE_AFTER_REGISTRATION,
  URBAN_REPORT_TRAMITE_AFTER_REGISTRATION,
} from "./lib-urban-tramite.ts";

// ========== SERVICE RATING: DIMENSÕES (alinhado a src/lib/serviceRatingDimensions.ts) ==========
export const SERVICE_RATING_DIMENSION_KEYS = ['atendimento', 'limpeza', 'infraestrutura', 'tempo_espera'] as const;

export function isCompleteServiceRatingDimensions(o: unknown): boolean {
  if (!o || typeof o !== 'object') return false;
  const rec = o as Record<string, unknown>;
  for (const k of SERVICE_RATING_DIMENSION_KEYS) {
    const n = Number(rec[k]);
    if (!Number.isInteger(n) || n < 1 || n > 5) return false;
  }
  return true;
}

export function parseRatingDimensionsMarker(content: string): Record<string, number> | null {
  const marker = '[RATING_DIMENSIONS:';
  const idx = content.indexOf(marker);
  if (idx < 0) return null;
  const start = idx + marker.length;
  const end = content.indexOf(']', start);
  if (end < 0) return null;
  try {
    const o = JSON.parse(content.slice(start, end)) as Record<string, unknown>;
    if (!isCompleteServiceRatingDimensions(o)) return null;
    return o as Record<string, number>;
  } catch {
    return null;
  }
}

export function parseFlexibleOccurrenceTime(input: string): string | null {
  const raw = (input || "").trim().toLowerCase();
  if (!raw) return null;

  const normalized = raw
    .replace(/\s+/g, " ")
    .replace(/horas?/g, "h")
    .replace(/\bmeia noite\b/g, "00:00")
    .replace(/\bmeio dia\b/g, "12:00")
    .replace(/\bmeio-dia\b/g, "12:00");

  const compact = normalized.replace(/\s+/g, "");

  const hm = compact.match(/\b([01]?\d|2[0-3])(?:h|:)([0-5]?\d)?\b/);
  if (hm) {
    const hour = hm[1].padStart(2, "0");
    const minute = (hm[2] || "00").padStart(2, "0");
    return `${hour}:${minute}`;
  }

  const digits = compact.match(/\b([01]\d|2[0-3])([0-5]\d)\b/);
  if (digits) return `${digits[1]}:${digits[2]}`;

  const hourOnly = compact.match(/\b([01]?\d|2[0-3])\b/);
  if (hourOnly && /\b(h|hora)\b/.test(normalized)) {
    return `${hourOnly[1].padStart(2, "0")}:00`;
  }

  return null;
}

export function aggregateRatingDimensionsStars(dim: Record<string, number>): number {
  const vals = SERVICE_RATING_DIMENSION_KEYS.map((k) => Number(dim[k]));
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}

// ========== NLP: BRAZILIAN PORTUGUESE PATTERNS (CENTRALIZED) ==========

/**
 * Detects affirmative responses in Brazilian Portuguese
 * Expanded patterns for natural language understanding
 */
export function isAffirmativeResponse(text: string): boolean {
  const lower = text.toLowerCase().trim();
  const patterns = [
    // Direct yes
    /^s+i*m*$/i, /^s$/i, /^ss+$/i,
    // Confirmations
    /^pode$/i, /^pode ser$/i, /^pode sim$/i, /^bora$/i, /^vamos$/i, /^vamos lá$/i,
    /^ok$/i, /^okay$/i, /^okey$/i, /^beleza$/i, /^blz$/i, /^show$/i,
    /^quero$/i, /^desejo$/i, /^aceito$/i, /^confirmo$/i, /^confirma$/i,
    // Affirmations
    /^isso$/i, /^isso mesmo$/i, /^exato$/i, /^exatamente$/i, /^isso aí$/i, /^isso ai$/i,
    /^correto$/i, /^certo$/i, /^verdade$/i, /^positivo$/i,
    /^ta$/i, /^tá$/i, /^ta bom$/i, /^tá bom$/i, /^tá certo$/i, /^tá ok$/i,
    /^legal$/i, /^ótimo$/i, /^otimo$/i, /^perfeito$/i, /^massa$/i,
    /^claro$/i, /^com certeza$/i, /^sem dúvida$/i, /^lógico$/i, /^logico$/i,
    /^é isso$/i, /^e isso$/i, /^é esse$/i, /^é essa$/i,
    /^manda$/i, /^manda ver$/i, /^segue$/i, /^vai$/i, /^dale$/i, /^bora lá$/i,
    /^afirmativo$/i, /^positivo$/i, /^certeza$/i,
    // Emojis
    /^👍$/i, /^✅$/i, /^✔$/i, /^👌$/i
  ];
  return patterns.some(p => p.test(lower)) || 
         lower.includes('sim') || lower.includes('correto') || 
         lower.includes('confirmo') || lower.includes('isso mesmo');
}

/**
 * Detects negative responses in Brazilian Portuguese
 */
export function isNegativeResponse(text: string): boolean {
  const lower = text.toLowerCase().trim();
  const patterns = [
    // Direct no
    /^n+[ãa]*o*$/i, /^n$/i, /^nn+$/i, /^nop$/i, /^nope$/i, /^nem$/i,
    // Negations
    /^nunca$/i, /^jamais$/i, /^negativo$/i, /^errado$/i,
    /^não é$/i, /^nao e$/i, /^não é isso$/i, /^nao e isso$/i,
    /^não quero$/i, /^nao quero$/i, /^não pode$/i, /^nao pode$/i,
    // Cancellations
    /^cancela$/i, /^cancelar$/i, /^parar$/i, /^para$/i, /^deixa$/i,
    /^deixa pra lá$/i, /^deixa quieto$/i, /^esquece$/i, /^desisto$/i,
    /^outro$/i, /^outra$/i, /^diferente$/i, /^mudar$/i, /^trocar$/i,
    // Emojis
    /^👎$/i, /^❌$/i, /^✖$/i
  ];
  return patterns.some(p => p.test(lower)) ||
         lower.startsWith('não') || lower.startsWith('nao') ||
         lower.includes('errado') || lower.includes('incorreto');
}

/**
 * Domain-specific keywords for semantic detection
 * Used for flexible description validation and intent detection
 */
const DOMAIN_KEYWORDS: Record<string, string[]> = {
  urban: [
    // Iluminação
    'poste', 'luz', 'apagado', 'apagada', 'escuro', 'lampada', 'lâmpada', 'iluminação', 'iluminacao',
    // Via pública  
    'buraco', 'asfalto', 'semaforo', 'semáforo', 'lombada', 'cratera', 'pavimento', 'pista',
    // Calçada
    'calcada', 'calçada', 'passeio', 'rampa', 'degrau', 'meio-fio',
    // Esgoto/água
    'bueiro', 'esgoto', 'vazamento', 'alagamento', 'enchente', 'valeta', 'enxurrada', 'córrego',
    // Lixo
    'lixo', 'entulho', 'sujeira', 'descarte', 'caçamba', 'cata', 'resíduo',
    // Área verde
    'arvore', 'árvore', 'mato', 'poda', 'galho', 'raiz', 'jardim', 'praça', 'praca',
    // Animais
    'rato', 'barata', 'escorpião', 'bicho', 'animal', 'pombo', 'cobra', 'infestação',
    // Estados comuns
    'caido', 'caído', 'quebrado', 'quebrada', 'danificado', 'estragado',
    'entupido', 'entupida', 'transbordando', 'vazando', 'fedendo', 'fedido',
    'acumulado', 'abandonado', 'irregular', 'perigoso',
    // Modernos (para categorias dinâmicas)
    'patinete', 'bicicleta', 'bike', 'moto', 'estacionado', 'drone', 'antena'
  ],
  transport: [
    // Atraso
    'atraso', 'atrasado', 'atrasou', 'demora', 'demorou', 'esperando', 'nunca chega', 'não passou', 'nao passou',
    // Lotação
    'lotado', 'lotação', 'lotacao', 'cheio', 'superlotado', 'apertado', 'não coube', 'nao coube', 'sem espaço',
    // Segurança
    'segurança', 'seguranca', 'assalto', 'roubo', 'assédio', 'assedio', 'perigo', 'medo', 'briga', 'ameaça',
    // Limpeza
    'sujo', 'sujeira', 'fedendo', 'fedor', 'nojento', 'lixo', 'vômito', 'vomito', 'imundo',
    // Acessibilidade
    'acessibilidade', 'cadeirante', 'elevador', 'rampa', 'deficiente', 'pcd', 'mobilidade',
    // Condução
    'motorista', 'cobrador', 'rude', 'grosso', 'mal educado', 'não parou', 'nao parou', 'freada', 'condução',
    // Modais
    'ônibus', 'onibus', 'metrô', 'metro', 'trem', 'linha', 'estação', 'estacao', 'terminal', 'ponto'
  ],
  service: [
    // Tipos de serviço
    'ubs', 'hospital', 'escola', 'ceu', 'biblioteca', 'posto', 'creche', 'pronto-socorro', 'ama',
    // Qualidade
    'atendimento', 'demora', 'fila', 'espera', 'médico', 'medico', 'professor', 'funcionário', 'funcionario',
    // Experiência
    'bom', 'ruim', 'péssimo', 'pessimo', 'ótimo', 'otimo', 'excelente', 'terrível', 'terrivel', 'horrível',
    'rápido', 'rapido', 'lento', 'eficiente', 'ineficiente', 'organizado', 'bagunça', 'bagunca'
  ],
  audiencias: [
    'audiência', 'audiencia', 'consulta', 'pública', 'publica', 'participar', 'inscrever', 'inscrição',
    'tema', 'sessão', 'sessao', 'reunião', 'reuniao', 'evento', 'câmara', 'camara', 'vereador'
  ],
  general: [
    'informação', 'informacao', 'dúvida', 'duvida', 'pergunta', 'como funciona', 'o que é', 'o que e',
    'horário', 'horario', 'endereço', 'endereco', 'telefone', 'contato', 'atendimento',
    'estrutura', 'funcionamento', 'apresentação', 'apresentacao', 'conhecer a câmara', 'conhecer a camara'
  ]
};

/**
 * Validates if text is a valid description for the given domain
 * Uses flexible threshold: >= 20 chars OR (>= 8 chars + domain keyword)
 */
export function isValidDomainDescription(text: string, domain: string): boolean {
  // SEMANTIC INTERPRETATION: Accept any non-empty, non-generic text
  // The LLM will handle semantic understanding - no character count restrictions
  if (!text || text.trim().length === 0) return false;
  if (isGenericIntentText(text)) return false;
  
  // Any text that is not a generic intent phrase is a valid description
  // Examples: "Rua suja", "Poste", "Buraco", "Lixo" are all valid
  return true;
}

/**
 * Extracts implicit data from user response based on context
 * Uses the last assistant question to understand what data to infer
 */
export function extractImplicitData(
  userMessage: string, 
  lastAssistantQuestion: string,
  domain: string
): Record<string, unknown> {
  const lower = userMessage.toLowerCase().trim();
  const questionLower = lastAssistantQuestion.toLowerCase();
  const extracted: Record<string, unknown> = {};
  
  // === CONTEXT: Risk/Urgency question ===
  if (questionLower.includes('risco') || questionLower.includes('urgente') || 
      questionLower.includes('perigoso') || questionLower.includes('gravidade')) {
    if (isAffirmativeResponse(userMessage)) {
      extracted.risk_level = 'moderate';
    } else if (isNegativeResponse(userMessage)) {
      extracted.risk_level = 'none';
    }
    // Intensifiers override
    if (/muito|demais|urgente|grave|sério|serio|crítico|critico|perigoso|imediato/i.test(lower)) {
      extracted.risk_level = 'critical';
    }
  }
  
  // === CONTEXT: Scope/Extent question ===
  if (questionLower.includes('afetando') || questionLower.includes('escopo') ||
      questionLower.includes('só você') || questionLower.includes('so voce') || 
      questionLower.includes('toda a rua') || questionLower.includes('bairro')) {
    if (/eu|minha casa|só eu|somente eu|meu apartamento|meu prédio/i.test(lower)) {
      extracted.affected_scope = 'individual';
    } else if (/rua|vizinhos|quarteirão|prédio|condomínio|vizinhança/i.test(lower)) {
      extracted.affected_scope = 'street';
    } else if (/bairro|região|todo|toda|muito|vários|várias|comunidade/i.test(lower)) {
      extracted.affected_scope = 'neighborhood';
    }
  }
  
  // === CONTEXT: Date/Time question ===
  if (questionLower.includes('quando') || questionLower.includes('data') || 
      questionLower.includes('hora') || questionLower.includes('dia')) {
    // Date inference
    if (/agora|acabou de|agora pouco|neste momento|há pouco|ha pouco|acabei de ver/i.test(lower)) {
      extracted.occurrence_date = new Date().toISOString().split('T')[0];
      extracted.occurrence_time = new Date().toTimeString().slice(0,5);
    } else if (/hoje/i.test(lower)) {
      extracted.occurrence_date = new Date().toISOString().split('T')[0];
    } else if (/ontem/i.test(lower)) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      extracted.occurrence_date = yesterday.toISOString().split('T')[0];
    } else if (/anteontem/i.test(lower)) {
      const dayBefore = new Date();
      dayBefore.setDate(dayBefore.getDate() - 2);
      extracted.occurrence_date = dayBefore.toISOString().split('T')[0];
    } else if (/semana passada/i.test(lower)) {
      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 7);
      extracted.occurrence_date = lastWeek.toISOString().split('T')[0];
    }
    
    // Time inference
    const parsedTime = parseFlexibleOccurrenceTime(userMessage);
    if (parsedTime) {
      extracted.occurrence_time = parsedTime;
    } else if (/manhã|de manhã|cedo|logo cedo/i.test(lower)) {
      extracted.occurrence_time = '08:00';
    } else if (/tarde|de tarde|após almoço|depois do almoço/i.test(lower)) {
      extracted.occurrence_time = '14:00';
    } else if (/noite|de noite|anoitecer|fim do dia/i.test(lower)) {
      extracted.occurrence_time = '20:00';
    } else if (/madrugada|de madrugada/i.test(lower)) {
      extracted.occurrence_time = '03:00';
    } else if (/meio-dia|meio dia|almoço/i.test(lower)) {
      extracted.occurrence_time = '12:00';
    }
  }
  
  // === CONTEXT: Rating/Stars question (service_rating) ===
  if (questionLower.includes('nota') || questionLower.includes('estrela') ||
      questionLower.includes('1 a 5') || questionLower.includes('avaliar') || questionLower.includes('avaliação')) {
    // Numbers written out
    const numberWords: Record<string, number> = {
      'um': 1, 'uma': 1, 'dois': 2, 'duas': 2, 'três': 3, 'tres': 3,
      'quatro': 4, 'cinco': 5, 'zero': 0
    };
    for (const [word, num] of Object.entries(numberWords)) {
      if (lower.includes(word) && num >= 1 && num <= 5) {
        extracted.rating_stars = num;
        break;
      }
    }
    // Qualifiers
    if (/péssim|pessim|horrível|horrivel|terrível|terrivel|muito ruim|lixo/i.test(lower)) {
      extracted.rating_stars = 1;
      extracted.sentiment = 'negative';
    } else if (/ruim|fraco|mal|insatisf/i.test(lower)) {
      extracted.rating_stars = 2;
      extracted.sentiment = 'negative';
    } else if (/ok|regular|mais ou menos|razoável|razoavel|médio|medio/i.test(lower)) {
      extracted.rating_stars = 3;
      extracted.sentiment = 'neutral';
    } else if (/bom|legal|gostei|satisf|decente/i.test(lower)) {
      extracted.rating_stars = 4;
      extracted.sentiment = 'positive';
    } else if (/ótimo|otimo|excelente|perfeito|maravilhoso|muito bom|sensacional|top/i.test(lower)) {
      extracted.rating_stars = 5;
      extracted.sentiment = 'positive';
    }
    const dimsMark = parseRatingDimensionsMarker(userMessage);
    if (dimsMark) {
      extracted.rating_dimensions = dimsMark;
      extracted.rating_stars = aggregateRatingDimensionsStars(dimsMark);
    }
  }
  
  // === CONTEXT: Address confirmation ===
  if (questionLower.includes('correto') || questionLower.includes('confirma') ||
      questionLower.includes('certo') || questionLower.includes('está correto') || questionLower.includes('este endereço')) {
    if (isAffirmativeResponse(userMessage)) {
      extracted.address_confirmed = true;
      extracted.service_address_confirmed = true;
    } else if (isNegativeResponse(userMessage)) {
      extracted.address_confirmed = false;
      extracted.service_address_confirmed = false;
    }
  }
  
  // === CONTEXT: Service type question ===
  if (questionLower.includes('tipo de serviço') || questionLower.includes('qual serviço') || questionLower.includes('que serviço')) {
    const serviceTypes: Record<string, string> = {
      'ubs': 'ubs', 'posto de saúde': 'ubs', 'posto de saude': 'ubs', 'postinho': 'ubs',
      'hospital': 'hospital', 'pronto socorro': 'hospital', 'pronto-socorro': 'hospital', 'ps': 'hospital',
      'escola': 'school', 'colégio': 'school', 'colegio': 'school',
      'ceu': 'ceu', 'centro educacional': 'ceu',
      'biblioteca': 'library',
      'centro esportivo': 'sports_center', 'quadra': 'sports_center', 'ginásio': 'sports_center', 'ginasio': 'sports_center'
    };
    for (const [keyword, type] of Object.entries(serviceTypes)) {
      if (lower.includes(keyword)) {
        extracted.service_type = type;
        break;
      }
    }
  }
  
  return extracted;
}

// ========== INTELLIGENT LABEL GENERATION WITH AI ==========

/**
 * Tries to match known patterns for label generation
 * Returns null if no pattern matches
 */
export function tryPatternBasedLabel(description: string, category: string): string | null {
  const lower = description.toLowerCase();
  
  const patterns: Record<string, Array<{ pattern: RegExp; label: string }>> = {
    iluminacao: [
      { pattern: /poste\s*(caido|caído|quebrado)/i, label: 'Poste Caído' },
      { pattern: /luz\s*(apagad|queimad)/i, label: 'Luz Apagada' },
      { pattern: /lampada\s*(queimad|quebrad)/i, label: 'Lâmpada Queimada' },
      { pattern: /rua\s*sem\s*luz/i, label: 'Rua sem Iluminação' },
      { pattern: /escuro|escuridao|escuridão/i, label: 'Falta de Iluminação' }
    ],
    via_publica: [
      { pattern: /buraco\s*(grande|enorme|gigante)?/i, label: 'Buraco na Via' },
      { pattern: /asfalto\s*(danificad|quebrad)/i, label: 'Asfalto Danificado' },
      { pattern: /lombada\s*(irregular|alta)/i, label: 'Lombada Irregular' }
    ],
    pavimentacao: [
      { pattern: /pavimenta[çc][ãa]o|pavimentacao|recape|recapeamento|asfaltamento|capeamento|fresagem/i, label: 'Pavimentação / Recape' },
      { pattern: /obra\s*(de\s*)?paviment|requalifica[çc][ãa]o\s*vi[áa]ria|cbuq|restaura[çc][ãa]o\s*asf[áa]ltica/i, label: 'Obra de Pavimentação' },
    ],
    sinalizacao: [
      { pattern: /semaforo|semáforo/i, label: 'Semáforo com Defeito' },
      { pattern: /faixa\s*(de\s*pedestre|apagad)/i, label: 'Faixa de Pedestre' },
      { pattern: /placa\s*(ca[íi]d|quebrad|torta)?/i, label: 'Placa de Sinalização' },
      { pattern: /sinaliza[çc][ãa]o/i, label: 'Problema de Sinalização' }
    ],
    drenagem: [
      { pattern: /drenagem|água\s*pluvial|pluvial|galeria|sarjeta/i, label: 'Drenagem / Água Pluvial' },
      { pattern: /água\s*da\s*chuva|chuva\s*acumulad/i, label: 'Acúmulo de Água da Chuva' },
      { pattern: /bueiro\s*pluvial/i, label: 'Bueiro Pluvial' }
    ],
    calcada: [
      { pattern: /calcada\s*(quebrad|irregular|danificad)|calçada/i, label: 'Calçada Irregular' },
      { pattern: /rampa\s*(faltando|irregular)/i, label: 'Rampa de Acessibilidade' }
    ],
    lixo: [
      { pattern: /lixo\s*(acumulad|amontoado)/i, label: 'Lixo Acumulado' },
      { pattern: /entulho/i, label: 'Entulho Descartado' },
      { pattern: /descarte\s*irregular/i, label: 'Descarte Irregular' }
    ],
    area_verde: [
      { pattern: /arvore\s*(caid|caind|tombad)|árvore/i, label: 'Árvore Caída' },
      { pattern: /poda\s*(necessari|urgente)/i, label: 'Necessidade de Poda' },
      { pattern: /mato\s*(alto|crescendo)/i, label: 'Mato Alto' },
      { pattern: /galho\s*(pendent|caind)/i, label: 'Galho Pendente' }
    ],
    esgoto: [
      { pattern: /bueiro\s*(entupid|transbordand)/i, label: 'Bueiro Entupido' },
      { pattern: /esgoto\s*(a\s*ceu\s*aberto|vazand)/i, label: 'Esgoto a Céu Aberto' },
      { pattern: /vazamento/i, label: 'Vazamento de Água' },
      { pattern: /alagamento|alagad/i, label: 'Alagamento' }
    ],
    poluicao: [
      { pattern: /barulho|som\s*alto|música\s*alta/i, label: 'Perturbação Sonora' },
      { pattern: /bar\s*(barulhento|barulho)|balada|festa/i, label: 'Estabelecimento Barulhento' },
      { pattern: /fumaça|fumaca|queimada/i, label: 'Poluição Atmosférica' }
    ],
    outro: [
      { pattern: /patinete\s*(abandonad|jogad)/i, label: 'Patinete Abandonado' },
      { pattern: /bicicleta\s*(abandonad|jogad)/i, label: 'Bicicleta Abandonada' },
      { pattern: /carro\s*(abandonad)/i, label: 'Veículo Abandonado' },
      { pattern: /moto\s*(abandonad)/i, label: 'Moto Abandonada' }
    ]
  };
  
  const categoryPatterns = patterns[category] || patterns['outro'];
  for (const p of categoryPatterns) {
    if (p.pattern.test(lower)) {
      return p.label;
    }
  }
  
  return null;
}

/**
 * Generates an intelligent label using AI for unmatched patterns
 * Falls back to basic label generation if AI fails
 */
export async function generateIntelligentLabel(
  description: string,
  category: string
): Promise<string> {
  // First try pattern-based matching
  const patternLabel = tryPatternBasedLabel(description, category);
  if (patternLabel) return patternLabel;
  
  // Try AI-based label generation
  try {
    const aiChatBaseUrl = Deno.env.get('AI_CHAT_BASE_URL') || Deno.env.get('AI_BASE_URL');
    const aiChatApiKey = Deno.env.get('AI_CHAT_API_KEY') || Deno.env.get('AI_API_KEY');
    const aiChatModel = Deno.env.get('AI_CHAT_MODEL') || 'meta-llama/Meta-Llama-3.1-8B-Instruct';
    
    if (!aiChatBaseUrl) {
      return generateLabelFromDescription(description);
    }
    
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
        messages: [{
          role: 'system',
          content: `Você é um classificador de problemas urbanos de São Paulo.
Dado uma descrição de problema, gere um LABEL curto (2-4 palavras) que resuma o problema.

Regras:
- Máximo 4 palavras
- Use linguagem clara e direta
- Foque no problema principal
- Não use artigos desnecessários

Exemplos:
- "Tem um poste caído na rua" -> "Poste Caído"
- "Lixo acumulado na calçada há semanas" -> "Lixo Acumulado"
- "Buraco grande no asfalto" -> "Buraco na Via"
- "Patinete abandonado na calçada" -> "Patinete Abandonado"
- "Bar com som alto de madrugada" -> "Perturbação Sonora"`
        }, {
          role: 'user',
          content: `Categoria: ${category}\nDescrição: ${description}\n\nGere o label:`
        }],
        max_tokens: 20,
        temperature: 0.3
      })
    });
    
    const data = await response.json();
    const label = data.choices?.[0]?.message?.content?.trim() || '';
    
    if (label && label.length <= 50 && label.length >= 3) {
      console.log('[generateIntelligentLabel] AI generated:', label);
      return label;
    }
  } catch (error) {
    console.error('[generateIntelligentLabel] AI error:', error);
  }
  
  // Fallback to basic generation
  return generateLabelFromDescription(description);
}

// ========== DYNAMIC CATEGORY SYSTEM ==========

/**
 * Emerging patterns that should become new categories
 */
export const EMERGING_PATTERNS = [
  { pattern: /patinete\s*(eletric|abandonad|jogad)/i, key: 'patinete_abandonado', name: 'Patinete Abandonado', parent: 'outro' },
  { pattern: /bicicleta\s*(de\s*app|compartilhad|abandonad)/i, key: 'bike_compartilhada', name: 'Bicicleta Compartilhada', parent: 'outro' },
  { pattern: /5g|antena\s*celular/i, key: 'infraestrutura_telecom', name: 'Infraestrutura de Telecom', parent: 'outro' },
  { pattern: /drone|drones/i, key: 'drones', name: 'Problema com Drones', parent: 'outro' },
  { pattern: /carro\s*eletrico|ponto\s*de\s*recarga/i, key: 'infraestrutura_ev', name: 'Infraestrutura Veículos Elétricos', parent: 'outro' },
  { pattern: /delivery|entregador|motoboy/i, key: 'problemas_delivery', name: 'Problemas com Delivery', parent: 'outro' },
];

/**
 * Detects if description matches an emerging category pattern
 */
export async function detectEmergingCategory(
  description: string,
  currentCategory: string,
  supabaseClient: SupabaseClient
): Promise<{ shouldCreate: boolean; suggestedKey?: string; suggestedName?: string; parentCategory?: string }> {
  const lower = description.toLowerCase();
  
  for (const ep of EMERGING_PATTERNS) {
    if (ep.pattern.test(lower)) {
      // Check if category already exists
      const { data: existing } = await supabaseClient
        .from('dynamic_categories')
        .select('id, usage_count')
        .eq('category_key', ep.key)
        .single();
      
      if (existing) {
        // Increment usage count
        await supabaseClient
          .from('dynamic_categories')
          .update({ 
            usage_count: existing.usage_count + 1, 
            last_used_at: new Date().toISOString() 
          })
          .eq('id', existing.id);
        console.log(`[detectEmergingCategory] Incremented usage for: ${ep.key}`);
        return { shouldCreate: false };
      } else {
        return { 
          shouldCreate: true, 
          suggestedKey: ep.key, 
          suggestedName: ep.name,
          parentCategory: ep.parent 
        };
      }
    }
  }
  
  return { shouldCreate: false };
}

/**
 * Creates a new dynamic category
 */
export async function createDynamicCategory(
  key: string,
  name: string,
  parentCategory: string,
  description: string,
  supabaseClient: SupabaseClient
): Promise<void> {
  const keywords = extractCategoryKeywords(description);
  
  try {
    await supabaseClient
      .from('dynamic_categories')
      .insert({
        category_key: key,
        parent_category: parentCategory,
        display_name: name,
        keywords: keywords,
        sample_descriptions: [description.substring(0, 200)],
        status: 'pending'
      });
    
    console.log(`[createDynamicCategory] New category created: ${key} (${name})`);
  } catch (error) {
    console.error('[createDynamicCategory] Error:', error);
  }
}

/**
 * Extracts keywords from text for category indexing
 */
export function extractCategoryKeywords(text: string): string[] {
  const stopwords = ['o', 'a', 'os', 'as', 'um', 'uma', 'de', 'da', 'do', 'em', 'na', 'no', 'que', 'e', 'para', 'com', 'por'];
  return text
    .toLowerCase()
    .replace(/[^\w\sáàâãéèêíìîóòôõúùûçñ]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3 && !stopwords.includes(w))
    .slice(0, 10);
}

/**
 * Logs category usage for pattern detection
 */
export async function logCategoryUsage(
  category: string,
  subcategory: string | null,
  description: string,
  userId: string | null,
  supabaseClient: SupabaseClient
): Promise<void> {
  try {
    // Simple hash for deduplication
    const descHash = description.substring(0, 50).replace(/\s+/g, '').toLowerCase();
    
    await supabaseClient
      .from('category_usage_log')
      .insert({
        category,
        subcategory,
        description_hash: descHash,
        description_sample: description.substring(0, 200),
        keywords_detected: extractCategoryKeywords(description),
        user_id: userId
      });
  } catch (error) {
    console.error('[logCategoryUsage] Error:', error);
  }
}

// ========== CITIZEN LEARNING SYSTEM ==========

export interface CitizenLearningProfile {
  preferred_neighborhood?: string;
  preferred_region?: string;
  last_known_address?: { street?: string; neighborhood?: string; cep?: string };
  common_categories: string[];
  common_keywords: string[];
  communication_style: 'formal' | 'informal' | 'concise';
  avg_message_length: number;
  prefers_short_responses: boolean;
  frequent_services: string[];
  frequent_transport_lines: string[];
  total_reports: number;
  total_conversations: number;
}

/**
 * Loads the citizen's learning profile from database
 */
export async function loadCitizenProfile(
  userId: string,
  supabaseClient: SupabaseClient
): Promise<CitizenLearningProfile | null> {
  try {
    const { data, error } = await supabaseClient
      .from('citizen_learning_profile')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error || !data) return null;
    return data as CitizenLearningProfile;
  } catch (e) {
    console.error('[loadCitizenProfile] Error:', e);
    return null;
  }
}

/**
 * Learns from a conversation and updates the citizen's profile
 */
export async function learnFromConversation(
  userId: string,
  messages: Array<{ role: string; content: string }>,
  reportData: Record<string, unknown>,
  supabaseClient: SupabaseClient
): Promise<void> {
  try {
    const userMessages = messages.filter(m => m.role === 'user');
    if (userMessages.length === 0) return;
    
    // Calculate metrics
    const avgLength = userMessages.reduce((sum, m) => sum + m.content.length, 0) / userMessages.length;
    
    // Detect communication style
    let style: 'formal' | 'informal' | 'concise' = 'informal';
    if (avgLength < 20) style = 'concise';
    else if (avgLength > 100) style = 'formal';
    
    // Extract neighborhood if mentioned
    let neighborhood: string | null = null;
    for (const msg of userMessages) {
      const match = msg.content.match(/(?:bairro|em|no)\s+([A-ZÀ-Ú][a-zà-ú]+(?:\s+[A-ZÀ-Ú][a-zà-ú]+)?)/i);
      if (match) {
        neighborhood = match[1];
        break;
      }
    }
    
    // Fetch existing profile
    const { data: existing } = await supabaseClient
      .from('citizen_learning_profile')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (existing) {
      // Update existing profile
      const updates: Record<string, unknown> = {
        avg_message_length: Math.round((existing.avg_message_length + avgLength) / 2),
        communication_style: style,
        prefers_short_responses: avgLength < 30,
        total_conversations: existing.total_conversations + 1,
        last_interaction_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      if (neighborhood && !existing.preferred_neighborhood) {
        updates.preferred_neighborhood = neighborhood;
      }
      
      // Add category to history
      if (reportData.category) {
        const categories = existing.common_categories || [];
        if (!categories.includes(reportData.category)) {
          updates.common_categories = [...categories.slice(-9), reportData.category];
        }
      }
      
      // Update last known address
      if (reportData.neighborhood || reportData.street) {
        updates.last_known_address = {
          street: reportData.street,
          neighborhood: reportData.neighborhood || neighborhood,
          cep: reportData.cep
        };
      }
      
      // Track frequent services
      if (reportData.service_type) {
        const services = existing.frequent_services || [];
        if (!services.includes(reportData.service_type)) {
          updates.frequent_services = [...services.slice(-4), reportData.service_type];
        }
      }
      
      // Track frequent transport lines
      if (reportData.line_code) {
        const lines = existing.frequent_transport_lines || [];
        if (!lines.includes(reportData.line_code)) {
          updates.frequent_transport_lines = [...lines.slice(-4), reportData.line_code];
        }
      }
      
      await supabaseClient
        .from('citizen_learning_profile')
        .update(updates)
        .eq('user_id', userId);
      
      console.log('[learnFromConversation] Profile updated for user:', userId);
    } else {
      // Create new profile
      await supabaseClient
        .from('citizen_learning_profile')
        .insert({
          user_id: userId,
          preferred_neighborhood: neighborhood,
          common_categories: reportData.category ? [reportData.category] : [],
          communication_style: style,
          avg_message_length: Math.round(avgLength),
          prefers_short_responses: avgLength < 30,
          total_conversations: 1,
          frequent_services: reportData.service_type ? [reportData.service_type] : [],
          frequent_transport_lines: reportData.line_code ? [reportData.line_code] : [],
          last_interaction_at: new Date().toISOString()
        });
      
      console.log('[learnFromConversation] Profile created for user:', userId);
    }
  } catch (error) {
    console.error('[learnFromConversation] Error:', error);
  }
}

/**
 * Generates personalized system prompt additions based on citizen profile
 */
export function getPersonalizedPromptAdditions(profile: CitizenLearningProfile | null): string {
  if (!profile) return '';
  
  const additions: string[] = [];
  
  // Communication style adaptation
  if (profile.communication_style === 'concise') {
    additions.push('O cidadão prefere respostas CURTAS e diretas. Seja objetivo, evite explicações longas.');
  } else if (profile.communication_style === 'formal') {
    additions.push('O cidadão usa linguagem formal. Mantenha tom respeitoso e completo nas respostas.');
  }
  
  // Suggest previous address
  if (profile.last_known_address?.neighborhood) {
    additions.push(`SUGESTÃO: Último endereço conhecido: ${profile.last_known_address.neighborhood}. Se o problema for no mesmo local, pergunte "É no mesmo local (${profile.last_known_address.neighborhood})?" em vez de pedir tudo novamente.`);
  }
  
  // Frequent categories
  if (profile.common_categories?.length > 0) {
    const topCategories = profile.common_categories.slice(-3);
    additions.push(`O cidadão costuma relatar problemas de: ${topCategories.join(', ')}.`);
  }
  
  // Frequent transport lines
  if (profile.frequent_transport_lines?.length > 0) {
    const lines = profile.frequent_transport_lines.slice(-3);
    additions.push(`Linhas de transporte frequentes: ${lines.join(', ')}.`);
  }
  
  return additions.length > 0 
    ? '\n\n=== PERSONALIZAÇÃO DO CIDADÃO ===\n' + additions.join('\n') 
    : '';
}

export const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

// Commission to themes mapping for council member suggestions
const COMMISSION_THEMES: Record<string, string[]> = {
  'transporte': ['atraso', 'lotacao', 'superlotacao', 'onibus', 'metro', 'trem', 'mobilidade', 'transito'],
  'urbanismo': ['buraco', 'calcada', 'iluminacao', 'praca', 'lixo', 'entulho', 'poda', 'arvore', 'infraestrutura'],
  'saude': ['ubs', 'hospital', 'posto', 'saude', 'medico', 'atendimento'],
  'educacao': ['escola', 'creche', 'ceu', 'educacao', 'ensino'],
  'meio_ambiente': ['poluicao', 'rio', 'corrego', 'desmatamento', 'verde', 'parque', 'ambiental'],
  'seguranca': ['seguranca', 'policia', 'violencia', 'assalto', 'roubo'],
  'habitacao': ['moradia', 'habitacao', 'ocupacao', 'favela', 'desabrigado'],
  'assistencia_social': ['social', 'vulnerabilidade', 'morador_rua', 'fome', 'abrigo'],
};

// ========== TEXT NORMALIZATION & FUZZY MATCHING UTILITIES ==========

// Normalize text: remove accents, lowercase, collapse spaces
export function normalizeForMatching(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics (accents)
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')        // Replace punctuation with spaces
    .replace(/\s+/g, ' ')             // Collapse multiple spaces
    .trim();
}

// Simple Levenshtein distance for fuzzy matching
export function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  
  const matrix: number[][] = [];
  
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b[i - 1] === a[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  
  return matrix[b.length][a.length];
}

// Transport type keywords for fuzzy matching
const TRANSPORT_TYPE_KEYWORDS: Record<string, string[]> = {
  'atraso': ['atraso', 'atrasado', 'atrasou', 'demora', 'demorou', 'esperando', 'espera', 'nao passou', 'nunca chega'],
  'lotacao': ['lotado', 'lotacao', 'cheio', 'superlotado', 'apertado', 'sem espaco', 'nao coube'],
  'seguranca': ['seguranca', 'assalto', 'roubo', 'assedio', 'perigo', 'medo', 'ameaca', 'briga', 'agressao'],
  'limpeza': ['sujo', 'sujeira', 'limpeza', 'fedendo', 'fedor', 'nojento', 'imundo', 'lixo', 'vomito'],
  'acessibilidade': ['acessibilidade', 'cadeirante', 'elevador', 'rampa', 'deficiente', 'muleta', 'pcd', 'mobilidade'],
  'conducao': ['motorista', 'cobrador', 'rude', 'grosso', 'mal educado', 'nao parou', 'conducao', 'freada', 'perigoso'],
};

// Fuzzy match a token against a list of keywords (returns true if match found)
export function fuzzyMatchKeyword(token: string, keywords: string[], maxDistance: number = 1): boolean {
  const normalizedToken = normalizeForMatching(token);
  if (normalizedToken.length < 3) return false; // Too short for fuzzy
  
  for (const kw of keywords) {
    const normalizedKw = normalizeForMatching(kw);
    
    // Exact match after normalization
    if (normalizedToken === normalizedKw) return true;
    
    // Contains match (for multi-word keywords)
    if (normalizedToken.includes(normalizedKw) || normalizedKw.includes(normalizedToken)) return true;
    
    // Fuzzy match with Levenshtein distance
    // Allow more distance for longer words
    const allowedDist = normalizedKw.length > 6 ? 2 : maxDistance;
    if (levenshteinDistance(normalizedToken, normalizedKw) <= allowedDist) {
      console.log(`[fuzzyMatch] Matched "${normalizedToken}" to "${normalizedKw}" (dist: ${levenshteinDistance(normalizedToken, normalizedKw)})`);
      return true;
    }
  }
  return false;
}

// Infer transport report_type from text using normalized + fuzzy matching
export function inferTransportTypeFromText(text: string): string | null {
  const normalized = normalizeForMatching(text);
  const tokens = normalized.split(' ').filter(t => t.length >= 3);
  
  console.log('[inferTransportTypeFromText] Tokens:', tokens.slice(0, 10));
  
  for (const [type, keywords] of Object.entries(TRANSPORT_TYPE_KEYWORDS)) {
    // First: check if any keyword is contained in the normalized text
    for (const kw of keywords) {
      const normalizedKw = normalizeForMatching(kw);
      if (normalized.includes(normalizedKw)) {
        console.log(`[inferTransportTypeFromText] Direct match: "${normalizedKw}" -> ${type}`);
        return type;
      }
    }
    
    // Second: fuzzy match each token
    for (const token of tokens) {
      if (fuzzyMatchKeyword(token, keywords)) {
        console.log(`[inferTransportTypeFromText] Fuzzy match: "${token}" -> ${type}`);
        return type;
      }
    }
  }
  
  return null;
}

// Intent detection for collection progress tracking with scoring system
export type CollectionIntent = {
  type: 'urban_report' | 'transport_report' | 'service_rating' | 'services' | 'audiencias' | 'general' | 'history' | 'occupancy' | 'vereadores' | 'noticias';
  fields: Record<string, unknown>;
  accumulatedFields?: Record<string, unknown>; // All fields collected across conversation
};

export interface DetectionScore {
  type: 'urban_report' | 'transport_report' | 'service_rating' | 'chamber_feedback' | 'services' | 'audiencias' | 'general' | 'history' | 'occupancy' | 'vereadores' | 'noticias';
  score: number;
  fields: Record<string, unknown>;
}

// Tool hint for light journeys (services, audiencias, general, history)
export function getToolHintForIntent(intentType: string): string | null {
  const hints: Record<string, string> = {
    'services': '[TOOL_HINT:find_nearby_services]',
    'audiencias': '[TOOL_HINT:search_audiencias]',
    'general': '[TOOL_HINT:search_knowledge_base]',
    'history': '[TOOL_HINT:get_citizen_history]',
    'occupancy': '[TOOL_HINT:get_service_occupancy_status]',
  };
  return hints[intentType] || null;
}

// Intent keywords - EXPANDED for natural language detection
export const INTENT_KEYWORDS = [
  // === Mensagens dos chips (PromptChips.tsx) - HIGH PRIORITY ===
  'relatar um problema', 'problema na cidade', 'problema no transporte',
  'avaliar um serviço', 'me diz o que está acontecendo', 'qual linha e o que aconteceu',
  'quero relatar um problema', 'problema urbano',
  // Entrada manual ampla (sem "quero fazer") — sem isso detectCollectionIntent retorna null e cai na LLM genérica
  'falar sobre a cidade',
  'abrir um relato',
  'relato na cidade',
  // Incidentes urbanos / segurança (primeira mensagem sem "quero relatar")
  'incêndio',
  'incendio',
  'pegando fogo',
  'em chamas',
  'alagamento',
  'alagando',
  'enchente',
  'chovendo',
  'chuva forte',
  'fios expostos',
  'desabamento',
  'desmoron',
  'atropelamento',
  
  // === Verbos de ação explícitos ===
  'quero reclamar', 'preciso relatar', 'quero reportar', 'aconteceu',
  'tem um problema', 'está com problema', 'não está funcionando',
  'quero avaliar', 'quero elogiar', 'quero denunciar', 'preciso informar',
  'gostaria de registrar', 'vim falar sobre um', 'tenho uma reclamação',
  'quero fazer', 'preciso fazer', 'quero registrar', 'tive um problema',
  'sofri um', 'passei por', 'enfrentei', 'reclamar sobre', 'reclamar do',
  'agradecer', 'parabenizar', 'sugerir', 'dar uma sugestão',
  
  // === Frases naturais sem verbo de ação ===
  'tem um', 'tem uma', 'há um', 'há uma', 'existe um', 'existe uma',
  'tá cheio', 'tá lotado', 'tá quebrado', 'tá apagado', 'tá fedendo',
  'está cheio', 'está lotado', 'está quebrado', 'está apagado', 'está fedendo',
  
  // === Busca de serviços ===
  'onde fica', 'onde tem', 'cadê', 'como chego', 'mais perto', 'perto de mim',
  'perto daqui', 'próximo de mim', 'endereço', 'telefone da', 'horário da',
  
  // === Audiências e eventos ===
  'quando vai ter', 'próxima', 'próximo', 'inscrever', 'participar',
  'audiência', 'audiencia', 'consulta pública', 'como posso buscar', 'buscar audiência', 'buscar audiencia', 'buscar uma audiência',
  
  // === Histórico pessoal ===
  'meu relato', 'minha reclamação', 'meus relatos', 'minhas avaliações',
  'status do meu', 'o que eu fiz', 'minha denúncia',
  
  // === Avaliações curtas ===
  'nota para', 'estrelas para', 'avaliar', 'dar nota',
  
  // === Gatilhos implícitos de problemas urbanos ===
  'buraco', 'poste apagado', 'lixo acumulado', 'esgoto', 'fedor',
  'calçada quebrada', 'árvore caindo', 'bueiro entupido',
  
  // === Gatilhos implícitos de transporte ===
  'ônibus atrasado', 'metrô lotado', 'trem atrasou', 'não passou',
  'motorista rude', 'falta de ônibus',
  
  // === Perguntas informativas / conhecimento (ativam scoring; general pode ganhar e acionar RAG) ===
  'como funciona', 'o que é', 'o que e', 'quem é', 'quem e', 'me explica', 'dúvida sobre', 'duvida sobre',
  'quais são', 'quais sao', 'qual é', 'qual e', 'quais as', 'quais os', 'qual a', 'qual o',
  'atribuições', 'atribuicoes', 'atribuição', 'atribuicao', 'função dos', 'funcao dos', 'papel dos',
  'vereadores', 'vereador', 'vereadora', 'câmara', 'camara', 'municipal', 'legislativo', 'legislatura',
  'informação sobre', 'informacao sobre', 'saber sobre', 'entender sobre', 'conhecer sobre',
  'sessões', 'sessão', 'sessoes', 'sessao', 'audiência', 'audiencia', 'como posso participar', 'como participar',
  'onde fica a', 'endereço da câmara', 'endereco da camara',
  'salário', 'salario', 'remuneração', 'remuneracao', 'quanto ganha', 'valor do vereador', 'ganha um vereador',
  'competências', 'competencias', 'responsabilidades', 'quantos vereadores', 'mandato', 'presidente da câmara',
  'comissões', 'comissoes', 'processo legislativo', 'projeto de lei', 'projetos', 'tramitação', 'tramitacao', 'em tramitação', 'em tramitacao', 'lei municipal', 'lei orgânica', 'lei organica',
  'regimento interno', 'tribuna livre', 'sessão ordinária', 'sessao ordinaria', 'votação', 'votacao', 'quórum', 'quorum',
  'qual vereador', 'vereadore', 'qero saber', 'sabe dos vereadores', 'vereadores de sp',
  'entrar em contato com um vereador', 'entrar em contato com vereador', 'falar com um vereador', 'falar com vereador', 'fala com vereador',
  'principais funções', 'funções de um vereador', 'consultar projetos de lei', 'projetos de lei da câmara', 'projetos de lei da camara',
  'últimas votações', 'ultimas votações', 'votações da câmara', 'votacoes da camara',
  'canal oficial', 'sugestões ou reclamações', 'sugestoes ou reclamacoes', 'sugestões reclamações',
  'papel das comissões', 'comissões dentro da câmara', 'tipos de projetos', 'apresentados por vereadores',
  'acompanhar as atividades dos vereadores', 'acompanhar atividades vereadores',
  'estrutura da Câmara', 'estrutura da camara', 'participar de uma audiência', 'participar de audiencia',
  'processo de votação', 'processo de votacao', 'votação de um PL', 'votacao de um PL',
  'reunião da câmara', 'reuniao da camara', 'reunião da câmara hoje', 'alguma reunião',
  'orçamento', 'orcamento', 'emendas', 'para que serve', 'por que existe', 'quando foi', 'história da câmara',
  'como nasce uma lei', 'o que é uma audiência', 'diferença entre', 'diferenca entre', 'requisitos para ser vereador',
  'cpi', 'cpis', 'comissão parlamentar de inquérito', 'comissao parlamentar de inquerito', 'comissão parlamentar', 'comissao parlamentar',
  // === GeoSampa / Prefeitura SP: equipamentos, transportes, população, sistema viário ===
  'equipamentos públicos', 'equipamentos publicos', 'equipamento público', 'equipamento publico', 'ubs', 'hospital', 'escola', 'ceu ', 'cras', 'posto de saúde', 'unidade de saúde',
  'população', 'populacao', 'habitantes', 'densidade', 'demografia', 'demográfico', 'censo', 'quantos habitantes',
  'sistema viário', 'sistema viario', 'sistema viária', 'via', 'vias', 'infraestrutura viária', 'trânsito', 'transito', 'ciclovia', 'ciclovias', 'malha viária',
  'transporte público', 'transporte publico', 'rede de transporte', 'linhas de ônibus', 'linhas de onibus', 'metrô', 'metro', 'cptm', 'bilhete único', 'bilhete unico',
  'geosampa', 'geo sampa', 'dados da cidade', 'dados de são paulo', 'mapa da cidade', 'melhor ubs', 'qual ubs', 'unidades de saúde',
  // Perguntas genéricas (Não Funcionais: restaurante, shopping, prefeito) → ativam intent para RAG responder "fora do escopo"
  'quem é o', 'quem e o', 'qual é o melhor', 'qual e o melhor', 'que horas',
];

// Extract transport-specific fields - EXPANDED VOCABULARY
export function extractTransportFields(context: string): Record<string, unknown> {
  const fields: Record<string, unknown> = {};
  const today = new Date().toISOString().split('T')[0];
  
  // Detect report_type - EXPANDED vocabulary for robust detection
  if (context.includes('atraso') || context.includes('atrasou') || context.includes('demora') ||
      context.includes('demorou') || context.includes('nao passou') || context.includes('não passou') ||
      context.includes('esperando muito') || context.includes('nunca chega') || context.includes('atrasado')) {
    fields.report_type = 'atraso';
  } else if (context.includes('lotad') || context.includes('chei') || context.includes('superlotad') ||
             context.includes('apertado') || context.includes('nao coube') || context.includes('não coube') ||
             context.includes('sem espaco') || context.includes('sem espaço') || context.includes('lotação')) {
    fields.report_type = 'lotacao';
  } else if (context.includes('seguranca') || context.includes('segurança') || context.includes('assalto') || 
             context.includes('roubo') || context.includes('assedio') || context.includes('assédio') ||
             context.includes('perigo') || context.includes('medo') || context.includes('ameaca') || context.includes('ameaça') ||
             context.includes('briga') || context.includes('agressao') || context.includes('agressão')) {
    fields.report_type = 'seguranca';
  } else if (context.includes('sujo') || context.includes('limpeza') || context.includes('fedendo') ||
             context.includes('fedor') || context.includes('nojento') || context.includes('imundo') ||
             context.includes('lixo') || context.includes('vomito') || context.includes('vômito')) {
    fields.report_type = 'limpeza';
  } else if (context.includes('acessib') || context.includes('cadeirante') || context.includes('elevador') ||
             context.includes('rampa') || context.includes('deficiente') || context.includes('muleta') ||
             context.includes('pcd') || context.includes('mobilidade')) {
    fields.report_type = 'acessibilidade';
  } else if (context.includes('motorista') || context.includes('cobrador') || context.includes('rude') ||
             context.includes('grosso') || context.includes('mal educado') || context.includes('mal-educado') ||
             context.includes('nao parou') || context.includes('não parou') || context.includes('conducao') ||
             context.includes('condução') || context.includes('freada') || context.includes('direcao perigosa') ||
             context.includes('direção perigosa')) {
    fields.report_type = 'conducao';
  }
  
  // Detect line
  const lineMatch = context.match(/linha\s*(\d{3,4}[a-z]?[-/]?\d*)/i);
  if (lineMatch) fields.line_code = lineMatch[1].toUpperCase();
  
  // Detect date - mark as confirmed when explicitly mentioned
  if (context.includes('hoje') || context.includes('agora') || context.includes('acabou de')) {
    fields.occurrence_date = today;
    fields.date_confirmed = true;
  } else if (context.includes('ontem')) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    fields.occurrence_date = yesterday.toISOString().split('T')[0];
    fields.date_confirmed = true;
  }
  
  // Detect time
  const parsedTime = parseFlexibleOccurrenceTime(context);
  if (parsedTime) {
    fields.occurrence_time = parsedTime;
  } else if (context.includes('manhã') || context.includes('cedo')) {
    fields.occurrence_time = '08:00';
  } else if (context.includes('tarde')) {
    fields.occurrence_time = '14:00';
  } else if (context.includes('noite')) {
    fields.occurrence_time = '19:00';
  }

  // Detect direction
  if (/\bida\b/.test(context)) {
    fields.direction = 'ida';
  } else if (/\bvolta\b/.test(context)) {
    fields.direction = 'volta';
  } else if (/\bcircular\b/.test(context)) {
    fields.direction = 'circular';
  }
  
  // Detect severity
  if (context.includes('gravíssim') || context.includes('acidente') || context.includes('agressão') || context.includes('ferido')) {
    fields.severity = 'critica';
  } else if (context.includes('muito atraso') || context.includes('mais de 30') || context.includes('horas esperando')) {
    fields.severity = 'alta';
  } else if (context.includes('20 minutos') || context.includes('meia hora') || context.includes('bastante')) {
    fields.severity = 'media';
  } else if (context.includes('desconfortável') || context.includes('chato') || context.includes('incômodo')) {
    fields.severity = 'baixa';
  }
  
  return fields;
}

/** Verifica se o nome da cidade corresponde ao município de São Paulo (capital). */
export function isCitySaoPaulo(city: string | undefined | null): boolean {
  if (!city || typeof city !== 'string') return false;
  const normalized = city.trim().toLowerCase().normalize('NFD').replace(/\u0307/g, '').replace(/[\u0300-\u036f]/g, '');
  return normalized === 'sao paulo' || normalized === 'são paulo';
}

/** Mensagem amigável quando endereço/CEP está fora do município de São Paulo (usado em relatos). */
export const MESSAGE_OUTSIDE_SAO_PAULO = (
  cityName?: string
) => cityName
  ? `Entendemos que o endereço informado é na **${cityName}**. No entanto, este canal é exclusivo para atendimentos realizados na cidade de São Paulo.\n\nVocê teria algum outro relato ou solicitação referente à cidade de São Paulo para que possamos ajudar?`
  : `Entendemos que o endereço informado fica fora da nossa área de atuação. No entanto, este canal é exclusivo para atendimentos realizados na cidade de São Paulo.\n\nVocê teria algum outro relato ou solicitação referente à cidade de São Paulo para que possamos ajudar?`;

// Lookup CEP via ViaCEP API
export async function lookupCEP(cep: string): Promise<{
  valid: boolean;
  street?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
}> {
  const cleanCEP = cep.replace(/\D/g, '');
  if (cleanCEP.length !== 8) {
    return { valid: false };
  }
  
  try {
    const response = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`);
    const data = await response.json();
    
    if (data.erro) {
      return { valid: false };
    }
    
    return {
      valid: true,
      street: data.logradouro || '',
      neighborhood: data.bairro || '',
      city: data.localidade || '',
      state: data.uf || ''
    };
  } catch (error) {
    console.error('[lookupCEP] Error:', error);
    return { valid: false };
  }
}

/** Geocode endereço (rua, bairro, CEP, cidade) para lat/lon via Nominatim (OSM). Usado para buscar serviços próximos quando não há GPS nem lat/lon no endereço cadastrado. */
export async function geocodeAddressToCoord(addressParts: {
  street?: string | null;
  street_number?: string | null;
  neighborhood?: string | null;
  cep?: string | null;
  city?: string | null;
}): Promise<{ lat: number; lon: number } | null> {
  const city = addressParts.city || 'São Paulo';
  const runQuery = async (query: string): Promise<{ lat: number; lon: number } | null> => {
    if (!query || query.length < 5) return null;
    const url = `https://nominatim.openstreetmap.org/search?${new URLSearchParams({
      q: query,
      format: 'json',
      limit: '1',
      countrycodes: 'br',
    })}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'CamaraNaMao-SP/1.0 (participacao@camara.sp.gov.br)' },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    const lat = Number(data[0].lat);
    const lon = Number(data[0].lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    return { lat, lon };
  };

  const parts: string[] = [];
  if (addressParts.street) {
    parts.push(addressParts.street_number ? `${addressParts.street}, ${addressParts.street_number}` : addressParts.street);
  }
  if (addressParts.neighborhood) parts.push(addressParts.neighborhood);
  if (addressParts.cep) parts.push(addressParts.cep.replace(/\D/g, '').replace(/(\d{5})(\d{3})/, '$1-$2'));
  parts.push(city, 'Brazil');
  const fullQuery = parts.filter(Boolean).join(', ');
  try {
    let result = await runQuery(fullQuery);
    if (result) return result;
    // Fallback: sem número (rua + bairro + cidade) — Nominatim às vezes falha com número
    if (addressParts.street_number && addressParts.street) {
      const fallbackParts = [addressParts.street, addressParts.neighborhood, city, 'Brazil'].filter(Boolean);
      result = await runQuery(fallbackParts.join(', '));
    }
    return result;
  } catch (e) {
    console.error('[geocodeAddressToCoord] Error:', e);
    return null;
  }
}

/** Geocode endereço usando Google Places (autocomplete + details), igual ao módulo e ao picker. Usado quando precisamos do mesmo ponto que o frontend (ex.: endereço cadastrado sem lat/lon). */
export async function geocodeAddressWithGoogle(
  supabase: SupabaseClient,
  addressParts: {
    street?: string | null;
    street_number?: string | null;
    neighborhood?: string | null;
    cep?: string | null;
    city?: string | null;
  }
): Promise<{ lat: number; lon: number } | null> {
  const city = addressParts.city || 'São Paulo';
  const parts: string[] = [];
  if (addressParts.street) {
    parts.push(addressParts.street_number ? `${addressParts.street}, ${addressParts.street_number}` : addressParts.street);
  }
  if (addressParts.neighborhood) parts.push(addressParts.neighborhood);
  if (addressParts.cep) parts.push(String(addressParts.cep).replace(/\D/g, '').replace(/(\d{5})(\d{3})/, '$1-$2'));
  parts.push(city, 'Brasil');
  const query = parts.filter(Boolean).join(', ');
  if (!query || query.length < 5) return null;
  try {
    const { data: autocompleteData, error: autocompleteError } = await supabase.functions.invoke<{
      predictions?: Array<{ placeId?: string }>;
      error?: string;
    }>('google-places-autocomplete', { body: { query } });
    if (autocompleteError || !autocompleteData?.predictions?.length) {
      if (autocompleteError) console.warn('[geocodeAddressWithGoogle] Autocomplete error:', autocompleteError);
      return null;
    }
    const placeId = autocompleteData.predictions[0].placeId;
    if (!placeId) return null;
    const { data: detailsData, error: detailsError } = await supabase.functions.invoke<{
      address?: { latitude?: number; longitude?: number };
      error?: string;
    }>('google-places-details', { body: { placeId } });
    if (detailsError || !detailsData?.address) {
      if (detailsError) console.warn('[geocodeAddressWithGoogle] Details error:', detailsError);
      return null;
    }
    const lat = Number(detailsData.address.latitude);
    const lon = Number(detailsData.address.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    return { lat, lon };
  } catch (e) {
    console.error('[geocodeAddressWithGoogle] Error:', e);
    return null;
  }
}

/** Linha retornada por `nearest_urban_reports_by_distance` (relatos próximos no chat). */
export type NearestUrbanReportRow = {
  id: string;
  protocol_code: string | null;
  category: string;
  subcategory: string | null;
  description: string | null;
  location_address: string | null;
  neighborhood: string | null;
  severity: string | null;
  created_at: string;
  distance_meters: number;
};

/** Coordenadas para busca de relatos similares: GPS do fluxo ou geocodificação do endereço coletado. */
export async function resolveUrbanCoordsForSimilarSearch(
  supabase: SupabaseClient,
  fields: Record<string, unknown>,
): Promise<{ lat: number; lon: number } | null> {
  const ula = fields.user_lat != null ? Number(fields.user_lat) : NaN;
  const ulo = fields.user_lon != null ? Number(fields.user_lon) : NaN;
  if (Number.isFinite(ula) && Number.isFinite(ulo)) {
    return { lat: ula, lon: ulo };
  }
  const addr = {
    street: (fields.street as string) || null,
    street_number: (fields.street_number as string) || null,
    neighborhood: (fields.neighborhood as string) || null,
    cep: (fields.cep as string) || null,
    city: (fields.city as string) || null,
  };
  if (!addr.street && !addr.neighborhood && !addr.cep) return null;
  const g = await geocodeAddressWithGoogle(supabase, addr);
  if (g) return g;
  return geocodeAddressToCoord(addr);
}

/** K relatos mais próximos (mesma categoria), ordenados por distância. */
export async function fetchNearestUrbanReportsForSimilarity(
  supabase: SupabaseClient,
  lat: number,
  lon: number,
  category: string,
  excludeUserId: string | undefined,
  limit = 10,
): Promise<NearestUrbanReportRow[]> {
  const { data, error } = await supabase.rpc('nearest_urban_reports_by_distance', {
    p_lat: lat,
    p_lng: lon,
    p_category: category,
    p_exclude_user_id: excludeUserId ?? null,
    p_limit: limit,
  });
  if (error) {
    console.error('[fetchNearestUrbanReportsForSimilarity]', error);
    return [];
  }
  return (data || []) as NearestUrbanReportRow[];
}

/** Monta linha curta a partir do objeto address do Nominatim (reverse). */
function formatNominatimReverseAddress(addr: Record<string, string | undefined> | undefined): string | null {
  if (!addr) return null;
  const road = addr.road || addr.pedestrian || addr.path || addr.residential;
  const num = addr.house_number;
  const suburb = addr.suburb || addr.neighbourhood || addr.city_district || addr.quarter;
  if (road && suburb) {
    return num ? `${road}, ${num} - ${suburb}` : `${road} - ${suburb}`;
  }
  if (road) return num ? `${road}, ${num}` : road;
  return null;
}

/**
 * GPS → endereço legível para o cidadão no chat (ex.: "Rua Augusta, 1200 - Consolação").
 * Tenta Google Geocoding API se GOOGLE_MAPS_API_KEY existir; senão Nominatim (OSM).
 */
export async function reverseGeocodeLatLon(lat: number, lon: number): Promise<string | null> {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  const key = Deno.env.get('GOOGLE_MAPS_API_KEY')?.trim();
  if (key) {
    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lon}&key=${key}&language=pt-BR`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.status === 'OK' && data.results?.[0]?.formatted_address) {
        return String(data.results[0].formatted_address).trim();
      }
      if (data.status && data.status !== 'ZERO_RESULTS') {
        console.warn('[reverseGeocodeLatLon] Google:', data.status, data.error_message ?? '');
      }
    } catch (e) {
      console.warn('[reverseGeocodeLatLon] Google request failed:', e);
    }
  }
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?${new URLSearchParams({
      lat: String(lat),
      lon: String(lon),
      format: 'json',
      'accept-language': 'pt-BR',
    })}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'CamaraNaMao-SP/1.0 (participacao@camara.sp.gov.br)' },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const fromAddr = formatNominatimReverseAddress(data.address);
    if (fromAddr) return fromAddr;
    const dn = typeof data.display_name === 'string' ? data.display_name.trim() : '';
    if (dn) {
      const parts = dn.split(',').map((p: string) => p.trim()).filter(Boolean);
      return parts.slice(0, 4).join(', ') || dn;
    }
  } catch (e) {
    console.warn('[reverseGeocodeLatLon] Nominatim failed:', e);
  }
  return null;
}

// Valid categories for urban reports (source of truth) — escopo OS (Obras e Serviços)
export const VALID_URBAN_CATEGORIES = [
  'iluminacao', 'calcada', 'via_publica', 'pavimentacao', 'sinalizacao', 'drenagem', 'lixo', 'esgoto',
  'area_verde', 'higiene_urbana', 'animais', 'poluicao', 'feedback_camara', 'outro'
] as const;

/**
 * Categorias urbanas com coleta obrigatória de risco/gravidade (criticidade).
 * Exclui só feedback_camara. Manter alinhado a `URBAN_RISK_COLLECTION_CATEGORIES` em src/lib/reportFieldConfig.ts
 */
export const URBAN_RISK_COLLECTION_CATEGORIES: readonly string[] = [
  'via_publica',
  'pavimentacao',
  'iluminacao',
  'esgoto',
  'area_verde',
  'calcada',
  'sinalizacao',
  'drenagem',
  'poluicao',
  'lixo',
  'higiene_urbana',
  'animais',
  'outro',
];

/** Natureza conversacional do relato (PO: elogio e sugestão explícitos, além de reclamação e dúvida). */
export const URBAN_REPORT_NATURE_VALUES = ['reclamacao', 'duvida', 'sugestao', 'elogio'] as const;
export type UrbanReportNature = (typeof URBAN_REPORT_NATURE_VALUES)[number];

export const REPORT_NATURE_LABELS: Record<UrbanReportNature, string> = {
  reclamacao: 'Reclamação',
  duvida: 'Dúvida',
  sugestao: 'Sugestão',
  elogio: 'Elogio',
};

/** Rótulos para o resumo “Resumo do relato” no chat (revisão antes de confirmar). */
const URBAN_PREVIEW_RISK_LEVEL_LABELS: Record<string, string> = {
  critical: 'Crítico',
  moderate: 'Moderado',
  low: 'Baixo',
  none: 'Nenhum',
};

const URBAN_PREVIEW_AFFECTED_SCOPE_LABELS: Record<string, string> = {
  individual: 'Individual',
  local: 'Local (rua/quadra)',
  street: 'Toda a rua',
  neighborhood: 'Bairro',
  regional: 'Regional (bairro)',
  citywide: 'Cidade toda',
};

/** Tipos de risco (códigos internos) → português no preview do chat */
const URBAN_PREVIEW_RISK_TYPE_LABELS: Record<string, string> = {
  electrical: 'Elétrico',
  traffic: 'Trânsito',
  flooding: 'Alagamento',
  structural: 'Estrutural',
  health: 'Saúde',
  fire: 'Incêndio',
  pedestrian: 'Pedestre',
  vehicle: 'Veicular',
  environmental: 'Ambiental',
};

/** Linha opcional após **Categoria:** (subcategoria / rótulo técnico). */
export function formatUrbanReportPreviewAfterCategory(fields: Record<string, unknown>): string {
  const sub = fields.subcategory;
  if (sub == null || String(sub).trim() === '') return '';
  return `\n• **Tipo / detalhe:** ${String(sub).trim()}`;
}

/** Bloco opcional após **Descrição:** — criticidade, tipos de risco, afetação, CEP. */
export function formatUrbanReportPreviewAfterDescription(fields: Record<string, unknown>): string {
  const chunks: string[] = [];
  const rl = fields.risk_level;
  if (rl != null && String(rl).trim() !== '') {
    const key = String(rl).toLowerCase();
    const label = URBAN_PREVIEW_RISK_LEVEL_LABELS[key] ?? String(rl);
    chunks.push(`• **Gravidade:** ${label}`);
  }
  const rt = fields.risk_types;
  if (Array.isArray(rt) && rt.length > 0) {
    const joined = rt
      .map((x) => {
        const k = String(x).trim().toLowerCase();
        return URBAN_PREVIEW_RISK_TYPE_LABELS[k] ?? String(x).trim();
      })
      .filter(Boolean)
      .join(', ');
    if (joined) chunks.push(`• **Tipos de risco:** ${joined}`);
  }
  const af = fields.affected_scope;
  if (af != null && String(af).trim() !== '') {
    const key = String(af).toLowerCase();
    const label = URBAN_PREVIEW_AFFECTED_SCOPE_LABELS[key] ?? String(af);
    chunks.push(`• **Afetação:** ${label}`);
  }
  const cep = fields.cep;
  if (cep != null && String(cep).trim() !== '') {
    chunks.push(`• **CEP:** ${String(cep).trim()}`);
  }
  return chunks.length ? `\n${chunks.join('\n')}` : '';
}

export function normalizeReportNature(raw: string | undefined | null): UrbanReportNature | null {
  if (raw == null || String(raw).trim() === '') return null;
  const s = String(raw).trim().toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
  if (/^reclam/.test(s) || s === 'reclamacao') return 'reclamacao';
  if (/^duvid/.test(s) || s === 'duvida') return 'duvida';
  if (/^sugest/.test(s) || s === 'sugestao') return 'sugestao';
  if (/^elog/.test(s) || s === 'elogio') return 'elogio';
  return null;
}

/**
 * Resposta só com a natureza (chip/botão: reclamação, dúvida…), sem narrar o fato.
 * Não pode ser tratada como `description` — senão o fluxo pula "o que aconteceu".
 */
export function isBareUrbanReportNatureReply(text: string): boolean {
  const t = text.trim().replace(/\.+$/g, '').trim();
  if (!t || t.length > 28) return false;
  if (/\s/.test(t)) return false;
  return normalizeReportNature(t) !== null;
}

/** Relato que descreve fato grave na cidade — atalho para entrar no fluxo urbano até "como informar o local". */
const URBAN_INCIDENT_STARTER_PATTERNS: RegExp[] = [
  /inc[eê]ndio|incendio|pegando\s*fogo|em\s*chamas|queimando/i,
  /alagando|alagada|alagado|alagamento|rua\s+alag|enchente|inundando|inundada|inundado|inundou|água\s*subindo|agua\s*subindo|chovendo\s*(muito\s*)?(forte|pesad)|chuva\s*(muito\s*)?(forte|pesad)/i,
  /fios?\s*expostos|cabos?\s*soltos|choque\s*el[eé]tric/i,
  /explos[aã]o|transformador/i,
  /desabamento|desmoron|risco\s*de\s*desab/i,
  /acidente|atropelamento/i,
  /armado|tirote|viol[eê]ncia|tr[aá]fico\s*de\s*droga|drogas?\s*na\s*rua/i,
];

export function messageLooksLikeUrbanIncidentStarter(text: string): boolean {
  const t = text.trim();
  if (t.length < 8) return false;
  return URBAN_INCIDENT_STARTER_PATTERNS.some((p) => p.test(t));
}

// State to track if category has been classified via AI for current conversation
export const classifiedCategories = new Map<string, { category: string; confidence: number; user_confirmed: boolean }>();

// Extract urban report-specific fields - SIMPLIFIED: NO category inference, NO location extraction
// Category is now EXCLUSIVELY determined by classify_report_category tool (AI classification)
export function extractUrbanFields(context: string): Record<string, unknown> {
  const fields: Record<string, unknown> = {};
  
  // REMOVED: All category inference logic - now handled by classify_report_category tool
  // The AI model will classify the category and call the tool explicitly
  
  // Only detect CEP pattern (structural data, not semantic)
  const cepMatch = context.match(/\b(\d{5}[-]?\d{3})\b/);
  if (cepMatch) {
    fields.cep = cepMatch[1].replace('-', '');
  }
  
  return fields;
}

// Normalize text by removing Markdown formatting for reliable string matching
export function normalizeTextForMatching(text: string): string {
  return text
    .replace(/\*\*/g, '') // Remove bold markers
    .replace(/_/g, '')    // Remove italic markers
    .replace(/\n+/g, ' ') // Replace newlines with spaces
    .replace(/\s+/g, ' ') // Collapse multiple spaces
    .toLowerCase()
    .trim();
}

// Check if text is a generic intent phrase (not a real description)
// SEMANTIC INTERPRETATION: Only filter explicit generic phrases, NOT short messages
export function isGenericIntentText(text: string): boolean {
  const genericPhrases = [
    // Generic report intents (not descriptions)
    /^quero\s*(relatar|reportar|fazer|registrar)/i,
    /^preciso\s*(relatar|reportar|fazer|registrar)/i,
    /^tenho\s*um\s*(problema|relato)/i,
    /^problema\s*(na|no)\s*(cidade|bairro|rua)/i,
    /^relatar\s*(um\s*)?problema/i,
    /^fazer\s*(um\s*)?(relato|denuncia)/i,
    /^quero\s*avaliar/i,
    /^avaliar\s*(um\s*)?servi[çc]o/i,
    /^(sim|não|nao|ok|pode|quero|desejo|aceito)$/i,
    // Transport generic intents - NOT actual descriptions
    /^quero\s*(denunciar|relatar|reportar)\s*(um\s*)?(problema|issue)/i,
    /^problema\s*(de|no|com)\s*transporte/i,
    /^relatar.*transporte/i,
    
    // === JOURNEY SWITCH PHRASES (must NOT be treated as descriptions) ===
    // These trigger journey switching via detect_user_intent
    /quero\s*falar\s*(de|do|sobre)\s*(transporte|avalia[çc][ãa]o|servi[çc]o|urbano|cidade)/i,
    // "sobre a cidade" (artigo) — chip/manual; sem isso vira description falsa e pula o relato
    /^quero\s+falar\s+sobre\s+a\s+cidade\b/i,
    /^preciso\s+falar\s+sobre\s+a\s+cidade\b/i,
    /^quero\s+falar\s+da\s+cidade\b/i,
    /^preciso\s+falar\s+da\s+cidade\b/i,
    /\bquero\s+falar\s+sobre\s+a\s+cidade\s*[—–-]\s*pode\s+ser\b/i,
    /falar\s*(de|do|sobre)\s*(transporte|avalia[çc][ãa]o|servi[çc]o|urbano|cidade)/i,
    /mudar\s*para\s*(transporte|avalia[çc][ãa]o|servi[çc]o|urbano|relato)/i,
    /trocar\s*para\s*(transporte|avalia[çc][ãa]o|servi[çc]o|urbano|relato)/i,
    /quero\s*(avaliar|relatar|reportar)\s*(um\s*)?(servi[çc]o|problema|transporte)/i,
    /na\s*verdade,?\s*(quero|preciso|gostaria)/i,
    /mudando\s*de\s*assunto/i,
    /outro\s*assunto/i,
    
    // === SERVICE SEARCH PHRASES (trigger service discovery journey) ===
    /quero\s*(encontrar|buscar|achar|procurar)\s*(um\s*)?(servi[çc]o|ubs|escola|hospital|ceu)/i,
    /encontrar\s*(um\s*)?(servi[çc]o|ubs|escola|hospital|ceu)/i,
    /buscar\s*(um\s*)?(servi[çc]o|ubs|escola|hospital|ceu)/i,
    /procurar\s*(um\s*)?(servi[çc]o|ubs|escola|hospital|ceu)/i,
    /onde\s*(fica|tem|posso\s*encontrar)\s*(um\s*)?(ubs|escola|hospital|posto|ceu)/i,
    /servi[çc]os?\s*(perto|pr[óo]ximo|perto\s*de\s*mim)/i,
    
    // === LEARNING/KNOWLEDGE PHRASES (trigger knowledge base search) ===
    /tenho\s*(uma?\s*)?(d[úu]vida|pergunta|quest[ãa]o)\s*(sobre)?/i,
    /d[úu]vida\s*(sobre|da|do)\s*(c[âa]mara|legislativo|vereador)/i,
    /como\s+funciona\s+(a\s+)?(c[âa]mara|legislativo|vota[çc][ãa]o)/i,
    /o\s+que\s+[ée]\s+(uma?\s+)?(audi[êe]ncia|projeto|lei|comiss[ãa]o)/i,
    /quem\s+[ée]\s+o\s*(vereador|presidente)/i,
    /me\s+explica\s+(como|o\s+que)/i,
    /informa[çc][ãa]o\s+sobre/i,
    /quero\s+(saber|entender|aprender)/i,
    
    // === NEWS PHRASES (trigger news search) ===
    /quais?\s*(as|a)?\s*([úu]ltimas?\s*)?not[íi]cias/i,
    /not[íi]cias\s*(da|do|sobre)\s*(c[âa]mara|legislativo|vereador)/i,
    /novidades\s*(da|do)\s*(c[âa]mara|legislativo)/i,
    /o\s+que\s+est[áa]\s+acontecendo\s+(na|no)\s*(c[âa]mara|legislativo)/i,
  ];
  
  const normalized = text.trim().toLowerCase();
  
  // REMOVED: Character count check - the LLM handles semantic interpretation
  // Short descriptive words like "Poste", "Buraco", "Lixo" are valid descriptions
  
  // Only filter explicit generic patterns (intent phrases, confirmations, journey switches)
  if (genericPhrases.some(pattern => pattern.test(normalized))) return true;
  
  return false;
}

// Transport keywords for semantic detection
export const TRANSPORT_KEYWORDS = [
  'atraso', 'atrasado', 'atrasou', 'demora', 'demorou', 'esperando', 'nunca chega', 'não passou', 'nao passou',
  'lotado', 'lotação', 'lotacao', 'cheio', 'superlotado', 'apertado', 'sem espaço', 'sem espaco', 'não coube', 'nao coube',
  'segurança', 'seguranca', 'assalto', 'roubo', 'assédio', 'assedio', 'perigo', 'medo', 'ameaça', 'briga', 'agressão', 'agressao',
  'sujo', 'sujeira', 'limpeza', 'fedendo', 'fedor', 'nojento', 'imundo', 'lixo', 'vômito', 'vomito',
  'acessibilidade', 'cadeirante', 'elevador', 'rampa', 'deficiente', 'muleta', 'pcd', 'mobilidade',
  'motorista', 'cobrador', 'rude', 'grosso', 'mal educado', 'não parou', 'nao parou', 'condução', 'conducao', 'freada', 'perigoso',
  'ônibus', 'onibus', 'metrô', 'metro', 'trem', 'linha', 'estação', 'estacao', 'ponto', 'terminal'
];

// Check if text contains transport-specific keywords (for flexible validation)
export function hasTransportKeywords(text: string): boolean {
  const lower = text.toLowerCase();
  return TRANSPORT_KEYWORDS.some(kw => lower.includes(kw));
}

// Heuristic auto-classification of urban category from description
// Returns category, confidence, AND a suggested intuitive label for subcategory
export function autoClassifyCategory(description: string): { 
  category: string | null; 
  confidence: number;
  suggestedLabel: string | null;
} {
  const desc = description.toLowerCase();
  
  // Label mapping: more specific patterns → intuitive labels
  const labelPatterns: Array<{ pattern: RegExp; label: string }> = [
    { pattern: /inc[eê]ndio|pegando\s*fogo|em\s*chamas|pr[eé]dio.*(fogo|chamas|inc[eê]ndio)/i, label: 'Incêndio / Fogo' },
    // Poluição: distinguir sonora × ambiental (ordem importa — sonora antes de fumaça/atmosfera)
    {
      pattern:
        /polui[çc][ãa]o\s*(sonora|ac[uú]stica)|polui[çc][ãa]o\s+(causada\s+)?(por|pelo|de)\s*(barulho|som|ru[ií]do|incomod)/i,
      label: 'Perturbação Sonora',
    },
    // Fumaça/chaminé antes de "poluição do ar" no mesmo texto → prioriza atmosférica
    { pattern: /fuma[çc]a|queimada|fumacca|chamin[ée]/, label: 'Poluição Atmosférica' },
    {
      pattern: /polui[çc][ãa]o\s*(atmosf|ambiental|do\s*ar|visual|lumin|h[íi]dric)/i,
      label: 'Poluição Ambiental',
    },
    // Poluição sonora - labels intuitivos
    { pattern: /som\s*alto|m[úu]sica\s*alta|musica\s*alta/, label: 'Perturbação Sonora' },
    { pattern: /bar\s*(barulho|barulhento|som|muito)?|balada|danceteria|boate|casa\s*noturna/, label: 'Estabelecimento Barulhento' },
    { pattern: /festa|evento|show/, label: 'Evento com Barulho' },
    { pattern: /vizinho\s*(barulho|som|incomoda)?/, label: 'Perturbação por Vizinho' },
    { pattern: /obra\s*(barulho|cedo|madrugada|domingo)?/, label: 'Barulho de Obra' },
    { pattern: /buzina|alarme/, label: 'Poluição Sonora' },
    { pattern: /latido|cachorro|cao|cães/, label: 'Barulho de Animais' },
    { pattern: /contamina[çc][ãa]o|qu[ií]mico|t[óo]xico|emiss[aã]o\s+(de\s*)?(g[áa]s|poluente)/i, label: 'Contaminação Ambiental' },
    
    // Outro - labels intuitivos para casos não classificados
    { pattern: /carro\s*abandonad|ve[íi]culo\s*abandonad|moto\s*abandonad/, label: 'Veículo Abandonado' },
    { pattern: /invas[ãa]o|ocupação\s*irregular|invadid/, label: 'Ocupação Irregular' },
    { pattern: /obra\s*(irregular|sem\s*alvara|ilegal)/, label: 'Obra Irregular' },
    { pattern: /com[ée]rcio\s*irregular|ambulante|camelô/, label: 'Comércio Irregular' },
    { pattern: /ponto\s*de\s*drogas|tr[áa]fico/, label: 'Atividade Ilícita' },
    { pattern: /morador\s*de\s*rua|pessoa\s*em\s*situa[çc][ãa]o/, label: 'Questão Social' },
    { pattern: /seguran[çc]a|perigoso|assalto|roubo/, label: 'Questão de Segurança' },
    
    // === ILUMINAÇÃO - padrões expandidos para mensagens curtas ===
    { pattern: /poste\s*(ca[íi]d|quebrad|danificad|torto|pendend|inclinad|pend[êe]nd)/i, label: 'Poste com Problema' },
    { pattern: /poste\s*(apagad|sem\s*luz|escuro)/i, label: 'Poste Apagado' },
    { pattern: /sem\s*luz|falta\s*de?\s*luz|luz\s*apagad/i, label: 'Falta de Iluminação' },
    { pattern: /l[âa]mpada\s*(queimad|apagad|quebrad)/i, label: 'Lâmpada Queimada' },
    { pattern: /escuro|escurid[ãa]o|sem\s*ilumina/i, label: 'Área Escura' },
    
    // === VIA PÚBLICA - padrões expandidos ===
    { pattern: /buraco\s*(grande|enorme|perigoso|gigante|profundo)?/i, label: 'Buraco na Via' },
    { pattern: /asfalto\s*(danificad|quebrad|esburacad|afundad)/i, label: 'Asfalto Danificado' },
    { pattern: /rua\s*(esburacad|quebrad|danificad|afundad)/i, label: 'Rua Danificada' },
    { pattern: /cratera|erosão|desmoron/i, label: 'Erosão/Cratera' },
    { pattern: /sem[áa]foro\s*(quebrad|apagad|com\s*defeito|danificad|não\s*funciona)/i, label: 'Semáforo com Defeito' },
    { pattern: /sinaliza[çc][ãa]o\s*(apagad|quebrad|danificad|suja)/i, label: 'Sinalização Danificada' },
    { pattern: /faixa\s*(apagad|suja)/i, label: 'Faixa de Pedestre Apagada' },
    
    // === ESGOTO/ALAGAMENTO - padrões expandidos ===
    { pattern: /bueiro\s*(entupid|transbordand|aberto|tampa|solto)/i, label: 'Bueiro com Problema' },
    { pattern: /tampa\s*(solt|faltand|aberta|quebrad)/i, label: 'Tampa Solta' },
    { pattern: /alagamento|alagad[oa]|enchente|inundad/i, label: 'Alagamento' },
    { pattern: /vazamento\s*(de\s*[áa]gua)?/i, label: 'Vazamento de Água' },
    { pattern: /esgoto\s*(aberto|vazand|fedend|estoura)/i, label: 'Problema de Esgoto' },
    { pattern: /água\s*(suja|parad|acumulad)/i, label: 'Água Parada' },
    
    // === ÁREA VERDE - padrões expandidos ===
    { pattern: /[áa]rvore\s*(ca[íi]d|caind|risco|pendend|quebrad)/i, label: 'Árvore com Risco' },
    { pattern: /galho\s*(ca[íi]d|quebrad|solto|pendend)/i, label: 'Galho Caído' },
    { pattern: /ra[íi]z\s*(expost|levant|danificand)/i, label: 'Raiz Exposta' },
    { pattern: /mato\s*(alto|crescend)|capim\s*alto/i, label: 'Mato Alto' },
    { pattern: /poda|podand|precisa\s*podar/i, label: 'Necessidade de Poda' },
    
    // === CALÇADA - padrões expandidos ===
    { pattern: /cal[çc]ada\s*(quebrad|danificad|esburacad|irregular)/i, label: 'Calçada Danificada' },
    { pattern: /meio[\s-]?fio\s*(quebrad|danificad|solto)/i, label: 'Meio-fio Danificado' },
    { pattern: /rampa\s*(de\s*acessibilidade)?/i, label: 'Problema de Acessibilidade' },
    
    // === LIXO - padrões expandidos ===
    { pattern: /lixo\s*(acumulad|na\s*rua|jogad|espalh)/i, label: 'Lixo Acumulado' },
    { pattern: /entulho\s*(na\s*rua|jogad)?/i, label: 'Entulho na Via' },
    { pattern: /coleta\s*(atrasad|não\s*passou)/i, label: 'Coleta Atrasada' },
    { pattern: /lixeira\s*(quebrad|chei|transbord)/i, label: 'Lixeira com Problema' },
    
    // === ANIMAIS - padrões expandidos ===
    { pattern: /rato|ratos|ratazana/i, label: 'Infestação de Ratos' },
    { pattern: /barata|baratas/i, label: 'Infestação de Baratas' },
    { pattern: /escorpi[ãa]o|escorpiões/i, label: 'Escorpiões' },
    { pattern: /animal\s*(mort|atropela|abandon)/i, label: 'Animal Morto/Abandonado' },
    { pattern: /inseto|mosquito|pernilongo/i, label: 'Infestação de Insetos' },
    
    // === HIGIENE URBANA - padrões expandidos ===
    { pattern: /fedor|fedend|mau\s*cheiro/i, label: 'Mau Cheiro' },
    { pattern: /urina|fezes|coc[ôo]/i, label: 'Sujeira Orgânica' },
    { pattern: /suj[oa]|imundo|nojent/i, label: 'Local Sujo' },
  ];
  
  // Find the best matching label
  let suggestedLabel: string | null = null;
  for (const lp of labelPatterns) {
    if (lp.pattern.test(desc)) {
      suggestedLabel = lp.label;
      break;
    }
  }
  
  const patterns: Array<{ keywords: RegExp; category: string; weight: number }> = [
    // === INCÊNDIO / FOGO (alta prioridade — categorias oficiais não têm "bombeiros"; fica em "outro" com rótulo claro) ===
    {
      keywords: /inc[eê]ndio|incendio|pegando\s*fogo|em\s*chamas|queimando|pr[eé]dio\s*(abandonad\w*\s*)?(em\s*)?(chamas|fogo|inc[eê]ndio)|fogo\s*(no|na|em)\s*pr[eé]dio/i,
      category: 'outro',
      weight: 9.5,
    },
    // === ESGOTO / ALAGAMENTO (HIGHEST priority) ===
    { keywords: /vazamento|alagamento|alagad[oa]|água\s*na\s*rua|bueiro\s*(entupido|transbordando|aberto|tampa)|esgoto|córrego|valeta|enchente|inundad?[oa]?|transbord/i, category: 'esgoto', weight: 10 },
    
    // === ILUMINAÇÃO (EXPANDED - weight 9 para auto-classificar) ===
    // Padrões curtos como "poste caído" devem classificar com alta confiança
    { keywords: /poste\s*(apagad|sem\s*luz|queimad|ca[íi]d|quebrad|danificad|torto|pendend|inclinad)|luz\s*(apagad|queimad)|ilumina[çc][ãa]o|sem\s*luz|escuro|escurid[ãa]o|l[âa]mpada\s*(queimad|apagad|quebrad)/i, category: 'iluminacao', weight: 9 },
    
    // === POLUIÇÃO SONORA (weight 9) — inclui frase explícita "poluição sonora/acústica" ===
    {
      keywords:
        /polui[çc][ãa]o\s*(sonora|ac[uú]stica)|polui[çc][ãa]o\s+(causada\s+)?(por|pelo|de)\s*(barulho|som|ru[ií]do)|som\s*alto|m[úu]sica\s*alta|musica\s*alta|bar\s*(com\s*)?(som|barulho|barulhento)|balada|danceteria|boate|casa\s*noturna|festa\s*(barulho|vizinho)?|vizinho\s*(barulho|som)|perturba[cç][aã]o\s*sonora|perturbacao\s*sonora|perturba[cç][aã]o\s+ac[uú]stica|madrugada.*barulho|barulho.*madrugada/i,
      category: 'poluicao',
      weight: 9,
    },
    
    // === PAVIMENTAÇÃO (weight 8.6 — OS: recape, capeamento, obras de pavimento; não confundir com só “buraco”) ===
    {
      keywords:
        /pavimenta[çc][ãa]o|pavimentacao|recape|recapeamento|asfaltamento|capeamento|fresagem|cbuq|obra\s*(de\s*)?paviment|requalifica[çc][ãa]o\s*vi[áa]ria|restaura[çc][ãa]o\s*asf[áa]ltica|revestimento\s*asf[áa]ltico/i,
      category: 'pavimentacao',
      weight: 8.6,
    },
    // === SINALIZAÇÃO (weight 8.5 — OS: vertical/horizontal, semáforo, placa, faixa) ===
    {
      keywords:
        /sem[áa]foro|sinaliza[çc][ãa]o\s*(vertical|horizontal)?|faixa\s*(de\s*pedestre|apagad)|placa\s*(de\s*sinal|ca[íi]d|quebrad)?|sinal\s*(quebrad|apagad|piscando)?|demarca[çc][ãa]o|repintura|zebr(?:a)?/i,
      category: 'sinalizacao',
      weight: 8.5,
    },
    // === DRENAGEM (weight 8.5 — OS: águas pluviais, sarjeta, galeria, bueiro de chuva) ===
    {
      keywords:
        /drenagem|água\s*pluvial|agua\s*pluvial|pluvial|galeria\s*(de\s*águas|pluvial)?|sarjeta|bueiro\s*pluvial|bueiro\s*de\s*chuva|água\s*da\s*chuva|agua\s*da\s*chuva|chuva\s*acumulad|poça\s*permanente|encharcad[oa]\s*pela\s*chuva/i,
      category: 'drenagem',
      weight: 8.5,
    },
    // === VIA PÚBLICA (weight 8 — buraco, erosão, lombada; pavimentação explícita → pavimentacao) ===
    { keywords: /buraco|asfalto\s*(danificad|quebrad|esburacad)?|rua\s*(esburacad|quebrad)|cratera|eros[ãa]o|desmoron|lombada|via\s*p[úu]blica/i, category: 'via_publica', weight: 8 },
    
    // === ÁREA VERDE (EXPANDED - weight 8) ===
    { keywords: /[áa]rvore\s*(ca[íi]d|caind|risco|pendend|quebrad)?|galho\s*(ca[íi]d|quebrad|solto)|poda|ra[íi]z\s*(expost|levant)|pra[çc]a|parque|jardim|mato\s*(alto|crescend)|capim\s*alto|vegeta[çc][ãa]o/i, category: 'area_verde', weight: 8 },
    
    // === CALÇADA (EXPANDED) ===
    { keywords: /cal[çc]ada\s*(quebrad|danificad|esburacad)?|passeio\s*p[úu]blic|meio[\s-]?fio|guia|rampa\s*(de\s*acessibilidade)?/i, category: 'calcada', weight: 8 },
    
    // === ANIMAIS (weight 8) ===
    { keywords: /rato|ratazana|barata|inseto|mosquito|pernilongo|bicho\s*mort|animal\s*(mort|atropelad|abandon)|pombo|infesta[çc][ãa]o|escorpi[ãa]o|cobra/i, category: 'animais', weight: 8 },
    
    // === LIXO / ENTULHO ===
    { keywords: /lixo\s*(acumulad|na\s*rua|jogad)?|entulho|descarte|coleta\s*(atrasad)?|cata|sujeira|res[ií]duo|lata\s*de\s*lixo|container|ca[çc]amba|lixeira\s*(chei|quebrad|transbord)/i, category: 'lixo', weight: 7 },
    
    // === HIGIENE URBANA ===
    { keywords: /fedor|mau\s*cheiro|fedend|podre|urina|fezes|coc[ôo]|defeca[çc][ãa]o|suj[oa]|imundo|nojent/i, category: 'higiene_urbana', weight: 7 },
    
    // === POLUIÇÃO AMBIENTAL / ATMOSFÉRICA / QUÍMICA (NÃO usar só "poluição" — evita confundir com sonora) ===
    {
      keywords:
        /fuma[çc]a|queimada|chamin[ée]|polui[çc][ãa]o\s+(atmosf|ambiental|do\s*ar|visual|lumin|h[íi]dric|t[ée]rmic)|polui[çc][ãa]o\s+(do|no|na)\s+(ar|c[ée]u|rio|r[ií]os)|contamina[çc][ãa]o|res[ií]duo\s+(qu[ií]mico|industrial)|emiss[aã]o\s+(de\s*)?(g[áa]s|poluente)|t[óo]xico|qu[íi]mico\s+(no|na|no\s*ar)/i,
      category: 'poluicao',
      weight: 7,
    },

    // === POLUIÇÃO SONORA GENÉRICA (barulho, ruído — mesmo peso que ambiental para desempate por sub-label) ===
    {
      keywords:
        /barulho|barulhent|ru[íi]do|buzina|alarme|latido|bagun[çc]a|obra\s*(barulho|cedo)?|incomod.*(som|barulho|ru[ií]do)|perturba[cç][aã]o(\s+do\s+sossego)?/i,
      category: 'poluicao',
      weight: 7,
    },

    // "Poluição" vaga (sem qualificar) — categoria poluição com confiança menor; preferir que o cidadão detalhe ou a IA refine
    { keywords: /\bpolui[çc][ãa]o\b/i, category: 'poluicao', weight: 5 },
    
    // === FEEDBACK CÂMARA ===
    { keywords: /vereador|c[âa]mara\s*municipal|legislativo|projeto\s*de\s*lei/i, category: 'feedback_camara', weight: 5 },
    
    // === FALLBACK: Catch-all - LOW priority ===
    { keywords: /problema|situa[çc][ãa]o|reclamar|reclama[çc][ãa]o|denunciar|den[úu]ncia|irregular|ilegal|abandonad|invad|invaz|invasão/i, category: 'outro', weight: 2 },
  ];
  
  let bestMatch: { category: string; score: number } | null = null;
  
  for (const pattern of patterns) {
    const match = desc.match(pattern.keywords);
    if (match) {
      const score = pattern.weight;
      if (!bestMatch || score > bestMatch.score) {
        bestMatch = { category: pattern.category, score };
      }
    }
  }
  
  if (bestMatch) {
    // Confidence based on score (max is 10)
    const confidence = Math.min(bestMatch.score / 10, 1);
    return { category: bestMatch.category, confidence, suggestedLabel };
  }
  
  return { category: null, confidence: 0, suggestedLabel };
}

// --- Feedback loop: matching descrição ↔ trecho salvo (admin / N8N) ---

const FEEDBACK_MATCH_STOPWORDS = new Set([
  'o', 'a', 'os', 'as', 'um', 'uma', 'de', 'da', 'do', 'das', 'dos', 'em', 'na', 'no', 'nas', 'nos',
  'que', 'e', 'é', 'para', 'com', 'por', 'como', 'mas', 'foi', 'ser', 'tem', 'se', 'ao', 'aos', 'à', 'às',
  'não', 'nao', 'mais', 'muito', 'muita', 'já', 'ja', 'está', 'esta', 'estão', 'estao', 'são', 'sao', 'ou',
]);

/** Tokens significativos para similaridade (feedback loop). */
export function tokenSetForFeedbackMatch(text: string): Set<string> {
  const raw = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !FEEDBACK_MATCH_STOPWORDS.has(w));
  return new Set(raw);
}

function jaccardTokenSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const t of a) {
    if (b.has(t)) inter++;
  }
  const union = a.size + b.size - inter;
  return union > 0 ? inter / union : 0;
}

/**
 * Indica se a descrição atual é suficientemente parecida com o trecho armazenado na correção.
 * Evita depender só de `includes(excerpt)` com 500 chars (quase nunca casa).
 */
export function descriptionMatchesFeedbackExcerpt(description: string, excerpt: string): boolean {
  const ex = excerpt.trim();
  const desc = description.trim();
  if (ex.length < 8 || desc.length < 5) return false;
  const dLower = desc.toLowerCase();
  const eLower = ex.toLowerCase();
  // Trecho curto e característico contido na descrição
  if (eLower.length >= 10 && eLower.length <= 160 && dLower.includes(eLower)) return true;
  // Prefixo comum (admin/N8N costumam salvar o início da descrição)
  const prefixLen = Math.min(100, ex.length, desc.length);
  if (prefixLen >= 20 && dLower.slice(0, prefixLen) === eLower.slice(0, prefixLen)) return true;
  // Similaridade lexical (descrições com mesmas palavras-chave, ordem diferente)
  const sim = jaccardTokenSimilarity(tokenSetForFeedbackMatch(desc), tokenSetForFeedbackMatch(ex));
  return sim >= 0.28;
}

/** Feedback loop: retorna categoria/subcategoria sugerida a partir de correções anteriores (descrição similar). */
export async function getClassificationFromFeedback(
  supabase: SupabaseClient,
  description: string,
  reportType: 'urban' | 'transport'
): Promise<{ category: string; subcategory: string | null } | null> {
  if (!description || description.trim().length < 5) return null;
  const { data: rows } = await supabase
    .from('report_classification_feedback')
    .select('description_excerpt, corrected_category, corrected_subcategory')
    .eq('report_type', reportType)
    .not('description_excerpt', 'is', null)
    .order('created_at', { ascending: false })
    .limit(500);
  if (!rows?.length) return null;
  for (const row of rows) {
    const excerpt = (row.description_excerpt || '').trim();
    if (excerpt.length < 8) continue;
    if (descriptionMatchesFeedbackExcerpt(description, excerpt)) {
      return {
        category: row.corrected_category,
        subcategory: row.corrected_subcategory ?? null
      };
    }
  }
  return null;
}

/** Valores de `report_classification_prediction_log.classification_source` (métricas de acurácia). */
export const CLASSIFICATION_PREDICTION_SOURCES = [
  'feedback_loop',
  'urgent_pattern',
  'auto_heuristic',
  'fallback_outro',
  'user_recovery',
  'fuzzy_text',
  'keyword_extract',
  'manual_form',
  'unknown',
] as const;
export type ClassificationPredictionSource = (typeof CLASSIFICATION_PREDICTION_SOURCES)[number];

/** Infere a origem da categoria urbana a partir dos flags da coleta determinística. */
export function inferUrbanClassificationSource(
  accumulated: Record<string, unknown> | undefined
): ClassificationPredictionSource {
  const acc = accumulated || {};
  if (acc._from_feedback === true) return 'feedback_loop';
  if (acc._urgent_content === true) return 'urgent_pattern';
  if (acc._fallback_category === true) return 'user_recovery';
  if (acc._auto_classified === true) return 'auto_heuristic';
  return 'unknown';
}

/** Infere a origem do tipo de relato de transporte (feedback, fuzzy, keywords, fallback). */
export function inferTransportClassificationSource(
  accumulated: Record<string, unknown> | undefined
): ClassificationPredictionSource {
  const acc = accumulated || {};
  if (acc._from_classification_feedback === true) return 'feedback_loop';
  const route = acc._transport_classification_route;
  if (route === 'fuzzy_text' || route === 'keyword_extract' || route === 'fallback_outro') {
    return route;
  }
  if (acc._fallback_report_type === true) return 'fallback_outro';
  return 'unknown';
}

/**
 * Registra predição no momento do registro do relato (JWT do cidadão; RLS user_id = auth.uid()).
 * Falha não interrompe o fluxo do chat. Também emite log estruturado para observabilidade.
 */
export async function insertClassificationPredictionLog(
  supabase: SupabaseClient,
  params: {
    userId: string;
    reportId: string;
    reportType: 'urban' | 'transport';
    predictedCategory: string;
    predictedSubcategory: string | null;
    classificationSource: string;
  }
): Promise<void> {
  const payload = {
    report_id: params.reportId,
    report_type: params.reportType,
    predicted_category: params.predictedCategory,
    predicted_subcategory: params.predictedSubcategory,
    classification_source: params.classificationSource,
    user_id: params.userId,
  };
  console.log('[CLASSIFICATION_METRIC]', JSON.stringify({ event: 'prediction_at_registration', ...payload }));
  const { error } = await supabase.from('report_classification_prediction_log').insert(payload);
  if (error) {
    const code = (error as { code?: string }).code;
    if (code === '23505') {
      console.warn('[insertClassificationPredictionLog] duplicate report_id+type, ignored');
      return;
    }
    console.warn('[insertClassificationPredictionLog] insert failed:', error.message);
  }
}

// Generate intuitive label from description when no pattern matches
export function generateLabelFromDescription(description: string): string {
  if (!description || description.trim().length === 0) {
    return 'Problema Urbano';
  }
  
  // Capitalize and clean the description to create a label
  const words = description
    .replace(/[^\w\sáàâãéèêíìîóòôõúùûçñ]/gi, ' ') // Keep accented chars
    .split(/\s+/)
    .filter(w => w.length > 2) // Filter out short words
    .slice(0, 4); // Take first 4 significant words
  
  if (words.length === 0) {
    return 'Problema Urbano';
  }
  
  // Capitalize each word
  const label = words
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
  
  // Limit to 50 chars
  return label.substring(0, 50) || 'Problema Urbano';
}

// Generate intuitive label from transport description when no pattern matches
export function generateTransportLabelFromDescription(description: string): string {
  if (!description || description.trim().length === 0) {
    return 'Problema no Transporte';
  }
  
  // Transport-specific label patterns
  const transportLabelPatterns: Array<{ pattern: RegExp; label: string }> = [
    { pattern: /motorista\s*(rude|grosso|mal\s*educado)?/i, label: 'Problema com Motorista' },
    { pattern: /cobrador/i, label: 'Problema com Cobrador' },
    { pattern: /ar\s*condicionado|ar\s*quebrado|calor/i, label: 'Problema de Climatização' },
    { pattern: /porta\s*(quebrad|não\s*abre)/i, label: 'Porta com Defeito' },
    { pattern: /banco\s*(quebrad|sujo|rasgad)/i, label: 'Banco Danificado' },
    { pattern: /freada|freio|freiada\s*bruscas?/i, label: 'Condução Perigosa' },
    { pattern: /não\s*para|passou\s*direto/i, label: 'Veículo Não Parou' },
    { pattern: /quebrou|pane|enguiçou/i, label: 'Veículo Quebrado' },
    { pattern: /rota\s*(errada|diferente)|caminho\s*diferente/i, label: 'Rota Alterada' },
    { pattern: /integração|baldeação/i, label: 'Problema de Integração' },
    { pattern: /cartão|bilhete|passagem/i, label: 'Problema com Bilhetagem' },
  ];
  
  // Try to match a specific pattern
  const descLower = description.toLowerCase();
  for (const lp of transportLabelPatterns) {
    if (lp.pattern.test(descLower)) {
      return lp.label;
    }
  }
  
  // Fallback: generate from first words
  const words = description
    .replace(/[^\w\sáàâãéèêíìîóòôõúùûçñ]/gi, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2)
    .slice(0, 4);
  
  if (words.length === 0) {
    return 'Problema no Transporte';
  }
  
  const label = words
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
  
  return label.substring(0, 50) || 'Problema no Transporte';
}

// Get friendly label for transport report types
export function getTransportTypeLabel(reportType: string): string {
  const labels: Record<string, string> = {
    'atraso': 'Atraso de Veículo',
    'lotacao': 'Veículo Lotado',
    'seguranca': 'Problema de Segurança',
    'acessibilidade': 'Problema de Acessibilidade',
    'limpeza': 'Problema de Limpeza',
    'conducao': 'Problema de Condução',
    'outro': 'Outro Problema'
  };
  return labels[reportType] || 'Problema no Transporte';
}

// ============= SEMANTIC LABEL TO CATEGORY MAPPING =============
// Maps AI-generated labels or short descriptions to known categories
export function mapLabelToCategory(label: string): string | null {
  if (!label) return null;
  const labelLower = label.toLowerCase();
  
  // Semantic mapping: keywords that indicate specific categories
  const semanticMap: Record<string, string[]> = {
    'iluminacao': [
      'poste', 'luz', 'lampada', 'lâmpada', 'escuro', 'escuridão', 'iluminação', 
      'apagado', 'queimado', 'caído', 'caido', 'torto', 'inclinado', 'pendendo'
    ],
    // OS explícitas antes de via genérica (evita "rua" dominar "recape na rua")
    'pavimentacao': [
      'pavimentação', 'pavimentacao', 'recape', 'asfaltamento', 'capeamento', 'fresagem', 'cbuq', 'obra de pavimento',
    ],
    'sinalizacao': [
      'semáforo', 'semaforo', 'sinalização', 'sinalizacao', 'faixa', 'pedestre', 'placa', 'sinal'
    ],
    'drenagem': [
      'drenagem', 'água pluvial', 'pluvial', 'galeria', 'sarjeta', 'chuva', 'bueiro pluvial'
    ],
    'via_publica': [
      'buraco', 'asfalto', 'rua', 'via', 'cratera', 'pista', 'erosão', 'desmoronamento', 'lombada',
    ],
    'calcada': [
      'calçada', 'calcada', 'passeio', 'guia', 'meio-fio', 'rampa', 'acessibilidade'
    ],
    'lixo': [
      'lixo', 'entulho', 'sujeira', 'descarte', 'resíduo', 'coleta', 'lixeira', 
      'container', 'caçamba'
    ],
    'esgoto': [
      'esgoto', 'bueiro', 'água', 'alagamento', 'vazamento', 'enchente', 
      'inundação', 'transbordando', 'tampa'
    ],
    'area_verde': [
      'árvore', 'arvore', 'mato', 'praça', 'praca', 'parque', 'jardim', 
      'galho', 'poda', 'raiz', 'vegetação', 'capim'
    ],
    'poluicao': [
      'barulho', 'ruído', 'ruido', 'som', 'música', 'musica', 'fumaça', 
      'fumaca', 'poluição', 'poluicao', 'festa', 'bar', 'buzina', 'alarme'
    ],
    'animais': [
      'rato', 'ratazana', 'barata', 'animal', 'bicho', 'inseto', 'escorpião', 
      'escorpiao', 'cobra', 'pombo', 'infestação', 'mosquito'
    ],
    'higiene_urbana': [
      'fedor', 'cheiro', 'urina', 'fezes', 'podre', 'fedendo', 'imundo', 
      'nojento', 'sujo', 'defecação'
    ],
  };
  
  for (const [category, keywords] of Object.entries(semanticMap)) {
    if (keywords.some(kw => labelLower.includes(kw))) {
      return category;
    }
  }
  
  return null;
}

// Auto-infer risk level from description
export function autoInferRisk(description: string): { 
  risk_level: string | null; 
  confidence: number;
  risk_types?: string[];
  reason?: string;
} {
  const desc = description
    .toLowerCase()
    // Typo comum no celular: "cheio tóxico" no lugar de "cheiro tóxico"
    .replace(/\bcheio(?=\s+t[óo]xic)/g, 'cheiro');
  
  // Critical risk patterns with weights
  const criticalPatterns: Array<{ pattern: RegExp; weight: number; type?: string; reason: string }> = [
    // Flooding - most common high-risk
    { pattern: /completamente\s*alagad[oa]|totalmente\s*alagad[oa]|muito\s*alagad[oa]/, weight: 0.95, type: 'flooding', reason: 'alagamento grave' },
    { pattern: /alagad[oa]|inundad[oa]|chei[oa]\s*d[e']?\s*[áa]gua/, weight: 0.85, type: 'flooding', reason: 'alagamento' },
    // Gerúndios / processo em curso ("está alagando", "inundando a calçada")
    { pattern: /\b(a?lagando|inundando|transbordando)\b|está\s*a?\s*lagando|esta\s*a?\s*lagando|tá\s*a?\s*lagando/, weight: 0.88, type: 'flooding', reason: 'alagamento em curso' },
    { pattern: /água\s*subindo|transbordando|enchente/, weight: 0.9, type: 'flooding', reason: 'alagamento crescente' },
    
    // Blocking/obstruction
    { pattern: /bloqueada|bloqueado|não\s*passa|nao\s*passa|via\s*interditada/, weight: 0.9, type: 'traffic', reason: 'via bloqueada' },
    { pattern: /rua\s*inteira|toda\s*a?\s*rua/, weight: 0.3, reason: 'extensão grande' }, // Booster
    
    // Electrical
    { pattern: /fio[s]?\s*(caíd|caid|expost|pelad)|choque|eletric/, weight: 0.95, type: 'electrical', reason: 'risco elétrico' },
    { pattern: /poste\s*caíd|poste\s*caid|cabo\s*expost/, weight: 0.9, type: 'electrical', reason: 'risco elétrico' },
    
    // Structural
    { pattern: /desab|caindo|cedendo|rachando|tombou|caiu|desmoron/, weight: 0.9, type: 'structural', reason: 'risco estrutural' },
    { pattern: /afundando|cratera\s*grande/, weight: 0.85, type: 'structural', reason: 'afundamento' },
    
    // Fire / incêndio
    { pattern: /inc[eê]ndio|pegando?\s*fogo|em\s*chamas|fuma[cç]a\s*(preta|densa)|explos[aã]o/, weight: 0.98, type: 'fire', reason: 'incêndio ou fogo ativo' },
    { pattern: /pr[eé]dio\s*abandonado.*(fogo|chamas|inc[eê]ndio)|fogo.*pr[eé]dio/, weight: 1.0, type: 'fire', reason: 'incêndio em edificação' },
    
    // Emergency language
    { pattern: /emergência|urgente|urgência|gravíssimo|muito\s*grave|muito\s*perigoso/, weight: 0.9, reason: 'urgência declarada' },
    { pattern: /ferido|machucado|hospital|ambulância|samu/, weight: 0.95, reason: 'situação de saúde' },
    
    // Intensity modifiers (boosters)
    { pattern: /completamente|totalmente|extremamente/, weight: 0.2, reason: 'intensificador' },
  ];
  
  // Moderate risk patterns
  const moderatePatterns: Array<{ pattern: RegExp; weight: number; type?: string; reason: string }> = [
    { pattern: /risco\s*de|pode\s*causar|perigoso|perigo/, weight: 0.6, reason: 'potencial risco' },
    { pattern: /acidente|contaminação|doença/, weight: 0.65, type: 'health', reason: 'risco de saúde' },
    { pattern: /preocupante|arriscado|grande|sério/, weight: 0.55, reason: 'situação séria' },
    // Odor / poluição química (ex.: "cheiro tóxico forte" — alinhado ao texto do assistente)
    { pattern: /tóxic|toxic|venenos|químic|quimic|gás\s*tóxic|gas\s*toxic/, weight: 0.62, type: 'health', reason: 'exposição tóxica ou química' },
    { pattern: /cheiro.*(forte|tóxic|toxic|ruim|horrível|horrivel|insuportável|insuportavel|muito)|fedor\s*(forte|ruim)|odor\s*forte|fuma[cç]a\s*(tóxic|toxic|preta|densa)/, weight: 0.58, type: 'health', reason: 'odor ou fumaça preocupante' },
    { pattern: /foco\s*de\s*contamina|contaminação|contaminacao|poluição\s*no\s*ar|poluicao\s*no\s*ar/, weight: 0.6, type: 'health', reason: 'contaminação / ar' },
  ];
  
  // No-risk patterns
  const noRiskPatterns: Array<{ pattern: RegExp; weight: number }> = [
    { pattern: /sem\s*risco|não\s*tem\s*risco|nenhum\s*risco/, weight: 0.9 },
    { pattern: /tranquilo|só\s*incômodo|so\s*incomodo|apenas\s*(estet|visual)/, weight: 0.8 },
  ];
  
  // Check for explicit no-risk first
  for (const p of noRiskPatterns) {
    if (p.pattern.test(desc)) {
      return { risk_level: 'none', confidence: p.weight, reason: 'sem risco declarado' };
    }
  }
  
  // Calculate critical score
  let criticalScore = 0;
  const riskTypes: string[] = [];
  let primaryReason = '';
  
  for (const p of criticalPatterns) {
    if (p.pattern.test(desc)) {
      criticalScore += p.weight;
      if (p.type && !riskTypes.includes(p.type)) {
        riskTypes.push(p.type);
      }
      if (!primaryReason && p.reason !== 'intensificador') {
        primaryReason = p.reason;
      }
    }
  }
  
  // Cap at 1.0
  criticalScore = Math.min(criticalScore, 1);
  
  if (criticalScore >= 0.7) {
    return { 
      risk_level: 'critical', 
      confidence: criticalScore, 
      risk_types: riskTypes.length > 0 ? riskTypes : undefined,
      reason: primaryReason || 'padrão crítico detectado'
    };
  }
  
  // Calculate moderate score
  let moderateScore = 0;
  let moderateReason = '';
  
  for (const p of moderatePatterns) {
    if (p.pattern.test(desc)) {
      moderateScore += p.weight;
      if (!moderateReason) {
        moderateReason = p.reason;
      }
    }
  }
  
  moderateScore = Math.min(moderateScore, 1);
  
  if (moderateScore >= 0.5) {
    return { 
      risk_level: 'moderate', 
      confidence: moderateScore,
      reason: moderateReason || 'padrão moderado detectado'
    };
  }
  
  // No clear risk signal
  return { risk_level: null, confidence: 0 };
}

/** Alinha severidade do relato urbano ao nível de risco (filtros da gestão: critical/high/medium/low). */
export function mapUrbanRiskLevelToSeverity(riskLevel: string | null | undefined): string | null {
  if (!riskLevel) return null;
  switch (riskLevel) {
    case "critical":
      return "critical";
    case "moderate":
      return "high";
    case "low":
      return "medium";
    case "none":
      return "low";
    default:
      return "medium";
  }
}

/** Raio em metros para considerar proximidade a equipamentos sensíveis (escolas, hospitais, UBS). */
const PROXIMITY_RADIUS_METERS = 500;

const SENSITIVE_SERVICE_TYPES = ['school', 'hospital', 'ubs'] as const;

/**
 * Ajusta severidade do relato urbano se houver equipamentos sensíveis (escola, hospital, UBS)
 * próximos ao local. Eleva: low→medium, medium→high. critical/high permanecem.
 */
export async function adjustSeverityForProximityToSensitiveEquipment(
  supabase: SupabaseClient,
  lat: number,
  lon: number,
  currentSeverity: string | null,
): Promise<{ adjustedSeverity: string; proximityDetails: string[] } | null> {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (!currentSeverity || currentSeverity === 'critical' || currentSeverity === 'high') return null;

  const delta = 0.005; // ~555m em SP
  const { data, error } = await supabase.rpc('search_public_services_fulltext', {
    min_lat: lat - delta,
    max_lat: lat + delta,
    min_lng: lon - delta,
    max_lng: lon + delta,
    center_lat: lat,
    center_lng: lon,
    radius_meters: PROXIMITY_RADIUS_METERS,
    search_query: null,
    service_types: [...SENSITIVE_SERVICE_TYPES],
    result_limit: 20,
  });

  if (error || !data?.length) return null;

  const labels: Record<string, string> = { school: 'escola', hospital: 'hospital', ubs: 'UBS' };
  const types = [...new Set((data as { service_type?: string }[]).map(s => s.service_type).filter(Boolean))];
  const proximityDetails = types.map(t => labels[t as string] || t);

  const bump: Record<string, string> = { low: 'medium', medium: 'high' };
  const adjustedSeverity = bump[currentSeverity] ?? currentSeverity;
  return { adjustedSeverity, proximityDetails };
}

/**
 * OS-05: persiste linha de auditoria para revisão humana (moderação).
 * Falha silenciosa no log para não quebrar criação do relato.
 */
export async function insertReportSeverityAuditLog(
  supabase: SupabaseClient,
  entry: {
    urban_report_id?: string;
    transport_report_id?: string;
    metric: string;
    previous_value?: string | null;
    new_value: string;
    justification: string;
    source_snippet?: string | null;
    confidence?: number | null;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  const row = {
    urban_report_id: entry.urban_report_id ?? null,
    transport_report_id: entry.transport_report_id ?? null,
    metric: entry.metric,
    previous_value: entry.previous_value ?? null,
    new_value: entry.new_value,
    justification: entry.justification,
    source_snippet: entry.source_snippet ? String(entry.source_snippet).slice(0, 500) : null,
    confidence: entry.confidence ?? null,
    metadata: entry.metadata ?? {},
  };
  const { error } = await supabase.from("report_severity_audit_log").insert(row);
  if (error) {
    console.error("[insertReportSeverityAuditLog]", error);
  }
}

// Parse user response for specific field types
export function parseFieldResponse(fieldType: string, userResponse: string): Record<string, unknown> {
  const response = userResponse.trim();
  const responseLower = response.toLowerCase();
  const result: Record<string, unknown> = {};
  
  switch (fieldType) {
    case 'report_nature': {
      const n = normalizeReportNature(response);
      if (n) {
        result.report_nature = n;
        console.log('[parseFieldResponse] report_nature:', n);
      }
      break;
    }

    case 'location_method': {
      const t = response.trim();
      const tl = t.toLowerCase();
      if (/^usar endereço cadastrado$/i.test(t) || /^usar endereco cadastrado$/i.test(t)) {
        result.location_method = 'registered_address';
        break;
      }
      if (/^digitar cep ou endereço$/i.test(t) || /^digitar cep ou endereco$/i.test(t)) {
        result.location_method = 'manual';
        break;
      }
      const gpsLineLm = response.match(/Localiza[cç][aã]o\s*GPS\s*[-:]?\s*(-?[\d.]+)\s*[,，]\s*(-?[\d.]+)/i);
      if (gpsLineLm) {
        const la = parseFloat(gpsLineLm[1]);
        const lo = parseFloat(gpsLineLm[2]);
        if (!Number.isNaN(la) && !Number.isNaN(lo) && la >= -90 && la <= 90 && lo >= -180 && lo <= 180) {
          result.user_lat = la;
          result.user_lon = lo;
          result.location_method = 'gps';
        }
        break;
      }
      if (/usar\s+minha\s+localiza[cç][aã]o|^gps$/i.test(tl)) {
        result.location_method = 'gps';
      }
      break;
    }

    case 'gps_coords': {
      const gpsLine = response.match(/Localiza[cç][aã]o\s*GPS\s*[-:]?\s*(-?[\d.]+)\s*[,，]\s*(-?[\d.]+)/i);
      if (gpsLine) {
        const la = parseFloat(gpsLine[1]);
        const lo = parseFloat(gpsLine[2]);
        if (!Number.isNaN(la) && !Number.isNaN(lo) && la >= -90 && la <= 90 && lo >= -180 && lo <= 180) {
          result.user_lat = la;
          result.user_lon = lo;
          result.location_method = 'gps';
        }
      }
      break;
    }

    case 'urban_registered_address_ack': {
      const t = responseLower.trim();
      if (/^(sim|s|yes|y|ok|correto|isso|confirmo|pode ser|certo|exato)\b/i.test(t) || /^👍/u.test(response.trim())) {
        result.urban_registered_address_ack = true;
        break;
      }
      if (/^(não|nao|n|no|nope|errado|outro|outra)\b/i.test(t)) {
        result.urban_registered_address_ack = true;
        result.location_method = 'manual';
        result.street = '';
        result.neighborhood = '';
        result.cep = '';
        result.street_number = '';
        result.reference_point = '';
        result._location_from_user_profile = false;
        console.log('[parseFieldResponse] urban_registered_address_ack: user rejected profile address → manual');
      }
      break;
    }

    case 'rating_dimensions': {
      const fromMark = parseRatingDimensionsMarker(response);
      if (fromMark) {
        result.rating_dimensions = fromMark;
        result.rating_stars = aggregateRatingDimensionsStars(fromMark);
      }
      break;
    }

    case 'cep': {
      // CEP numérico (8 dígitos)
      const cepMatch = response.match(/\b(\d{5}[-]?\d{3})\b/);
      if (cepMatch) {
        result.cep = cepMatch[1].replace(/\D/g, '');
        break;
      }
      // Endereço em texto livre "Rua X, Bairro" ou "Rua X 123, Centro"
      const looksLikeAddr = /rua|av\.|avenida|praça|rua das|rua do|centro|vila|jardim|bairro/i.test(response) || (response.includes(',') && response.length > 15);
      if (looksLikeAddr && response.length >= 10) {
        const parts = response.split(',').map((p: string) => p.trim()).filter(Boolean);
        if (parts.length >= 2) {
          const lastPart = parts[parts.length - 1];
          const streetParts = parts.slice(0, -1);
          const street = streetParts.join(', ');
          if (street.length >= 3 && lastPart.length >= 2) {
            result.street = street;
            result.neighborhood = lastPart;
            console.log('[parseFieldResponse] CEP: parsed free-form address:', { street, neighborhood: lastPart });
          }
        } else if (parts.length === 1 && parts[0].length >= 10 && /rua|av\.|avenida|praça/i.test(parts[0])) {
          result.street = parts[0];
          console.log('[parseFieldResponse] CEP: parsed single-part street:', parts[0]);
        }
      }
      break;
    }

    case 'street_number': {
      // Try to extract number first
      const numberMatch = response.match(/^(\d+)/);
      if (numberMatch) {
        result.street_number = numberMatch[1];
      } else if (responseLower.includes('altura') || responseLower.includes('perto') || 
                 responseLower.includes('frente') || responseLower.includes('próximo') ||
                 responseLower.includes('esquina')) {
        result.reference_point = response;
      } else if (response.length > 0 && response.length < 50) {
        // Short response without reference keywords = treat as number/reference
        result.street_number = response;
      }
      break;
    }
      
    case 'category': {
      // === CRITICAL: Handle confirmation responses (sim/não) for pending category ===
      const confirmPatterns = /^(sim|s|yes|y|ok|pode|pode ser|isso|isso mesmo|confirmo|confirma|exato|correto)$/i;
      const denyPatterns = /^(não|nao|n|no|nope|outra|outro|diferente|errado|não é isso|nao e isso)$/i;
      
      if (confirmPatterns.test(responseLower)) {
        // User confirmed - signal that we should use _pending_category
        result._category_confirmed = true;
        console.log('[parseFieldResponse] Category confirmation detected: YES');
        break;
      }
      if (denyPatterns.test(responseLower)) {
        // User denied - signal that we should clear pending and ask again
        result._category_denied = true;
        console.log('[parseFieldResponse] Category confirmation detected: NO');
        break;
      }
      
      // Direct category answer - EXPANDED with more synonyms
      const categoryMap: Record<string, string> = {
        'iluminação': 'iluminacao', 'iluminacao': 'iluminacao', 'luz': 'iluminacao', 'poste': 'iluminacao', 'lampada': 'iluminacao',
        'buraco': 'via_publica', 'asfalto': 'via_publica', 'via pública': 'via_publica', 'via publica': 'via_publica', 'rua': 'via_publica',
        'pavimentação': 'pavimentacao', 'pavimentacao': 'pavimentacao', 'recape': 'pavimentacao', 'asfaltamento': 'pavimentacao',
        'sinalização': 'sinalizacao', 'sinalizacao': 'sinalizacao', 'semáforo': 'sinalizacao', 'semaforo': 'sinalizacao', 'faixa': 'sinalizacao', 'placa': 'sinalizacao',
        'drenagem': 'drenagem', 'água pluvial': 'drenagem', 'agua pluvial': 'drenagem', 'sarjeta': 'drenagem', 'galeria': 'drenagem', 'pluvial': 'drenagem',
        'calçada': 'calcada', 'calcada': 'calcada', 'passeio': 'calcada',
        'lixo': 'lixo', 'entulho': 'lixo', 'sujeira': 'lixo',
        'esgoto': 'esgoto', 'bueiro': 'esgoto', 'vazamento': 'esgoto', 'alagamento': 'esgoto', 'água': 'esgoto', 'agua': 'esgoto',
        'área verde': 'area_verde', 'area verde': 'area_verde', 'árvore': 'area_verde', 'arvore': 'area_verde', 'praça': 'area_verde', 'praca': 'area_verde', 'mato': 'area_verde',
        'higiene': 'higiene_urbana', 'fedor': 'higiene_urbana', 'cheiro': 'higiene_urbana',
        'animais': 'animais', 'rato': 'animais', 'barata': 'animais', 'animal': 'animais',
        // EXPANDED: Poluição with noise-related terms
        'poluição': 'poluicao', 'poluicao': 'poluicao', 'poluição sonora': 'poluicao', 'poluicao sonora': 'poluicao',
        'poluição ambiental': 'poluicao', 'poluicao ambiental': 'poluicao', 'poluição atmosférica': 'poluicao',
        'barulho': 'poluicao', 'ruido': 'poluicao', 'ruído': 'poluicao',
        'som': 'poluicao', 'som alto': 'poluicao', 'música': 'poluicao', 'musica': 'poluicao', 'festa': 'poluicao',
        'perturbação': 'poluicao', 'perturbacao': 'poluicao', 'perturbação sonora': 'poluicao',
        'vizinho': 'poluicao', 'bar': 'poluicao', 'balada': 'poluicao',
        // FALLBACK: "outro" category
        'outro': 'outro', 'outros': 'outro', 'diferente': 'outro', 'não sei': 'outro', 'nao sei': 'outro', 'outra coisa': 'outro',
      };
      
      // Check for direct match
      for (const [key, cat] of Object.entries(categoryMap)) {
        if (responseLower === key || responseLower.startsWith(key + ' ') || responseLower.includes(key)) {
          result.category = cat;
          console.log('[parseFieldResponse] Category matched:', key, '→', cat);
          break;
        }
      }
      
      // RECOVERY: If response looks like a description (>= 20 chars), save as description instead
      // This handles the case where AI asked for category but user gave a detailed description
      if (!result.category && response.length >= 20) {
        console.log('[parseFieldResponse] Category recovery: treating as description');
        result.description = response;
        
        // Try to auto-classify from the description
        const autoClass = autoClassifyCategory(response);
        if (autoClass.category && autoClass.confidence >= 0.5) {
          result.category = autoClass.category;
          result.subcategory = autoClass.suggestedLabel || generateLabelFromDescription(response);
          result._auto_classified = true;
          result._classification_confidence = autoClass.confidence;
          console.log('[parseFieldResponse] Auto-classified category:', autoClass.category, 'subcategory:', result.subcategory);
        } else {
          // FALLBACK: Use 'outro' when we can't classify
          result.category = 'outro';
          result.subcategory = generateLabelFromDescription(response);
          result._fallback_category = true;
          console.log('[parseFieldResponse] Fallback to outro with subcategory:', result.subcategory);
        }
      }
      break;
    }
      
    case 'risk_level': {
      // Normaliza typo comum ("cheio tóxico" → "cheiro tóxico") para keywords e inferência
      const rl = responseLower.replace(/\bcheio(?=\s+t[óo]xic)/g, 'cheiro');

      // Botões / valores canônicos (evita cair no fallback "frase ≥8 chars" → low, ex.: "critical")
      const riskQuickNorm = response
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{M}/gu, '');
      const riskQuickMap: Record<string, string> = {
        critical: 'critical',
        moderate: 'moderate',
        low: 'low',
        none: 'none',
        critica: 'critical',
        critico: 'critical',
        moderada: 'moderate',
        moderado: 'moderate',
        baixa: 'low',
        baixo: 'low',
        semriscoimediato: 'none',
        semrisco: 'none',
      };
      const riskQuickKey = riskQuickNorm.replace(/\s+/g, '');
      if (riskQuickMap[riskQuickKey]) {
        result.risk_level = riskQuickMap[riskQuickKey];
        result.urgency_reason = response;
        break;
      }

      // Parse risk level from natural language - EXPANDED VOCABULARY
      // Simple yes/no responses first
      if (rl === 'sim' || rl === 's' || rl === 'yes' || rl === 'y') {
        result.risk_level = 'critical';
        result.urgency_reason = response;
        break;
      }
      if (rl === 'não' || rl === 'nao' || rl === 'n' || rl === 'no') {
        result.risk_level = 'none';
        result.urgency_reason = response;
        break;
      }
      
      const criticalKeywords = [
        // Blocking/obstruction
        'bloqueada', 'bloqueado', 'não passa', 'nao passa', 'não dá para', 'nao da para',
        // Electrical
        'fios expostos', 'exposto', 'choque', 'eletricidade', 'fio caído', 'fio caido',
        // Flooding - EXPANDED
        'alagando', 'água subindo', 'inundando', 'transbordando',
        'alagada', 'alagado', 'inundada', 'inundado', 'cheia de água', 'cheia dágua', 'cheia d\'água',
        'completamente alagad', 'totalmente alagad', 'muito alagad',
        // Structural
        'desabando', 'caindo', 'desmoronando', 'desabou', 'caiu', 'tombou', 'rachando', 'cedendo',
        // Fire / incêndio
        'incêndio', 'incendio', 'fogo', 'chamas', 'pegando fogo', 'fumaça preta', 'fumaca preta', 'explosão', 'explosao',
        // Emergency/urgency
        'risco imediato', 'emergência', 'urgente', 'urgência', 'gravíssimo', 'muito grave', 'muito perigoso',
        // Injury/health immediate
        'ferido', 'machucado', 'hospital', 'ambulância', 'samu',
        // Químico / odor forte (exemplos do próprio fluxo de gravidade)
        'tóxico', 'toxico', 'veneno', 'gás tóxico', 'gas toxico', 'vazamento de gás', 'cheiro de gás',
        'foco de contamina', 'contaminação forte', 'cheiro forte', 'fedor forte',
        // Intensity boosters (with context)
        'completamente', 'totalmente', 'extremamente'
      ];
      const moderateKeywords = [
        'risco de', 'pode causar', 'perigoso', 'perigo', 'acidente', 
        'risco de doença', 'doença', 'doenças', 'contaminação', 'transtorno', 'prejudica',
        'arriscado', 'preocupante', 'pode machucar', 'pode alagar', 'grande', 'sério',
        'cheiro', 'fedor', 'fumaça', 'fumaca', 'olor', 'mau cheiro', 'odor', 'poluição', 'poluicao',
      ];
      const lowKeywords = ['incômodo', 'incomodo', 'chato', 'desconfortável', 'feio', 'ruim', 'só atrapalha', 'so atrapalha'];
      const noRiskKeywords = ['sem risco', 'não tem risco', 'nao tem risco', 'nenhum risco', 'tranquilo', 'não há risco', 'nao ha risco', 'só incômodo', 'so incomodo'];
      
      if (noRiskKeywords.some(k => rl.includes(k))) {
        result.risk_level = 'none';
      } else if (criticalKeywords.some(k => rl.includes(k))) {
        result.risk_level = 'critical';
        // Also extract risk types
        const riskTypes: string[] = [];
        if (rl.includes('fio') || rl.includes('choque') || rl.includes('elétric') || rl.includes('eletric')) riskTypes.push('electrical');
        if (rl.includes('bloqueada') || rl.includes('não passa') || rl.includes('trânsito') || rl.includes('transito')) riskTypes.push('traffic');
        if (rl.includes('alagad') || rl.includes('inundad') || rl.includes('água') || rl.includes('agua') || rl.includes('enchente')) riskTypes.push('flooding');
        if (rl.includes('caindo') || rl.includes('desab') || rl.includes('tomb') || rl.includes('rachando')) riskTypes.push('structural');
        if (rl.includes('tóxic') || rl.includes('toxic') || rl.includes('contamina') || rl.includes('cheiro') || rl.includes('fedor') || rl.includes('fumaça') || rl.includes('fumaca') || rl.includes('gás')) riskTypes.push('health');
        if (rl.includes('incêndio') || rl.includes('incendio') || rl.includes('fogo') || rl.includes('chamas') || rl.includes('explosão') || rl.includes('explosao')) riskTypes.push('fire');
        if (riskTypes.length > 0) result.risk_types = riskTypes;
      } else if (moderateKeywords.some(k => rl.includes(k))) {
        result.risk_level = 'moderate';
        // Extract risk types for moderate too
        const riskTypes: string[] = [];
        if (rl.includes('doença') || rl.includes('saúde') || rl.includes('contaminação') || rl.includes('contaminacao')) riskTypes.push('health');
        if (rl.includes('acidente') || rl.includes('trânsito') || rl.includes('transito')) riskTypes.push('traffic');
        if (rl.includes('tóxic') || rl.includes('toxic') || rl.includes('cheiro') || rl.includes('fedor') || rl.includes('fumaça') || rl.includes('fumaca') || rl.includes('odor') || rl.includes('poluição') || rl.includes('poluicao')) riskTypes.push('health');
        if (riskTypes.length > 0) result.risk_types = riskTypes;
      } else if (lowKeywords.some(k => rl.includes(k))) {
        result.risk_level = 'low';
      }

      // Inferência semântica + fallback: o assistente pede "descreva em uma frase" — frases curtas devem avançar o fluxo
      if (!result.risk_level) {
        const inferred = autoInferRisk(response);
        if (inferred.risk_level != null && inferred.confidence >= 0.45) {
          result.risk_level = inferred.risk_level;
          if (inferred.risk_types?.length) result.risk_types = inferred.risk_types;
          result.urgency_reason = response;
        } else {
          const t = response.trim();
          const vague = /^(não sei|nao sei|sem ideia|não\s*opino|nao\s*opino)\b/i.test(t);
          const looksDescriptive = t.length >= 10 && /\s/.test(t);
          const looksLikeFlowToken =
            /^(confirmar|corrigir|continuar|registrar|novo_relato|ok|obrigad)/i.test(t);
          if (looksDescriptive && !vague && !/^(não|nao|n|no)\b/i.test(t) && !looksLikeFlowToken) {
            result.risk_level = 'low';
            result.urgency_reason = response;
          }
        }
      }

      // Store urgency reason with user's actual words
      if (result.risk_level) {
        result.urgency_reason = response;
      }
      break;
    }
      
    case 'affected_scope': {
      // Parse affected scope
      const individualKeywords = ['só eu', 'so eu', 'minha casa', 'meu', 'apenas eu', 'só minha'];
      const streetKeywords = ['rua toda', 'toda a rua', 'rua inteira', 'vizinhos', 'quarteirão', 'a rua', 'toda rua'];
      const neighborhoodKeywords = ['bairro', 'região', 'região toda', 'várias ruas', 'varias ruas'];
      
      if (neighborhoodKeywords.some(k => responseLower.includes(k))) {
        result.affected_scope = 'neighborhood';
      } else if (streetKeywords.some(k => responseLower.includes(k))) {
        result.affected_scope = 'street';
      } else if (individualKeywords.some(k => responseLower.includes(k))) {
        result.affected_scope = 'individual';
      }
      break;
    }

    case 'occurrence_time': {
      const parsed = parseFlexibleOccurrenceTime(response);
      if (parsed) {
        result.occurrence_time = parsed;
      }
      break;
    }

    case 'direction': {
      if (/\bida\b/i.test(responseLower)) result.direction = 'ida';
      else if (/\bvolta\b/i.test(responseLower)) result.direction = 'volta';
      else if (/\bcircular\b/i.test(responseLower)) result.direction = 'circular';
      break;
    }
      
    case 'active_consequences': {
      // Parse active consequences
      const consequences: string[] = [];
      if (responseLower.includes('luz') || responseLower.includes('apagão') || responseLower.includes('energia')) {
        consequences.push('power_outage');
      }
      if (responseLower.includes('água') && (responseLower.includes('falta') || responseLower.includes('sem'))) {
        consequences.push('water_outage');
      }
      if (responseLower.includes('trânsito parado') || responseLower.includes('transito parado') || 
          responseLower.includes('não passa') || responseLower.includes('via bloqueada')) {
        consequences.push('traffic_blocked');
      }
      if (responseLower.includes('alagando') || responseLower.includes('inundando') || 
          responseLower.includes('alagado') || responseLower.includes('inundado')) {
        consequences.push('flooding');
      }
      if (responseLower.includes('doença') || responseLower.includes('saúde') || responseLower.includes('contamin')) {
        consequences.push('health_hazard');
      }
      if (consequences.length > 0) {
        result.active_consequences = consequences;
      }
      break;
    }
      
    case 'description': {
      // USE CENTRALIZED NLP FUNCTION - accepts 8+ chars with keyword
      if (isValidDomainDescription(response, 'urban')) {
        result.description = response;
        console.log('[parseFieldResponse] Description accepted via isValidDomainDescription:', { 
          length: response.length, 
          preview: response.substring(0, 50) 
        });
        
        // Also try to auto-classify category from description
        const autoClass = autoClassifyCategory(response);
        if (autoClass.category && autoClass.confidence >= 0.7) {
          result._suggested_category = autoClass.category;
          result._classification_confidence = autoClass.confidence;
          console.log('[parseFieldResponse] Suggested category from description:', autoClass.category);
        }
      }
      break;
    }
  }
  
  return result;
}

// Accumulate fields from all messages in conversation for better tracking
export function accumulateFieldsFromHistory(
  messages: Array<{ role: string; content: string }>,
  collectionType: 'urban_report' | 'transport_report' | 'service_rating' | 'services' | 'audiencias' | 'general' | 'history' | 'occupancy' | 'vereadores' | 'noticias'
): Record<string, unknown> {
  // === LIGHT JOURNEY: services (busca de serviços próximos) ===
  // Ordem: 1) location_method (GPS / cadastrado / manual), 2) se manual → CEP/endereço, 3) service_type
  if (collectionType === 'services') {
    const getContent = (msg: { role: string; content: string | unknown }): string => {
      const raw = msg.content;
      if (typeof raw === 'string') return raw;
      if (Array.isArray(raw)) {
        const part = raw.find((p: Record<string, unknown>) => p?.type === 'text' && p?.text);
        return part ? String(part.text) : '';
      }
      return '';
    };
    const acc: Record<string, unknown> = {};
    for (const msg of messages) {
      if (msg.role === 'assistant') {
        const c = getContent(msg);
        if (c.includes('[COLLECTION_PROGRESS:services:')) {
          const match = c.match(/\[COLLECTION_PROGRESS:services:(\{[^}]+\})\]/);
        if (match) {
          try {
            Object.assign(acc, JSON.parse(match[1]));
            } catch { /* ignore parse errors */ }
          }
        }
      }
    }
    for (const msg of messages) {
      if (msg.role !== 'user') continue;
      const c = getContent(msg).trim();
      const cLower = c.toLowerCase();
      // Método de localização
      if (!acc.location_method) {
        if (/usar\s+(minha\s+)?localização|localização\s+gps|gps\s*$/i.test(cLower) || cLower.includes('localização gps:')) {
          acc.location_method = 'gps';
        } else if (/usar\s+endereço\s+cadastrado|endereço\s+cadastrado\s*$/i.test(cLower)) {
          acc.location_method = 'registered_address';
        } else if (/digitar\s+(cep|endereço)|digitar\s+cep\s+ou\s+endereço/i.test(cLower)) {
          acc.location_method = 'manual';
        }
      }
      // Localização GPS: lat,lon (enviado pelo frontend) — aceita "Localização GPS: -23.58,-46.69" ou com espaços
      const gpsMatch = c.match(/Localiza[cç][aã]o\s*GPS\s*[-:]?\s*(-?[\d.]+)\s*[,，]\s*(-?[\d.]+)/i)
        || (cLower.includes('localização gps') || cLower.includes('localizacao gps') ? c.match(/(-?[\d.]+)\s*[,，]\s*(-?[\d.]+)/) : null);
      if (gpsMatch && !acc.user_lat) {
        const lat = parseFloat(gpsMatch[1].trim());
        const lon = parseFloat(gpsMatch[2].trim());
        if (!Number.isNaN(lat) && !Number.isNaN(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
          acc.user_lat = lat;
          acc.user_lon = lon;
          if (!acc.location_method) acc.location_method = 'gps';
        }
      }
      // Tipo de serviço: chip/picker "Tipo de serviço: UBS" ou "Tipo de serviço: Parques"
      if (!acc.service_type && /tipo de serviço:\s*(.+)/i.test(c)) {
        const m = c.match(/tipo de serviço:\s*(.+?)(?:\s*\.\s*Especificação|$)/im);
        const raw = m?.[1]?.trim().toLowerCase().replace(/\s+/g, ' ');
        if (raw) {
          const labelToId: Record<string, string> = {
            'ubs': 'ubs', 'escolas': 'school', 'ceus': 'ceu', 'hospitais': 'hospital',
            'bibliotecas': 'library', 'esportes': 'sports_center', 'centros esportivos': 'sports_center',
            'parques': 'park', 'feiras': 'street_market', 'centros comunitários': 'community_center',
            'creches': 'daycare', 'mercados': 'market', 'mercados municipais': 'city_market',
            'teatro/cinema': 'theater', 'teatros': 'theater', 'museus': 'museum',
            'assistência social': 'social_assistance', 'transporte': 'transit_station',
            'delegacia/polícia': 'police_station', 'cemitério': 'cemetery', 'acessibilidade': 'accessibility',
            'reciclagem/limpeza': 'recycling_point', 'bombeiros': 'fire_station', 'outros': 'other'
          };
          acc.service_type = labelToId[raw] || raw;
        }
      }
      // CEP em qualquer formato
      if (!acc.cep && /\b(\d{5}-?\d{3})\b/.test(c)) {
        const m = c.match(/\b(\d{5}-?\d{3})\b/);
        if (m) acc.cep = m[1].replace(/-/g, '');
      }
      // Endereço selecionado (Google Places) com CEP e rua/bairro
      if (cLower.includes('endereço selecionado:')) {
        const cepMatch = c.match(/CEP:\s*(\d{5}-?\d{3})/i);
        if (cepMatch?.[1] && !acc.cep) acc.cep = cepMatch[1].replace(/-/g, '');
        const streetMatch = c.match(/Endereço selecionado:\s*([^-\n]+)/i);
        if (streetMatch?.[1]?.trim() && !acc.street) acc.street = streetMatch[1].trim();
        const neighborhoodMatch = c.match(/-\s*([^,\n]+?)(?:,|\s+-\s+CEP)/i);
        if (neighborhoodMatch?.[1]?.trim() && !acc.neighborhood) acc.neighborhood = neighborhoodMatch[1].trim();
      }
    }
    // Número ou referência: se o assistente pediu e o usuário respondeu (services journey)
    const lastAssistantContent = messages.filter((m) => m.role === 'assistant').map((m) => getContent(m)).pop() || '';
    const lastUserContent = messages.filter((m) => m.role === 'user').map((m) => getContent(m)).pop()?.trim() || '';
    if (lastUserContent && (lastAssistantContent.includes('número') || lastAssistantContent.includes('ponto de referência')) && !acc.street_number && !acc.reference_point) {
      const skipPhrases = ['pular', 'não sei', 'nao sei', 'continuar', 'não tenho', 'nao tenho', 'opcional', 'próximo', 'proximo', 'sem número', 'sem numero'];
      if (skipPhrases.some((p) => lastUserContent.toLowerCase().includes(p))) {
        acc.reference_point = 'não informado';
      } else {
        const numberMatch = lastUserContent.match(/^(\d+)/);
        if (numberMatch) acc.street_number = numberMatch[1];
        else if (/altura|perto|frente|próximo|proximo/.test(lastUserContent.toLowerCase())) acc.reference_point = lastUserContent;
        else if (lastUserContent.length < 50) acc.street_number = lastUserContent;
      }
    }
    // Inferir service_type por texto (UBS, hospital, CEU, etc.)
    if (!acc.service_type) {
      for (const msg of messages) {
        if (msg.role === 'user') {
          const t = inferServiceTypeFromText(getContent(msg));
          if (t) {
            acc.service_type = t;
            break;
          }
        }
      }
    }
    // Quando o assistente mostrou "Qual desses te interessa?" (lista de alternativas) e o usuário respondeu com número ou tipo, usar essa escolha (evita loop de "não tenho serviços")
    const lastAssistant = messages.filter((m) => m.role === 'assistant').pop();
    const lastUser = messages.filter((m) => m.role === 'user').pop();
    if (lastAssistant && lastUser && getContent(lastAssistant).includes('Qual desses te interessa?')) {
      const assistantText = getContent(lastAssistant);
      const userText = getContent(lastUser).trim();
      const labelToType: Record<string, string> = {
        'ubs': 'ubs', 'escolas': 'school', 'ceus': 'ceu', 'hospitais': 'hospital',
        'bibliotecas': 'library', 'centros esportivos': 'sports_center', 'esportes': 'sports_center',
        'parques': 'park', 'feiras': 'street_market', 'creches': 'daycare', 'museus': 'museum',
        'teatros': 'theater', 'transporte': 'transit_station', 'bombeiros': 'fire_station'
      };
      let chosenType: string | null = null;
      const digitMatch = userText.match(/^(\d)\s*$/);
      if (digitMatch) {
        const num = parseInt(digitMatch[1], 10);
        const listMatch = assistantText.match(new RegExp(`^${num}\\.\\s*(.+)$`, 'm'));
        if (listMatch) {
          const label = listMatch[1].trim().toLowerCase().replace(/\s+/g, ' ');
          chosenType = (labelToType[label] || Object.entries(labelToType).find(([k]) => label.includes(k))?.[1]) ?? null;
        }
      } else {
        chosenType = inferServiceTypeFromText(userText);
      }
      if (chosenType) {
        acc.service_type = chosenType;
      }
    }
    // Filtros de busca (raio, avaliação mínima, busca por texto) — da última mensagem do usuário
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role !== 'user') continue;
      const c = getContent(messages[i]).trim();
      const cLower = c.toLowerCase();
      if (!acc.radius_meters) {
        const radiusMatch = c.match(/raio\s*[:\s]*(\d+)\s*(km|m)/i) || cLower.match(/raio\s*(\d+)\s*(km|m)/);
        if (radiusMatch) {
          const val = parseInt(radiusMatch[1], 10);
          acc.radius_meters = (radiusMatch[2] || '').toLowerCase() === 'km' ? val * 1000 : val;
        }
      }
      if (acc.min_rating === undefined || acc.min_rating === null || /avalia[cç][aã]o\s*(m[ií]nima)?\s*[:\s]*todas/i.test(c)) {
        if (/avalia[cç][aã]o\s*(m[ií]nima)?\s*[:\s]*todas/i.test(c)) {
          acc.min_rating = 0;
        } else {
          const ratingMatch = c.match(/avalia[cç][aã]o\s*(m[ií]nima)?\s*[:\s]*(\d+)\s*\+?/i) || c.match(/(\d+)\s*\+?\s*estrelas?/i);
          if (ratingMatch) {
            const stars = parseInt(ratingMatch[2] || ratingMatch[1], 10);
            if (stars >= 2 && stars <= 5) acc.min_rating = stars;
          }
        }
      }
      if (!acc.search_query) {
        const buscaMatch = c.match(/busca\s*[:\s]+([^.\n]+)/i) || c.match(/buscar\s+por\s+[^:]+[:\s]+([^.\n]+)/i);
        if (buscaMatch?.[1]?.trim()) acc.search_query = buscaMatch[1].trim();
      }
    }
    return acc;
  }

  // Only accumulate for structured journeys
  if (!['urban_report', 'transport_report', 'service_rating'].includes(collectionType)) {
    return {};
  }
  const accumulated: Record<string, unknown> = {};
  
  // Check for fields already collected via [COLLECTION_PROGRESS] markers
  for (const msg of messages) {
    if (msg.role === 'assistant' && msg.content.includes('[COLLECTION_PROGRESS:')) {
      const match = msg.content.match(/\[COLLECTION_PROGRESS:[^:]+:(\{[^}]+\})\]/);
      if (match) {
        try {
          const fields = JSON.parse(match[1]);
          Object.assign(accumulated, fields);
        } catch { /* ignore parse errors */ }
      }
    }
  }
  
  // === CRITICAL: Parse Google Places address picker format FIRST ===
  // Format: "Endereço selecionado: Rua X - Bairro, Cidade - CEP: 00000-000"
  for (const msg of messages) {
    if (msg.role === 'user' && msg.content.toLowerCase().includes('endereço selecionado:')) {
      const content = msg.content;
      
      // Extract street
      const streetMatch = content.match(/Endereço selecionado:\s*([^-\n]+)/i);
      if (streetMatch?.[1]?.trim() && !accumulated.street) {
        accumulated.street = streetMatch[1].trim();
      }
      
      // Extract neighborhood
      const neighborhoodMatch = content.match(/-\s*([^,\n]+?)(?:,|\s+-\s+CEP)/i);
      if (neighborhoodMatch?.[1]?.trim() && !accumulated.neighborhood) {
        accumulated.neighborhood = neighborhoodMatch[1].trim();
      }
      
      // Extract CEP
      const cepMatch = content.match(/CEP:\s*(\d{5}-?\d{3})/i);
      if (cepMatch?.[1] && !accumulated.cep) {
        accumulated.cep = cepMatch[1].replace('-', '');
      }
      // Extract city (Bairro, Cidade - CEP ou ... - Cidade - CEP) para validação relato só São Paulo
      if (!accumulated.city) {
        const cityComma = content.match(/,\s*([^-\n]+?)\s*-\s*CEP/i);
        if (cityComma?.[1]?.trim()) {
          accumulated.city = cityComma[1].trim();
        } else {
          const cityBeforeCep = content.match(/\s+-\s+([^-\n]+?)\s*-\s*CEP\s*:?/i);
          if (cityBeforeCep?.[1]?.trim()) {
            accumulated.city = cityBeforeCep[1].trim();
          }
        }
      }
      
      console.log('[accumulateFields] Parsed Google Places address:', {
        street: accumulated.street,
        neighborhood: accumulated.neighborhood,
        cep: accumulated.cep,
        city: accumulated.city
      });
      // "Rua X, 1477" antes do hífen do bairro → separar número (evita pedir de novo só o número)
      if (accumulated.street && !accumulated.street_number) {
        const sm = String(accumulated.street).match(/^(.+),\s*(\d+[A-Za-z]?)\s*$/);
        if (sm) {
          accumulated.street = sm[1].trim();
          accumulated.street_number = sm[2].trim();
        }
      }
    }
  }
  
  // === CRITICAL: Detect description using CENTRALIZED NLP FUNCTION ===
  // Uses isValidDomainDescription for flexible threshold (8+ chars with keyword)
  if (!accumulated.description) {
    // Determine domain based on collection type
    const domain = collectionType === 'transport_report' ? 'transport' : 
                   collectionType === 'service_rating' ? 'service' : 'urban';
    
    // Process messages from newest to oldest to capture the LATEST valid description
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (msg.role === 'user') {
        const contentLower = msg.content.toLowerCase();
        
        // Skip structured messages (addresses, numbers, short answers)
        const isStructured = 
          contentLower.includes('endereço selecionado:') ||
          contentLower.includes('localização gps:') ||
          contentLower.includes('localizacao gps:') ||
          /^usar endereço cadastrado$/i.test(msg.content.trim()) ||
          /^usar endereco cadastrado$/i.test(msg.content.trim()) ||
          /^digitar cep ou endereço$/i.test(msg.content.trim()) ||
          /^digitar cep ou endereco$/i.test(msg.content.trim()) ||
          contentLower.includes('linha selecionada:') ||
          contentLower.includes('nota:') ||
          contentLower.includes('data:') ||
          /^\d+$/.test(msg.content.trim());
        
        // Skip generic intent messages that don't describe a specific problem
        const isGeneric = isGenericIntentText(msg.content);
        
        // USE CENTRALIZED NLP: accepts 8+ chars with keyword OR 20+ chars OR 15+ with keyword
        const bareNature = collectionType === 'urban_report' && isBareUrbanReportNatureReply(msg.content);
        if (!isStructured && !isGeneric && !bareNature && isValidDomainDescription(msg.content, domain)) {
          accumulated.description = msg.content.trim();
          console.log('[accumulateFields] Auto-detected description via isValidDomainDescription:', { 
            length: msg.content.length, 
            domain
          });
          break;
        }
      }
    }
  }
  
  // For urban reports, scan ALL user messages for category and structured fields
  if (collectionType === 'urban_report') {
    // FIRST: Scan all user messages for category detection (fixes "bueiro" → "iluminacao" bug)
    for (const msg of messages) {
      if (msg.role === 'user') {
        const userContext = msg.content.toLowerCase();
        const detectedFields = extractUrbanFields(userContext);
        // Only override category if we found one (prevents losing a good detection)
        if (detectedFields.category && !accumulated.category) {
          accumulated.category = detectedFields.category;
        } else if (detectedFields.category) {
          // If already have category, only update if this one is more specific
          accumulated.category = detectedFields.category;
        }
      }
    }
    
    // NEW: Detect category from assistant confirmations (e.g., "registrar como feedback")
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      const role = msg.role;
      const content = msg.content.toLowerCase();
      
      // Category detection from assistant messages (fixes feedback_camara flow)
      if (role === 'assistant' && !accumulated.category) {
        const categoryPatterns = [
          { pattern: /problema de \*?\*?ilumina[çc][ãa]o\*?\*?/i, category: 'iluminacao' },
          { pattern: /problema de \*?\*?via p[úu]blica\*?\*?/i, category: 'via_publica' },
          { pattern: /problema de \*?\*?pavimenta[çc][ãa]o\*?\*?/i, category: 'pavimentacao' },
          { pattern: /problema de \*?\*?cal[çc]ada\*?\*?/i, category: 'calcada' },
          { pattern: /problema de \*?\*?sinaliza[çc][ãa]o\*?\*?/i, category: 'sinalizacao' },
          { pattern: /problema de \*?\*?drenagem\*?\*?/i, category: 'drenagem' },
          { pattern: /problema de \*?\*?lixo\*?\*?/i, category: 'lixo' },
          { pattern: /problema de \*?\*?esgoto\*?\*?/i, category: 'esgoto' },
          { pattern: /problema de \*?\*?[áa]rea verde\*?\*?/i, category: 'area_verde' },
          // Evitar "feedback" genérico + "Câmara" em textos longos do app (ex.: trâmite) — só frases explícitas de feedback legislativo
          { pattern: /registrar\s+(?:como\s+)?feedback\s+(?:para|à|a)\s+(?:a\s+)?c[âa]mara/i, category: 'feedback_camara' },
          { pattern: /registrar.*preocupa[çc][ãa]o.*c[âa]mara/i, category: 'feedback_camara' },
          { pattern: /registrar como feedback/i, category: 'feedback_camara' },
          { pattern: /feedback geral para a c[âa]mara/i, category: 'feedback_camara' },
        ];
        
        for (const { pattern, category } of categoryPatterns) {
          if (pattern.test(msg.content)) {
            accumulated.category = category;
            console.log('[accumulateFields] Category detected from assistant message:', category);
            break;
          }
        }
      }
      
      // Detect user acceptance of feedback registration offer
      if (role === 'user' && i > 0 && !accumulated.category) {
        const prevMsg = messages[i - 1];
        if (prevMsg && prevMsg.role === 'assistant') {
          const prevContent = prevMsg.content.toLowerCase();
          const isOfferingFeedback = prevContent.includes('registrar') && 
                                     (prevContent.includes('feedback') || prevContent.includes('preocupação') || prevContent.includes('câmara'));
          const userAccepts = content.includes('sim') || content.includes('desejo') || 
                             content.includes('quero') || content.includes('pode') || 
                             content.includes('ok') || content.includes('aceito');
          
          if (isOfferingFeedback && userAccepts) {
            accumulated.category = 'feedback_camara';
            console.log('[accumulateFields] Category set to feedback_camara from user acceptance');
          }
        }
      }
    }

    // Relato urbano: método de localização + linha "Localização GPS:" (mesmo padrão do fluxo de serviços)
    for (const msg of messages) {
      if (msg.role !== 'user' || typeof msg.content !== 'string') continue;
      const c = msg.content;
      const cLower = c.toLowerCase();
      if (!accumulated.location_method) {
        if (/localiza[cç][aã]o\s*gps\s*[-:0-9]/i.test(c) || /^📍/u.test(c.trim())) {
          accumulated.location_method = 'gps';
        } else if (/usar\s+endere[cç]o\s+cadastrado/i.test(cLower)) {
          accumulated.location_method = 'registered_address';
        } else if (/digitar\s+(cep|endere[cç]o)|digitar\s+cep\s+ou\s+endere[cç]o/i.test(cLower)) {
          accumulated.location_method = 'manual';
        }
      }
      const gpsM =
        c.match(/Localiza[cç][aã]o\s*GPS\s*[-:]?\s*(-?[\d.]+)\s*[,，]\s*(-?[\d.]+)/i)
        || (cLower.includes('localização gps') || cLower.includes('localizacao gps')
          ? c.match(/(-?[\d.]+)\s*[,，]\s*(-?[\d.]+)/)
          : null);
      if (gpsM && accumulated.user_lat == null) {
        const la = parseFloat(gpsM[1].trim());
        const lo = parseFloat(gpsM[2].trim());
        if (!Number.isNaN(la) && !Number.isNaN(lo) && la >= -90 && la <= 90 && lo >= -180 && lo <= 180) {
          accumulated.user_lat = la;
          accumulated.user_lon = lo;
          if (!accumulated.location_method) accumulated.location_method = 'gps';
        }
      }
    }
    
    // THEN: Parse assistant questions and user responses for structured fields
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      const nextMsg = messages[i + 1];
      
      // Detect CEP in any user message
      if (msg.role === 'user') {
        const cepMatch = msg.content.match(/\b(\d{5}[-]?\d{3})\b/);
        if (cepMatch && !accumulated.cep) {
          accumulated.cep = cepMatch[1].replace('-', '');
        }
      }
      
      if (msg.role === 'assistant' && nextMsg?.role === 'user') {
        const rawQuestion = msg.content;
        const question = normalizeTextForMatching(rawQuestion); // Use normalized text for matching
        const answer = nextMsg.content.trim();
        
        // === Deterministic field capture via [FIELD_REQUEST:...] markers ===
        const fieldRequestMatch = rawQuestion.match(/\[FIELD_REQUEST:(\w+)\]/);
        if (fieldRequestMatch) {
          const fieldType = fieldRequestMatch[1];
          const parsedFields = parseFieldResponse(fieldType, answer);
          
          // === CRITICAL: Handle category confirmation logic ===
          if (fieldType === 'category') {
            if (parsedFields._category_confirmed && accumulated._pending_category) {
              // User confirmed the pending category
              accumulated.category = accumulated._pending_category;
              accumulated.subcategory = accumulated._pending_subcategory || generateLabelFromDescription(accumulated.description || '');
              delete accumulated._pending_category;
              delete accumulated._pending_subcategory;
              console.log('[accumulateFields] Category confirmed:', accumulated.category, 'subcategory:', accumulated.subcategory);
              continue;
            } else if (parsedFields._category_denied) {
              // User denied - clear pending and mark as needing to ask again
              delete accumulated._pending_category;
              delete accumulated._pending_subcategory;
              accumulated._asked_category = false; // Allow asking again
              console.log('[accumulateFields] Category denied, will ask again');
              continue;
            }
          }
          
          Object.assign(accumulated, parsedFields);
          continue; // Skip heuristic parsing, we used deterministic capture
        }
        
        // Extract CEP from specific question
        if ((question.includes('qual o cep') || question.includes('qual é o cep') || 
             question.includes('cep do local')) && answer.length >= 8) {
          const cepMatch = answer.match(/\b(\d{5}[-]?\d{3})\b/);
          if (cepMatch) {
            accumulated.cep = cepMatch[1].replace('-', '');
          }
        }
        
        // === Parse free-form address when user gives "Rua X, Bairro" instead of CEP ===
        // Question asked for CEP/address ("me diz a rua e bairro", "qual o cep", etc.)
        const askedForAddress = (question.includes('cep do local') || question.includes('qual o cep') ||
          question.includes('qual o endereço') || question.includes('rua e bairro') ||
          question.includes('me diz a rua') || question.includes('cep ou endereço')) &&
          answer.length >= 10 && !answer.toLowerCase().includes('endereço selecionado:');
        const hasCepInAnswer = /\b\d{5}[-]?\d{3}\b/.test(answer);
        const looksLikeAddress = /rua|av\.|avenida|praça|rua das|rua do|centro|vila|jardim|bairro/i.test(answer) || (answer.includes(',') && answer.length > 15);
        if (askedForAddress && !hasCepInAnswer && looksLikeAddress && (!accumulated.street || !accumulated.neighborhood)) {
          const parts = answer.split(',').map(p => p.trim()).filter(Boolean);
          if (parts.length >= 2) {
            const lastPart = parts[parts.length - 1];
            const streetParts = parts.slice(0, -1);
            const street = streetParts.join(', ');
            if (street.length >= 3 && lastPart.length >= 2) {
              accumulated.street = street;
              accumulated.neighborhood = lastPart;
              console.log('[accumulateFields] Parsed free-form address:', { street, neighborhood: lastPart });
            }
          } else if (parts.length === 1 && parts[0].length >= 10 && /rua|av\.|avenida|praça/i.test(parts[0])) {
            accumulated.street = parts[0];
            console.log('[accumulateFields] Parsed single-part address as street:', { street: parts[0] });
          }
        }
        
        // Extract street from specific question-answer pair (fallback if no CEP)
        if ((question.includes('qual o nome da rua') || question.includes('qual é o nome da rua') || 
             question.includes('qual a rua') || question.includes('qual é a rua')) && 
            answer.length > 3 && !answer.toLowerCase().includes('não sei')) {
          // Clean street name - remove common prefixes if duplicated
          let street = answer;
          if (street.toLowerCase().startsWith('rua rua ')) {
            street = street.substring(4);
          } else if (street.toLowerCase().startsWith('avenida avenida ')) {
            street = street.substring(8);
          }
          accumulated.street = street;
        }
        
        // Extract number/reference from specific question (NOW MARKDOWN-RESISTANT)
        if ((question.includes('qual o número') || question.includes('qual é o número') ||
             question.includes('número ou ponto') || question.includes('ponto de referência')) && answer.length > 0) {
          const answerLower = answer.toLowerCase().trim();
          const skipPhrases = ['pular', 'não sei', 'nao sei', 'continuar', 'não tenho', 'nao tenho', 'opcional', 'próximo', 'proximo', 'sem número', 'sem numero'];
          if (skipPhrases.some(p => answerLower.includes(p))) {
            accumulated.reference_point = 'não informado';
          } else {
            const numberMatch = answer.match(/^(\d+)/);
            if (numberMatch) {
              accumulated.street_number = numberMatch[1];
            } else if (answerLower.includes('altura') || answerLower.includes('perto') ||
                       answerLower.includes('frente') || answerLower.includes('próximo')) {
              accumulated.reference_point = answer;
            } else {
              accumulated.street_number = answer;
            }
          }
        }
        
        // Extract neighborhood from specific question (fallback if no CEP)
        if ((question.includes('qual o bairro') || question.includes('qual é o bairro') ||
             question.includes('bairro?')) && answer.length > 2) {
          accumulated.neighborhood = answer;
        }
        
        // === NEW: Heuristic parsing for impact fields (as fallback) ===
        // Risk level: reaplicar quando o cidadão corrige gravidade (já havia risk_level)
        const riskQuestionHeuristic =
          /\[FIELD_REQUEST:risk_level\]/i.test(rawQuestion) ||
          /\[QUICK_REPLY:\s*critical\b/i.test(rawQuestion) ||
          /\bnova\s+gravidade\b/i.test(question) ||
          /\bqual\s+a\s+nova\s+gravidade\b/i.test(question) ||
          /\bn[ií]vel\s+de\s+gravidade\b/i.test(question) ||
          (/\bgravidade\s+do\s+problema\b/i.test(question) &&
            /escolha|op(ç|c)[aã]o|risco\s+ou\s+impacto|uma\s+frase|descreva/i.test(question)) ||
          (/\bhá\s+algum\s+risco\b/i.test(question) || /\brisco\s+imediat/i.test(question));
        if (riskQuestionHeuristic) {
          const parsedRisk = parseFieldResponse('risk_level', answer);
          if (parsedRisk.risk_level != null) {
            Object.assign(accumulated, parsedRisk);
          }
        }
        
        // Affected scope detection
        if ((question.includes('afetando só você') || question.includes('toda a rua') ||
             question.includes('bairro todo') || question.includes('está afetando')) && !accumulated.affected_scope) {
          const parsedScope = parseFieldResponse('affected_scope', answer);
          Object.assign(accumulated, parsedScope);
        }
        
        // Active consequences detection
        if ((question.includes('consequência') || question.includes('falta de luz') ||
             question.includes('causando')) && !accumulated.active_consequences) {
          const parsedConsequences = parseFieldResponse('active_consequences', answer);
          Object.assign(accumulated, parsedConsequences);
        }
        
        // === DESCRIPTION detection from detailed questions (NLP-based) ===
        if ((question.includes('me conte mais') || question.includes('descreva') ||
             question.includes('mais detalhes') || question.includes('o que está acontecendo') ||
             question.includes('qual o problema') || question.includes('qual é o problema') ||
             question.includes('sua dúvida') || question.includes('sua duvida') ||
             question.includes('sua sugestão') || question.includes('sua sugestao') ||
             question.includes('quer elogiar') || question.includes('funcionando bem') ||
             question.includes('ideia de melhoria') || question.includes('conta o que')) &&
            isValidDomainDescription(answer, 'urban') &&
            !isBareUrbanReportNatureReply(answer) &&
            !accumulated.description) {
          accumulated.description = answer;
        }
      }
    }
    
    // === CRITICAL: Process the LAST user message if it's a response to a FIELD_REQUEST ===
    // This handles the case where the user just responded but we haven't looped through it yet
    const lastMsgIdx = messages.length - 1;
    if (messages[lastMsgIdx]?.role === 'user' && lastMsgIdx > 0) {
      const prevMsg = messages[lastMsgIdx - 1];
      if (prevMsg?.role === 'assistant') {
        const fieldRequestMatch = prevMsg.content.match(/\[FIELD_REQUEST:(\w+)\]/);
        if (fieldRequestMatch) {
          const fieldType = fieldRequestMatch[1];
          const answer = messages[lastMsgIdx].content.trim();
          const parsedFields = parseFieldResponse(fieldType, answer);
          
          // === CRITICAL: Handle category confirmation logic for last message ===
          if (fieldType === 'category') {
            if (parsedFields._category_confirmed && accumulated._pending_category) {
              // User confirmed the pending category
              accumulated.category = accumulated._pending_category;
              accumulated.subcategory = accumulated._pending_subcategory || generateLabelFromDescription(accumulated.description || '');
              delete accumulated._pending_category;
              delete accumulated._pending_subcategory;
              console.log('[accumulateFields] Last msg: Category confirmed:', accumulated.category, 'subcategory:', accumulated.subcategory);
            } else if (parsedFields._category_denied) {
              // User denied - clear pending and mark as needing to ask again
              delete accumulated._pending_category;
              delete accumulated._pending_subcategory;
              accumulated._asked_category = false; // Allow asking again
              console.log('[accumulateFields] Last msg: Category denied, will ask again');
            } else {
              // Direct category match or other response
              Object.assign(accumulated, parsedFields);
            }
          } else {
            Object.assign(accumulated, parsedFields);
          }
        }
      }
    }

    // Método de localização + coordenadas GPS (InlineLocationMethodPicker — relato urbano)
    {
      const getContentU = (msg: { role: string; content: string | unknown }): string => {
        const raw = msg.content;
        if (typeof raw === 'string') return raw;
        if (Array.isArray(raw)) {
          const part = raw.find((p: Record<string, unknown>) => p?.type === 'text' && p?.text);
          return part ? String((part as Record<string, unknown>).text) : '';
        }
        return '';
      };
      for (const msg of messages) {
        if (msg.role !== 'user') continue;
        const c = getContentU(msg).trim();
        const cLower = c.toLowerCase();
        if (!accumulated.location_method) {
          if (/^usar endereço cadastrado$/i.test(c) || /^usar endereco cadastrado$/i.test(c)) {
            accumulated.location_method = 'registered_address';
          } else if (/^digitar cep ou endereço$/i.test(c) || /^digitar cep ou endereco$/i.test(c)) {
            accumulated.location_method = 'manual';
          } else if (/usar\s+(minha\s+)?localiza[cç][aã]o|localiza[cç][aã]o\s*gps:/i.test(cLower)) {
            accumulated.location_method = 'gps';
          }
        }
        const gpsMatch =
          c.match(/Localiza[cç][aã]o\s*GPS\s*[-:]?\s*(-?[\d.]+)\s*[,，]\s*(-?[\d.]+)/i) ||
          ((cLower.includes('localização gps') || cLower.includes('localizacao gps')) &&
            c.match(/(-?[\d.]+)\s*[,，]\s*(-?[\d.]+)/));
        if (gpsMatch && accumulated.user_lat == null) {
          const lat = parseFloat(gpsMatch[1].trim());
          const lon = parseFloat(gpsMatch[2].trim());
          if (!Number.isNaN(lat) && !Number.isNaN(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
            accumulated.user_lat = lat;
            accumulated.user_lon = lon;
            if (!accumulated.location_method) accumulated.location_method = 'gps';
          }
        }
      }
    }

    // Botões rápidos / resposta curta: reclamacao, elogio, sugestao, duvida
    if (!accumulated.report_nature) {
      for (const msg of messages) {
        if (msg.role !== 'user') continue;
        const t = msg.content.trim();
        if (t.length > 48) continue;
        const n = normalizeReportNature(t);
        if (n) {
          accumulated.report_nature = n;
          break;
        }
      }
    }
  }
  
  // ========== SERVICE_RATING SPECIFIC PARSING ==========
  if (collectionType === 'service_rating') {
    // Service type mapping from display names to IDs (alinhado ao InlineServiceTypePicker)
    const serviceTypeMap: Record<string, string> = {
      'ubs': 'ubs', 'hospital': 'hospital', 'escola': 'school', 'escolas': 'school',
      'ceu': 'ceu', 'biblioteca': 'library', 'bibliotecas': 'library',
      'centro esportivo': 'sports_center', 'esportes': 'sports_center',
      'parques': 'park', 'park': 'park', 'feiras': 'street_market', 'creches': 'daycare',
      'museus': 'museum', 'teatros': 'theater', 'teatro': 'theater', 'transporte': 'transit_station',
      'mercados': 'market', 'mercados municipais': 'city_market', 'outros': 'other'
    };
    
    // === FLEXIBLE ADDRESS CONFIRMATION PATTERNS ===
    const addressConfirmPatterns = [
      /^sim\.?$/i,
      /^s\.?$/i,
      /sim.*correto/i,
      /está correto/i,
      /esta correto/i,
      /isso mesmo/i,
      /pode ser/i,
      /é isso/i,
      /e isso/i,
      /confirmo/i
    ];
    const addressDenyPatterns = [
      /^n[aã]o$/i,
      /^n$/i,
      /n[aã]o.*correto/i,
      /está errado/i,
      /esta errado/i,
      /outro endere[çc]o/i,
      /errado/i,
      /incorreto/i
    ];
    
    // Parse structured messages from inline pickers
    for (const msg of messages) {
      if (msg.role !== 'user') continue;
      const content = msg.content;
      const contentLower = content.toLowerCase().trim();
      
      // Parse "Tipo de serviço: UBS" format from InlineServiceTypePicker
      const serviceTypeMatch = content.match(/tipo de serviço:\s*(\w+)/i);
      if (serviceTypeMatch && !accumulated.service_type) {
        const typeName = serviceTypeMatch[1].toLowerCase();
        accumulated.service_type = serviceTypeMap[typeName] || typeName;
        console.log('[accumulateFields] Parsed service_type from picker:', accumulated.service_type);
      }
      
      // Parse "Serviço: UBS Bela Vista - Centro\nEndereço: Rua X..." format from InlineServicePicker
      const serviceNameMatch = content.match(/serviço:\s*(.+?)(?:\s*-\s*(.+))?(?:\n|$)/i);
      if (serviceNameMatch && !accumulated.service_name) {
        accumulated.service_name = serviceNameMatch[1].trim();
        if (serviceNameMatch[2]) {
          accumulated.service_neighborhood = serviceNameMatch[2].trim();
        }
        console.log('[accumulateFields] Parsed service_name from picker:', accumulated.service_name);
      }
      
      // Parse "Endereço: ..." format from InlineServicePicker
      const addressMatch = content.match(/endereço:\s*(.+?)$/im);
      if (addressMatch && !accumulated.service_address) {
        accumulated.service_address = addressMatch[1].trim();
        console.log('[accumulateFields] Parsed service_address from picker:', accumulated.service_address);
      }
      
      // Parse [SERVICE_ID:uuid] from InlineServicePicker (quando usuário escolhe da lista)
      const serviceIdMatch = content.match(/\[SERVICE_ID:([a-f0-9-]{36})\]/i);
      if (serviceIdMatch && !accumulated.service_id) {
        accumulated.service_id = serviceIdMatch[1];
        console.log('[accumulateFields] Parsed service_id from picker:', accumulated.service_id);
      }
      
      // === IMPROVED: Parse address confirmation responses with flexible patterns ===
      // Only parse if we're awaiting confirmation (service_address_confirmed is undefined)
      if (accumulated.service_address_confirmed === undefined) {
        if (addressConfirmPatterns.some(p => p.test(contentLower))) {
          accumulated.service_address_confirmed = true;
          accumulated._needs_address_reconfirm = false;
          accumulated._address_reconfirmed = true;
          console.log('[accumulateFields] Service address confirmed by user (flexible match)');
        } else if (addressDenyPatterns.some(p => p.test(contentLower))) {
          accumulated.service_address_confirmed = false;
          console.log('[accumulateFields] Service address denied by user - will ask for neighborhood');
        }
      }
      
      const rdParsed = parseRatingDimensionsMarker(content);
      if (rdParsed) {
        accumulated.rating_dimensions = rdParsed;
        accumulated.rating_stars = aggregateRatingDimensionsStars(rdParsed);
        console.log('[accumulateFields] Parsed rating_dimensions from marker');
      }

      // Parse "Nota: X estrelas" ou [RATING_SELECTED:N] (picker de avaliação geral)
      const ratingSelectedTag = content.match(/\[RATING_SELECTED:([1-5])\]/);
      if (ratingSelectedTag && !accumulated.rating_stars) {
        accumulated.rating_stars = parseInt(ratingSelectedTag[1], 10);
        console.log('[accumulateFields] Parsed rating_stars from RATING_SELECTED marker');
      }
      const ratingMatch = content.match(/nota:\s*(\d)\s*estrelas?/i);
      if (ratingMatch && !accumulated.rating_stars && !accumulated.rating_dimensions) {
        accumulated.rating_stars = parseInt(ratingMatch[1]);
        console.log('[accumulateFields] Parsed rating_stars from picker:', accumulated.rating_stars);
      }
      
      // Also detect rating from natural language if not already captured
      if (!accumulated.rating_stars && !accumulated.rating_dimensions) {
        const naturalRatingMatch = contentLower.match(/(\d)\s*(?:estrela|nota)/);
        if (naturalRatingMatch) {
          accumulated.rating_stars = parseInt(naturalRatingMatch[1]);
        }
      }
    }
    
    // Extract service fields from context using heuristics
    for (const msg of messages) {
      if (msg.role === 'user') {
        const contextFields = extractServiceFields(msg.content.toLowerCase());
        // Only merge if not already set by more explicit parsing
        for (const [key, value] of Object.entries(contextFields)) {
          if (!accumulated[key]) {
            accumulated[key] = value;
          }
        }
      }
    }
    
    // Process FIELD_REQUEST markers in last message exchange
    const lastMsgIdx = messages.length - 1;
    if (messages[lastMsgIdx]?.role === 'user' && lastMsgIdx > 0) {
      const prevMsg = messages[lastMsgIdx - 1];
      if (prevMsg?.role === 'assistant') {
        const fieldRequestMatch = prevMsg.content.match(/\[FIELD_REQUEST:(\w+)\]/);
        if (fieldRequestMatch) {
          const fieldType = fieldRequestMatch[1];
          const answer = messages[lastMsgIdx].content.trim();
          
          // Service-specific field parsing
          switch (fieldType) {
            case 'service_type': {
              // Check if answer is actually a journey switch request
              const isJourneySwitchAttempt = 
                answer.toLowerCase().includes('falar de') ||
                answer.toLowerCase().includes('falar do') ||
                answer.toLowerCase().includes('mudar para') ||
                answer.toLowerCase().includes('trocar para') ||
                answer.toLowerCase().includes('quero fazer') ||
                answer.toLowerCase().includes('na verdade');
              
              if (isJourneySwitchAttempt) {
                // Don't store as field - let intent detection handle this
                console.log('[accumulateFields] Detected journey switch attempt, skipping service_type capture');
                break;
              }
              
              const typeMatch = answer.match(/tipo de serviço:\s*(\w+)/i);
              if (typeMatch) {
                accumulated.service_type = serviceTypeMap[typeMatch[1].toLowerCase()] || typeMatch[1].toLowerCase();
              } else if (serviceTypeMap[answer.toLowerCase()]) {
                accumulated.service_type = serviceTypeMap[answer.toLowerCase()];
              } else if (answer.length <= 20) {
                // Only accept short direct answers as type names
                accumulated.service_type = answer.toLowerCase();
              }
              break;
            }
            case 'service_name': {
              // Aceitar "Serviço: NOME - Bairro\nEndereço: ..." (regex sem $ para multilinha)
              const nameMatch = answer.match(/serviço:\s*(.+?)(?:\s*-\s*([^\n]*))?(?:\n|$)/i);
              if (nameMatch) {
                accumulated.service_name = nameMatch[1].trim();
                if (nameMatch[2] && nameMatch[2].trim()) accumulated.service_neighborhood = nameMatch[2].trim();
              } else {
                accumulated.service_name = answer.trim();
              }
              break;
            }
            case 'rating_dimensions': {
              const rd = parseRatingDimensionsMarker(answer);
              if (rd) {
                accumulated.rating_dimensions = rd;
                accumulated.rating_stars = aggregateRatingDimensionsStars(rd);
              }
              break;
            }
            case 'rating_stars': {
              const rdAns = parseRatingDimensionsMarker(answer);
              if (rdAns) {
                accumulated.rating_dimensions = rdAns;
                accumulated.rating_stars = aggregateRatingDimensionsStars(rdAns);
              } else {
                const starsMatch = answer.match(/(\d)/);
                if (starsMatch) {
                  accumulated.rating_stars = parseInt(starsMatch[1]);
                }
              }
              break;
            }
            case 'rating_text': {
              if (answer.length >= 5) {
                accumulated.rating_text = answer;
              }
              break;
            }
            case 'service_address_confirmed': {
              const confirmLower = answer.toLowerCase().trim();
              if (/^(sim|s|isso|correto|confirmo)$/i.test(confirmLower) || 
                  confirmLower.includes('correto') || confirmLower.includes('isso mesmo')) {
                accumulated.service_address_confirmed = true;
                accumulated._needs_address_reconfirm = false;
                accumulated._address_reconfirmed = true;
                console.log('[accumulateFields] FIELD_REQUEST: Service address confirmed');
              } else if (/^(n[aã]o|n|errado|incorreto)$/i.test(confirmLower) || 
                         confirmLower.includes('errado') || confirmLower.includes('outro')) {
                accumulated.service_address_confirmed = false;
                console.log('[accumulateFields] FIELD_REQUEST: Service address denied');
              }
              break;
            }
            case 'service_neighborhood': {
              if (answer.length >= 2 && answer.length <= 60) {
                accumulated.service_neighborhood = answer.trim();
                if (accumulated.service_name) {
                  accumulated.service_address = `${accumulated.service_name} - ${answer.trim()}`;
                }
                accumulated.service_address_confirmed = undefined;
                const prevContent = (prevMsg?.content as string) || '';
                if (/correto|ok.*bairro/i.test(prevContent)) {
                accumulated._needs_address_reconfirm = true;
                }
                // NUNCA preencher service_name com genérico - queremos o dropdown
                const typeLabels: Record<string, string> = { ceu: 'CEU', ubs: 'UBS', hospital: 'Hospital', school: 'Escola', library: 'Biblioteca', sports_center: 'Centro esportivo' };
                const tl = typeLabels[String(accumulated.service_type || '')] || '';
                const generic = tl ? `${tl} - ${answer.trim()}` : '';
                if (accumulated.service_name === generic || !accumulated.service_name || accumulated.service_name.length < 5) {
                  accumulated.service_name = undefined;
                }
                console.log('[accumulateFields] FIELD_REQUEST: Service neighborhood captured:', answer);
              }
              break;
            }
            case 'service_address_reconfirm': {
              const reconfirmLower = answer.toLowerCase().trim();
              const denied = /^(n[aã]o|n|errado|incorreto)$/i.test(reconfirmLower) ||
                reconfirmLower.includes('errado') || reconfirmLower.includes('incorreto') || reconfirmLower.includes('outro');
              if (/^(sim|s|isso|correto|confirmo)$/i.test(reconfirmLower) || 
                  reconfirmLower.includes('correto') || reconfirmLower.includes('isso mesmo')) {
                accumulated.service_address_confirmed = true;
                accumulated._address_reconfirmed = true;
                accumulated._needs_address_reconfirm = false;
                console.log('[accumulateFields] FIELD_REQUEST: Service address reconfirmed');
              } else if (denied) {
                accumulated.service_address_confirmed = false;
                accumulated.service_neighborhood = undefined;
                accumulated.service_address = accumulated.service_name ? `${accumulated.service_name}` : undefined;
                accumulated._needs_address_reconfirm = false;
                accumulated._address_reconfirmed = false;
                console.log('[accumulateFields] FIELD_REQUEST: Service address denied on reconfirm - will ask for correct bairro');
              }
              break;
            }
          }
        }
      }
    }
  }
  
  // ========== TRANSPORT_REPORT SPECIFIC PARSING ==========
  if (collectionType === 'transport_report') {
    // === CRITICAL: Extract transport fields from ALL user messages using extractTransportFields ===
    // This ensures natural language responses like "atraso de ônibus" are properly parsed
    for (const msg of messages) {
      if (msg.role === 'user') {
        const contentLower = msg.content.toLowerCase();
        const contextFields = extractTransportFields(contentLower);
        
        // Merge extracted fields (only if not already set by more explicit parsing)
        for (const [key, value] of Object.entries(contextFields)) {
          if (!accumulated[key]) {
            accumulated[key] = value;
            console.log(`[accumulateFields] Extracted ${key} from transport natural language:`, value);
          }
        }
      }
    }
    
    // === Detect description from transport-related user messages ===
    // VERY FLEXIBLE: Accept short but informative responses (>= 5 chars with keyword)
    // Allow overwriting if current description is generic (e.g., "Quero relatar um problema...")
    const shouldDetectDescription = !accumulated.description || isGenericIntentText(accumulated.description);
    
    console.log('[accumulateFields] Transport description check:', {
      currentDescription: accumulated.description?.substring(0, 40),
      isCurrentGeneric: accumulated.description ? isGenericIntentText(accumulated.description) : 'N/A',
      shouldDetectDescription
    });
    
    if (shouldDetectDescription) {
      // Process messages from newest to oldest to capture the LATEST valid description
      for (let i = messages.length - 1; i >= 0; i--) {
        const msg = messages[i];
        if (msg.role === 'user') {
          const contentLower = msg.content.toLowerCase();
          const hasKeyword = hasTransportKeywords(msg.content);
          
          // Skip structured messages (picker selections)
          const isStructured = 
            contentLower.includes('linha selecionada:') ||
            contentLower.includes('data:') ||
            contentLower.includes('horário:') ||
            contentLower.includes('horario:');
          
          // Skip generic intent messages that don't describe a problem
          const isGeneric = isGenericIntentText(msg.content);
          
          // VERY FLEXIBLE THRESHOLD:
          // - >= 5 chars with transport keyword = valid (e.g., "atraso", "lotado", "metro sujo")
          // - >= 15 chars without keyword = also valid (longer descriptions)
          const isValidDescription = !isGeneric && !isStructured && 
            ((msg.content.length >= 5 && hasKeyword) || msg.content.length >= 15);
          
          if (isValidDescription) {
            accumulated.description = msg.content.trim();
            console.log('[accumulateFields] Auto-detected transport description:', {
              length: msg.content.length,
              hasKeyword,
              preview: msg.content.substring(0, 50)
            });
            break;
          }
        }
      }
    }
    
    // Parse structured messages from inline pickers
    for (const msg of messages) {
      if (msg.role !== 'user') continue;
      const content = msg.content;
      
      // Parse "Linha selecionada: XXX (Nome)" format from InlineLinePicker
      const lineMatch = content.match(/linha selecionada:\s*(\S+)/i);
      if (lineMatch && !accumulated.line_code) {
        accumulated.line_code = lineMatch[1];
        console.log('[accumulateFields] Parsed line_code from picker:', accumulated.line_code);
      }
      
      // Parse "Data: DD/MM/YYYY" format from InlineDatePicker - always mark as confirmed
      const dateMatch = content.match(/data:\s*(.+)/i);
      if (dateMatch && !accumulated.occurrence_date) {
        // Try to extract date - could be "hoje", "ontem", or actual date
        const dateStr = dateMatch[1].trim().toLowerCase();
        if (dateStr === 'hoje' || dateStr.includes('hoje')) {
          accumulated.occurrence_date = new Date().toISOString().split('T')[0];
        } else if (dateStr === 'ontem' || dateStr.includes('ontem')) {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          accumulated.occurrence_date = yesterday.toISOString().split('T')[0];
        } else {
          // Try to parse as date
          const parts = dateStr.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
          if (parts) {
            const day = parts[1].padStart(2, '0');
            const month = parts[2].padStart(2, '0');
            const year = parts[3] ? (parts[3].length === 2 ? '20' + parts[3] : parts[3]) : new Date().getFullYear().toString();
            accumulated.occurrence_date = `${year}-${month}-${day}`;
          } else {
            accumulated.occurrence_date = dateStr;
          }
        }
        // User explicitly selected via picker = confirmed
        accumulated.date_confirmed = true;
        console.log('[accumulateFields] Parsed occurrence_date from picker:', accumulated.occurrence_date, '(confirmed)');
      }
      
      // Parse "Horário: XX:XX" format from InlineTimePicker
      const timeMatch = content.match(/horário:\s*([^\n]+)/i);
      if (timeMatch && !accumulated.occurrence_time) {
        const parsed = parseFlexibleOccurrenceTime(timeMatch[1]);
        if (parsed) accumulated.occurrence_time = parsed;
        console.log('[accumulateFields] Parsed occurrence_time from picker:', accumulated.occurrence_time);
      }

      // Parse "Sentido: Ida|Volta|Circular" from InlineDirectionPicker
      const directionMatch = content.match(/sentido:\s*([^\n]+)/i);
      if (directionMatch && !accumulated.direction) {
        const directionRaw = directionMatch[1].trim().toLowerCase();
        if (directionRaw.includes('ida')) accumulated.direction = 'ida';
        else if (directionRaw.includes('volta')) accumulated.direction = 'volta';
        else if (directionRaw.includes('circular')) accumulated.direction = 'circular';
      }
    }
  }

  if (collectionType === "service_rating" && accumulated.service_neighborhood != null) {
    accumulated.service_neighborhood = normalizeServiceRatingNeighborhood(accumulated.service_neighborhood);
  }

  return accumulated;
}

function capitalizeWords(s: string): string {
  return s.replace(/\b\w/g, c => c.toUpperCase());
}

/** Remove tokens consecutivos duplicados (ex.: "Butantã Butantã") — bug de acúmulo / cópia do bairro */
export function normalizeServiceRatingNeighborhood(raw: unknown): string {
  const s = String(raw ?? "")
    .trim()
    .replace(/\s+/g, " ");
  if (!s) return "";
  const parts = s.split(/\s+/);
  const out: string[] = [];
  for (const p of parts) {
    if (out.length && out[out.length - 1].toLowerCase() === p.toLowerCase()) continue;
    out.push(p);
  }
  return out.join(" ");
}

/** Nome do equipamento em PT para fluxo de avaliação (evita "Library", "library" no prompt) */
export function getServiceRatingNounPt(serviceType: string | undefined): string {
  const SERVICE_RATING_NOUN_PT: Record<string, string> = {
    ubs: "UBS",
    school: "escola",
    hospital: "hospital",
    ceu: "CEU",
    library: "biblioteca",
    sports_center: "centro esportivo",
    street_market: "feira",
    community_center: "centro comunitário",
    daycare: "creche",
    park: "parque",
    market: "mercado",
    city_market: "mercado municipal",
    theater: "teatro",
    museum: "museu",
    social_assistance: "assistência social",
    transit_station: "terminal/estação de transporte",
    police_station: "delegacia",
    cemetery: "cemitério",
    accessibility: "serviço de acessibilidade",
    recycling_point: "ponto de reciclagem",
    fire_station: "Corpo de Bombeiros",
    other: "serviço",
  };
  if (!serviceType) return "serviço";
  return SERVICE_RATING_NOUN_PT[serviceType] || serviceType;
}

/** Remove acentos para comparar bairro digitado (Butantã) com cadastro (BUTANTA). */
function foldAccentsForCompare(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/** Normaliza para comparar "Bibliotecas - X" com "biblioteca - X" (nome genérico vs chip) */
export function normalizeGenericServiceRatingName(s: string): string {
  return foldAccentsForCompare(
    s
      .toLowerCase()
      .trim()
      .replace(/\s+/g, " ")
      .replace(/\bhospitais\b/g, "hospital")
      .replace(/\bbibliotecas\b/g, "biblioteca")
      .replace(/\bescolas\b/g, "escola")
      .replace(/\bceus\b/g, "ceu")
      .replace(/\bfeiras\b/g, "feira")
      .replace(/\bparques\b/g, "parque")
      .replace(/\bmercados\b/g, "mercado"),
  );
}

/**
 * Quando só existe `service_name` como "UBS - Butantã" (LLM/COLLECTION_PROGRESS) sem `service_neighborhood`,
 * inferimos o trecho após "Tipo - " para comparar com o genérico e exibir SERVICE_PICKER.
 */
export function inferServiceRatingNeighborhoodFromCompositeName(
  serviceName: unknown,
  serviceType: string | undefined,
): string | undefined {
  const sn = String(serviceName ?? "").trim();
  if (sn.length < 3) return undefined;
  const noun = getServiceRatingNounPt(serviceType);
  const escaped = noun.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`^\\s*${escaped}\\s*-\\s*(.+)$`, "i");
  const m = sn.match(re);
  if (!m) return undefined;
  const rest = m[1].trim();
  return rest.length >= 2 ? rest : undefined;
}

/**
 * true = ainda não há um equipamento concreto (só categoria, chip "Bibliotecas", etc.).
 * Nesse caso devemos mostrar SERVICE_PICKER após o bairro, antes de confirmar endereço.
 */
export function isServiceRatingTypeOnlyEquipmentName(
  serviceName: unknown,
  serviceType: string | undefined,
): boolean {
  const raw = String(serviceName ?? "").trim();
  if (raw.length < 2) return true;

  const s = normalizeGenericServiceRatingName(raw);
  const noun = normalizeGenericServiceRatingName(getServiceRatingNounPt(serviceType));
  if (!s || s === noun) return true;

  const TYPE_ONLY = new Set<string>([
    "ubs",
    "ceu",
    "ceus",
    "hospital",
    "hospitais",
    "escola",
    "escolas",
    "biblioteca",
    "bibliotecas",
    "feira",
    "feiras",
    "parque",
    "parques",
    "mercado",
    "mercados",
    "mercado municipal",
    "creche",
    "creches",
    "teatro",
    "teatros",
    "museu",
    "museus",
    "centro esportivo",
    "centro comunitário",
    "delegacia",
    "cemitério",
    "esportes",
    "outros",
    "serviço",
    "posto de saude",
    "posto de saúde",
    "assistência social",
    "terminal/estação de transporte",
    "corpo de bombeiros",
    "ponto de reciclagem",
    "acessibilidade",
  ]);

  if (TYPE_ONLY.has(s)) return true;

  const eng = raw.toLowerCase();
  if (
    ["library", "school", "hospital", "park", "museum", "theater", "other", "daycare", "cemetery"].includes(
      eng,
    )
  ) {
    return true;
  }

  return false;
}

/** Pergunta "Em qual bairro fica …?" com artigo correto em PT */
export function buildServiceRatingBairroPrompt(serviceType: string | undefined): string {
  const t = serviceType || "";
  if (t === "ubs") {
    return "Em qual **bairro** fica a **UBS** que você visitou?";
  }
  if (t === "ceu") {
    return "Em qual **bairro** fica o **CEU** que você visitou?";
  }
  const noun = getServiceRatingNounPt(t);
  const masculineArticleTypes = new Set([
    "hospital",
    "sports_center",
    "community_center",
    "park",
    "market",
    "city_market",
    "theater",
    "museum",
    "cemetery",
    "transit_station",
    "police_station",
    "fire_station",
    "street_market",
    "other",
    "accessibility",
    "recycling_point",
  ]);
  const art = masculineArticleTypes.has(t) ? "o" : "a";
  return `Em qual **bairro** fica ${art} **${noun}** que você visitou?`;
}

// Extract service rating-specific fields
export function extractServiceFields(context: string): Record<string, unknown> {
  const fields: Record<string, unknown> = {};
  
  // Detect service type
  if (context.includes('ubs') || context.includes('posto de saúde') || context.includes('posto de saude')) {
    fields.service_type = 'ubs';
  } else if (context.includes('hospital')) {
    fields.service_type = 'hospital';
  } else if (context.includes('escola')) {
    fields.service_type = 'school';
  } else if (context.includes('ceu')) {
    fields.service_type = 'ceu';
  } else if (context.includes('biblioteca')) {
    fields.service_type = 'library';
  } else if (context.includes('centro esportivo') || context.includes('esporte')) {
    fields.service_type = 'sports_center';
  }
  
  // Extract name/neighborhood from "UBS Butantã", "quero avaliar a UBS Butantã", etc.
  const typeNameMatch = context.match(/\b(ubs|hospital|escola|ceu|biblioteca|centro\s+esportivo)\s+([a-záàâãéèêíìóòôõúùç]+(?:\s+[a-záàâãéèêíìóòôõúùç]+)*?)(?=\s+que|\s*[.,!?]|$)/i);
  if (typeNameMatch) {
    const namePart = typeNameMatch[2].trim();
    if (namePart.length >= 2 && namePart.length <= 50) {
      // Só bairro/local — não preencher service_name com "UBS - X" (evita pular SERVICE_PICKER)
      fields.service_neighborhood = capitalizeWords(namePart);
    }
  }
  
  // Detect rating
  const starsMatch = context.match(/(\d)\s*(?:estrela|nota)/);
  if (starsMatch) {
    fields.rating_stars = parseInt(starsMatch[1]);
  }
  
  // Detect rating_text from short descriptive replies (excelente, ótimo, bom, ruim, etc.)
  const shortCommentMatch = context.match(/^(excelente|ótimo|ótima|otimo|otima|bom|boa|ruim|regular|péssimo|maravilhoso|ótimo atendimento|atendimento excelente|muito bom|muito boa)$/i);
  if (shortCommentMatch && !fields.rating_text) {
    fields.rating_text = shortCommentMatch[1];
  }
  
  // Detect sentiment
  if (context.includes('péssim') || context.includes('horrível') || context.includes('ruim') || context.includes('terrível')) {
    fields.sentiment = 'negative';
  } else if (context.includes('bom') || context.includes('ótim') || context.includes('excelente') || context.includes('elogiar') || context.includes('muito bom')) {
    fields.sentiment = 'positive';
  } else {
    fields.sentiment = 'neutral';
  }
  
  // DO NOT extract service_neighborhood automatically - ask the user
  
  return fields;
}

// Official council member list for validation
export const COUNCIL_MEMBERS = [
  { name: 'Milton Leite', party: 'UNIÃO' },
  { name: 'Rubinho Nunes', party: 'UNIÃO' },
  { name: 'Rodrigo Goulart', party: 'PSD' },
  { name: 'Celso Giannazi', party: 'PSOL' },
  { name: 'Soninha Francine', party: 'CIDADANIA' },
  { name: 'Erika Hilton', party: 'PSOL' },
  { name: 'Amanda Paschoal', party: 'PSOL' },
  { name: 'Luna Zarattini', party: 'PT' },
  { name: 'Janaína Lima', party: 'PP' },
  { name: 'Rinaldi Digilio', party: 'REPUBLICANOS' },
  { name: 'José Turin', party: 'REPUBLICANOS' },
  { name: 'José Ferreira', party: 'MDB' },
  { name: 'Juliana Cardoso', party: 'PT' },
  { name: 'Eduardo Suplicy', party: 'PT' },
  { name: 'Rute Costa', party: 'PL' },
  { name: 'Thammy Miranda', party: 'PL' },
  { name: 'Ricardo Teixeira', party: 'UNIÃO' },
  { name: 'Eliseu Gabriel', party: 'PSB' },
  { name: 'Atílio Francisco', party: 'REPUBLICANOS' },
  { name: 'Eli Corrêa', party: 'UNIÃO' },
  { name: 'Zé Luiz', party: 'REPUBLICANOS' },
  { name: 'Professor Toninho Vespoli', party: 'PSOL' },
  { name: 'Sandra Tadeu', party: 'PL' },
  { name: 'Fabio Riva', party: 'MDB' },
  { name: 'Senival Moura', party: 'PT' },
  { name: 'Tito Bernardes', party: 'PSDB' },
];

// Helper: Find council member matches
export function findCouncilMemberMatches(partialName: string): { found: boolean; matches: Array<{ name: string; party: string }>; suggestion?: string } {
  const nameLower = partialName.toLowerCase().trim();
  
  // Exact match first
  const exactMatch = COUNCIL_MEMBERS.find(v => v.name.toLowerCase() === nameLower);
  if (exactMatch) {
    return { found: true, matches: [exactMatch], suggestion: `${exactMatch.name} (${exactMatch.party})` };
  }
  
  // Partial match (first name, last name, or contains)
  const matches = COUNCIL_MEMBERS.filter(v => {
    const vLower = v.name.toLowerCase();
    const parts = vLower.split(' ');
    return parts.some(part => part.startsWith(nameLower) || nameLower.startsWith(part)) ||
           vLower.includes(nameLower);
  });
  
  if (matches.length === 1) {
    return { found: true, matches, suggestion: `${matches[0].name} (${matches[0].party})` };
  }
  
  if (matches.length > 1) {
    return { found: false, matches: matches.slice(0, 5), suggestion: undefined };
  }
  
  return { found: false, matches: [], suggestion: undefined };
}

// Extract chamber feedback-specific fields
export function extractChamberFields(context: string): Record<string, unknown> {
  const fields: Record<string, unknown> = {
    category: 'feedback_camara'
  };
  
  // Detect feedback type (subcategory)
  if (context.includes('elogiar') || context.includes('elogio') || context.includes('agradecer') || context.includes('parabenizar')) {
    fields.subcategory = 'elogio';
  } else if (context.includes('reclamar') || context.includes('reclamação') || context.includes('reclamacao') || context.includes('denunciar') || context.includes('denúncia')) {
    fields.subcategory = 'reclamacao';
  } else if (context.includes('sugestão') || context.includes('sugestao') || context.includes('sugerir')) {
    fields.subcategory = 'sugestao';
  }
  
  // Detect council member name with validation
  const namePatterns = [
    /(?:vereador|vereadora)\s+([a-záàâãéèêíïóôõöúç\s]+?)(?:\s+por|\s+pelo|\s*,|\s+é|\s+foi|$)/i,
    /(?:ao|à|a)\s+(?:vereador|vereadora)\s+([a-záàâãéèêíïóôõöúç\s]+?)(?:\s+por|\s+pelo|\s*,|$)/i
  ];
  
  for (const pattern of namePatterns) {
    const match = context.match(pattern);
    if (match && match[1] && match[1].trim().length > 2) {
      const rawName = match[1].trim();
      const validation = findCouncilMemberMatches(rawName);
      
      if (validation.found && validation.matches.length === 1) {
        fields.council_member_name = validation.matches[0].name;
        fields.council_member_party = validation.matches[0].party;
      } else {
        // Store raw name for AI to validate
        fields.council_member_name = rawName;
        fields._ambiguous_name = true;
        fields._possible_matches = validation.matches.map(m => `${m.name} (${m.party})`);
      }
      break;
    }
  }
  
  return fields;
}

// Structured journey types that use the DataCollectionTracker
export const STRUCTURED_JOURNEY_TYPES = ['urban_report', 'transport_report', 'service_rating'] as const;

// Detect existing structured journey from conversation history
export function detectExistingJourney(
  conversationHistory: Array<{ role: string; content: string }>
): 'urban_report' | 'transport_report' | 'service_rating' | null {
  // Check for COLLECTION_PROGRESS markers in reverse order (most recent first)
  for (let i = conversationHistory.length - 1; i >= 0; i--) {
    const msg = conversationHistory[i];
    if (msg.role === 'assistant') {
      const progressMatch = msg.content.match(/\[COLLECTION_PROGRESS:(\w+):/);
      if (progressMatch) {
        const type = progressMatch[1] as string;
        if (STRUCTURED_JOURNEY_TYPES.includes(type)) {
          return type;
        }
      }
      // Check for creation markers (journey completed)
      if (msg.content.includes('[REPORT_CREATED:') || 
          msg.content.includes('[TRANSPORT_CREATED:') || 
          msg.content.includes('[RATING_CREATED:')) {
        return null; // Journey was completed
      }
    }
  }
  return null;
}

/**
 * Detecta se a mensagem é pergunta informativa sobre audiência (ex.: "o que é audiência pública?").
 * Usado para forçar intent general e acionar RAG mesmo quando o usuário está na aba Audiências.
 */
export function isInformationalQuestionAboutAudience(userMessage: string): boolean {
  const normalized = userMessage
    .trim()
    .replace(/^0\s*que\s/gi, 'o que ')
    .replace(/\b0\s*que\s/gi, 'o que ');
  return /(o que (é|e) (uma |a )?(audiência|audiencia)(\s+pública|\s+publica)?|como funciona (a )?(audiência|audiencia)(\s+pública|\s+publica)?|o que são (as )?(audiências|audiencias)(\s+públicas|\s+publicas)?)/i.test(normalized);
}

/**
 * Detecta se a mensagem é pergunta sobre como entrar em contato com a Câmara (telefone, email, endereço).
 * Usado para forçar intent general e acionar RAG em vez de iniciar fluxo de relato/feedback.
 */
export function isInformationalQuestionAboutContact(userMessage: string): boolean {
  const m = userMessage.trim().toLowerCase()
    .replace(/\bveread(o|or)\b/g, 'vereador')
    .replace(/\bfala\s+com\b/g, 'falar com');
  const chamber = /câmara|camara|municipal|legislativ|vereador/i.test(m);
  const contact = /como\s+(entrar\s+em\s+)?contato|entrar\s+em\s+contato\s+com|telefone\s+(da\s+)?(câmara|camara)?|email\s+(da\s+)?(câmara|camara)?|endere[cç]o\s+(da\s+)?(câmara|camara)?|falar\s+com\s+(a\s+|um\s+)?(câmara|camara|vereador)|ligar\s+para\s+(a\s+)?(câmara|camara)|contato\s+(da\s+)?(câmara|camara)|como\s+fal(o|ar)\s+com|onde\s+posso\s+encontrar|como\s+faz\s+pra\s+falar\s+com/i.test(m);
  return chamber && (contact || /como\s+entrar\s+em\s+contato/i.test(m));
}

/** Pergunta sobre projetos em tramitação → deve acionar RAG (general). */
export function isInformationalQuestionAboutProjetosTramitacao(userMessage: string): boolean {
  const m = userMessage.toLowerCase();
  return /projetos?\s+(est[aã]o\s+)?em\s+tramita[cç][aã]o|tramita[cç][aã]o\s+(de\s+)?projetos?|quais\s+projetos?\s+est[aã]o/i.test(m);
}

/** Pergunta sobre como buscar audiência pública → deve acionar RAG (general). */
export function isInformationalQuestionAboutBuscarAudiencia(userMessage: string): boolean {
  const m = userMessage.toLowerCase();
  return /(como\s+posso\s+)?buscar\s+(uma\s+)?(audi[eê]ncia|audiencia)|buscar\s+(audi[eê]ncia|audiencia)\s+p[uú]blica/i.test(m);
}

/**
 * Pergunta que pede listagem/agenda de audiências (próximas, quais, quando).
 * Usado para short-circuit: chamar search_audiencias antes da IA e retornar só o texto da ferramenta,
 * evitando que o modelo responda com RAG genérico em vez de chamar a ferramenta.
 */
export function isQuestionAboutProximasOuQuaisAudiencias(userMessage: string): boolean {
  const m = userMessage.trim().toLowerCase();
  return (
    /quais\s+(as\s+)?(pr[oó]ximas?\s+)?(audi[eê]ncias?|audiencias?)(\s+p[uú]blicas?)?/i.test(m) ||
    /(quando\s+(s[aã]o|é)\s+)?(as\s+)?pr[oó]ximas?\s+(audi[eê]ncias?|audiencias?)(\s+p[uú]blicas?)?/i.test(m) ||
    /(tem|ter|existe|existem)\s+(alguma\s+)?(audi[eê]ncia|audiencia)(\s+p[uú]blica)?\s+(pr[oó]xima|agendada)/i.test(m) ||
    /(lista|agenda|calend[aá]rio)\s+(de\s+)?(audi[eê]ncias?|audiencias?)(\s+p[uú]blicas?)?/i.test(m) ||
    /(audi[eê]ncias?|audiencias?)(\s+p[uú]blicas?)?\s+(pr[oó]ximas?|agendadas?)/i.test(m)
  );
}

/** Pergunta claramente fora do escopo (shopping, restaurante, prefeito, multa, horário de comércio) → general para RAG responder "não temos essa informação", sem coletar CEP. */
export function isOutOfScopeQuestion(userMessage: string): boolean {
  const m = userMessage.trim().toLowerCase();
  return (
    /(que\s+horas\s+)(fecha|abre|funciona)\s+(o\s+)?(shopping|restaurante|mercado|loja|comércio|comercio)/i.test(m) ||
    /(shopping|restaurante|mercado)\s+(mais\s+próximo|mais\s+proximo|perto)/i.test(m) ||
    /qual\s+é\s+o\s+melhor\s+restaurante/i.test(m) ||
    /quem\s+é\s+o\s+prefeito/i.test(m) ||
    /(resolv(er|a)|resolver|resolve)\s+(minha\s+)?multa/i.test(m) ||
    /\bmulta\s+(de\s+)?trânsito|\bmulta\s+(de\s+)?transito/i.test(m)
  );
}

/**
 * Pergunta de conhecimento geral sem relação com a Câmara (presidente de país, capital de país, Copa do Mundo, etc.).
 * Usado para retornar resposta padrão "fora do escopo" sem acionar a LLM (relatório M-TECH / controle de escopo).
 */
export function isGeneralKnowledgeOutOfScope(userMessage: string): boolean {
  const m = userMessage.trim().toLowerCase();
  // Exclui perguntas sobre a própria Câmara (presidente da Câmara, vereador, etc.)
  if (/câmara|camara|vereador|comissão|comissao|legislativ/i.test(m)) return false;
  return (
    // Presidente de qualquer país (Japão, EUA, França, Brasil, etc.) — exceto "presidente da Câmara" já excluído acima
    /(quem\s+é\s+o\s+)?presidente\s+(do\s+|da\s+|dos\s+|das\s+)/i.test(m) ||
    /(qual\s+é\s+a\s+)?capital\s+(da\s+)?(frança|franca|espanha|italia|argentina|brasil|méxico|mexico|inglaterra|japão|japao)/i.test(m) ||
    /(quem\s+ganhou\s+)?(a\s+)?copa\s+(do\s+mundo|do\s+mundo\s+de\s+\d{4})/i.test(m) ||
    // Geografia: "São Paulo e de qual Estado?", "qual estado é São Paulo?" (planilha Mauro Lima – única reprovada)
    /s[aã]o\s+paulo\s+(e|é)\s+de\s+qual\s+estado/i.test(m) ||
    /qual\s+estado\s+(é|e)\s+s[aã]o\s+paulo/i.test(m) ||
    /(a\s+)?cidade\s+(de\s+)?s[aã]o\s+paulo\s+(é|e)\s+(de\s+)?qual\s+estado/i.test(m)
  );
}

/** Mensagem padrão quando o cidadão pede opinião/avaliação sobre políticos (bloqueio determinístico). */
export const POLITICIAN_EVALUATION_BLOCKED_MESSAGE =
  'Não posso responder a perguntas sobre avaliação ou desempenho de políticos ou autoridades eleitas — isso foge do escopo deste canal.\n\n' +
  'Posso ajudar com informações institucionais sobre a Câmara, serviços públicos, audiências, projetos de lei, relatos ou encaminhamentos previstos no app.\n\n' +
  '[SHOW_SERVICES_CHIPS]';

/**
 * Perguntas diretas ou subjetivas sobre avaliação/desempenho de políticos (vereador, prefeito, etc.).
 * Não bloqueia: avaliação de serviço público (UBS, escola…), relato/feedback estruturado (elogiar vereador, encaminhar…).
 */
export function isPoliticianPerformanceEvaluationQuestion(userMessage: string): boolean {
  const m = userMessage.trim().toLowerCase();
  if (!m) return false;

  // Fluxos do app: relato urbano / encaminhamento (não confundir com "pedir opinião ao bot")
  if (
    /\bfeedback\s+sobre\s+vereador/i.test(m) ||
    /\belogiar\s+(um\s+)?vereador/i.test(m) ||
    /\bcr[ií]tica\s+ao\s+vereador/i.test(m) ||
    /\bsugest[aã]o\s+para\s+(o\s+)?vereador/i.test(m) ||
    /\belogio\s+ao\s+vereador/i.test(m) ||
    /\bencaminhar.*vereador/i.test(m) ||
    /\bquero\s+encaminhar.*vereador/i.test(m) ||
    /\brelato.*vereador/i.test(m)
  ) {
    return false;
  }

  // Avaliação de serviço ou equipamento público (não pessoa)
  if (
    /\bavaliar\s+(um\s+)?(servi[cç]o|servi[cç]os\s+p[uú]blicos?|ubs|hospital|escola|ceu|biblioteca|posto\s+de\s+sa[uú]de|atendimento|equipamento|creche|parque)/i.test(
      m,
    ) ||
    /\bnota\s+(para|pro)\s+(o\s+)?(servi[cç]o|atendimento|hospital|ubs|posto|escola)/i.test(m) ||
    /\bfazer\s+uma\s+avalia[cç][aã]o\s+de\s+servi[cç]o/i.test(m) ||
    /\bavalia[cç][aã]o\s+de\s+servi[cç]o\s+p[uú]blico/i.test(m)
  ) {
    return false;
  }

  const politico =
    /vereador|vereadora|vereadores|vereadoras|prefeito|prefeita|deputad[oa]s?|pol[ií]ticos?|parlamentares?|presidente\s+da\s+c[iâ]mara|presidente\s+da\s+camara/i;
  if (!politico.test(m)) return false;

  // Comparação direta ("melhor vereador", "pior prefeito")
  if (
    /\b(melhor|pior|mais\s+corrupto|mais\s+honesto)\s+(vereador|vereadora|vereadores|prefeito|prefeita|deputad[oa]|pol[ií]tico)/i.test(
      m,
    )
  ) {
    return true;
  }

  // Subjetivo / comparação / opinião (com menção a político já garantida acima)
  if (
    /\b(o\s+que\s+voc[aê]|que\s+nota|qual\s+nota|d[aê]\s+nota|merece\s+(nota|voto|reelei[cç][aã]o))/i.test(m) ||
    /\b(desempenho|performance|avalia[cç][aã]o|ranking)\b/i.test(m) ||
    /\bopini[aã]o\s+(sobre|do|da|dos|das)/i.test(m) ||
    /\bo\s+que\s+voc[aê]\s+acha/i.test(m) ||
    /\b(gosta|gostam)\s+(do|da|dele|dela)\b/i.test(m) ||
    /\b(trabalha|trabalham)\s+(bem|mal|horr[ií]vel)\b/i.test(m) ||
    /\b(fazendo|fez|faz)\s+(um\s+)?(bom|ruim|ótimo|ótim[oa]|péssim[oa]|excelente)\s+trabalho/i.test(m) ||
    /\b(bom|boa|ruim|r[uú]im|ótimo|ótim[oa]|péssim[oa]|excelente)\s+(trabalho|gest[aã]o)\b/i.test(m)
  ) {
    return true;
  }

  if (
    /\bnota\s+(para|do|da|pro|pra)\s+(o\s+|a\s+)?(vereador|vereadora|prefeito|prefeita|deputad|presidente)\b/i.test(m)
  ) {
    return true;
  }

  if (
    /\b(avaliar|avalia)\s+(o\s+|a\s+|os\s+)?(vereador|vereadora|prefeito|prefeita|deputad|trabalho\s+do\s+vereador|gest[aã]o\s+do\s+prefeito)/i.test(
      m,
    )
  ) {
    return true;
  }

  if (
    /\b(qual|quem)\s+(é\s+)?(o\s+|a\s+)?(melhor|pior)\s+(vereador|vereadora|prefeito|prefeita|deputad|pol[ií]tico)/i.test(m)
  ) {
    return true;
  }

  if (/\branking\s+(de|dos|das)?\s*(vereador|vereadora|prefeito|prefeita|deputad)/i.test(m)) {
    return true;
  }

  return false;
}

/**
 * Perguntas informativas sobre vereador ou Câmara que não devem acionar coleta de relato (CEP).
 * Ex.: perfil da vereadora, frequência nas sessões, quem faltou, gastos da câmara, como falar com vereador.
 * Baseado na planilha "plano de teste executado" e relatório M-TECH (Pontos Críticos a Endereçar).
 */
export function isInformationalQuestionAboutVereadorOrCamara(userMessage: string): boolean {
  const m = userMessage.trim().toLowerCase();
  return (
    /(mostre?\s+o\s+)?perfil\s+(da\s+)?(vereador(a|e)s?|vereadora)/i.test(m) ||
    /frequ[eê]ncia\s+(do|da)\s+vereador(a|e)s?\s+(nas\s+)?sess[oõ]es/i.test(m) ||
    /quais\s+vereadores\s+faltaram\s+(na\s+)?(última|ultima)\s+sess[aã]o/i.test(m) ||
    /quanto\s+a\s+(c[aâ]mara|camara)\s+gasta\s*(por\s+m[eê]s)?/i.test(m) ||
    /(como\s+posso\s+)?falar\s+com\s+(meu\s+)?vereador/i.test(m) ||
    /onde\s+(ta|est[aá])\s+os\s+gastos\s+(dos\s+)?vereadores/i.test(m)
  );
}

/** True quando o cidadão pergunta sobre linhas/paradas/previsão de ônibus (consulta Olho Vivo), não relato de problema. */
export function isBusInformationalQuery(userMessage: string): boolean {
  const m = userMessage.trim().toLowerCase();
  const patterns = [
    /linhas?\s+(de\s+)?(ônibus|onibus)\s+passam/i,
    /quais\s+linhas\s+passam/i,
    /(ônibus|onibus)\s+passam\s+próximo|(ônibus|onibus)\s+passam\s+perto/i,
    /qual\s+(linha|ônibus|onibus)\s+passa/i,
    /quando\s+passa\s+(o\s+)?(ônibus|onibus)/i,
    /itinerário|itinerario\s+(da\s+)?linha/i,
    /previsão\s+de\s+chegada|previsao\s+de\s+chegada/i,
    /(paradas?|pontos?)\s+(de\s+)?(ônibus|onibus)\s+perto|(ônibus|onibus)\s+(que\s+)?passam\s+perto/i,
    /próximo\s+a\s+mim.*(ônibus|onibus|linha)|(ônibus|onibus|linha).*próximo\s+a\s+mim/i,
    /perto\s+de\s+mim.*(ônibus|onibus|linha)|(ônibus|onibus|linha).*perto\s+de\s+mim/i,
  ];
  return patterns.some(p => p.test(m));
}

export function detectCollectionIntent(
  userMessage: string, 
  conversationHistory: Array<{ role: string; content: string }>
): CollectionIntent | null {
  const msgLower = userMessage.toLowerCase();
  
  // === PHASE 1: Detect existing structured journey ===
  const existingJourney = detectExistingJourney(conversationHistory);
  
  // FIX: Use ONLY user messages for context (prevents assistant examples from contaminating category)
  const userOnlyContext = conversationHistory
    .slice(-6)
    .filter(m => m.role === 'user')
    .map(m => m.content.toLowerCase())
    .join(' ');
  const fullUserContext = `${userOnlyContext} ${msgLower}`;
  // Normalização de typos comuns para detecção de intent (planilha plano de teste executado + Pontos Críticos)
  const normalizedForIntent = fullUserContext
    .replace(/\bqero\b/g, 'quero')
    .replace(/\bvereadore(s)?\b/g, 'vereador$1')
    .replace(/\bvereadoe(s)?\b/g, 'vereador$1')
    .replace(/\bveread(o|or)\b/g, 'vereador')
    .replace(/\bsabe\s+dos\b/g, 'saber dos')
    .replace(/\bmunicpal\b/g, 'municipal')
    .replace(/\bprojeots?\b/g, 'projetos')
    .replace(/\bprojetu(s)?\b/g, 'projeto$1')
    .replace(/\bdi\s+lei\b/g, 'de lei')
    .replace(/\bonde\s+ta\b/g, 'onde está')
    .replace(/\bta\s+os\b/g, 'está os')
    .replace(/\bleiiii+\b/g, 'lei')
    .replace(/\bfala\s+(com|pra)\b/g, 'falar $1')
    .replace(/\bfala\s+com\b/g, 'falar com')
    .replace(/\breuniao\b/g, 'reunião');
  
  // Check for intent keywords (REQUIRED to activate tracker)
  const hasIntent = INTENT_KEYWORDS.some(kw => normalizedForIntent.includes(kw));
  
  if (!hasIntent) {
    const excerpt = (userMessage || '').trim().slice(0, 120);
    console.log('[detectCollectionIntent] No intent keywords found, skipping tracker activation');
    console.log('[ai-orchestrator] NÃO FOI POSSÍVEL ASSOCIAR A NENHUM INTENT; RAG NÃO FOI CONSULTADO. Mensagem do usuário (trecho):', excerpt || '(vazia)');
    return null;
  }
  
  // Calculate scores for each type using USER-ONLY context
  const scores: DetectionScore[] = [];
  
  // === EXPLICIT INTENT PHRASES (strongly indicate journey switch) ===
  // IMPORTANT: Urban phrases must be SPECIFIC to avoid matching transport/other contexts
  const explicitUrbanPhrases = [
    'quero fazer uma reclamação', 'quero fazer reclamação', 'quero fazer reclamacao',
    'quero denunciar', 'problema na minha rua', 'problema na cidade', 'problema urbano',
    'problemas na cidade', 'problemas na rua', 'quero falar sobre problemas na cidade',
    'tem um buraco', 'poste apagado', 'lixo acumulado', 'quero abrir um chamado',
    'quero registrar um problema urbano', 'relatar problema urbano', 'fazer um relato urbano',
    'problema na rua', 'problema no bairro', 'problema de infraestrutura',
    'quero falar de problema', 'quero falar sobre cidade', 'quero falar sobre problema',
    'quero fazer um elogio', 'quero elogiar', 'fazer um elogio', 'tenho um elogio',
    'quero dar um elogio', 'elogio à cidade', 'elogio a cidade', 'elogio sobre a cidade',
    'tenho uma sugestão', 'tenho uma sugestao', 'quero sugerir', 'sugestão para a cidade',
    'sugestao para a cidade', 'ideia de melhoria', 'sugestão de melhoria', 'sugestao de melhoria',
    'quero falar sobre a cidade',
    'preciso falar sobre a cidade',
    'preciso falar da cidade',
    'quero falar da cidade',
    'relato na cidade',
    'falar com a cidade',
    'quero abrir um relato',
    'abrir um relato',
    'quero registrar um relato',
    // REMOVED: 'quero relatar um problema' - too generic, matches transport!
  ];
  
  const explicitTransportPhrases = [
    'problema no ônibus', 'problema no onibus', 'problema no metrô', 'problema no metro',
    'problema no trem', 'quero relatar transporte', 'quero reclamar do transporte',
    'ônibus atrasado', 'onibus atrasado', 'metrô lotado', 'metro lotado', 'trem não passou',
    'problema na linha', 'quero falar do ônibus', 'quero falar do onibus',
    'quero fazer um relato de transporte', 'relatar problema de transporte',
    'problema no transporte', 'problema no transporte público', 'problema no transporte publico',
    'relatar um problema no transporte', 'problema de transporte',
    // Campo geral: falar sobre transporte
    'quero falar de transporte', 'quero falar do transporte', 'quero falar sobre transporte',
    'falar de transporte', 'falar sobre transporte', 'mudar para transporte', 'trocar para transporte'
  ];
  
  const explicitRatingPhrases = [
    'quero fazer uma avaliação', 'quero fazer avaliação', 'quero fazer avaliacao',
    'quero avaliar', 'fazer uma avaliação', 'fazer avaliação', 'fazer avaliacao',
    'quero dar nota', 'quero dar uma nota', 'avaliar um serviço', 'avaliar servico',
    'avaliar o serviço', 'avaliar o servico', 'dar minha avaliação', 'deixar avaliação',
    'avaliar atendimento', 'avaliar serviço público', 'avaliar servico publico',
    'avaliar uma ubs', 'avaliar uma escola', 'avaliar um hospital',
    'quero avaliar um serviço', 'quero avaliar um servico',
    // Journey switch phrases
    'quero falar de avaliação', 'quero falar de avaliaçao', 'falar de avaliação',
    'mudar para avaliação', 'trocar para avaliação', 'trocar para avaliaçao'
  ];
  
  const explicitServicesPhrases = [
    'onde fica a ubs', 'onde fica o hospital', 'buscar serviço', 'buscar servico',
    'quero encontrar', 'preciso encontrar', 'procurar uma escola',
    'qual ubs mais perto', 'qual a ubs perto de mim', 'quais ubs perto de mim',
    'quais ubss perto de mim', 'quais as ubs perto de mim', 'quais as ubss perto de mim',
    'quais as ubs\'s perto de mim', 'como chegar na ubs', 'serviços perto de mim',
    'servicos perto de mim', 'onde tem hospital', 'onde tem escola',
    'qual hospital perto de mim', 'quais hospitais perto de mim', 'qual hospital mais perto de mim',
    'quais hospitais mais perto de mim', 'qual escola perto de mim', 'quais escolas perto de mim',
    'qual escola mais perto de mim', 'quais escolas mais perto de mim',
    'qual ceu perto de mim', 'quais ceus perto de mim', 'qual ceu mais perto de mim', 'quais ceus mais perto de mim',
    'qual biblioteca perto de mim', 'quais bibliotecas perto de mim', 'qual biblioteca mais perto de mim', 'quais bibliotecas mais perto de mim',
    'qual a ubs mais perto', 'quais as ubs mais perto', 'qual o hospital mais perto', 'quais os hospitais mais perto',
    'quais assistências sociais mais perto de mim', 'qual assistência social mais perto de mim',
    'quais esportes mais perto de mim', 'qual esporte mais perto de mim',
    'qual transporte mais perto de mim', 'quais transportes mais perto de mim',
    'qual delegacia mais perto de mim', 'quais delegacias mais perto de mim',
    'quero falar sobre serviços', 'quero falar sobre servicos', 'quero falar de serviços',
    'serviços próximos', 'servicos próximos', 'serviços proximos', 'quero serviços próximos'
  ];
  
  const explicitAudienciasPhrases = [
    'quero participar de audiência', 'quero participar de audiencia', 'próxima audiência',
    'proxima audiencia', 'quando tem audiência', 'quando tem audiencia',
    'audiência pública', 'audiencia publica', 'consulta pública', 'consulta publica',
    'quero me inscrever na audiência', 'quero me inscrever na audiencia'
  ];
  
  const explicitHistoryPhrases = [
    'meus relatos', 'meu histórico', 'meu historico', 'o que eu já fiz', 'o que eu ja fiz',
    'quero ver meus relatos', 'como está minha reclamação', 'como esta minha reclamacao',
    'status do meu relato', 'minhas reclamações', 'minhas reclamacoes'
  ];
  
  // NEW: Vereadores phrases (informação / saber sobre = consulta, NÃO relato)
  const explicitVereadoresPhrases = [
    'vereadores da minha região', 'vereadores da minha regiao',
    'quais vereadores representam', 'quem me representa na câmara',
    'quem me representa na camara', 'vereadores do meu bairro',
    'meus vereadores', 'vereador da zona', 'vereadores da zona',
    'quais vereadores representam minha região', 'quais vereadores representam minha regiao',
    'gostaria de saber sobre os vereadores', 'gostaria de saber sobre vereadores',
    'quero saber sobre os vereadores', 'quero saber sobre vereadores',
    'saber sobre os vereadores', 'saber sobre vereadores',
    'informação sobre vereadores', 'informacao sobre vereadores',
    'informação sobre os vereadores', 'informacao sobre os vereadores',
    'vereadores referentes ao bairro', 'vereadores da cidade',
    'vereadores do bairro', 'quem são os vereadores', 'quem sao os vereadores'
  ];
  
  // NEW: Noticias phrases
  const explicitNoticiasPhrases = [
    'últimas notícias', 'ultimas noticias', 'notícias da câmara',
    'noticias da camara', 'novidades legislativas', 'o que está acontecendo na câmara',
    'o que esta acontecendo na camara', 'notícias recentes', 'noticias recentes',
    'quais as últimas notícias', 'quais as ultimas noticias'
  ];

  // Dúvidas gerais sobre a Câmara (não é relato de problema)
  const explicitGeneralPhrases = [
    'tenho uma dúvida', 'tenho uma duvida', 'tenho dúvida', 'tenho duvida',
    'dúvida sobre a câmara', 'duvida sobre a camara', 'dúvida sobre a Câmara',
    'dúvida sobre a Câmara Municipal', 'duvida sobre a camara municipal',
    'tirar dúvida', 'tirar duvida', 'tirar uma dúvida', 'quero tirar dúvida',
    'pergunta sobre a câmara', 'pergunta sobre a camara', 'como funciona a câmara',
    'como funciona a camara', 'quero saber sobre a câmara', 'quero saber sobre a camara',
    'informação sobre a câmara', 'informacao sobre a camara', 'dúvidas sobre a câmara',
    'duvidas sobre a camara'
  ];
  
  // === INTENT CHANGE INDICATORS (generic signals of topic switch) ===
  const intentChangeIndicators = [
    'quero fazer', 'preciso de', 'pode me ajudar com',
    'na verdade', 'mudando de assunto', 'outra coisa',
    'deixa isso', 'esquece isso', 'vamos falar de', 'agora quero',
    'quero falar de', 'quero falar do', 'falar de', 'falar sobre',
    'mudar para', 'trocar para'
  ];
  const hasIntentChange = intentChangeIndicators.some(ind => fullUserContext.includes(ind));
  
  // === GENERIC "quero falar de X" PATTERN DETECTION ===
  type ExplicitIntentType = 'service_rating' | 'urban_report' | 'transport_report' | 'services' | 'audiencias' | 'general' | 'history' | 'occupancy' | 'vereadores' | 'noticias';
  // Inclui preciso/gostaria e "sobre a cidade" → tópico "cidade" (antes capturava só "a")
  const queroFalarMatch = msgLower.match(
    /(?:quero|vou|vamos|preciso|gostaria(?:\s+de)?)\s+falar\s+(?:de|do|da|sobre)\s+(?:a\s+)?(\w+)/i
  );
  let genericTopicIntent: { type: ExplicitIntentType; boost: number } | null = null;
  if (queroFalarMatch) {
    const topic = queroFalarMatch[1].toLowerCase();
    const topicToJourney: Record<string, ExplicitIntentType> = {
      'transporte': 'transport_report',
      'ônibus': 'transport_report',
      'onibus': 'transport_report',
      'metrô': 'transport_report',
      'metro': 'transport_report',
      'trem': 'transport_report',
      'avaliação': 'service_rating',
      'avaliaçao': 'service_rating',
      'avaliações': 'service_rating',
      'avaliacoes': 'service_rating',
      'serviço': 'service_rating',
      'servico': 'service_rating',
      'cidade': 'urban_report',
      'elogio': 'urban_report',
      'sugestão': 'urban_report',
      'sugestao': 'urban_report',
      'problema': 'urban_report',
      'problemas': 'urban_report',
      'rua': 'urban_report',
      'bairro': 'urban_report',
      'urbano': 'urban_report',
      'urbanos': 'urban_report',
      'relato': 'urban_report',
      'relatos': 'urban_report',
      'infraestrutura': 'urban_report',
      'serviços': 'services',
      'servicos': 'services',
      'audiência': 'audiencias',
      'audiencia': 'audiencias',
      'audiências': 'audiencias',
      'audiencias': 'audiencias',
      'vereador': 'vereadores',
      'vereadores': 'vereadores',
      'notícia': 'noticias',
      'noticia': 'noticias',
      'notícias': 'noticias',
      'noticias': 'noticias',
      'histórico': 'history',
      'historico': 'history',
      'dúvida': 'general',
      'duvida': 'general',
      'dúvidas': 'general',
      'duvidas': 'general'
    };
    const mappedJourney = topicToJourney[topic];
    if (mappedJourney) {
      genericTopicIntent = { type: mappedJourney, boost: 20 };
      console.log('[detectCollectionIntent] Generic topic pattern detected:', topic, '→', mappedJourney);
    }
  }
  
  // === EXPLICIT INTENT OVERRIDE (last message takes priority for journey switching) ===
  // If the LAST user message contains an explicit intent phrase,
  // it should override accumulated context for journey switching
  // Note: ExplicitIntentType is already defined above in generic pattern detection
  const lastMsgExplicitIntent: { type: ExplicitIntentType; boost: number } | null = (() => {
    // Check explicit phrases in LAST message only (not accumulated context)
    // Dúvidas gerais primeiro, para não confundir com relato de problema
    if (explicitGeneralPhrases.some(phrase => msgLower.includes(phrase))) {
      return { type: 'general', boost: 15 };
    }
    if (explicitRatingPhrases.some(phrase => msgLower.includes(phrase))) {
      return { type: 'service_rating', boost: 15 };
    }
    if (explicitUrbanPhrases.some(phrase => msgLower.includes(phrase))) {
      return { type: 'urban_report', boost: 15 };
    }
    if (explicitTransportPhrases.some(phrase => msgLower.includes(phrase))) {
      return { type: 'transport_report', boost: 15 };
    }
    if (explicitServicesPhrases.some(phrase => msgLower.includes(phrase))) {
      return { type: 'services', boost: 15 };
    }
    if (explicitAudienciasPhrases.some(phrase => msgLower.includes(phrase))) {
      return { type: 'audiencias', boost: 15 };
    }
    if (explicitHistoryPhrases.some(phrase => msgLower.includes(phrase))) {
      return { type: 'history', boost: 15 };
    }
    // NEW: Vereadores explicit intent
    if (explicitVereadoresPhrases.some(phrase => msgLower.includes(phrase))) {
      return { type: 'vereadores', boost: 15 };
    }
    // NEW: Noticias explicit intent
    if (explicitNoticiasPhrases.some(phrase => msgLower.includes(phrase))) {
      return { type: 'noticias', boost: 15 };
    }
    return null;
  })();

  if (lastMsgExplicitIntent) {
    console.log(`[detectCollectionIntent] Explicit intent in LAST message: ${lastMsgExplicitIntent.type} (boost: ${lastMsgExplicitIntent.boost})`);
  }

  // Consulta informativa sobre ônibus/linhas (Olho Vivo) → general, NÃO transport_report
  const isBusInformationalQuery = (() => {
    const m = msgLower;
    const patterns = [
      /linhas?\s+(de\s+)?(ônibus|onibus)\s+passam/i,
      /quais\s+linhas\s+passam/i,
      /(ônibus|onibus)\s+passam\s+próximo|(ônibus|onibus)\s+passam\s+perto/i,
      /qual\s+(linha|ônibus|onibus)\s+passa/i,
      /quando\s+passa\s+(o\s+)?(ônibus|onibus)/i,
      /itinerário|itinerario\s+(da\s+)?linha/i,
      /previsão\s+de\s+chegada|previsao\s+de\s+chegada/i,
      /(paradas?|pontos?)\s+(de\s+)?(ônibus|onibus)\s+perto|(ônibus|onibus)\s+(que\s+)?passam\s+perto/i,
      /próximo\s+a\s+mim.*(ônibus|onibus|linha)|(ônibus|onibus|linha).*próximo\s+a\s+mim/i,
      /perto\s+de\s+mim.*(ônibus|onibus|linha)|(ônibus|onibus|linha).*perto\s+de\s+mim/i,
    ];
    return patterns.some(p => p.test(m));
  })();
  if (isBusInformationalQuery) {
    console.log('[detectCollectionIntent] Bus/line informational query detected → general (Olho Vivo tools), not transport_report');
    scores.push({ type: 'general', score: 22, fields: {} });
  }

  // Consulta de ocupação de equipamento (ex.: "A UBS X está cheia?") → general com tool de ocupação.
  // Não deve cair em fluxo estruturado de avaliação.
  const isEquipmentOccupancyQuery = (() => {
    const m = msgLower;
    const hasServiceEntity = /\b(ubs|hospital|escola|ceu|biblioteca|posto de sa[úu]de|centro esportivo|equipamento)\b/i.test(m);
    const hasOccupancySignal =
      /(ocup[aã]?[cç][aã]o|lota[cç][aã]o|movimenta[cç][aã]o|est[aá]\s+chei[oa]|t[aá]\s+chei[oa]|lotad[oa]|superlotad[oa])/.test(m);
    const asksNow =
      /(como est[aá]|agora|neste momento|nesse momento|nesse local|neste local|\best[aá]\b.*\?)/.test(m);
    return hasServiceEntity && hasOccupancySignal && asksNow;
  })();
  if (isEquipmentOccupancyQuery) {
    console.log('[detectCollectionIntent] Equipment occupancy query detected → occupancy tool, not service_rating');
    scores.push({ type: 'occupancy', score: 28, fields: {} });
  }

  // Transport scoring (relato de problema: atraso, lotação, etc.)
  const transportDomain = ['ônibus', 'onibus', 'metrô', 'metro', 'trem', 'cptm', 'estação', 'estacao', 'terminal', 'ponto de ônibus', 'transporte', 'transporte público', 'transporte publico'];
  const transportProblems = ['lotado', 'lotação', 'lotacao', 'atraso', 'atrasou', 'demora', 'não passou', 'nao passou', 'quebrou'];
  let transportScore = 0;
  if (!isBusInformationalQuery) {
    transportDomain.forEach(kw => { if (fullUserContext.includes(kw)) transportScore += 4; });
    transportProblems.forEach(kw => { if (fullUserContext.includes(kw)) transportScore += 3; });
    const hasExplicitTransportIntent = explicitTransportPhrases.some(phrase => fullUserContext.includes(phrase));
    if (hasExplicitTransportIntent) {
      transportScore += 5;
      console.log('[detectCollectionIntent] Explicit transport intent detected');
    }
  }
  if (transportScore > 0) {
    scores.push({ type: 'transport_report', score: transportScore, fields: extractTransportFields(fullUserContext) });
  }
  
  // Urban scoring - using USER-ONLY context to prevent assistant contamination
  const urbanDomain = ['buraco', 'poste', 'iluminação', 'iluminacao', 'lixo', 'entulho', 'calçada', 'calcada', 'esgoto', 'pavimentação', 'pavimentacao', 'recape', 'asfaltamento', 'sinalização', 'sinalizacao', 'semáforo', 'semaforo', 'placa', 'faixa de pedestre', 'drenagem', 'sarjeta', 'pluvial', 'água pluvial', 'agua pluvial', 'árvore', 'arvore', 'poda', 'fedor', 'fedido', 'bicho morto', 'animal morto', 'rato', 'bueiro', 'vazamento', 'sujeira', 'fedendo', 'cheiro', 'elogio', 'elogiar', 'sugestão', 'sugestao', 'parabéns', 'parabens', 'agradeço', 'agradeco', 'melhorar a cidade', 'funcionou bem', 'incêndio', 'incendio', 'fogo', 'chamas', 'queimando', 'alagamento', 'alagando', 'enchente', 'inundando', 'chovendo', 'chuva forte', 'fios expostos', 'explosão', 'explosao', 'transformador', 'desabamento', 'atropelamento', 'prédio abandonado', 'predio abandonado'];
  const urbanProblems = ['quebrado', 'apagado', 'acumulado', 'vazando', 'caindo', 'fedendo', 'fedido', 'entupido', 'entupida', 'entupidas', 'entupidos', 'alagado', 'alagando'];
  let urbanScore = 0;
  urbanDomain.forEach(kw => { if (fullUserContext.includes(kw)) urbanScore += 4; });
  urbanProblems.forEach(kw => { if (fullUserContext.includes(kw)) urbanScore += 2; });
  // Check for explicit urban intent
  const hasExplicitUrbanIntent = explicitUrbanPhrases.some(phrase => fullUserContext.includes(phrase));
  if (hasExplicitUrbanIntent) {
    urbanScore += 5;
    console.log('[detectCollectionIntent] Explicit urban intent detected');
  }
  
  // MUTUAL EXCLUSION: If transport keywords present, don't let urban win on generic phrase alone
  const hasTransportContext = transportDomain.some(kw => fullUserContext.includes(kw));
  const hasUrbanContext = urbanDomain.some(kw => fullUserContext.includes(kw));
  if (hasTransportContext && hasExplicitUrbanIntent && !hasUrbanContext) {
    console.log('[detectCollectionIntent] Suppressing urban score - transport context detected without urban keywords');
    urbanScore = 0; // Don't count generic urban phrase when transport context exists
  }
  
  if (urbanScore > 0) {
    // FIX: Extract fields from USER-ONLY context
    scores.push({ type: 'urban_report', score: urbanScore, fields: extractUrbanFields(fullUserContext) });
  }
  
  // Service rating scoring - use user-only context
  const serviceDomain = ['ubs', 'hospital', 'escola', 'ceu', 'biblioteca', 'posto de saúde', 'posto de saude', 'centro esportivo'];
  const ratingTerms = ['avaliar', 'avaliação', 'avaliacao', 'nota', 'estrela', 'atendimento'];
  let serviceScore = 0;
  serviceDomain.forEach(kw => { if (fullUserContext.includes(kw)) serviceScore += 4; });
  ratingTerms.forEach(kw => { if (fullUserContext.includes(kw)) serviceScore += 3; });
  // Check for explicit rating intent phrases - these should trigger journey switch
  const hasExplicitRatingIntent = explicitRatingPhrases.some(phrase => fullUserContext.includes(phrase));
  if (hasExplicitRatingIntent) {
    serviceScore += 5; // Strong boost for explicit intent
    console.log('[detectCollectionIntent] Explicit rating intent detected');
  }
  const hasRatingSignal = ratingTerms.some(term => fullUserContext.includes(term));
  // Evita confundir "UBS X está cheia?" com fluxo de avaliação.
  if (isEquipmentOccupancyQuery) {
    serviceScore = 0;
  }
  if (serviceScore > 0 && (hasRatingSignal || hasExplicitRatingIntent)) {
    scores.push({ type: 'service_rating', score: serviceScore, fields: extractServiceFields(fullUserContext) });
  }
  
  // Chamber feedback scoring - use user-only context
  // IMPORTANTE: NÃO pontuar só com reclamacao/elogio/sugestao — são os mesmos termos dos botões de NATUREZA do relato urbano.
  // Só é feedback à Câmara (vereador/legislativo) quando o cidadão menciona Câmara, vereador, gabinete, etc.
  const chamberDomain = ['vereador', 'vereadora', 'câmara', 'camara', 'parlamentar', 'gabinete', 'cmsp'];
  const feedbackTermsWhenChamberAnchored = ['elogiar', 'elogio', 'reclamar', 'reclamação', 'reclamacao', 'sugestão', 'sugestao', 'denunciar', 'agradecer', 'parabenizar'];
  const factualQuestionTerms = [
    'salário', 'salario', 'quanto ganha', 'remuneração', 'remuneracao', 'qual é o', 'qual e o', 'qual o ', 'qual a ',
    'quanto é', 'quanto e', 'quantos ', 'quantas ', 'valor do', 'atribuições', 'atribuicoes', 'função do', 'funcao do',
    'papel do', 'importância', 'importancia', 'o que faz', 'como funciona', 'o que é a', 'o que e a',
    'competências', 'competencias', 'responsabilidades', 'mandato', 'duração', 'duracao', 'presidente da câmara',
    'comissões', 'comissoes', 'processo legislativo', 'projeto de lei', 'lei municipal', 'lei orgânica', 'lei organica',
    'regimento interno', 'tribuna livre', 'sessão ordinária', 'sessao ordinaria', 'votação', 'votacao', 'quórum', 'quorum',
    'orçamento', 'orcamento', 'emendas', 'verba', 'para que serve', 'por que existe', 'quando foi', 'história', 'historio',
    'como nasce', 'diferença entre', 'diferenca entre', 'requisitos para', 'cargo público', 'cargo publico',
    'o que é uma', 'o que e uma', 'para que serve a', 'como participar da', 'como participar das'
  ];
  const isFactualQuestionAboutChamber = factualQuestionTerms.some(t => fullUserContext.includes(t))
    && fullUserContext.match(/vereador|vereadora|câmara|camara|municipal|legislativo|legislatura|sessão|sessao|audiência|audiencia|lei|projeto/i);
  let chamberScore = 0;
  chamberDomain.forEach(kw => { if (fullUserContext.includes(kw)) chamberScore += 5; });
  const chamberAnchored = chamberDomain.some(kw => fullUserContext.includes(kw));
  // Só soma "elogio/reclamação/..." depois de âncora institucional — evita confundir relato de infraestrutura com feedback à Câmara
  if (chamberAnchored) {
    feedbackTermsWhenChamberAnchored.forEach(kw => { if (fullUserContext.includes(kw)) chamberScore += 4; });
  }
  if (chamberAnchored && chamberScore >= 5 && !isFactualQuestionAboutChamber) {
    scores.push({ type: 'chamber_feedback', score: chamberScore, fields: extractChamberFields(fullUserContext) });
  }
  
  // === LIGHT TOOLS SCORING (services, audiencias, general, history) ===
  
  // Services/Nearby scoring
  const servicesDomain = ['onde fica', 'onde tem', 'perto de mim', 'mais perto', 'próximo de mim', 'próximo de',
                          'como chego', 'endereço', 'telefone', 'horário', 'perto daqui', 'qual é o mais perto'];
  const servicesTypes = ['ubs', 'hospital', 'escola', 'ceu', 'biblioteca', 'centro esportivo', 'posto de saúde'];
  let servicesScore = 0;
  servicesDomain.forEach(kw => { if (fullUserContext.includes(kw)) servicesScore += 4; });
  servicesTypes.forEach(kw => { if (fullUserContext.includes(kw)) servicesScore += 2; });
  // Check for explicit services intent
  const hasExplicitServicesIntent = explicitServicesPhrases.some(phrase => fullUserContext.includes(phrase));
  if (hasExplicitServicesIntent) {
    servicesScore += 5;
    console.log('[detectCollectionIntent] Explicit services intent detected');
  }
  // Only add if it's a search (not evaluation)
  const isEvaluating = ratingTerms.some(term => fullUserContext.includes(term));
  if (servicesScore > 0 && !isEvaluating) {
    scores.push({ type: 'services', score: servicesScore, fields: {} });
  }
  
  // Audiencias scoring  
  const audienciasDomain = ['audiência', 'audiencia', 'consulta pública', 'consulta publica',
                            'participar', 'inscrever', 'próxima reunião', 'proxima reuniao'];
  const audienciasTerms = ['quando', 'próxima', 'proxima', 'tema', 'assunto', 'sobre'];
  let audienciasScore = 0;
  audienciasDomain.forEach(kw => { if (fullUserContext.includes(kw)) audienciasScore += 5; });
  audienciasTerms.forEach(kw => { if (fullUserContext.includes(kw)) audienciasScore += 2; });
  // Check for explicit audiencias intent
  const hasExplicitAudienciasIntent = explicitAudienciasPhrases.some(phrase => fullUserContext.includes(phrase));
  if (hasExplicitAudienciasIntent) {
    audienciasScore += 5;
    console.log('[detectCollectionIntent] Explicit audiencias intent detected');
  }
  if (audienciasScore > 0) {
    scores.push({ type: 'audiencias', score: audienciasScore, fields: {} });
  }
  
  // Knowledge base / general scoring
  const knowledgeDomain = [
    'como funciona', 'como posso', 'como participar', 'o que é', 'o que e', 'quem é', 'quem e', 'qual é', 'qual e', 'qual a ', 'qual o ',
    'quais são', 'quais sao', 'quais as', 'quais os', 'quantos ', 'quantas ', 'me explica', 'dúvida sobre', 'duvida sobre',
    'informação sobre', 'informacao sobre', 'atribuições', 'atribuicoes', 'atribuição', 'atribuicao', 'competências', 'competencias',
    'responsabilidades', 'importância', 'importancia', 'salário', 'salario', 'remuneração', 'remuneracao', 'quanto ganha', 'valor do',
    'onde fica', 'onde fica a', 'onde consultar', 'qual o endereço', 'qual o endereco', 'qual endereço', 'qual endereco',
    'participar das', 'sessões da', 'sessão da', 'audiência', 'audiencia', 'mandato', 'presidente da câmara',
    'comissões', 'comissoes', 'processo legislativo', 'projeto de lei', 'lei municipal', 'lei orgânica', 'lei organica', 'regimento interno',
    'tribuna livre', 'sessão ordinária', 'sessao ordinaria', 'votação', 'votacao', 'quórum', 'quorum', 'orçamento', 'orcamento', 'emendas', 'para que serve', 'como nasce uma lei',
    'cpi', 'cpis', 'comissão parlamentar de inquérito', 'comissao parlamentar de inquerito', 'comissão parlamentar', 'comissao parlamentar',
    'diferença entre', 'diferenca entre', 'requisitos para', 'história da câmara', 'historio da camara', 'o que é uma audiência', 'o que e uma audiencia',
    'equipamentos públicos', 'equipamentos publicos', 'população', 'populacao', 'habitantes', 'densidade', 'sistema viário', 'sistema viario', 'geosampa',
    'ubs', 'unidade de saúde', 'transporte público', 'transporte publico', 'rede de transporte', 'malha viária', 'infraestrutura viária', 'dados da cidade',
    'zoneamento', 'lpuos', 'construir', 'reformar', 'imóvel', 'imovel', 'legislação urbana', 'legislacao urbana', 'siszon', 'smul', 'loteamento', 'uso do solo', 'coeficiente de aproveitamento'
  ];
  let knowledgeScore = 0;
  knowledgeDomain.forEach(kw => { if (fullUserContext.includes(kw)) knowledgeScore += 4; });
  // Normaliza typo comum "0 que" -> "o que" (início ou após fronteira) para detecção de pergunta informativa
  const normalizedUserMessage = userMessage
    .trim()
    .replace(/^0\s*que\s/gi, 'o que ')
    .replace(/\b0\s*que\s/gi, 'o que ');
  // Perguntas informativas sobre a Câmara/vereadores devem acionar RAG (general)
  const isInformationalQuestion = /^(o que (é|e) |como funciona|quem (é|são|sao)|qual (é|e) (a |o )?(função|papel|salário|salario|importância|importancia|competência|competencia)|qual a |qual o |quantos |quantas |me explica|o que são|quais são|quais sao|quais as |quais os |para que serve|por que existe|como nasce|diferença entre|requisitos )/i.test(normalizedUserMessage);
  const isLocationQuestionAboutChamber = /^(onde fica|qual (é|e) (o )?endereço|qual (é|e) (o )?endereco|como chego)/i.test(normalizedUserMessage);
  const isContactQuestionAboutChamber = /como\s+(entrar\s+em\s+)?contato|entrar\s+em\s+contato\s+com|telefone\s+(da\s+)?(câmara|camara)?|email\s+(da\s+)?(câmara|camara)?|endere[cç]o\s+(da\s+)?(câmara|camara)?|falar\s+com\s+(a\s+|um\s+)?(câmara|camara|vereador)|ligar\s+para\s+(a\s+)?(câmara|camara)|contato\s+(da\s+)?(câmara|camara)|como\s+fal(o|ar)\s+com|como\s+faz\s+pra\s+falar\s+com/i.test(normalizedForIntent);
  const isParticipationQuestion = /^(como posso participar|como participar|participar das sessões|participar da sessão)/i.test(normalizedUserMessage);
  const mentionsChamber = fullUserContext.match(/câmara|camara|municipal|legislativo|vereador|vereadores/i);
  const mentionsSessionsOrAudience = fullUserContext.match(/sessões|sessão|audiência|audiencia|participar/i);
  // Variações: "o que é audiência (pública)?", "o que é uma audiência (pública)?", "o que é a audiência (pública)?", com/sem acento
  const isInformationalAboutAudience = (mentionsSessionsOrAudience && /(o que (é|e) (uma |a )?(audiência|audiencia)(\s+pública|\s+publica)?|como funciona (a )?(audiência|audiencia)(\s+pública|\s+publica)?|o que são (as )?(audiências|audiencias)(\s+públicas|\s+publicas)?)/i.test(normalizedUserMessage));
  // GeoSampa / cidade / zoneamento: equipamentos, transportes, população, sistema viário, zoneamento (perguntas informativas → general/RAG)
  const cityDataTerms = ['equipamentos', 'equipamento público', 'população', 'habitantes', 'densidade', 'sistema viário', 'sistema viario', 'geosampa', 'ubs', 'transporte público', 'rede de transporte', 'malha viária', 'dados da cidade', 'são paulo', 'sao paulo', 'zoneamento', 'lpuos', 'construir', 'imóvel', 'imovel', 'siszon', 'legislação urbana', 'legislacao urbana'];
  const isCityDataQuestion = cityDataTerms.some(t => fullUserContext.includes(t)) && (isInformationalQuestion || /^(qual a |qual o |quantos |quais |como funciona|o que é )/i.test(userMessage.trim()));
  if (isCityDataQuestion) {
    knowledgeScore = Math.max(knowledgeScore, 6);
    console.log('[detectCollectionIntent] City data question (equipamentos/transportes/população/viário/zoneamento) → boosting general for RAG');
  }
  // Zoneamento / LPUOS / construir no imóvel: priorizar base de conhecimento (Supabase KB tem conteúdo)
  const zoneamentoTerms = ['zoneamento', 'lpuos', 'construir', 'reformar', 'imóvel', 'imovel', 'siszon', 'legislação urbana', 'legislacao urbana', 'smul'];
  const isZoneamentoQuestion = zoneamentoTerms.some(t => fullUserContext.includes(t));
  if (isZoneamentoQuestion) {
    knowledgeScore = Math.max(knowledgeScore, 9);
    console.log('[detectCollectionIntent] Zoneamento/LPUOS/construir question → boosting general for RAG/KB');
  }
  if (mentionsChamber && (isInformationalQuestion || isLocationQuestionAboutChamber)) {
    knowledgeScore = Math.max(knowledgeScore, 6);
    console.log('[detectCollectionIntent] Informational/location question about Câmara → boosting general for RAG');
  }
  if (mentionsChamber && isContactQuestionAboutChamber) {
    knowledgeScore = Math.max(knowledgeScore, 9);
    console.log('[detectCollectionIntent] Contact question (telefone/email/contato com Câmara) → boosting general for RAG');
  }
  if ((isParticipationQuestion && mentionsSessionsOrAudience) || (mentionsChamber && isParticipationQuestion)) {
    knowledgeScore = Math.max(knowledgeScore, 6);
    console.log('[detectCollectionIntent] Participation question (sessões/audiência) → boosting general for RAG');
  }
  if (isInformationalAboutAudience) {
    knowledgeScore = Math.max(knowledgeScore, 8);
    console.log('[detectCollectionIntent] Informational question about audiência (o que é / como funciona) → boosting general for RAG');
  }
  if ((fullUserContext.includes('atribuições') || fullUserContext.includes('atribuicoes')) && mentionsChamber) {
    knowledgeScore = Math.max(knowledgeScore, 6);
    console.log('[detectCollectionIntent] Question about atribuições/vereadores → boosting general for RAG');
  }
  if (isFactualQuestionAboutChamber) {
    knowledgeScore = Math.max(knowledgeScore, 7);
    console.log('[detectCollectionIntent] Factual question about vereador/Câmara (salário, função, etc.) → boosting general for RAG');
  }
  // Apresentação da estrutura e funcionamento da Câmara (card ClickUp)
  if (isCamaraFuncionamentoInternoQuery(fullUserContext)) {
    knowledgeScore = Math.max(knowledgeScore, 8);
    console.log('[detectCollectionIntent] Estrutura/funcionamento da Câmara → boosting general for RAG');
  }
  // Projetos em tramitação (PL 4 - planilha RAG)
  const isProjetosTramitacao = /projetos?\s+(est[aã]o\s+)?em\s+tramita[cç][aã]o|tramita[cç][aã]o\s+(de\s+)?projetos?|quais\s+projetos?\s+est[aã]o/i.test(fullUserContext);
  if (isProjetosTramitacao) {
    knowledgeScore = Math.max(knowledgeScore, 8);
    console.log('[detectCollectionIntent] Projetos em tramitação → boosting general for RAG');
  }
  // Como buscar audiência pública (PL 8 - planilha RAG)
  const isBuscarAudiencia = /(como\s+posso\s+)?buscar\s+(uma\s+)?(audi[eê]ncia|audiencia)|buscar\s+(audi[eê]ncia|audiencia)\s+p[uú]blica/i.test(fullUserContext);
  if (isBuscarAudiencia) {
    knowledgeScore = Math.max(knowledgeScore, 8);
    console.log('[detectCollectionIntent] Buscar audiência pública → boosting general for RAG');
  }
  // Qual vereador / saber dos vereadores (PL 11, 16 - planilha RAG)
  const isQualVereadorOuSaber = /qual\s+vereador|quais\s+vereadores|(quero\s+)?saber\s+(dos\s+)?(os\s+)?vereadores|vereadore?s?\s+de\s+sp/i.test(normalizedForIntent);
  if (isQualVereadorOuSaber && mentionsChamber) {
    knowledgeScore = Math.max(knowledgeScore, 7);
    console.log('[detectCollectionIntent] Qual vereador / saber vereadores → boosting general for RAG');
  }
  // Planilha Funcionais / Não Funcionais: votações, canal oficial, comissões, processo legislativo, reunião
  const isVotacoesOuCanal = /(últimas\s+)?vota[cç][oõ]es|canal\s+oficial|sugest[oõ]es\s+ou\s+reclama[cç][oõ]es/i.test(normalizedForIntent);
  const isComissoesOuProcesso = /papel\s+das\s+comiss[oõ]es|comiss[oõ]es\s+(dentro\s+)?da\s+(c[aâ]mara|camara)|processo\s+legislativo|processo\s+de\s+vota[cç][aã]o|tipos\s+de\s+projetos|acompanhar\s+(as\s+)?atividades/i.test(normalizedForIntent);
  const isReuniaoCamara = /reuni[aã]o\s+da\s+(c[aâ]mara|camara)|alguma\s+reuni[aã]o|tem\s+reuni[aã]o/i.test(normalizedForIntent);
  const isConsultarProjetos = /consultar\s+projetos\s+de\s+lei|onde\s+(posso\s+)?consultar\s+os\s+projetos|onde\s+vejo\s+os\s+projetos/i.test(normalizedForIntent);
  if (mentionsChamber && (isVotacoesOuCanal || isComissoesOuProcesso || isReuniaoCamara || isConsultarProjetos)) {
    knowledgeScore = Math.max(knowledgeScore, 8);
    console.log('[detectCollectionIntent] Planilha Funcionais (votações/comissões/reunião/consultar projetos) → boosting general for RAG');
  }
  if (knowledgeScore > 0) {
    scores.push({ type: 'general', score: knowledgeScore, fields: {} });
  }
  
  // History scoring
  const historyDomain = ['meu relato', 'meus relatos', 'minhas avaliações', 'minhas avaliacoes',
                         'minha reclamação', 'minha reclamacao', 'status do meu', 'o que eu fiz',
                         'minha denúncia', 'minha denuncia', 'meu histórico', 'meu historico'];
  let historyScore = 0;
  historyDomain.forEach(kw => { if (fullUserContext.includes(kw)) historyScore += 5; });
  // Check for explicit history intent
  const hasExplicitHistoryIntent = explicitHistoryPhrases.some(phrase => fullUserContext.includes(phrase));
  if (hasExplicitHistoryIntent) {
    historyScore += 5;
    console.log('[detectCollectionIntent] Explicit history intent detected');
  }
  if (historyScore > 0) {
    scores.push({ type: 'history', score: historyScore, fields: {} });
  }
  
  // NEW: Vereadores scoring
  const vereadoresDomain = ['vereador', 'vereadora', 'representante', 'parlamentar'];
  const vereadoresTerms = ['minha região', 'minha regiao', 'meu bairro', 'quem representa', 'zona'];
  let vereadoresScore = 0;
  vereadoresDomain.forEach(kw => { if (fullUserContext.includes(kw)) vereadoresScore += 4; });
  vereadoresTerms.forEach(kw => { if (fullUserContext.includes(kw)) vereadoresScore += 3; });
  const hasExplicitVereadoresIntent = explicitVereadoresPhrases.some(phrase => fullUserContext.includes(phrase));
  if (hasExplicitVereadoresIntent) {
    vereadoresScore += 5;
    console.log('[detectCollectionIntent] Explicit vereadores intent detected');
  }
  if (vereadoresScore > 0 && !isEvaluating) {
    scores.push({ type: 'vereadores', score: vereadoresScore, fields: {} });
  }
  
  // NEW: Noticias scoring
  const noticiasDomain = ['notícia', 'noticia', 'novidade', 'acontecendo', 'recente'];
  const noticiasTerms = ['câmara', 'camara', 'legislativo', 'vereador'];
  let noticiasScore = 0;
  noticiasDomain.forEach(kw => { if (fullUserContext.includes(kw)) noticiasScore += 4; });
  noticiasTerms.forEach(kw => { if (fullUserContext.includes(kw)) noticiasScore += 2; });
  const hasExplicitNoticiasIntent = explicitNoticiasPhrases.some(phrase => fullUserContext.includes(phrase));
  if (hasExplicitNoticiasIntent) {
    noticiasScore += 5;
    console.log('[detectCollectionIntent] Explicit noticias intent detected');
  }
  if (noticiasScore > 0) {
    scores.push({ type: 'noticias', score: noticiasScore, fields: {} });
  }
  
  // No matches found
  if (scores.length === 0) {
    console.log('[detectCollectionIntent] Intent found but no domain keywords matched');
    return null;
  }
  
  // === APPLY EXPLICIT INTENT BOOST FROM LAST MESSAGE ===
  // This ensures the last user message takes priority for journey switching
  if (lastMsgExplicitIntent) {
    const targetScore = scores.find(s => s.type === lastMsgExplicitIntent.type);
    if (targetScore) {
      targetScore.score += lastMsgExplicitIntent.boost;
      console.log(`[detectCollectionIntent] Applied explicit intent boost: ${lastMsgExplicitIntent.type} now has score ${targetScore.score}`);
    } else {
      // If no score exists for this type, create one with appropriate fields
      let fields = {};
      if (lastMsgExplicitIntent.type === 'urban_report') {
        fields = extractUrbanFields(msgLower);
      } else if (lastMsgExplicitIntent.type === 'transport_report') {
        fields = extractTransportFields(msgLower);
      } else if (lastMsgExplicitIntent.type === 'service_rating') {
        fields = extractServiceFields(msgLower);
      }
      scores.push({ 
        type: lastMsgExplicitIntent.type, 
        score: lastMsgExplicitIntent.boost, 
        fields 
      });
      console.log(`[detectCollectionIntent] Created new score for explicit intent: ${lastMsgExplicitIntent.type} with score ${lastMsgExplicitIntent.boost}`);
    }
  }
  
  // === Apply genericTopicIntent boost (from "quero falar de X" pattern) ===
  if (genericTopicIntent) {
    const existingScore = scores.find(s => s.type === genericTopicIntent!.type);
    if (existingScore) {
      existingScore.score += genericTopicIntent.boost;
      console.log(`[detectCollectionIntent] Applied generic topic boost to ${genericTopicIntent.type}: +${genericTopicIntent.boost}`);
    } else {
      scores.push({ 
        type: genericTopicIntent.type, 
        score: genericTopicIntent.boost, 
        fields: {} 
      });
      console.log(`[detectCollectionIntent] Created new score from generic topic: ${genericTopicIntent.type} with score ${genericTopicIntent.boost}`);
    }
  }
  
  // Sort by score and select winner (AFTER applying explicit intent boost)
  let winner = scores.sort((a, b) => b.score - a.score)[0];
  console.log('[detectCollectionIntent] Scores:', JSON.stringify(scores.map(s => ({ type: s.type, score: s.score }))));
  console.log('[detectCollectionIntent] Winner:', winner.type, 'with score:', winner.score);
  
  // === INTENT CHANGE BOOST ===
  // If user signals topic change and winner has some score, boost it
  // CRITICAL: Use LARGE boost to overcome accumulated context from previous journey
  if (hasIntentChange && winner.score > 0 && winner.type !== existingJourney) {
    const boostAmount = 10; // Increased from 2 to 10
    winner = { ...winner, score: winner.score + boostAmount };
    console.log('[detectCollectionIntent] Intent change indicator detected, boosted by', boostAmount, 'to:', winner.score);
  }
  
  // === ADAPTIVE THRESHOLD based on journey type ===
  // Structured journeys need higher confidence, light tools can be triggered more easily
  const thresholds: Record<string, number> = {
    'urban_report': 3,      // Lower: catch natural complaints like "tem um buraco"
    'transport_report': 3,  // Lower: catch "ônibus lotado"
    'service_rating': 3,    // Lower: catch explicit "quero avaliar" - allows journey switch
    'chamber_feedback': 9,  // Câmara/vereador + termo de feedback (evita confundir com botões reclamacao/elogio do relato urbano)
    'services': 4,          // Medium: needs location question
    'audiencias': 4,        // Medium: needs audiencia reference
    'general': 4,           // Medium: needs knowledge question
    'history': 4,           // Medium: needs personal reference
    'vereadores': 4,        // Medium: needs vereador reference
    'noticias': 4,          // Medium: needs news reference
  };
  
  const threshold = thresholds[winner.type] || 5;
  
  // === UNIVERSAL JOURNEY SWITCH DETECTION ===
  // Detect switches between ANY journey types (structured or light)
  const allJourneyTypes = ['urban_report', 'transport_report', 'service_rating', 
                           'services', 'audiencias', 'general', 'history', 'occupancy',
                           'vereadores', 'noticias'] as const;
  const structuredTypes = ['urban_report', 'transport_report', 'service_rating'] as const;
  
  const isWinnerInAllTypes = allJourneyTypes.includes(winner.type as typeof allJourneyTypes[number]);
  const isExistingInAllTypes = existingJourney && allJourneyTypes.includes(existingJourney as typeof allJourneyTypes[number]);
  const isWinnerStructured = structuredTypes.includes(winner.type as typeof structuredTypes[number]);
  const isExistingStructured = existingJourney && structuredTypes.includes(existingJourney as typeof structuredTypes[number]);
  
  // If user is in ANY journey and wants to switch to ANY other with reasonable confidence
  if (isExistingInAllTypes && isWinnerInAllTypes && winner.type !== existingJourney && winner.score >= 3) {
    console.log(`[detectCollectionIntent] Universal journey switch detected: ${existingJourney} → ${winner.type} (score: ${winner.score})`);
    
    // For structured -> structured switches, AI will use confirm_journey_switch if there are fields
    // For any -> light switches, just return the new journey directly
    if (isWinnerStructured) {
      const validType = winner.type as 'urban_report' | 'transport_report' | 'service_rating';
      return { type: validType, fields: winner.fields };
    }
    
    // For light journeys, return as-is (will inject tool hint)
    return { type: winner.type as CollectionIntent['type'], fields: winner.fields };
  }
  
  if (winner.score < threshold) {
    console.log(`[detectCollectionIntent] Winner score ${winner.score} below threshold ${threshold} for ${winner.type}, skipping`);
    // === PHASE 1: If there's an existing structured journey, maintain it ===
    if (existingJourney) {
      console.log(`[detectCollectionIntent] Maintaining existing journey: ${existingJourney}`);
      const accumulatedFields = accumulateFieldsFromHistory(conversationHistory, existingJourney);
      return { type: existingJourney, fields: accumulatedFields };
    }
    return null;
  }
  
  // Chamber feedback is stored as urban_report with category=feedback_camara
  if (winner.type === 'chamber_feedback') {
    return { type: 'urban_report', fields: winner.fields };
  }
  
  // === PHASE 1: Check if we should maintain existing journey ===
  // If there's an existing structured journey and the new winner is a "light" type with LOW score, keep existing
  const lightTypes = ['services', 'audiencias', 'general', 'history', 'occupancy'];
  if (existingJourney && isExistingStructured && lightTypes.includes(winner.type) && winner.score < 6) {
    console.log(`[detectCollectionIntent] Existing journey ${existingJourney} preserved (new intent was light with low score: ${winner.type}=${winner.score})`);
    const accumulatedFields = accumulateFieldsFromHistory(conversationHistory, existingJourney);
    return { type: existingJourney, fields: accumulatedFields };
  }
  
  // For light tools, inject tool hint for the AI
  const toolHint = getToolHintForIntent(winner.type);
  if (toolHint) {
    console.log(`[detectCollectionIntent] Light journey detected: ${winner.type}, hint: ${toolHint}`);
  }
  
  return { type: winner.type as CollectionIntent['type'], fields: winner.fields };
}

// Tools moved to lib-tools.ts to reduce bundle size
export { tools } from "./lib-tools.ts";


// System prompt moved to lib-prompts.ts to reduce bundle size
export { systemPrompt } from "./lib-prompts.ts";

// ========== OLHO VIVO API (SPTrans ônibus São Paulo) ==========
const OLHOVIVO_BASE = "https://api.olhovivo.sptrans.com.br/v2.1";
const OLHOVIVO_GATEWAY_BASE = "https://gateway.apilib.prefeitura.sp.gov.br/sptrans/olhovivo/v2.1";
let olhoVivoCookie: string | null = null;
/** Quando true, usar gateway da Prefeitura com Bearer em vez de cookie (API Store). */
let olhoVivoUseBearer: boolean = false;
let olhoVivoBearerToken: string | null = null;

async function olhoVivoLogin(): Promise<boolean> {
  const token = Deno.env.get("OLHOVIVO_API_TOKEN");
  if (!token?.trim()) {
    console.warn("[olhoVivo] OLHOVIVO_API_TOKEN not set");
    return false;
  }
  const trimmedToken = token.trim();

  // 1) Tentar autenticação clássica (api.olhovivo.sptrans.com.br + cookie)
  try {
    console.warn("[olhoVivo] Trying classic login (POST)...");
    const loginUrl = `${OLHOVIVO_BASE}/Login/Autenticar?token=${encodeURIComponent(trimmedToken)}`;
    const res = await fetch(loginUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "CamaraNaMao/1.0 (https://github.com/camara-na-mao)",
      },
      body: new URLSearchParams({ token: trimmedToken }).toString(),
      redirect: "follow",
    });
    const text = await res.text();
    console.warn("[olhoVivo] Classic login status:", res.status, "bodyLen:", text?.length ?? 0, "bodySample:", text?.trim().slice(0, 120) ?? "");
    // Capturar todos os cookies (Fetch pode enviar vários Set-Cookie; getSetCookie existe no Deno)
    const setCookies = (res.headers as Headers & { getSetCookie?(): string[] }).getSetCookie?.() ?? [];
    if (setCookies.length > 0) {
      olhoVivoCookie = setCookies.map((c) => c.split(";")[0].trim()).join("; ");
    } else {
      const single = res.headers.get("set-cookie");
      if (single) olhoVivoCookie = single.split(";")[0].trim();
    }
    const trimmed = text?.trim() ?? "";
    let ok = trimmed === "true";
    if (!ok && trimmed.length < 20) {
      try {
        const parsed = JSON.parse(trimmed);
        ok = parsed === true;
      } catch {
        /* ignore */
      }
    }
    if (trimmed === "false") {
      console.warn("[olhoVivo] API retornou false no login. A SPTrans pode estar rejeitando requisições da origem (ex.: datacenter). Considere: (1) pedir à SPTrans liberação para uso server-side; (2) usar token do API Store (Prefeitura) com app inscrito na API Olho Vivo v2.1.");
    }
    if (ok) {
      olhoVivoUseBearer = false;
      olhoVivoBearerToken = null;
      return true;
    }
  } catch (e) {
    console.warn("[olhoVivo] Classic login failed:", (e as Error).message, (e as Error).stack?.slice(0, 300));
  }

  // 2) Se falhou, usar token como Bearer no gateway (só faz sentido para token do API Store, não para chave SPTrans)
  const looksLikeSptransKey = /^[a-f0-9]{64}$/i.test(trimmedToken);
  if (looksLikeSptransKey) {
    console.warn("[olhoVivo] Token parece chave SPTrans; não tentando gateway Bearer.");
  }
  if (!looksLikeSptransKey) {
    try {
      const testUrl = `${OLHOVIVO_GATEWAY_BASE}/Linha/Buscar?termosBusca=0`;
      const testRes = await fetch(testUrl, {
        headers: { Authorization: `Bearer ${trimmedToken}` },
      });
      if (testRes.ok || testRes.status === 200) {
        olhoVivoCookie = null;
        olhoVivoUseBearer = true;
        olhoVivoBearerToken = trimmedToken;
        console.log("[olhoVivo] Using gateway (Bearer) auth");
        return true;
      }
      const body = await testRes.text();
      if (testRes.status === 403) {
        console.warn("[olhoVivo] Gateway 403 Forbidden: o token do API Store não tem permissão para a API Olho Vivo. No portal apilib.prefeitura.sp.gov.br, inscreva o aplicativo na API Olho Vivo v2.1 (Production/Sandbox).");
      } else {
        console.warn("[olhoVivo] Gateway Bearer test status:", testRes.status, "body:", body?.slice(0, 200));
      }
    } catch (e) {
      console.warn("[olhoVivo] Gateway Bearer test failed:", (e as Error).message);
    }
  }

  console.warn("[olhoVivo] Login returned: false (classic and gateway failed)");
  return false;
}

async function olhoVivoGet(path: string): Promise<{ ok: boolean; data?: unknown; status: number }> {
  const base = olhoVivoUseBearer ? OLHOVIVO_GATEWAY_BASE : OLHOVIVO_BASE;
  const url = path.startsWith("http") ? path : `${base}${path.startsWith("/") ? path : "/" + path}`;

  if (olhoVivoUseBearer && olhoVivoBearerToken) {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${olhoVivoBearerToken}` },
    });
    const contentType = res.headers.get("content-type") || "";
    let data: unknown;
    if (contentType.includes("application/json")) {
      data = await res.json();
    } else {
      data = await res.text();
    }
    return { ok: res.ok, data, status: res.status };
  }

  if (!olhoVivoCookie) {
    const loggedIn = await olhoVivoLogin();
    if (!loggedIn) return { ok: false, status: 401 };
    return olhoVivoGet(path);
  }

  const res = await fetch(url, {
    headers: { Cookie: olhoVivoCookie },
  });
  if (res.status === 401) {
    olhoVivoCookie = null;
    const loggedIn = await olhoVivoLogin();
    if (!loggedIn) return { ok: false, status: 401 };
    return olhoVivoGet(path);
  }
  const contentType = res.headers.get("content-type") || "";
  let data: unknown;
  if (contentType.includes("application/json")) {
    data = await res.json();
  } else {
    data = await res.text();
  }
  return { ok: res.ok, data, status: res.status };
}

/** Buscar linhas por número ou nome (ex: 8000, Lapa). Retorna array com cl, lt, tp, ts, sl. */
export async function olhoVivoSearchLines(termosBusca: string): Promise<{ success: boolean; lines?: Array<{ cl: number; lt: string; tp: string; ts: string; sl: number }>; error?: string }> {
  const q = encodeURIComponent(termosBusca.trim());
  const { ok, data, status } = await olhoVivoGet(`/Linha/Buscar?termosBusca=${q}`);
  if (!ok || !Array.isArray(data)) {
    return { success: false, error: status === 401 ? "API Olho Vivo não configurada." : "Não foi possível buscar linhas." };
  }
  return { success: true, lines: data as Array<{ cl: number; lt: string; tp: string; ts: string; sl: number }> };
}

/** Buscar paradas por nome ou endereço. Retorna array com cp, np, ed, py, px. */
export async function olhoVivoSearchStops(termosBusca: string): Promise<{ success: boolean; stops?: Array<{ cp: number; np: string; ed: string; py: number; px: number }>; error?: string }> {
  const q = encodeURIComponent(termosBusca.trim());
  const { ok, data, status } = await olhoVivoGet(`/Parada/Buscar?termosBusca=${q}`);
  if (!ok || !Array.isArray(data)) {
    return { success: false, error: status === 401 ? "API Olho Vivo não configurada." : "Não foi possível buscar paradas." };
  }
  return { success: true, stops: data as Array<{ cp: number; np: string; ed: string; py: number; px: number }> };
}

/** Itinerário da linha: paradas em ordem. codigoLinha = cl da linha. */
export async function olhoVivoGetStopsByLine(codigoLinha: number): Promise<{ success: boolean; stops?: Array<{ cp: number; np: string; ed: string; py: number; px: number }>; error?: string }> {
  const { ok, data, status } = await olhoVivoGet(`/Parada/BuscarParadasPorLinha?codigoLinha=${codigoLinha}`);
  if (!ok || !Array.isArray(data)) {
    return { success: false, error: status === 401 ? "API Olho Vivo não configurada." : "Não foi possível buscar itinerário." };
  }
  return { success: true, stops: data as Array<{ cp: number; np: string; ed: string; py: number; px: number }> };
}

/** Previsão de chegada na parada para uma linha. codigoParada e codigoLinha = códigos da API. */
export async function olhoVivoPrevisao(codigoParada: number, codigoLinha: number): Promise<{
  success: boolean;
  parada?: { np: string; l?: Array<{ c: string; cl: number; lt0: string; lt1: string; vs: Array<{ p: string; t?: string; a?: boolean }> }> };
  error?: string;
}> {
  const { ok, data, status } = await olhoVivoGet(`/Previsao?codigoParada=${codigoParada}&codigoLinha=${codigoLinha}`);
  if (!ok || !data || typeof data !== "object") {
    return { success: false, error: status === 401 ? "API Olho Vivo não configurada." : "Não foi possível obter previsão." };
  }
  const obj = data as { p?: { np?: string; l?: Array<{ c: string; cl: number; lt0: string; lt1: string; vs: Array<{ p: string; t?: string; a?: boolean }> }> } };
  return { success: true, parada: obj.p };
}

/** Previsão de chegada de todas as linhas em um ponto de parada. GET /Previsao/Parada?codigoParada= */
export async function olhoVivoPrevisaoParada(codigoParada: number): Promise<{
  success: boolean;
  parada?: { np?: string; l?: Array<{ c: string; cl: number; lt0: string; lt1: string; vs: Array<{ p: string; t?: string; a?: boolean }> }> };
  error?: string;
}> {
  const { ok, data, status } = await olhoVivoGet(`/Previsao/Parada?codigoParada=${codigoParada}`);
  if (!ok || !data || typeof data !== "object") {
    return { success: false, error: status === 401 ? "API Olho Vivo não configurada." : "Não foi possível obter previsão." };
  }
  const obj = data as { p?: { np?: string; l?: Array<{ c: string; cl: number; lt0: string; lt1: string; vs: Array<{ p: string; t?: string; a?: boolean }> }> } };
  return { success: true, parada: obj.p };
}


// Helper: Get friendly service type name (alinhado ao InlineServiceTypePicker / Perto de você)
export function getServiceTypeName(type: string): string {
  const names: Record<string, string> = {
    'ubs': 'UBS',
    'school': 'escolas',
    'ceu': 'CEUs',
    'hospital': 'hospitais',
    'library': 'bibliotecas',
    'sports_center': 'centros esportivos',
    'transit_station': 'pontos de ônibus e transporte',
    'park': 'parques',
    'street_market': 'feiras',
    'community_center': 'centros comunitários',
    'daycare': 'creches',
    'market': 'mercados',
    'city_market': 'mercados municipais',
    'theater': 'teatros e cinema',
    'museum': 'museus',
    'social_assistance': 'assistência social',
    'police_station': 'delegacia e polícia',
    'cemetery': 'cemitérios',
    'accessibility': 'acessibilidade',
    'recycling_point': 'reciclagem e limpeza',
    'fire_station': 'bombeiros',
    'other': 'serviços'
  };
  return names[type] || 'serviços';
}

/** Infer service_type from user text (ex.: "parques mais perto", "UBS próximo a mim" → park, ubs). Reconhece todos os equipamentos do módulo Perto de você. */
export function inferServiceTypeFromText(text: string): string | null {
  const t = text.toLowerCase().trim();
  // UBS: singular, plural (UBSs, UBS's) e variações (aspas retas e curvas)
  if (/\bubs[\u0027\u2019']?s?\b|unidade\s+b[aá]sica\s+de\s+sa[uú]de|posto\s+de\s+sa[uú]de|sa[uú]de\s+p[uú]blica/.test(t)) return 'ubs';
  if (/\bceu[s]?\b|centro\s+educacional/.test(t)) return 'ceu';
  if (/\bhospital(is)?\b|\bhospitais\b/.test(t)) return 'hospital';
  if (/\bescola[s]?\b|educa[cç][aã]o/.test(t)) return 'school';
  if (/\bbiblioteca[s]?\b/.test(t)) return 'library';
  if (/\bcentro\s+esportivo|esportivo[s]?\b|esporte[s]?\b|quadra[s]?|academia\s+p[uú]blica/.test(t)) return 'sports_center';
  if (/\bparque[s]?\b|parques?\s+pr[oó]ximos?/.test(t)) return 'park';
  if (/\bfeira[s]?\s+(livres?|de\s+rua)?|feira\s+livre/.test(t)) return 'street_market';
  if (/\bcentro[s]?\s+comunit[aá]rio|comunit[aá]rio/.test(t)) return 'community_center';
  if (/\bcreche[s]?\b|ber[cç][aá]rio/.test(t)) return 'daycare';
  if (/\bmercado[s]?\s+municipal|mercados?\s+p[uú]blicos?/.test(t)) return 'city_market';
  if (/\bmercado[s]?\b/.test(t)) return 'market';
  if (/\bteatro[s]?\b|cinema[s]?\b/.test(t)) return 'theater';
  if (/\bmuseu[s]?\b/.test(t)) return 'museum';
  if (/\bassist[eê]n[cç]ia[s]?\s+social(is)?|\bassist[eê]n[cç]ia[s]?\s+sociais\b|cr[aá]s?\b|social/.test(t)) return 'social_assistance';
  if (/\btransporte[s]?\b|\b(o[nú]nibus|ônibus|onibus|ponto[s]?\s+de\s+[oô]nibus|parada[s]?\s+de\s+[oô]nibus|paradas?\s+pr[oó]ximas?|pontos?\s+pr[oó]ximos?|terminais?\s+de\s+[oô]nibus|transporte\s+p[uú]blico|esta[cç][aã]o\s+de\s+[oô]nibus)\b/.test(t)) return 'transit_station';
  if (/\bdelegacia[s]?\b|pol[ií]cia|pm\b|guardas?\s+municipal/.test(t)) return 'police_station';
  if (/\bcemit[eé]rio[s]?\b/.test(t)) return 'cemetery';
  if (/\bacessibilidade|acess[ií]vel/.test(t)) return 'accessibility';
  if (/\breciclagem|ecoponto|limpeza\s+p[uú]blica/.test(t)) return 'recycling_point';
  if (/\bbombeiro[s]?\b|corpo\s+de\s+bombeiros/.test(t)) return 'fire_station';
  return null;
}

// Serviços sem endereço válido não devem aparecer na lista (evita "Endereço não informado")
function hasValidAddress(s: { address?: string | null }): boolean {
  const a = (s.address || '').trim().toLowerCase();
  if (!a) return false;
  if (a === 'endereço não informado' || a === 'endereco nao informado') return false;
  return true;
}

// Helper: Format services with positive context (Never Negative pattern)
export function formatServicesWithContext(
  services: Record<string, unknown>[], 
  serviceType: string, 
  originalDistrict: string | null,
  isExpanded: boolean,
  /** Endereço ou referência legível da posição do cidadão (ex.: reverse geocode do GPS). */
  referenceLocationText?: string | null,
): string {
  const withAddress = services.filter(hasValidAddress);
  if (withAddress.length === 0) {
    return ''; // caller will fallback
  }
  const typeName = getServiceTypeName(serviceType);
  const ref = (referenceLocationText || '').trim();
  const header = isExpanded
    ? ref
      ? `Aqui estão as opções mais próximas de ${typeName} perto de ${ref}:`
      : `Aqui estão as opções mais próximas de ${typeName}${originalDistrict && originalDistrict !== 'null' ? ` em ${originalDistrict}` : ' de você'}:`
    : ref
      ? `Encontrei ${withAddress.length} ${typeName} perto de ${ref}:`
      : `Encontrei ${withAddress.length} ${typeName}:`;
  
  const list = withAddress.map((s: Record<string, unknown>, i: number) => {
    const districtInfo = isExpanded ? ` (${s.district})` : '';
    const rating = s.average_rating ? ` ⭐ ${Number(s.average_rating).toFixed(1)}` : '';
    return `${i+1}. ${s.name}${districtInfo}\n   📍 ${s.address}${rating}`;
  }).join('\n\n');
  
  const footer = isExpanded 
    ? '\n\n💡 Quer que eu calcule a rota para alguma delas?\n\nPara mais informações, [clique aqui](/servicos-proximos).'
    : '';
  
  return `${header}\n\n${list}${footer}`;
}

/** Perguntas sobre estrutura, órgãos e funcionamento legislativo da Câmara (evita depender só do RAG genérico). */
export function isCamaraFuncionamentoInternoQuery(contextText: string): boolean {
  const ctx = contextText.trim().toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
  const estruturaOuApresentacao =
    /(estrutura|funcionamento|apresentacao)\s+(da\s+)?camara|conhecer\s+(a\s+)?camara|como\s+(a\s+)?camara\s+e\s+organizada|como\s+funciona\s+(a\s+)?camara|o\s+que\s+e\s+(a\s+)?camara\s+municipal/.test(ctx);
  const orgaosOuProcesso =
    /mesa\s+diretora|secretaria\s+da\s+mesa|procuradoria|regimento\s+interno|regimento|tramitacao|tramitar|sessao\s+plenaria|sessoes\s+plenarias|processo\s+legislativo|poder\s+legislativo|legislativo\s+municipal|comissoes?\s+(da\s+)?camara|comissoes?\s+permanentes|comissoes?\s+tecnicas|atribuicoes\s+das\s+comissoes/.test(ctx);
  const mentionsChamber = /camara\s+municipal|\bcamara\b|vereador|vereadores|plen|comiss/.test(ctx);
  const funcionamentoInterno = /funcionamento\s+interno/.test(ctx);
  return estruturaOuApresentacao || funcionamentoInterno || (mentionsChamber && orgaosOuProcesso);
}

function sanitizeKbIlikeTerm(term: string): string {
  return term.replace(/%/g, '').replace(/_/g, '').trim();
}

// Helper: Search knowledge base (with positive alternatives)
export async function searchKnowledgeBase(supabase: SupabaseClient, query: string): Promise<string> {
  let searchTerms = query
    .toLowerCase()
    .split(/\s+/)
    .map(sanitizeKbIlikeTerm)
    .filter(t => t.length > 2)
    .slice(0, 5);
  // Para zoneamento/LPUOS/construir: garantir termos que existem no conteúdo (evitar falha por acento: construir vs construído)
  const zoneamentoBoost = ['zoneamento', 'lpuos', 'construir', 'construído', 'imóvel', 'imovel', 'siszon', 'geosampa'];
  const q = query.toLowerCase();
  if (zoneamentoBoost.some(k => q.includes(k))) {
    const extra = ['zoneamento', 'lpuos', 'geosampa', 'siszon'].map(sanitizeKbIlikeTerm).filter(t => t.length > 2);
    searchTerms = [...new Set([...searchTerms, ...extra])].slice(0, 6);
  }
  // Funcionamento interno / estrutura da Câmara: termos que aparecem nas FAQs da KB
  const camaraKbBoost = ['mesa', 'plenário', 'plenario', 'comissões', 'comissoes', 'regimento', 'tramitação', 'tramitacao', 'legislativo', 'câmara', 'camara', 'vereador', 'secretaria', 'procuradoria', 'estrutura', 'funcionamento'];
  if (isCamaraFuncionamentoInternoQuery(query) || camaraKbBoost.some(k => q.includes(k))) {
    const extra = ['mesa', 'plenário', 'comissões', 'regimento', 'tramitação', 'vereador', 'legislativo', 'câmara']
      .map(sanitizeKbIlikeTerm)
      .filter(t => t.length > 2);
    searchTerms = [...new Set([...searchTerms, ...extra])].slice(0, 8);
  }
  if (searchTerms.length === 0) {
    return 'Posso te ajudar com informações sobre a Câmara Municipal, audiências públicas, vereadores e serviços da cidade. O que você gostaria de saber?';
  }

  const orClause = searchTerms
    .flatMap(term => [`content.ilike.%${term}%`, `title.ilike.%${term}%`])
    .join(',');

  const { data, error } = await supabase
    .from('knowledge_base')
    .select('content, content_type, title')
    .or(orClause)
    .limit(6);

  const hitCount = data?.length ?? 0;
  console.log('[searchKnowledgeBase]', JSON.stringify({
    querySnippet: query.slice(0, 120),
    termCount: searchTerms.length,
    hits: hitCount,
    dbError: !!error,
  }));

  if (error || !data?.length) {
    console.log('[searchKnowledgeBase] empty_or_error', JSON.stringify({ reason: error ? 'db_error' : 'no_rows', querySnippet: query.slice(0, 120) }));
    // NEVER NEGATIVE: Suggest alternatives instead of just saying "not found"
    const suggestions = [
      '• Como funciona a Câmara Municipal',
      '• Próximas audiências públicas',
      '• Informações sobre vereadores',
      '• Serviços públicos na cidade'
    ];
    return `Não encontrei informações específicas sobre "${query}", mas posso te ajudar com:\n\n${suggestions.join('\n')}\n\n📌 Ou você pode visitar cmsp.sp.gov.br para mais detalhes.`;
  }

  const SNIPPET_LEN = 600; // Longer snippets so answers are less truncated (was 300)
  return data.map((doc: Record<string, unknown>, i: number) => {
    const source = doc.content_type === 'noticia' ? 'Notícia' : 
                   doc.content_type === 'audiencia' ? 'Audiência' : 'Info';
    const text = doc.content?.trim() || '';
    const showMore = text.length > SNIPPET_LEN;
    const snippet = showMore ? `${text.slice(0, SNIPPET_LEN)}...` : text;
    return `[${i+1}] ${doc.title || source}: ${snippet}`;
  }).join('\n\n');
}

/** Gera link do Google Maps para traçar rota da origem (lat,lon) até o endereço de destino. */
export function buildGoogleMapsDirectionsUrl(originLat: number, originLon: number, destinationAddress: string): string {
  const dest = encodeURIComponent(destinationAddress.trim());
  return `https://www.google.com/maps/dir/?api=1&origin=${originLat},${originLon}&destination=${dest}&travelmode=transit`;
}

/** Gera link do Google Maps para rota entre dois endereços (transporte público). */
export function buildGoogleMapsDirectionsUrlFromAddresses(originAddress: string, destinationAddress: string): string {
  const origin = encodeURIComponent(originAddress.trim());
  const dest = encodeURIComponent(destinationAddress.trim());
  return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}&travelmode=transit`;
}

// --- Google Directions API (transporte público) ---
// Ref: https://developers.google.com/maps/documentation/directions/get-directions

type DirectionsStep = {
  travel_mode?: string;
  html_instructions?: string;
  transit_details?: {
    line?: { short_name?: string; name?: string; vehicle?: { name?: string } };
    departure_stop?: { name?: string };
    arrival_stop?: { name?: string };
    num_stops?: number;
  };
};

type DirectionsLeg = {
  steps?: DirectionsStep[];
  duration?: { value?: number; text?: string };
  distance?: { value?: number; text?: string };
};
type DirectionsRoute = { legs?: DirectionsLeg[] };
type DirectionsResponse = {
  status: string;
  routes?: DirectionsRoute[];
  error_message?: string;
};

/** Remove tags HTML simples para exibir instrução em texto. */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .trim();
}

/**
 * Chama a Google Directions API (mode=transit) e retorna o passo a passo em texto,
 * além da duração e distância totais do trajeto.
 * Requer GOOGLE_MAPS_API_KEY com Directions API ativada.
 * Em caso de falha (sem key, erro de rede, ZERO_RESULTS, etc.), retorna { ok: false }.
 */
export async function fetchGoogleDirectionsTransit(
  originAddress: string,
  destinationAddress: string,
  apiKey: string
): Promise<
  | { ok: true; steps: string[]; durationText?: string; distanceText?: string }
  | { ok: false; error?: string }
> {
  if (!apiKey?.trim()) return { ok: false, error: 'missing_api_key' };
  const origin = encodeURIComponent(originAddress.trim());
  const dest = encodeURIComponent(destinationAddress.trim());
  const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${dest}&mode=transit&language=pt-BR&key=${apiKey}`;
  try {
    const res = await fetch(url);
    const data = (await res.json()) as DirectionsResponse;
    if (data.status !== 'OK' || !data.routes?.length) {
      return { ok: false, error: data.status === 'ZERO_RESULTS' ? 'zero_results' : data.error_message || data.status };
    }
    const leg = data.routes[0].legs?.[0];
    const durationText = leg?.duration?.text?.trim() || undefined;
    const distanceText = leg?.distance?.text?.trim() || undefined;
    if (!leg?.steps?.length) return { ok: true, steps: [], durationText, distanceText };
    const rawSteps: { mode: string; text: string }[] = [];
    for (const s of leg.steps) {
      const mode = (s.travel_mode || '').toUpperCase();
      const td = s.transit_details;
      if (mode === 'TRANSIT' && td) {
        const lineName = td.line?.short_name || td.line?.name || td.line?.vehicle?.name || 'ônibus/metrô';
        const from = td.departure_stop?.name || 'parada de partida';
        const to = td.arrival_stop?.name || 'parada de destino';
        const n = td.num_stops != null ? ` (${td.num_stops} parada${td.num_stops !== 1 ? 's' : ''})` : '';
        rawSteps.push({ mode: 'TRANSIT', text: `• Pegue **${lineName}** na parada *${from}*, desça em *${to}*${n}` });
      } else {
        const text = stripHtml(s.html_instructions || '');
        if (text) rawSteps.push({ mode: 'WALKING', text: `• ${text}` });
      }
    }
    // Agrupar "Ande até X" + "Pegue linha Y" na mesma linha, uma etapa por linha
    const steps: string[] = [];
    for (let i = 0; i < rawSteps.length; i++) {
      const curr = rawSteps[i];
      const next = rawSteps[i + 1];
      if (curr.mode === 'WALKING' && next?.mode === 'TRANSIT') {
        const walk = curr.text.replace(/^•\s*/, '');
        const transit = next.text.replace(/^•\s*/, '');
        steps.push(`• ${walk} • ${transit}`);
        i++;
      } else {
        steps.push(curr.text);
      }
    }
    return { ok: true, steps, durationText, distanceText };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

// Distância em metros (Haversine) para ordenar serviços por proximidade
function distanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Helper: Find nearby services (com ordenação por distância quando userLat/userLon disponíveis). Só lista serviços com endereço válido.
export async function findNearbyServices(
  supabase: SupabaseClient,
  serviceType: string,
  district?: string,
  limit: number = 5,
  userLat?: number | null,
  userLon?: number | null,
  radiusMeters: number = 2000,
  minRating: number = 0,
  searchQuery?: string | null,
  referenceLocationText?: string | null,
): Promise<string> {
  const typeName = getServiceTypeName(serviceType);
  const limitWithBuffer = Math.max(limit * 3, 15);
  const hasCoords = userLat != null && userLon != null && !Number.isNaN(userLat) && !Number.isNaN(userLon);
  const selectFields = hasCoords
    ? 'name, address, district, phone, average_rating, service_type, latitude, longitude'
    : 'name, address, district, phone, average_rating, service_type';
  const search = (searchQuery || '').trim().toLowerCase();

  const sortAndFormat = (data: Record<string, unknown>[], isExpanded: boolean, radiusOverride?: number): string => {
    const radius = radiusOverride ?? radiusMeters;
    let withAddress = data.filter(hasValidAddress);
    if (withAddress.length === 0) return '';
    if (search) {
      withAddress = withAddress.filter((s: Record<string, unknown>) => {
        const name = (s.name || '').toString().toLowerCase();
        const address = (s.address || '').toString().toLowerCase();
        const districtStr = (s.district || '').toString().toLowerCase();
        return name.includes(search) || address.includes(search) || districtStr.includes(search);
      });
      if (withAddress.length === 0) return '';
    }
    let ordered = withAddress;
    if (hasCoords && withAddress.some((s: Record<string, unknown>) => s.latitude != null && s.longitude != null)) {
      ordered = [...withAddress]
        .map((s: Record<string, unknown>) => ({
          ...s,
          _distance: (s.latitude != null && s.longitude != null)
            ? distanceMeters(userLat!, userLon!, Number(s.latitude), Number(s.longitude))
            : Infinity
        }))
        .filter((s: Record<string, unknown>) => {
          const d = s._distance as number;
          return (Number.isFinite(d) && d <= radius) || d === Infinity;
        })
        .filter((s: Record<string, unknown>) => minRating === 0 || (Number(s.average_rating) || 0) >= minRating)
        .sort((a, b) => (a._distance as number) - (b._distance as number))
        .slice(0, limit)
        .map(({ _distance, ...rest }) => rest) as Record<string, unknown>[];
    } else {
      ordered = withAddress
        .filter((s: Record<string, unknown>) => minRating === 0 || (Number(s.average_rating) || 0) >= minRating)
        .slice(0, limit);
    }
    if (ordered.length === 0) return '';
    return formatServicesWithContext(ordered, serviceType, district ?? null, isExpanded, referenceLocationText) || '';
  };

  const tryFormat = (data: Record<string, unknown>[], isExpanded: boolean): string => sortAndFormat(data, isExpanded);

  // Quando temos coordenadas do usuário, buscar mais resultados city-wide e ordenar por distância (prioridade sobre district)
  if (hasCoords) {
    const fetchSize = 200;
    const { data, error } = await supabase
      .from('public_services')
      .select(selectFields)
      .eq('service_type', serviceType)
      .limit(fetchSize);
    if (!error && data?.length) {
      let out = sortAndFormat(data, !district);
      if (out) {
        console.log('[findNearbyServices] Sorted by distance from user');
        return out;
      }
      // Nenhum resultado no raio pedido: tentar com raio maior (20 km) para sempre mostrar opções quando existirem no DB
      out = sortAndFormat(data, !district, 20000);
      if (out) {
        console.log('[findNearbyServices] No results in radius, showing within 20km');
        return `Nenhum ${typeName} a até ${radiusMeters < 1000 ? radiusMeters + ' m' : (radiusMeters / 1000) + ' km'} de você. Aqui estão as opções mais próximas (até 20 km):\n\n${out}`;
      }
      // Ainda zero (ex.: todos além de 20 km ou registros sem lat/lon): sem filtro de distância (raio muito grande)
      out = sortAndFormat(data, !district, 1e9);
      if (out) {
        console.log('[findNearbyServices] Showing first N without distance filter');
        return `Aqui estão algumas opções de ${typeName} em São Paulo:\n\n${out}`;
      }
    }
  }

  // 1st attempt: specific district
  if (district) {
    const { data, error } = await supabase
      .from('public_services')
      .select(selectFields)
      .eq('service_type', serviceType)
      .ilike('district', `%${district}%`)
      .limit(limitWithBuffer);
    
    if (!error && data?.length) {
      const out = tryFormat(data, false);
      if (out) return out;
    }
    
    const { data: cityWide, error: cityError } = await supabase
      .from('public_services')
      .select(selectFields)
      .eq('service_type', serviceType)
      .limit(limitWithBuffer);
    
    if (!cityError && cityWide?.length) {
      const out = tryFormat(cityWide, true);
      if (out) return out;
    }
  } else {
    const { data, error } = await supabase
      .from('public_services')
      .select(selectFields)
      .eq('service_type', serviceType)
      .limit(limitWithBuffer);
    
    if (!error && data?.length) {
      const out = tryFormat(data, false);
      if (out) return out;
    }
  }
  
  const { data: otherTypes } = await supabase
    .from('public_services')
    .select('service_type')
    .limit(20);
  
  const availableTypes = [...new Set((otherTypes || []).map((s: Record<string, unknown>) => s.service_type))] as string[];
  const typeNames = availableTypes.map((t: string) => getServiceTypeName(t)).slice(0, 4);
  
  if (typeNames.length > 0) {
    return `No momento não tenho ${typeName} com endereço cadastrado na sua região. Posso te ajudar a encontrar:\n\n${typeNames.map((t, i) => `${i+1}. ${t}`).join('\n')}\n\nQual desses te interessa?`;
  }
  
  return `Estou atualizando minha base de serviços. Por enquanto, você pode buscar ${typeName} em sp156.prefeitura.sp.gov.br`;
}

/**
 * Busca um serviço pelo nome (ex: "CEU Butantã") e retorna o endereço do banco de dados.
 * Usado para perguntas como "qual o endereço do CEU Butantã?" — evita que a LLM invente.
 */
export async function getServiceAddressByName(supabase: SupabaseClient, serviceName: string): Promise<string | null> {
  const nameTrim = serviceName.trim();
  if (nameTrim.length < 3) return null;

  const { data, error } = await supabase
    .from('public_services')
    .select('name, address, district, phone')
    .ilike('name', `%${nameTrim}%`)
    .limit(3);

  if (error) {
    console.warn('[getServiceAddressByName] DB error:', error.message);
    return null;
  }
  if (!data?.length) return null;

  const first = data[0];
  const addressLine = [first.address, first.district].filter(Boolean).join(', ');
  const phoneNote = first.phone ? `\n📞 ${first.phone}` : '';
  return `${first.name}\n📍 ${addressLine}${phoneNote}`;
}

type OccupancyServiceDisplay = {
  name: string;
  address?: string | null;
  district?: string | null;
};

/** Formata texto de ocupação a partir do retorno da RPC (mesma política da UI cidadã). */
function formatOccupancySummaryFromRpcResult(selected: OccupancyServiceDisplay, occRows: unknown): string {
  const row = Array.isArray(occRows) ? occRows[0] : null;
  const usersCount = Math.max(0, Number((row as { users_count?: unknown })?.users_count || 0));
  const lastPingAt = row && typeof (row as { last_ping_at?: unknown }).last_ping_at === 'string'
    ? String((row as { last_ping_at: string }).last_ping_at)
    : null;
  const MIN_SAMPLE = 3;

  let movementLabel = 'Movimentação baixa';
  let coverageLabel = 'Cobertura baixa';
  if (usersCount >= 20) {
    movementLabel = 'Movimentação alta';
    coverageLabel = 'Cobertura alta';
  } else if (usersCount >= 8) {
    movementLabel = 'Movimentação média';
    coverageLabel = 'Cobertura média';
  }

  const header = `📍 **${selected.name}**${selected.district ? ` (${selected.district})` : ''}`;
  const address = selected.address ? `\nEndereço: ${selected.address}` : '';
  const baseLine = `\nFonte: Visitas detectadas no app (sinais de presença agregados).`;
  const lastPingLine = lastPingAt
    ? `\nÚltimo ping: ${new Date(lastPingAt).toLocaleString('pt-BR')}.`
    : '';
  const transparencyLine = `\nIndicador estimado com base em interações de usuários do app (não é medição oficial da Prefeitura).`;

  if (usersCount < MIN_SAMPLE) {
    return `${header}${address}\n\n**Dados insuficientes** para estimar a movimentação agora (base abaixo da amostra mínima).${baseLine}${lastPingLine}${transparencyLine}`;
  }

  return `${header}${address}\n\n${movementLabel} nas últimas 2h.\n${coverageLabel}.\nBase: ${usersCount} pessoa${usersCount === 1 ? '' : 's'} com sinais recentes no app.${baseLine}${lastPingLine}${transparencyLine}`;
}

/**
 * Ocupação por UUID (ex.: seleção no picker após pergunta de lotação).
 */
export async function getServiceOccupancyStatusByServiceId(
  supabase: SupabaseClient,
  serviceId: string
): Promise<string> {
  const idTrim = String(serviceId || '').trim();
  if (!/^[a-f0-9-]{36}$/i.test(idTrim)) {
    return 'Identificador do serviço inválido.';
  }
  const { data: svc, error } = await supabase
    .from('public_services')
    .select('id, name, address, district')
    .eq('id', idTrim)
    .maybeSingle();
  if (error || !svc) {
    return 'Não encontrei esse equipamento na base. Tente novamente ou escolha outro na lista.';
  }
  const selected: OccupancyServiceDisplay = {
    name: String(svc.name),
    address: (svc as { address?: string | null }).address ?? null,
    district: (svc as { district?: string | null }).district ?? null,
  };
  const { data: occRows, error: occError } = await supabase.rpc('get_equipment_occupancy_summary_for_service', {
    p_service_id: idTrim,
    p_window_minutes: 120,
  });
  if (occError) {
    console.warn('[getServiceOccupancyStatusByServiceId] occupancy rpc error:', occError.message);
    return `Encontrei **${selected.name}**, mas não consegui consultar a ocupação neste momento.`;
  }
  return formatOccupancySummaryFromRpcResult(selected, occRows);
}

/**
 * Retorna status de ocupação de um equipamento específico pelo nome.
 * Usa a mesma política da UI cidadã: amostra mínima, nível de movimentação e transparência.
 */
export async function getServiceOccupancyStatusByName(
  supabase: SupabaseClient,
  serviceName: string,
  district?: string
): Promise<string> {
  const nameTrim = String(serviceName || "").trim();
  const districtTrim = String(district || "").trim();
  if (nameTrim.length < 3) {
    return 'Me diga o nome do equipamento com mais detalhe (ex.: "CEU Butantã" ou "UBS Vila Mariana").';
  }

  // Remove termos de pergunta para melhorar matching por nome real do equipamento.
  const cleanedName = nameTrim
    .replace(/\?/g, ' ')
    .replace(/\b(como\s+est[aá]|est[aá]\s+chei[oa]|t[aá]\s+chei[oa]|lota[cç][aã]o|ocupa[cç][aã]o|agora)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const lookupTerm = cleanedName.length >= 3 ? cleanedName : nameTrim;

  const inferServiceTypeForPicker = (text: string): string | null => {
    const t = text.toLowerCase();
    if (/\bubs\b|posto de sa[úu]de/.test(t)) return 'ubs';
    if (/\bhospital\b/.test(t)) return 'hospital';
    if (/\bescola\b|emef|emei|etec/.test(t)) return 'school';
    if (/\bceu\b/.test(t)) return 'ceu';
    if (/\bbiblioteca\b/.test(t)) return 'library';
    if (/centro esportivo|esportivo/.test(t)) return 'sports_center';
    return null;
  };
  const inferDistrictForPicker = (text: string): string | null => {
    const t = text
      .replace(/\b(ubs|hospital|escola|ceu|biblioteca|posto de sa[úu]de|centro esportivo)\b/gi, ' ')
      .replace(/\b(como|est[aá]|agora|ocup[aã]?[cç][aã]o|lota[cç][aã]o|movimenta[cç][aã]o)\b/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return t.length >= 3 ? t : null;
  };
  const pickerType = inferServiceTypeForPicker(lookupTerm);
  const pickerDistrict = districtTrim || inferDistrictForPicker(lookupTerm) || '';
  const pickerMarker = `[SERVICE_PICKER${pickerDistrict ? `:district=${encodeURIComponent(pickerDistrict)}` : ''}${pickerType ? `:type=${pickerType}` : ''}]`;

  // Query mínima e resiliente (evita erro em ambientes com variações de colunas como district/neighborhood).
  let { data: services, error: serviceError } = await supabase
    .from('public_services')
    .select('id, name')
    .ilike('name', `%${lookupTerm}%`)
    .limit(8);
  if (serviceError) {
    console.warn('[getServiceOccupancyStatusByName] service lookup error (table):', serviceError.message);
    // Fallback robusto via RPC de busca (usada em outras jornadas do app).
    const { data: rpcData, error: rpcError } = await supabase.rpc('search_public_services_fulltext', {
      min_lat: null,
      max_lat: null,
      min_lng: null,
      max_lng: null,
      center_lat: null,
      center_lng: null,
      radius_meters: null,
      search_query: lookupTerm,
      service_types: null,
      result_limit: 8,
    });
    if (rpcError) {
      console.warn('[getServiceOccupancyStatusByName] service lookup error (rpc):', rpcError.message);
      return 'Não consegui consultar a ocupação agora. Tente novamente em instantes.';
    }
    services = (Array.isArray(rpcData) ? rpcData : [])
      .map((r: Record<string, unknown>) => ({ id: String(r.id || ''), name: String(r.name || '') }))
      .filter((r) => r.id && r.name);
  }
  if (!services?.length) {
    return `[OCCUPANCY_SERVICE_PICK][FIELD_REQUEST:service_name]Não encontrei exatamente esse equipamento${districtTrim ? ` em ${districtTrim}` : ''}. Selecione na lista abaixo (ou refine por nome/bairro).\n${pickerMarker}`;
  }

  // Tenta enriquecer com address/district; se falhar, segue sem esses campos.
  let detailsById = new Map<string, { address?: string | null; district?: string | null }>();
  const ids = services.map((s) => s.id).filter(Boolean);
  if (ids.length > 0) {
    const { data: detailsRows } = await supabase
      .from('public_services')
      .select('id, address, district')
      .in('id', ids);
    for (const row of (detailsRows || [])) {
      detailsById.set(String(row.id), {
        address: (row as { address?: string | null }).address ?? null,
        district: (row as { district?: string | null }).district ?? null,
      });
    }
  }

  const ranked = services
    .map((s) => {
      const d = detailsById.get(String(s.id));
      const scoreNameExact = s.name?.toLowerCase?.() === lookupTerm.toLowerCase() ? 4 : 0;
      const scoreNameIncludes = s.name?.toLowerCase?.().includes(lookupTerm.toLowerCase()) ? 2 : 0;
      const scoreDistrict = districtTrim && d?.district?.toLowerCase?.().includes(districtTrim.toLowerCase()) ? 3 : 0;
      return { ...s, address: d?.address ?? null, district: d?.district ?? null, _score: scoreNameExact + scoreNameIncludes + scoreDistrict };
    })
    .sort((a, b) => b._score - a._score);

  if (ranked.length > 1 && ranked[0]?._score === ranked[1]?._score) {
    return `[OCCUPANCY_SERVICE_PICK][FIELD_REQUEST:service_name]Encontrei mais de um equipamento parecido. Selecione na lista abaixo para eu consultar a ocupação correta.\n${pickerMarker}`;
  }

  const selected = ranked[0];
  const { data: occRows, error: occError } = await supabase.rpc('get_equipment_occupancy_summary_for_service', {
    p_service_id: selected.id,
    p_window_minutes: 120,
  });

  if (occError) {
    console.warn('[getServiceOccupancyStatusByName] occupancy rpc error:', occError.message);
    return `Encontrei **${selected.name}**, mas não consegui consultar a ocupação neste momento.`;
  }

  return formatOccupancySummaryFromRpcResult(selected, occRows);
}

// Helper: build tema filter (ilike on tema or titulo)
function audienciasTemaFilter(supabase: SupabaseClient, base: { or?: (a: string, b: string) => unknown }, tema: string) {
  const t = tema.trim().replace(/%/g, '');
  if (!t) return base;
  return base.or(`tema.ilike.%${t}%,titulo.ilike.%${t}%`);
}

// Zonas de São Paulo para filtro por região (espelho de audienciaZonas no front)
const ZONAS_KEYWORDS: { zona: string; keywords: string[] }[] = [
  { zona: "Zona Norte", keywords: ["tucuruvi", "jaçanã", "santana", "vila maria", "vila guilherme", "casa verde", "limão", "brasilândia", "freguesia do ó", "perus", "pirituba", "vila leopoldina"] },
  { zona: "Zona Sul", keywords: ["ipiranga", "jabaquara", "santo amaro", "cidade ademar", "socorro", "cursino", "saúde", "vila mariana", "campo belo"] },
  { zona: "Zona Leste", keywords: ["mooca", "tatuapé", "vila carmosina", "vila formosa", "penha", "cangaíba", "são mateus", "itaquera", "guaianases", "vila prudente"] },
  { zona: "Zona Oeste", keywords: ["lapa", "pinheiros", "butantã", "jaguaré", "rio pequeno", "raposo tavares", "vila sônia", "morumbi", "barra funda"] },
  { zona: "Centro", keywords: ["sé", "república", "bela vista", "bom retiro", "cambuci", "consolação", "liberdade", "santa cecília", "prestes maia", "auditório", "câmara municipal", "centro", "vila buarque", "aclimação", "higienópolis"] },
];

function localParaZona(local: string | null | undefined): string {
  const text = (local || "").toLowerCase().trim();
  if (!text) return "Centro";
  for (const { zona, keywords } of ZONAS_KEYWORDS) {
    if (keywords.some((k) => text.includes(k))) return zona;
  }
  return "Centro";
}

function filterByRegiao<T extends { local?: string | null }>(rows: T[], regiao: string): T[] {
  if (!regiao?.trim()) return rows;
  const r = regiao.trim();
  return rows.filter((a) => localParaZona(a.local) === r);
}

// Status no banco: 'agendada' | 'encerrada' (seed); aceitar também 'scheduled' | 'ongoing' | 'finished' por compatibilidade
const AUDIENCIA_STATUS_AGENDADA = ['agendada', 'scheduled'];

function isAgendada(s: string) {
  return s && AUDIENCIA_STATUS_AGENDADA.includes(String(s).toLowerCase());
}

function formatAudienciaStatus(s: string) {
  if (isAgendada(s)) return '📅 Agendada';
  if (s === 'ongoing' || s === 'em andamento') return '🔴 Em andamento';
  return '✅ Encerrada';
}

/** Trunca descrição para uso como contexto na explicação simplificada ao cidadão (evita payload grande). */
function truncateDescricaoForContext(descricao: string | null | undefined, maxLen: number = 380): string {
  if (!descricao || !descricao.trim()) return '';
  const oneLine = descricao.trim().replace(/\s+/g, ' ').trim();
  if (oneLine.length <= maxLen) return oneLine;
  return oneLine.slice(0, maxLen) + '…';
}

/** Formata data ISO (YYYY-MM-DD) para pt-BR (DD/MM/AAAA). */
function formatDatePtBr(iso: string | null | undefined): string {
  if (!iso) return '';
  const s = iso.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const [y, m, d] = s.split('-');
  return `${d}/${m}/${y}`;
}

/** Formata texto de convidados: cada nome e cada cargo em linha própria (quebra no markdown com "  \n"). */
function formatConvidadosBlock(convidados: string | null | undefined): string {
  if (!convidados || !convidados.trim()) return '';
  let text = convidados.replace(/\s+/g, ' ').trim();
  text = text.replace(/^Foram\s+convidados?\s+para\s+a\s+Audi[eê]ncia\s+P[úu]blica:\s*/i, '');
  const segmentos = text.split(/\s*;\s*/).map((s) => s.trim()).filter(Boolean);
  if (!segmentos.length) return '';
  const br = '  \n'; // markdown: duas espaços + newline = <br>
  const EN_DASH = '\u2013'; // –
  const linhas = segmentos.map((seg) => {
    const idx = seg.indexOf(' - ');
    if (idx >= 0) {
      const nome = seg.slice(0, idx).trim();
      const cargo = seg.slice(idx + 3).trim();
      return `   - ${nome}${br}   ${EN_DASH} ${cargo}`;
    }
    return `   - ${seg}`;
  });
  return `\n\n   **Foram convidados para a Audiência Pública:**${br}${linhas.join(br)}`;
}

/** Documentos e materiais de referência não são incluídos no texto da resposta; o chat exibe na listagem (transmissão, contato). */
function formatDocumentosLine(_a: { projeto_referencia?: string | null; link_transmissao?: string | null; mais_informacoes?: string | null }): string {
  return '';
}

/** Formata uma linha de audiência para o chat: título, tema (vindo da API), data/local/status. Sem duplicar rótulo "Tema:". */
function formatAudienciaLine(a: { titulo: string; tema: string; comissao?: string | null; data: string; hora?: string | null; local?: string | null; status?: string }, i: number, statusText: string, inscricao: string, ctxBlock: string, docsBlock: string): string {
  const br = '  \n';
  const nomeDaAudiencia = (a.comissao && a.comissao.trim()) ? a.comissao.trim() : (a.tema && a.tema.trim()) ? a.tema.trim() : (a.titulo && a.titulo.trim()) ? a.titulo.trim() : 'Audiência';
  const dataLabel = formatDatePtBr(a.data || '');
  const dataHora = `📅 ${dataLabel}${a.hora ? ` às ${a.hora.slice(0, 5)}` : ''}`;
  const localLine = a.local ? `${br}   **Local:** ${a.local}` : '';
  const inscricaoTrim = inscricao.trim();
  const statusInscricao = inscricaoTrim ? `${br}   ${statusText}${br}   ${inscricaoTrim}` : `${br}   ${statusText}`;
  return `${i + 1}. **Audiência pública:** ${nomeDaAudiencia}\n\n   ${a.tema}\n\n   ${dataHora}${localLine}${statusInscricao}${ctxBlock}${docsBlock}`;
}

/** Busca as N últimas notícias do cache (tabela news_cache) para injetar no contexto do chat. */
export async function getUltimasNoticias(supabase: SupabaseClient, limit = 5): Promise<string> {
  const { data: rows, error } = await supabase
    .from('news_cache')
    .select('id, title, description, link, pub_date')
    .order('pub_date', { ascending: false })
    .limit(limit);

  if (error) {
    console.warn('[getUltimasNoticias] Erro ao ler news_cache:', error.message);
    return '';
  }
  if (!rows?.length) return '';

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return iso?.slice(0, 10) || '';
    }
  };

  const lines = rows.map((r: { id: string; title: string; description: string; link: string; pub_date: string }, i: number) => {
    const title = (r.title || '').trim();
    const desc = (r.description || '').trim().slice(0, 200);
    const date = formatDate(r.pub_date || '');
    return `${i + 1}. **${title}**\n   ${desc}${desc.length >= 200 ? '...' : ''}\n   Data: ${date} | Link: ${r.link || ''}`;
  });
  return '[Últimas notícias da Câmara (use este bloco para listar as 5 últimas no chat)]\n\n' + lines.join('\n\n');
}

// Helper: Search audiencias (with filters by tema, data, regiao)
export async function searchAudiencias(
  supabase: SupabaseClient,
  tema?: string,
  status?: string,
  inscricoesAbertas?: boolean,
  dataInicio?: string,
  dataFim?: string,
  regiao?: string
): Promise<string> {
  const temaNorm = tema?.trim();
  const today = new Date().toISOString().split('T')[0];
  const dataMin = dataInicio?.trim() || today;
  let dataMax = dataFim?.trim() || null;
  // Se só tem data_inicio (ex.: "este ano" sem data_fim), limitar ao fim desse ano para não incluir audiências de anos futuros
  if (dataMin && !dataMax && /^\d{4}-\d{2}-\d{2}$/.test(dataMin)) {
    dataMax = `${dataMin.slice(0, 4)}-12-31`;
  }
  const regiaoNorm = regiao?.trim() || null;
  const limitBase = regiaoNorm ? 20 : 5; // fetch more when filtering by region in memory
  const hasExplicitDateRange = !!(dataInicio?.trim() || dataFim?.trim());

  const applyDateFilters = (q: { gte?: (a: string, b: string) => unknown; lte?: (a: string, b: string) => unknown }) => {
    let out = q.gte('data', dataMin);
    if (dataMax) out = out.lte('data', dataMax);
    return out;
  };

  // 0) Período explícito (data_inicio/data_fim): retornar agendadas E encerradas no período
  if (hasExplicitDateRange) {
    let rangeQ = supabase
    .from('audiencias')
      .select('titulo, tema, comissao, descricao, data, hora, local, status, inscricoes_abertas, vagas_disponiveis, convidados, projeto_referencia, link_transmissao, mais_informacoes')
      .gte('data', dataMin)
      .order('data', { ascending: false })
      .limit(regiaoNorm ? 40 : 15);
    if (dataMax) rangeQ = rangeQ.lte('data', dataMax);
    if (temaNorm) rangeQ = audienciasTemaFilter(supabase, rangeQ, temaNorm);
    const { data: rawRange } = await rangeQ;
    const inRange = filterByRegiao(rawRange || [], regiaoNorm).slice(0, 10);
    if (inRange?.length) {
      const formatted = inRange.map((a: Record<string, unknown>, i: number) => {
        const statusText = formatAudienciaStatus(a.status);
        const inscricao = a.inscricoes_abertas ? ` 🎫 Inscrições abertas` : '';
        const ctx = truncateDescricaoForContext(a.descricao);
        const convidadosBlock = formatConvidadosBlock((a as any).convidados as string | null | undefined);
        const ctxBlock = ctx
          ? `\n\n   **Explicação simplificada do que será discutido:**\n\n   ${ctx}${convidadosBlock}`
          : convidadosBlock;
        const docsBlock = formatDocumentosLine(a);
        return formatAudienciaLine(a, i, statusText, inscricao, ctxBlock, docsBlock);
      }).join('\n\n');
      const periodo = dataMax ? `de ${formatDatePtBr(dataMin)} a ${formatDatePtBr(dataMax)}` : `a partir de ${formatDatePtBr(dataMin)}`;
      const intro = temaNorm
        ? `Audiências sobre **${temaNorm}** no período (${periodo}):\n\n`
        : `Audiências no período (${periodo}) — agendadas e realizadas:\n\n`;
      return `${intro}${formatted}\n\nQuer saber mais sobre alguma ou inscrever-se?`;
    }
    // Nenhuma audiência no período com tema: mensagem + últimas 5 realizadas para o tema (sempre ano anterior e ano retrasado em relação a hoje)
    if (temaNorm) {
      const today = new Date();
      const currentYear = today.getFullYear();
      const yearBeforeLastStart = `${currentYear - 2}-01-01`; // ex.: 2026 → 2024-01-01
      const startOfCurrentYear = `${currentYear}-01-01`;    // ex.: 2026 → 2026-01-01 (exclusive)
      const histQ = supabase
        .from('audiencias')
        .select('titulo, tema, comissao, descricao, data, hora, local, status, inscricoes_abertas, vagas_disponiveis, projeto_referencia, link_transmissao, mais_informacoes')
        .gte('data', yearBeforeLastStart)
        .lt('data', startOfCurrentYear)
        .order('data', { ascending: false })
        .limit(regiaoNorm ? 20 : 10);
      const histWithTema = audienciasTemaFilter(supabase, histQ, temaNorm);
      const { data: rawUltimas } = await histWithTema;
      const ultimas5 = filterByRegiao(rawUltimas || [], regiaoNorm).slice(0, 5);
      const temaLabel = temaNorm.charAt(0).toUpperCase() + temaNorm.slice(1).toLowerCase();
      let msg = `Este ano ainda não foram realizadas audiências públicas com este tema (**${temaLabel}**).\n\n`;
      if (ultimas5?.length) {
        const formatted = ultimas5.map((a: Record<string, unknown>, i: number) => {
          const statusText = formatAudienciaStatus(a.status);
          const ctx = truncateDescricaoForContext(a.descricao);
          const convidadosBlock = formatConvidadosBlock((a as any).convidados as string | null | undefined);
          const ctxBlock = ctx
            ? `\n\n   **Explicação simplificada do que foi discutido:**\n\n   ${ctx}${convidadosBlock}`
            : convidadosBlock;
          const docsBlock = formatDocumentosLine(a);
          return formatAudienciaLine(a, i, statusText, '', ctxBlock, docsBlock);
        }).join('\n\n');
        msg += `Segue abaixo as últimas audiências realizadas para este tema:\n\n${formatted}`;
      } else {
        msg += `Não há audiências realizadas no histórico para este tema.`;
      }
      msg += '\n\nQuer buscar outras audiências ou outro tema?';
      return msg;
    }
  }

  // 1) Sem tema: priorizar PRÓXIMAS (data >= dataMin, status agendada).
  // Se não houver próximas, responder com a última audiência realizada.
  if (!temaNorm) {
    let q = supabase
      .from('audiencias')
      .select('titulo, tema, comissao, descricao, data, hora, local, status, inscricoes_abertas, vagas_disponiveis, convidados, projeto_referencia, link_transmissao, mais_informacoes')
      .in('status', AUDIENCIA_STATUS_AGENDADA)
      .order('data', { ascending: true })
      .limit(limitBase);
    q = applyDateFilters(q);
    const { data: rawProximas } = await q;
    const proximas = filterByRegiao(rawProximas || [], regiaoNorm).slice(0, 5);

    if (proximas?.length) {
      const formatted = proximas.map((a: Record<string, unknown>, i: number) => {
        const statusText = formatAudienciaStatus(a.status);
        const inscricao = a.inscricoes_abertas ? ` 🎫 Inscrições abertas` : '';
        const ctx = truncateDescricaoForContext(a.descricao);
        const convidadosBlock = formatConvidadosBlock((a as any).convidados as string | null | undefined);
        const ctxBlock = ctx
          ? `\n\n   **Explicação simplificada do que será discutido:**\n\n   ${ctx}${convidadosBlock}`
          : convidadosBlock;
        const docsBlock = formatDocumentosLine(a);
        return formatAudienciaLine(a, i, statusText, inscricao, ctxBlock, docsBlock);
      }).join('\n\n---\n\n');
      const filtros = [regiaoNorm && `região ${regiaoNorm}`, dataInicio && (dataFim ? `de ${formatDatePtBr(dataMin)} a ${formatDatePtBr(dataMax!)}`
        : `a partir de ${formatDatePtBr(dataMin)}`)].filter(Boolean);
      const intro = filtros.length ? `Próximas audiências (${filtros.join(', ')}):\n\n` : 'Próximas audiências públicas agendadas:\n\n';
      return `${intro}${formatted}\n\nQuer saber mais sobre alguma ou inscrever-se?`;
    }

    // Sem próximas agendadas: retornar a última audiência realizada (data <= hoje).
    const { data: ultimas } = await supabase
      .from('audiencias')
      .select('titulo, tema, comissao, descricao, data, hora, local, status, inscricoes_abertas, vagas_disponiveis, convidados, projeto_referencia, link_transmissao, mais_informacoes')
      .lte('data', today)
      .order('data', { ascending: false })
      .limit(1);
    const ultima = filterByRegiao(ultimas || [], regiaoNorm)[0] as Record<string, unknown> | undefined;
    if (ultima) {
      const statusText = formatAudienciaStatus(ultima.status);
      const ctx = truncateDescricaoForContext(ultima.descricao);
      const convidadosBlock = formatConvidadosBlock((ultima as any).convidados as string | null | undefined);
      const ctxBlock = ctx
        ? `\n\n   **Resumo do que foi discutido:**\n\n   ${ctx}${convidadosBlock}`
        : convidadosBlock;
      const docsBlock = formatDocumentosLine(ultima);
      const linha = formatAudienciaLine(ultima, 0, statusText, '', ctxBlock, docsBlock);
      return `Não há audiências públicas futuras agendadas no momento.\n\nA última audiência pública foi:\n\n${linha}\n\nPosso buscar outras audiências por tema, período ou região, se você quiser.`;
    }
  }

  // 2) Com tema: buscar por tema (agendadas primeiro, depois histórico)
  let query = supabase
    .from('audiencias')
    .select('titulo, tema, comissao, descricao, data, hora, local, status, inscricoes_abertas, vagas_disponiveis, convidados, projeto_referencia, link_transmissao, mais_informacoes')
    .in('status', AUDIENCIA_STATUS_AGENDADA)
    .order('data', { ascending: true })
    .limit(limitBase);
  query = applyDateFilters(query);
  if (temaNorm) {
    query = audienciasTemaFilter(supabase, query, temaNorm);
  }
  if (status) {
    query = query.eq('status', status);
  }
  if (inscricoesAbertas) {
    query = query.eq('inscricoes_abertas', true);
  }
  
  const { data: rawData, error } = await query;
  const data = filterByRegiao(rawData || [], regiaoNorm).slice(0, 5);

  if (!error && data?.length) {
    return data.map((a: Record<string, unknown>, i: number) => {
      const statusText = formatAudienciaStatus(a.status);
      const inscricao = a.inscricoes_abertas ? ` 🎫 Inscrições abertas (${a.vagas_disponiveis || '?'} vagas)` : '';
      const ctx = truncateDescricaoForContext(a.descricao);
      const convidadosBlock = formatConvidadosBlock((a as any).convidados as string | null | undefined);
      const ctxBlock = ctx
        ? `\n\n   **Explicação simplificada do que será discutido:**\n\n   ${ctx}${convidadosBlock}`
        : convidadosBlock;
      const docsBlock = formatDocumentosLine(a);
      return formatAudienciaLine(a, i, statusText, inscricao, ctxBlock, docsBlock);
    }).join('\n\n');
  }

  // 3) Com tema mas sem próximas: buscar histórico desse tema
  if (temaNorm) {
    let histQuery = supabase
      .from('audiencias')
      .select('titulo, tema, comissao, descricao, data, hora, local, status, inscricoes_abertas, vagas_disponiveis, projeto_referencia, link_transmissao, mais_informacoes')
      .order('data', { ascending: false })
      .limit(regiaoNorm ? 30 : 10);
    if (dataMin) histQuery = histQuery.gte('data', dataMin);
    if (dataMax) histQuery = histQuery.lte('data', dataMax);
    histQuery = audienciasTemaFilter(supabase, histQuery, temaNorm);
    const { data: rawHist } = await histQuery;
    const historico = filterByRegiao(rawHist || [], regiaoNorm).slice(0, 10);
    if (historico?.length) {
      const formatted = historico.map((a: Record<string, unknown>, i: number) => {
        const statusText = formatAudienciaStatus(a.status);
        const inscricao = a.inscricoes_abertas ? ` 🎫 Inscrições abertas` : '';
        const ctx = truncateDescricaoForContext(a.descricao);
        const convidadosBlock = formatConvidadosBlock((a as any).convidados as string | null | undefined);
        const ctxBlock = ctx
          ? `\n\n   **Explicação simplificada do que será discutido:**\n\n   ${ctx}${convidadosBlock}`
          : convidadosBlock;
        const docsBlock = formatDocumentosLine(a);
        return formatAudienciaLine(a, i, statusText, inscricao, ctxBlock, docsBlock);
      }).join('\n\n');
      return `Audiências sobre **${temaNorm}** (histórico e agendadas):\n\n${formatted}\n\nQuer saber sobre outro tema ou inscrever-se em alguma?`;
    }
  }

  // 4) Fallback: listar próximas agendadas (qualquer tema)
  let fallbackQ = supabase
    .from('audiencias')
    .select('titulo, tema, comissao, descricao, data, hora, local, status, inscricoes_abertas, vagas_disponiveis, projeto_referencia, link_transmissao, mais_informacoes')
    .in('status', AUDIENCIA_STATUS_AGENDADA)
      .order('data', { ascending: true })
    .limit(limitBase);
  fallbackQ = applyDateFilters(fallbackQ);
  const { data: rawUpcoming } = await fallbackQ;
  const upcoming = filterByRegiao(rawUpcoming || [], regiaoNorm).slice(0, 5);
    
    if (upcoming?.length) {
    const formattedUpcoming = upcoming.map((a: Record<string, unknown>, i: number) => {
      const statusText = formatAudienciaStatus(a.status);
      const inscricao = a.inscricoes_abertas ? ` 🎫 Inscrições abertas` : '';
      const ctx = truncateDescricaoForContext(a.descricao);
      const ctxBlock = ctx ? `\n\n   **Explicação simplificada do que será discutido:**\n\n   ${ctx}` : '';
      const docsBlock = formatDocumentosLine(a);
      return formatAudienciaLine(a, i, statusText, inscricao, ctxBlock, docsBlock);
      }).join('\n\n');
    const temaText = temaNorm ? `sobre "${temaNorm}"` : 'com esses critérios';
    return `Não encontrei audiências ${temaText} no momento, mas aqui estão as próximas agendadas:\n\n${formattedUpcoming}\n\nQuer que eu te avise quando houver audiências sobre ${temaNorm || 'seu tema de interesse'}?`;
    }
    
  // 5) Sugerir temas com histórico
    const { data: allAudiencias } = await supabase
      .from('audiencias')
      .select('tema')
    .limit(100);
    
  const availableThemes = [...new Set((allAudiencias || []).map((a: Record<string, unknown>) => a.tema).filter(Boolean))].slice(0, 8);
    
    if (availableThemes.length > 0) {
    return `Não há audiências ${temaNorm ? `sobre "${temaNorm}"` : 'agendadas'} no momento.\n\nTemas com histórico de audiências:\n${availableThemes.map((t) => `• ${t}`).join('\n')}\n\nQuer saber mais sobre algum desses? (Ao escolher, mostro as audiências desse tema, inclusive do histórico.)`;
    }
    
    return 'Não há audiências agendadas no momento. Você pode acompanhar a agenda em cmsp.sp.gov.br/agenda';
}

// Helper: Suggest council member (lista vem SEMPRE da API fetch-vereadores para refletir vereadores em exercício)
export async function suggestCouncilMember(issueType: string, description: string, district?: string): Promise<string> {
  const baseUrl = typeof Deno !== 'undefined' ? Deno.env.get('SUPABASE_URL') : undefined;
  const anonKey = typeof Deno !== 'undefined' ? Deno.env.get('SUPABASE_ANON_KEY') : undefined;

  if (baseUrl && anonKey) {
    try {
      const res = await fetch(`${baseUrl}/functions/v1/fetch-vereadores`, {
        headers: { 'Authorization': `Bearer ${anonKey}` },
      });
      if (res.ok) {
        const json = await res.json() as { vereadores?: Array<{ name: string; party: string; isSubstitute?: boolean; isOnLeave?: boolean }> };
        const vereadores = json.vereadores ?? [];
        const active = vereadores.filter(v => !v.isSubstitute && !v.isOnLeave);
        const top = active.slice(0, 5).map(v => `${v.name} (${v.party})`);
        if (top.length > 0) {
          return `Para questões de ${issueType}, você pode procurar:\n\n${top.map((m, i) => `${i + 1}. ${m}`).join('\n')}\n\nDeseja que eu encaminhe sua demanda para algum deles?`;
        }
      }
    } catch (e) {
      console.warn('[suggestCouncilMember] fetch-vereadores failed:', (e as Error).message);
    }
  }

  // Sem fallback com lista fixa: evita mostrar vereadores que não estão mais em exercício.
  // Direciona o cidadão à página oficial de vereadores, que consome a mesma API.
  return `No momento não consegui carregar a lista atualizada de vereadores. Você pode ver a lista completa em [Vereadores](/institucional/vereadores), onde constam apenas os parlamentares em exercício. Posso ajudar com mais alguma coisa?`;
}

// Helper: Get citizen history
export async function getCitizenHistory(
  supabase: SupabaseClient, 
  userId: string, 
  historyType: string = 'all',
  statusFilter: string = 'all',
  limit: number = 5
): Promise<string> {
  const results: string[] = [];
  
  // Urban reports
  if (historyType === 'all' || historyType === 'urban_reports') {
    let query = supabase
      .from('urban_reports')
      .select('id, protocol_code, category, subcategory, status, created_at, location_address, street, neighborhood')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }
    
    const { data, error } = await query;
    if (!error && data?.length) {
      results.push('📍 **Relatos Urbanos:**');
      data.forEach((r: Record<string, unknown>, i: number) => {
        const statusEmoji = r.status === 'pending' ? '⏳' : r.status === 'in_progress' ? '🔄' : r.status === 'resolved' ? '✅' : '❌';
        const location = r.street ? `${r.street}, ${r.neighborhood}` : r.location_address || 'Local não informado';
        const proto = r.protocol_code ? `**${r.protocol_code}** — ` : '';
        results.push(`${i+1}. ${proto}${r.subcategory || r.category} - ${location}\n   ${statusEmoji} ${r.status} | ${new Date(r.created_at).toLocaleDateString('pt-BR')}`);
      });
    }
  }
  
  // Transport reports
  if (historyType === 'all' || historyType === 'transport_reports') {
    let query = supabase
      .from('transport_reports')
      .select('id, report_type, status, created_at, line_code_custom, location')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }
    
    const { data, error } = await query;
    if (!error && data?.length) {
      if (results.length) results.push('');
      results.push('🚌 **Relatos de Transporte:**');
      data.forEach((r: Record<string, unknown>, i: number) => {
        const statusEmoji = r.status === 'pending' ? '⏳' : r.status === 'in_progress' ? '🔄' : r.status === 'resolved' ? '✅' : '❌';
        const proto = r.protocol_code ? `**${r.protocol_code}** — ` : '';
        results.push(`${i+1}. ${proto}${r.report_type} ${r.line_code_custom ? `- Linha ${r.line_code_custom}` : ''}\n   ${statusEmoji} ${r.status} | ${new Date(r.created_at).toLocaleDateString('pt-BR')}`);
      });
    }
  }
  
  // Service ratings
  if (historyType === 'all' || historyType === 'ratings') {
    const { data, error } = await supabase
      .from('service_ratings')
      .select('id, rating_stars, rating_text, created_at, service:public_services(name, service_type)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (!error && data?.length) {
      if (results.length) results.push('');
      results.push('⭐ **Avaliações de Serviços:**');
      data.forEach((r: Record<string, unknown>, i: number) => {
        const stars = '⭐'.repeat(r.rating_stars);
        const serviceName = r.service?.name || 'Serviço';
        results.push(`${i+1}. ${serviceName} - ${stars}\n   ${new Date(r.created_at).toLocaleDateString('pt-BR')}`);
      });
    }
  }
  
  // Audiencia inscricoes (lembretes) e participacoes (videoconferência/escrito)
  if (historyType === 'all' || historyType === 'audiencias') {
    const { data: inscricoesData, error: errInsc } = await supabase
      .from('audiencia_inscricoes')
      .select('id, status, created_at, audiencia:audiencias(titulo, data, status)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (!errInsc && inscricoesData?.length) {
      if (results.length) results.push('');
      results.push('🎫 **Inscrições para lembretes de audiências:**');
      inscricoesData.forEach((r: Record<string, unknown>, i: number) => {
        const audiencia = r.audiencia;
        const statusEmoji = audiencia?.status === 'finished' ? '✅' : '📅';
        results.push(`${i+1}. ${audiencia?.titulo || 'Audiência'}\n   ${statusEmoji} ${audiencia?.data || ''}`);
      });
    }

    const { data: participacoesData, error: errPart } = await supabase
      .from('audiencia_participacoes')
      .select('id, tipo, created_at, audiencia:audiencias(titulo, data, status)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (!errPart && participacoesData?.length) {
      if (results.length) results.push('');
      results.push('🎤 **Inscrições para participar (videoconferência/escrito):**');
      participacoesData.forEach((r: Record<string, unknown>, i: number) => {
        const audiencia = r.audiencia;
        const tipoLabel = r.tipo === 'videoconferencia' ? 'Videoconferência' : r.tipo === 'escrito' ? 'Manifestação escrita' : String(r.tipo || '');
        const statusEmoji = audiencia?.status === 'finished' ? '✅' : '📅';
        results.push(`${i+1}. ${audiencia?.titulo || 'Audiência'} (${tipoLabel})\n   ${statusEmoji} ${audiencia?.data || ''} | ${new Date(r.created_at as string).toLocaleDateString('pt-BR')}`);
      });
    }
  }
  
  // Council member referrals
  if (historyType === 'all' || historyType === 'referrals') {
    const { data, error } = await supabase
      .from('council_member_referrals')
      .select('id, council_member_name, council_member_party, status, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (!error && data?.length) {
      if (results.length) results.push('');
      results.push('📨 **Encaminhamentos a Vereadores:**');
      data.forEach((r: Record<string, unknown>, i: number) => {
        const statusEmoji = r.status === 'pending' ? '⏳' : r.status === 'sent' ? '📤' : r.status === 'acknowledged' ? '👀' : '✅';
        results.push(`${i+1}. ${r.council_member_name} (${r.council_member_party})\n   ${statusEmoji} ${r.status} | ${new Date(r.created_at).toLocaleDateString('pt-BR')}`);
      });
    }
  }
  
  if (results.length === 0) {
    return 'Você ainda não tem registros no sistema. Posso ajudar a fazer um relato ou avaliação?';
  }
  
  return results.join('\n');
}

// Execute tool
export async function executeTool(
  name: string, 
  args: Record<string, unknown>, 
  userId: string, 
  supabase: SupabaseClient,
  accumulatedFields?: Record<string, unknown>
): Promise<{ success: boolean; message: string; data?: unknown }> {
  console.log(`[executeTool] Executing ${name} with args:`, JSON.stringify(args));
  console.log(`[executeTool] Accumulated fields:`, JSON.stringify(accumulatedFields || {}));
  
  try {
    switch (name) {
      case 'classify_report_category': {
        // Validate category against enum
        const validCategories = VALID_URBAN_CATEGORIES;
        if (!validCategories.includes(args.category)) {
          console.error('[classify_report_category] Invalid category:', args.category);
          return {
            success: false,
            message: `Categoria inválida. Categorias válidas: ${validCategories.join(', ')}`
          };
        }
        
        // Log classification for audit
        console.log('[classify_report_category] Classification:', {
          category: args.category,
          confidence: args.confidence,
          reasoning: args.reasoning,
          user_confirmed: args.user_confirmed,
          alternatives: args.alternative_categories
        });
        
        // Build progress marker with category
        const categoryLabels: Record<string, string> = {
          iluminacao: 'Iluminação',
          via_publica: 'Via Pública',
          pavimentacao: 'Pavimentação',
          calcada: 'Calçada',
          sinalizacao: 'Sinalização',
          drenagem: 'Drenagem',
          lixo: 'Lixo/Entulho',
          esgoto: 'Esgoto/Bueiro',
          area_verde: 'Área Verde',
          higiene_urbana: 'Higiene Urbana',
          animais: 'Animais',
          poluicao: 'Poluição',
          feedback_camara: 'Feedback Câmara',
          outro: 'Outro'
        };
        const categoryLabel = categoryLabels[args.category] || args.category;
        
        // If low confidence and not user confirmed, suggest alternatives
        if (args.confidence < 0.8 && !args.user_confirmed && args.alternative_categories?.length) {
          const alternatives = args.alternative_categories
            .map((cat: string) => categoryLabels[cat] || cat)
            .join(', ');
          
          return {
            success: true,
            message: `Não tenho certeza da categoria. É mais um problema de **${categoryLabel}** ou de **${alternatives}**?`,
            data: { 
              category: args.category, 
              confidence: args.confidence, 
              user_confirmed: false,
              needs_confirmation: true
            }
          };
        }
        
        // Classification confirmed (high confidence or user confirmed)
        const progressData = { 
          category: args.category,
          category_confidence: args.confidence,
          category_user_confirmed: args.user_confirmed
        };
        const progressMarker = `[COLLECTION_PROGRESS:urban_report:${JSON.stringify(progressData)}]`;
        
        const confirmationText = args.user_confirmed 
          ? `Entendido, **${categoryLabel}**.` 
          : `Certo, é um problema de **${categoryLabel}**.`;
        
        return {
          success: true,
          message: `${progressMarker}${confirmationText}\n\nQual o **CEP** do local?\n\n_Se não souber, me diz a rua e bairro._`,
          data: { 
            category: args.category, 
            confidence: args.confidence, 
            user_confirmed: args.user_confirmed 
          }
        };
      }
      
      case 'classify_transport_type': {
        // Validate report_type against enum
        const validTransportTypes = ['atraso', 'lotacao', 'seguranca', 'acessibilidade', 'limpeza', 'conducao', 'outro'];
        if (!validTransportTypes.includes(args.report_type)) {
          return {
            success: false,
            message: `Tipo inválido. Tipos válidos: ${validTransportTypes.join(', ')}`
          };
        }
        
        // Log classification for audit
        console.log('[classify_transport_type] Classification:', {
          report_type: args.report_type,
          subcategory_label: args.subcategory_label,
          confidence: args.confidence,
          reasoning: args.reasoning,
          user_confirmed: args.user_confirmed,
          alternatives: args.alternative_types
        });
        
        // Human-readable type labels
        const transportTypeLabels: Record<string, string> = {
          atraso: 'Atraso',
          lotacao: 'Lotação',
          seguranca: 'Segurança',
          acessibilidade: 'Acessibilidade',
          limpeza: 'Limpeza',
          conducao: 'Condução',
          outro: 'Outro'
        };
        const typeLabel = transportTypeLabels[args.report_type] || args.report_type;
        
        // If low confidence and not user confirmed, suggest alternatives
        if (args.confidence < 0.8 && !args.user_confirmed && args.alternative_types?.length) {
          const alternatives = args.alternative_types
            .map((t: string) => transportTypeLabels[t] || t)
            .join(', ');
          
          return {
            success: true,
            message: `Não tenho certeza do tipo. É mais um problema de **${typeLabel}** ou de **${alternatives}**?`,
            data: { 
              report_type: args.report_type, 
              subcategory_label: args.subcategory_label,
              confidence: args.confidence, 
              user_confirmed: false,
              needs_confirmation: true
            }
          };
        }
        
        // Classification confirmed (high confidence or user confirmed)
        const transportProgressData = { 
          report_type: args.report_type,
          subcategory_label: args.subcategory_label,
          type_confidence: args.confidence,
          type_user_confirmed: args.user_confirmed
        };
        const transportProgressMarker = `[COLLECTION_PROGRESS:transport_report:${JSON.stringify(transportProgressData)}]`;
        
        const transportConfirmationText = args.user_confirmed 
          ? `Entendido, **${typeLabel}**.` 
          : `Certo, é um problema de **${typeLabel}**.`;
        
        return {
          success: true,
          message: `${transportProgressMarker}${transportConfirmationText}\n\n**Qual linha ou estação** teve o problema?`,
          data: { 
            report_type: args.report_type, 
            subcategory_label: args.subcategory_label,
            confidence: args.confidence, 
            user_confirmed: args.user_confirmed 
          }
        };
      }
      
      case 'validate_cep': {
        const result = await lookupCEP(args.cep);
        if (result.valid) {
          if (!isCitySaoPaulo(result.city)) {
            return {
              success: false,
              message: MESSAGE_OUTSIDE_SAO_PAULO(result.city || undefined),
            };
          }
          // Include COLLECTION_PROGRESS marker with validated address data
          const cleanCep = args.cep.replace(/\D/g, '');
          const addressData = { 
            cep: cleanCep,
            street: result.street, 
            neighborhood: result.neighborhood,
            city: result.city,
            state: result.state
          };
          const progressMarker = `[COLLECTION_PROGRESS:urban_report:${JSON.stringify(addressData)}]`;
          
          // Add FIELD_REQUEST marker for deterministic capture of next response
          return {
            success: true,
            message: `${progressMarker}[FIELD_REQUEST:street_number]✅ **CEP válido!**\n\n📍 **Endereço encontrado:**\n- Rua: ${result.street}\n- Bairro: ${result.neighborhood}\n- Cidade: ${result.city}/${result.state}\n\nQual o **número** ou **ponto de referência** próximo?`,
            data: addressData
          };
        } else {
          return {
            success: false,
            message: 'CEP não encontrado. Pode verificar o número? Se não souber o CEP, me diz o nome da rua e bairro.'
          };
        }
      }
      
      case 'create_urban_report': {
        /** Conversa + args da ferramenta: o modelo costuma omitir risk_level / afetação no JSON — a coleta está no histórico. */
        const acc = (accumulatedFields || {}) as Record<string, unknown>;
        const rawArgs = (args || {}) as Record<string, unknown>;
        // Chaves explícitas `undefined` no objeto (ex.: toolArgs no index) não devem apagar valores vindos do histórico
        const argsSanitized = Object.fromEntries(
          Object.entries(rawArgs).filter(([, v]) => v !== undefined),
        ) as Record<string, unknown>;
        const eff: Record<string, unknown> = { ...acc, ...argsSanitized };

        // JSON do modelo pode trazer `risk_level: null` e sobrescrever a coleta do histórico — preferir valor preenchido na conversa
        const restoreEmptyFromAcc = (key: 'risk_level' | 'affected_scope' | 'urgency_reason') => {
          const v = eff[key];
          const fromAcc = acc[key];
          const empty = v === undefined || v === null || v === '';
          if (empty && fromAcc != null && fromAcc !== '') eff[key] = fromAcc;
        };
        restoreEmptyFromAcc('risk_level');
        restoreEmptyFromAcc('affected_scope');
        restoreEmptyFromAcc('urgency_reason');
        const rtEff = eff.risk_types;
        const rtAcc = acc.risk_types;
        if ((!Array.isArray(rtEff) || rtEff.length === 0) && Array.isArray(rtAcc) && rtAcc.length > 0) {
          eff.risk_types = rtAcc;
        }

        // Validar abrangência: apenas município de São Paulo (Guarulhos e demais cidades não aceitos)
        const reportCity = (eff.city ?? acc.city) as string | undefined;
        if (reportCity && !isCitySaoPaulo(reportCity)) {
          return {
            success: false,
            message: MESSAGE_OUTSIDE_SAO_PAULO(reportCity),
          };
        }
        // Validate category is provided
        if (!eff.category) {
          return {
            success: false,
            message: 'Preciso saber a categoria do relato (iluminação, buraco, esgoto, lixo, área verde, etc.). Pode descrever melhor o local ou o tema?'
          };
        }
        
        // Validate category against enum
        const validCategories = VALID_URBAN_CATEGORIES;
        if (!validCategories.includes(eff.category as (typeof validCategories)[number])) {
          console.error('[create_urban_report] Invalid category:', eff.category);
          return {
            success: false,
            message: `Categoria inválida: ${eff.category}. Categorias válidas: ${validCategories.join(', ')}`
          };
        }
        
        // USE CENTRALIZED NLP FUNCTION for flexible description validation
        // Accepts: 8+ chars with keyword OR 20+ chars OR 15+ with keyword
        const isValidDescription = eff.description && isValidDomainDescription(String(eff.description).trim(), 'urban');
        
        if (!isValidDescription) {
          return {
            success: false,
            message: '[FIELD_REQUEST:description]Por favor, descreva o problema com mais detalhes. O que está acontecendo exatamente?'
          };
        }
        
        // Validate required address fields
        if (!eff.street || !eff.neighborhood) {
          return {
            success: false,
            message: 'Preciso saber a rua e o bairro para registrar o relato. Qual o CEP ou endereço do local?'
          };
        }
        
        // === HARD VALIDATION: criticidade / risco (todas as categorias exceto feedback_camara) ===
        if (URBAN_RISK_COLLECTION_CATEGORIES.includes(String(eff.category || ''))) {
          if (!eff.risk_level) {
            const categoryLabels: Record<string, string> = {
              via_publica: 'via pública',
              pavimentacao: 'pavimentação',
              iluminacao: 'iluminação',
              esgoto: 'esgoto/alagamento',
              area_verde: 'área verde',
              calcada: 'calçada',
              sinalizacao: 'sinalização',
              drenagem: 'drenagem',
              poluicao: 'poluição',
              lixo: 'lixo/entulho',
              higiene_urbana: 'higiene urbana',
              animais: 'animais',
              outro: 'outro tema',
            };
            const label = categoryLabels[String(eff.category)] || eff.category;
            return {
              success: false,
              message: `[FIELD_REQUEST:risk_level]Para registrar com **criticidade correta**, qual o **nível de gravidade**? Toque em uma opção abaixo (ou descreva em uma frase). _(Categoria: ${label})_[QUICK_REPLY:critical,moderate,low,none]`,
            };
          }
          
          // If risk is moderate or critical, require affected_scope
          if (['critical', 'moderate'].includes(String(eff.risk_level)) && !eff.affected_scope) {
            // Add FIELD_REQUEST marker for deterministic capture of affected_scope
            return {
              success: false,
              message: '[FIELD_REQUEST:affected_scope]Entendi que há risco. Isso está afetando **só você**, **toda a rua** ou **o bairro todo**?'
            };
          }
        }
        
        // Category is now directly from classify_report_category (AI classification)
        // No more server-side normalization - trust the AI classification
        
        // Build location_address from structured fields
        const locationParts = [];
        if (eff.street) locationParts.push(eff.street);
        if (eff.street_number) locationParts.push(eff.street_number);
        if (eff.reference_point) locationParts.push(`(${eff.reference_point})`);
        if (eff.neighborhood) locationParts.push(`- ${eff.neighborhood}`);
        const location_address = locationParts.join(' ');
        
        // Generate protocol code atomically
        const { data: protocolData, error: protocolError } = await supabase
          .rpc('generate_protocol_code', { p_type: 'urban' });
        
        if (protocolError) {
          console.error('[executeTool] Protocol generation failed:', protocolError);
        }
        const protocolCode = protocolData || null;
        
        let derivedSeverity = mapUrbanRiskLevelToSeverity((eff.risk_level as string) || null);

        // Geocode para coordenadas do relato (usado em proximidade e no registro)
        let reportLat: number | null = null;
        let reportLon: number | null = null;
        let proximityAdjustment: { adjustedSeverity: string; proximityDetails: string[] } | null = null;

        const addrForGeocode = {
          street: (eff.street as string) || null,
          street_number: (eff.street_number as string) || null,
          neighborhood: (eff.neighborhood as string) || null,
          cep: (eff.cep as string) || null,
          city: (eff.city ?? acc.city) as string | null || 'São Paulo',
        };
        let coords = await geocodeAddressWithGoogle(supabase, addrForGeocode);
        if (!coords) {
          coords = await geocodeAddressToCoord(addrForGeocode);
        }
        if (coords) {
          reportLat = coords.lat;
          reportLon = coords.lon;
          proximityAdjustment = await adjustSeverityForProximityToSensitiveEquipment(
            supabase, reportLat, reportLon, derivedSeverity,
          );
          if (proximityAdjustment) {
            derivedSeverity = proximityAdjustment.adjustedSeverity;
          }
        }

        const reportNatureResolved =
          normalizeReportNature((eff.report_nature as string) ?? (acc.report_nature as string)) ??
          'reclamacao';

        // Prioridade imediata: relatos críticos de segurança e saúde
        const SAFETY_HEALTH_CATEGORIES = ['esgoto', 'via_publica', 'iluminacao', 'sinalizacao', 'drenagem', 'area_verde'];
        const isCriticalSeverity = derivedSeverity === 'critical';
        const isSafetyHealthWithRisk =
          SAFETY_HEALTH_CATEGORIES.includes(String(eff.category)) &&
          ['critical', 'moderate'].includes(String(eff.risk_level || ''));
        const initialN8nPriority =
          isCriticalSeverity || isSafetyHealthWithRisk ? 'critica' : null;

        console.log('[create_urban_report] Attempting to insert report:', {
          userId,
          category: eff.category,
          report_nature: reportNatureResolved,
          hasDescription: !!eff.description,
          hasStreet: !!eff.street,
          hasNeighborhood: !!eff.neighborhood,
          location_address,
          derivedSeverity,
        });
        
        const { data, error } = await supabase
          .from('urban_reports')
          .insert({
            user_id: userId,
            protocol_code: protocolCode,
            category: eff.category, // Use AI-classified category directly
            subcategory: eff.subcategory || null,
            report_nature: reportNatureResolved,
            description: eff.description,
            location_address: location_address,
            cep: eff.cep || null,
            street: eff.street || null,
            street_number: eff.street_number || null,
            reference_point: eff.reference_point || null,
            neighborhood: eff.neighborhood || null,
            latitude: reportLat,
            longitude: reportLon,
            photos: Array.isArray(eff.photos) && eff.photos.length > 0 ? eff.photos : null,
            ai_classification: {
              council_member_name: eff.council_member_name || null,
              council_member_party: eff.council_member_party || null
            },
            // Impact fields (new)
            risk_level: eff.risk_level || null,
            risk_types: eff.risk_types || [],
            affected_scope: eff.affected_scope || null,
            affected_estimate: eff.affected_estimate || null,
            active_consequences: eff.active_consequences || [],
            urgency_reason: eff.urgency_reason || null,
            severity: derivedSeverity,
            status: 'pending',
            n8n_priority: initialN8nPriority
          })
          .select('id, protocol_code')
          .single();
        
        if (error) {
          console.error('[create_urban_report] Database insert error:', error);
          throw error;
        }
        
        console.log('[create_urban_report] Report saved successfully:', {
          id: data.id,
          protocol_code: data.protocol_code
        });

        try {
          await insertClassificationPredictionLog(supabase, {
            userId,
            reportId: data.id,
            reportType: 'urban',
            predictedCategory: String(eff.category),
            predictedSubcategory: eff.subcategory ? String(eff.subcategory) : null,
            classificationSource: inferUrbanClassificationSource(
              accumulatedFields as Record<string, unknown> | undefined
            ),
          });
        } catch (metricErr) {
          console.warn('[create_urban_report] classification metric log failed:', metricErr);
        }

        if (eff.risk_level) {
          const desc = String(eff.description || "").trim();
          const snippet = desc.slice(0, 240);
          const autoAgain = desc ? autoInferRisk(desc) : null;
          const isAuto = String(eff.urgency_reason || "").startsWith("Auto-inferido");
          const justification =
            (eff.urgency_reason && String(eff.urgency_reason).trim()) ||
            `Nível de risco registrado na coleta estruturada: ${eff.risk_level}.`;
          await insertReportSeverityAuditLog(supabase, {
            urban_report_id: data.id,
            metric: "risk_level",
            previous_value: null,
            new_value: eff.risk_level,
            justification,
            source_snippet: snippet || null,
            confidence: isAuto && autoAgain?.confidence != null ? autoAgain.confidence : null,
            metadata: {
              risk_types: eff.risk_types ?? [],
              derived_severity: derivedSeverity,
              category: eff.category,
              auto_inferred: isAuto,
            },
          });
        }

        if (proximityAdjustment) {
          const prevSev = mapUrbanRiskLevelToSeverity((eff.risk_level as string) || null);
          await insertReportSeverityAuditLog(supabase, {
            urban_report_id: data.id,
            metric: "severity_proximity_adjustment",
            previous_value: prevSev,
            new_value: proximityAdjustment.adjustedSeverity,
            justification: `Severidade elevada por proximidade a ${proximityAdjustment.proximityDetails.join(', ')} (até ${PROXIMITY_RADIUS_METERS}m).`,
            source_snippet: null,
            metadata: {
              latitude: reportLat,
              longitude: reportLon,
              proximity_details: proximityAdjustment.proximityDetails,
            },
          });
        }
        
        // Notify n8n
        try {
          await supabase.functions.invoke('notify-n8n', {
            body: { 
              event_type: 'urban_report.created',
              entity_type: 'urban_report',
              entity_id: data.id,
              payload: { ...eff, user_id: userId }
            }
          });
        } catch (n8nError) {
          console.error('[executeTool] N8N notification failed:', n8nError);
        }
        
        // Build comprehensive success message with full summary
        const categoryLabels: Record<string, string> = {
          iluminacao: 'Iluminação',
          via_publica: 'Via Pública',
          pavimentacao: 'Pavimentação',
          calcada: 'Calçada',
          sinalizacao: 'Sinalização',
          drenagem: 'Drenagem',
          lixo: 'Lixo/Entulho',
          esgoto: 'Esgoto/Bueiro',
          area_verde: 'Área Verde',
          higiene_urbana: 'Higiene Urbana',
          animais: 'Animais',
          poluicao: 'Poluição',
          feedback_camara: 'Feedback Câmara',
          outro: 'Outro'
        };
        const categoryLabel = categoryLabels[String(eff.category)] || String(eff.category);
        
        const riskLabels: Record<string, string> = {
          critical: 'Crítico',
          moderate: 'Moderado',
          low: 'Baixo',
          none: 'Nenhum'
        };
        
        const scopeLabels: Record<string, string> = {
          individual: 'Apenas eu',
          local: 'Local (rua/quadra)',
          street: 'Toda a rua',
          building: 'Meu prédio/vizinhança',
          block: 'Quadra inteira',
          neighborhood: 'Bairro',
          regional: 'Regional (bairro)',
          citywide: 'Cidade toda',
          zone: 'Zona',
          city: 'Cidade toda'
        };
        
        const riskTypeLabels: Record<string, string> = {
          electrical: 'Elétrico',
          traffic: 'Trânsito',
          flooding: 'Alagamento',
          structural: 'Estrutural',
          health: 'Saúde',
          fire: 'Incêndio',
          pedestrian: 'Pedestre',
          vehicle: 'Veicular',
          environmental: 'Ambiental'
        };
        
        const consequenceLabels: Record<string, string> = {
          power_outage: 'Falta de luz',
          water_outage: 'Falta de água',
          traffic_blocked: 'Trânsito bloqueado',
          flooding: 'Alagamento',
          health_hazard: 'Risco à saúde',
          service_disruption: 'Serviço interrompido',
          pedestrian_blocked: 'Pedestres bloqueados',
          accidents_reported: 'Acidentes reportados',
          property_damage: 'Dano à propriedade',
          safety_risk: 'Risco à segurança'
        };
        
        // Build address section
        const addressParts: string[] = [];
        if (eff.street) addressParts.push(String(eff.street));
        if (eff.street_number) addressParts.push(String(eff.street_number));
        const addressLine = addressParts.join(', ');
        const neighborhoodLine = String(eff.neighborhood || '');
        const cepLine = eff.cep ? `CEP ${eff.cep}` : '';

        /**
         * Resumo pós-registro: `args` da ferramenta pode vir com risk_level undefined e apagar o merge —
         * restoreEmptyFromAcc já corrige `eff`, mas reforçamos com `acc` (histórico) para o texto final.
         */
        const summaryRiskLevel = String(
          eff.risk_level != null && eff.risk_level !== ''
            ? eff.risk_level
            : acc.risk_level != null && acc.risk_level !== ''
              ? acc.risk_level
              : '',
        ).trim();
        const summaryRiskTypes: string[] =
          Array.isArray(eff.risk_types) && (eff.risk_types as unknown[]).length > 0
            ? (eff.risk_types as string[])
            : Array.isArray(acc.risk_types) && (acc.risk_types as unknown[]).length > 0
              ? (acc.risk_types as string[])
              : [];
        const summaryAffected =
          eff.affected_scope != null && eff.affected_scope !== ''
            ? eff.affected_scope
            : acc.affected_scope != null && acc.affected_scope !== ''
              ? acc.affected_scope
              : null;

        /** Mesmo escopo que a coleta de criticidade (exclui feedback_camara). */
        const hasUrbanSeverity =
          URBAN_RISK_COLLECTION_CATEGORIES.includes(String(eff.category || '')) && summaryRiskLevel.length > 0;

        // Linhas de gravidade no próprio resumo (alinhado ao preview e ao fluxo de transporte)
        const urbanSeveritySummaryLines: string[] = [];
        if (hasUrbanSeverity) {
          urbanSeveritySummaryLines.push(
            `⚠️ **Gravidade / criticidade:** ${riskLabels[summaryRiskLevel] || summaryRiskLevel}`,
          );
          if (summaryRiskTypes.length) {
            const translatedTypes = summaryRiskTypes.map((t: string) => riskTypeLabels[t] || t);
            urbanSeveritySummaryLines.push(`🔗 **Tipos de risco:** ${translatedTypes.join(', ')}`);
          }
          if (summaryAffected != null && summaryAffected !== '') {
            urbanSeveritySummaryLines.push(
              `👥 **Afetação:** ${scopeLabels[String(summaryAffected)] || summaryAffected}`,
            );
          }
          if (eff.affected_estimate) {
            urbanSeveritySummaryLines.push(`📊 **Pessoas afetadas (estimativa):** ~${eff.affected_estimate}`);
          }
          const acList = Array.isArray(eff.active_consequences) ? eff.active_consequences as string[] : [];
          if (acList.length) {
            const translatedConseq = acList.map((c: string) => consequenceLabels[c] || c);
            urbanSeveritySummaryLines.push(`⚡ **Consequências ativas:** ${translatedConseq.join(', ')}`);
          }
        }

        const photosSection = Array.isArray(eff.photos) && eff.photos.length > 0
          ? `\n\n📷 **Fotos anexadas:** ${eff.photos.length} imagem(ns)\n`
          : '';

        // Compose full message
        const successMessage = [
          `[REPORT_CREATED:${data.id}]`,
          '',
          '✅ **Relato registrado com sucesso!**',
          '',
          data.protocol_code ? `🔖 **Protocolo:** \`${data.protocol_code}\`\n` : '',
          '**Resumo do seu relato:**',
          '',
          `📋 **Categoria:** ${categoryLabel}${eff.subcategory ? ` - ${eff.subcategory}` : ''}`,
          '',
          `📝 **Descrição:** ${eff.description}`,
          ...(urbanSeveritySummaryLines.length > 0 ? ['', ...urbanSeveritySummaryLines] : []),
          '',
          `📍 **Endereço:**`,
          addressLine ? `- ${addressLine}` : '',
          neighborhoodLine ? `- ${neighborhoodLine}` : '',
          cepLine ? `- ${cepLine}` : '',
          eff.reference_point ? `- Referência: ${eff.reference_point}` : '',
          photosSection,
          '',
          '---',
          '',
          URBAN_REPORT_TRAMITE_AFTER_REGISTRATION,
          '',
          '---',
          '',
          '🔗 [Ver Meus Relatos](/relato-urbano/historico) para acompanhar o status',
          '',
          '**Quer que eu encaminhe esse relato para algum vereador?**',
          '',
          'Posso ajudar com mais alguma coisa?'
        ].filter(line => line !== '').join('\n');
        
        // Track emerging category patterns for NLP learning (async, non-blocking)
        try {
          await detectEmergingCategory(String(eff.description || ''), String(eff.category || ''), supabase);
          console.log('[executeTool] Emerging category detection completed for urban report');
        } catch (detectError) {
          console.error('[executeTool] Emerging category detection failed:', detectError);
        }
        
        return { 
          success: true, 
          message: successMessage,
          data: { id: data.id, protocol_code: data.protocol_code, type: 'urban' }
        };
      }
      
      case 'create_transport_report': {
        // Merge accumulated fields into args (especially date_confirmed from picker/natural language)
        if (accumulatedFields?.date_confirmed && !args.date_confirmed) {
          args.date_confirmed = true;
          console.log('[create_transport_report] Inherited date_confirmed from accumulatedFields');
        }
        if (accumulatedFields?.occurrence_date && !args.occurrence_date) {
          args.occurrence_date = accumulatedFields.occurrence_date;
        }
        
        // === VALIDAÇÃO ESTRITA (coleta sequencial obrigatória) ===
        // Helper: inferir report_type de forma robusta (dicionário expandido)
        const inferReportTypeFromDesc = (description: string): string | null => {
          const desc = description.toLowerCase();
          
          // SEGURANÇA (prioridade - termos graves)
          if (/ass[ée]dio|encox|importunação|abuso|agress|ameaç|roubo|furto|assalto|arma|facão|faca|briga|violên|estup|molest/i.test(desc)) {
            return 'seguranca';
          }
          
          // ATRASO
          if (/atras|demor|não (veio|passou|chegou)|espera|aguard|15\s*min|20\s*min|30\s*min|meia hora|uma hora/i.test(desc)) {
            return 'atraso';
          }
          
          // LOTAÇÃO
          if (/lot[aç]|cheio|superlot|aperta|empurr|não (coube|cabe)|sardinha/i.test(desc)) {
            return 'lotacao';
          }
          
          // ACESSIBILIDADE
          if (/elevador|rampa|cadeira|deficien|acessib|cego|surdo|mobilidade/i.test(desc)) {
            return 'acessibilidade';
          }
          
          // LIMPEZA
          if (/suj[oa]|lixo|fedido|mal cheiro|imundo|nojento|barata|rato|inseto/i.test(desc)) {
            return 'limpeza';
          }
          
          // CONDUÇÃO
          if (/motorista|dirig|freiada|acelera|imprudên|perigos|costur/i.test(desc)) {
            return 'conducao';
          }
          
          return null;
        };
        
        // === COLETA SEQUENCIAL OBRIGATÓRIA ===
        // 1. DESCRIÇÃO (obrigatória, validada via NLP)
        if (!args.description || !isValidDomainDescription(args.description.trim(), 'transport')) {
          return {
            success: false,
            message: '[FIELD_REQUEST:description]**O que aconteceu?** Me conta o problema com mais detalhes.'
          };
        }
        
        // 2. REPORT_TYPE (obrigatório, inferido da descrição, fallback para 'outro' com label)
        let validReportType = args.report_type;
        let subcategoryLabel = args.subcategory_label || null;
        
        if (!validReportType || validReportType === 'outro') {
          const inferred = inferReportTypeFromDesc(args.description);
          if (inferred) {
            validReportType = inferred;
            console.log('[create_transport_report] Inferred report_type:', validReportType, 'from description');
          } else {
            // FALLBACK: Não conseguiu inferir - usar 'outro' com label gerado
            validReportType = 'outro';
            subcategoryLabel = generateTransportLabelFromDescription(args.description);
            console.log('[create_transport_report] Fallback to outro with label:', subcategoryLabel);
          }
        }
        
        // Se ainda não tem subcategory_label, gerar um
        if (!subcategoryLabel && validReportType !== 'outro') {
          subcategoryLabel = getTransportTypeLabel(validReportType);
        }
        
        // 3. LINHA (obrigatória)
        if (!args.line_code) {
          return {
            success: false,
            message: '[FIELD_REQUEST:line_code]**Qual linha ou estação** teve o problema?'
          };
        }
        
        // 4. DATA (obrigatória - modelo DEVE ter coletado explicitamente, NUNCA assumir)
        // O modelo PRECISA ter perguntado e o usuário respondido "hoje", "ontem" ou data específica
        if (!args.occurrence_date) {
          return {
            success: false,
            message: '[FIELD_REQUEST:occurrence_date]**Quando isso aconteceu?** (hoje, ontem, ou me diz a data)'
          };
        }

        if (!args.occurrence_time) {
          return {
            success: false,
            message: '[FIELD_REQUEST:occurrence_time]Qual foi o **horário exato** da ocorrência? [TIME_PICKER]'
          };
        }

        const normalizedTime = parseFlexibleOccurrenceTime(String(args.occurrence_time || ""));
        if (!normalizedTime) {
          return {
            success: false,
            message: '[FIELD_REQUEST:occurrence_time]Não consegui entender o horário. Pode informar no formato **HH:MM**? [TIME_PICKER]'
          };
        }
        args.occurrence_time = normalizedTime;

        if (!args.direction || !['ida', 'volta', 'circular'].includes(String(args.direction).toLowerCase())) {
          return {
            success: false,
            message: '[FIELD_REQUEST:direction]Qual era o **sentido** da viagem? [DIRECTION_PICKER]'
          };
        }
        args.direction = String(args.direction).toLowerCase();
        
        // Date confirmation check - args.date_confirmed is set by accumulateFieldsFromHistory
        // when user explicitly selects via picker or says "hoje"/"ontem"
        const today = new Date().toISOString().split('T')[0];
        if (args.occurrence_date === today && !args.date_confirmed) {
          console.log('[create_transport_report] Date is today but not explicitly confirmed, asking user');
          return {
            success: false,
            message: '[FIELD_REQUEST:occurrence_date]Isso aconteceu **hoje**? Me confirma a data.'
          };
        }
        
        // === PROCESSAMENTO APÓS VALIDAÇÃO ===
        
        // Get line_id if line_code provided
        let lineId = null;
        if (args.line_code) {
          const { data: lineData } = await supabase
            .from('transport_lines')
            .select('id')
            .ilike('line_code', args.line_code)
            .single();
          lineId = lineData?.id || null;
        }
        
        // Inferir severidade para incidentes de segurança
        const inferredSeverity = validReportType === 'seguranca' ? 'alta' : (args.severity || 'media');
        
        // Generate protocol code atomically
        const { data: protocolData, error: protocolError } = await supabase
          .rpc('generate_protocol_code', { p_type: 'transport' });
        
        if (protocolError) {
          console.error('[executeTool] Protocol generation failed:', protocolError);
        }
        const protocolCode = protocolData || null;
        
        // Prioridade imediata: relatos críticos de segurança e saúde
        const isTransportSafety = validReportType === 'seguranca';
        const isTransportCritical = inferredSeverity === 'critica';
        const isTransportHigh = inferredSeverity === 'alta';
        const initialTransportPriority = isTransportSafety || isTransportCritical
          ? 'critica'
          : isTransportHigh
            ? 'alta'
            : null;

        console.log('[create_transport_report] Attempting to insert report:', {
          userId,
          report_type: validReportType,
          hasDescription: !!args.description,
          hasLineCode: !!args.line_code,
          hasOccurrenceDate: !!args.occurrence_date,
          lineId
        });
        
        const photosArray = Array.isArray(args.photos) && args.photos.length > 0
          ? args.photos.slice(0, 3)
          : null;

        const { data, error } = await supabase
          .from('transport_reports')
          .insert({
            user_id: userId,
            protocol_code: protocolCode,
            report_type: validReportType,
            description: args.description,
            occurrence_date: args.occurrence_date,
            occurrence_time: args.occurrence_time || null,
            direction: args.direction || null,
            line_id: lineId,
            line_code_custom: args.line_code || null,
            location: args.location || null,
            severity: inferredSeverity,
            impact_description: args.impact_description || null,
            status: 'pending',
            photos: photosArray,
            n8n_priority: initialTransportPriority
          })
          .select('id, protocol_code')
          .single();
        
        if (error) {
          console.error('[create_transport_report] Database insert error:', error);
          throw error;
        }
        
        console.log('[create_transport_report] Report saved successfully:', {
          id: data.id,
          protocol_code: data.protocol_code
        });

        try {
          await insertClassificationPredictionLog(supabase, {
            userId,
            reportId: data.id,
            reportType: 'transport',
            predictedCategory: String(validReportType),
            predictedSubcategory: subcategoryLabel ? String(subcategoryLabel) : null,
            classificationSource: inferTransportClassificationSource(
              accumulatedFields as Record<string, unknown> | undefined
            ),
          });
        } catch (metricErr) {
          console.warn('[create_transport_report] classification metric log failed:', metricErr);
        }

        const transportSeverityJustification =
          validReportType === "seguranca"
            ? "Política: relato classificado como 'seguranca' → severidade 'alta'."
            : args.severity
              ? `Severidade informada na coleta: ${args.severity}.`
              : "Severidade padrão 'media' (sem valor explícito na coleta).";

        await insertReportSeverityAuditLog(supabase, {
          transport_report_id: data.id,
          metric: "severity",
          previous_value: null,
          new_value: inferredSeverity,
          justification: transportSeverityJustification,
          source_snippet: String(args.description || "").trim().slice(0, 240) || null,
          metadata: {
            report_type: validReportType,
            user_provided_severity: args.severity ?? null,
          },
        });
        
        // Notify n8n
        try {
          await supabase.functions.invoke('notify-n8n', {
            body: { 
              event_type: 'transport_report.created',
              entity_type: 'transport_report',
              entity_id: data.id,
              payload: { ...args, user_id: userId }
            }
          });
        } catch (n8nError) {
          console.error('[executeTool] N8N notification failed:', n8nError);
        }
        
        const reportTypeLabels: Record<string, string> = {
          atraso: 'Atraso',
          lotacao: 'Lotação',
          seguranca: 'Segurança',
          acessibilidade: 'Acessibilidade',
          limpeza: 'Limpeza',
          conducao: 'Condução',
          outro: 'Outro'
        };
        
        // Use subcategoryLabel or fallback to type label
        const displayLabel = subcategoryLabel || reportTypeLabels[validReportType] || validReportType;
        const typeLabel = reportTypeLabels[validReportType] || validReportType;
        
        const severityLabels: Record<string, string> = {
          baixa: 'Baixa', media: 'Média', alta: 'Alta', critica: 'Crítica'
        };
        const severityLabel = severityLabels[inferredSeverity] || inferredSeverity;
        
        // Compose full success message with [TRANSPORT_CREATED] marker for tracker reconstruction
        const successMessage = [
          `[TRANSPORT_CREATED:${data.id}]`,
          '',
          '✅ **Relato de transporte registrado!**',
          '',
          data.protocol_code ? `🔖 **Protocolo:** \`${data.protocol_code}\`\n` : '',
          '**Resumo do seu relato:**',
          '',
          `📋 **Tipo:** ${typeLabel}${subcategoryLabel ? ` - ${subcategoryLabel}` : ''}`,
          `🚌 **Linha:** ${args.line_code || 'Não informada'}`,
          `📅 **Data:** ${args.occurrence_date}`,
          args.occurrence_time ? `🕐 **Horário:** ${args.occurrence_time}` : '',
          args.direction ? `🧭 **Sentido:** ${String(args.direction).charAt(0).toUpperCase()}${String(args.direction).slice(1)}` : '',
          args.location ? `📍 **Local:** ${args.location}` : '',
          photosArray?.length ? `📷 **Fotos anexadas:** ${photosArray.length} imagem(ns)` : '',
          `⚠️ **Gravidade:** ${severityLabel}`,
          '',
          `📝 **Descrição:** ${args.description.substring(0, 100)}${args.description.length > 100 ? '...' : ''}`,
          '',
          '---',
          '',
          TRANSPORT_REPORT_TRAMITE_AFTER_REGISTRATION,
          '',
          '---',
          '',
          '🔗 [Ver Meus Relatos](/transporte/meus-relatos) para acompanhar.',
          '',
          '**Quer que eu encaminhe esse relato para algum vereador?**',
          '',
          'Posso ajudar com mais alguma coisa?'
        ].filter(line => line !== '').join('\n');
        
        // Track emerging patterns for NLP learning (async, non-blocking)
        try {
          await detectEmergingCategory(args.description, validReportType, supabase);
          console.log('[executeTool] Emerging category detection completed for transport report');
        } catch (detectError) {
          console.error('[executeTool] Transport emerging pattern detection failed:', detectError);
        }
        
        return { 
          success: true, 
          message: successMessage,
          data: { id: data.id, protocol_code: data.protocol_code, type: 'transport' }
        };
      }
      
      case 'create_service_rating': {
        // 1. Avaliação: preferir dimensões completas; senão rating_stars (legado)
        const dimsMerged =
          (args.rating_dimensions && isCompleteServiceRatingDimensions(args.rating_dimensions) ? args.rating_dimensions : null) ??
          (accumulatedFields?.rating_dimensions && isCompleteServiceRatingDimensions(accumulatedFields.rating_dimensions)
            ? accumulatedFields.rating_dimensions
            : null);
        let stars =
          typeof args.rating_stars === 'number' && args.rating_stars >= 1 && args.rating_stars <= 5
            ? args.rating_stars
            : null;
        if (dimsMerged && typeof dimsMerged === 'object') {
          stars = aggregateRatingDimensionsStars(dimsMerged as Record<string, number>);
        }
        if (!stars || stars < 1 || stars > 5) {
          return {
            success: false,
            message:
              '[FIELD_REQUEST:rating_stars]**Avaliação geral:** de **1 a 5** (1 = muito ruim, 5 = excelente). [RATING_PICKER]',
          };
        }
        const ratingDimensionsJson = dimsMerged && typeof dimsMerged === 'object' ? (dimsMerged as Record<string, number>) : null;
        
        // 2. Validate rating_text
        if (!args.rating_text || args.rating_text.trim().length < 5) {
          return {
            success: false,
            message: '[FIELD_REQUEST:rating_text]**Pode descrever sua experiência?** Me conta como foi o atendimento. (mínimo 5 caracteres)'
          };
        }
        
        let serviceId: string | null = null;
        let visitId: string | null = null;
        let serviceNameForMessage = args.service_name || '';

        // === MODO VISITA: visit_id informado (página de avaliação conversacional) ===
        if (args.visit_id) {
          const { data: visitData, error: visitLoadError } = await supabase
            .from('service_visits')
            .select('id, service_id')
            .eq('id', args.visit_id)
            .eq('user_id', userId)
            .single();

          if (visitLoadError || !visitData) {
            console.error('[create_service_rating] Visit not found or access denied:', args.visit_id);
            return { success: false, message: 'Visita não encontrada. Tente acessar novamente pela notificação.' };
          }

          visitId = visitData.id;
          serviceId = visitData.service_id;
          serviceNameForMessage = args.service_name || accumulatedFields?.service_name || 'serviço';
          console.log('[create_service_rating] Using existing visit:', visitId, 'service:', serviceId);
        } else {
          // === MODO LIVRE: sem visit_id - coleta service_type, service_name, confirmação de endereço ===
        if (!args.service_type) {
          return {
            success: false,
            message: '[FIELD_REQUEST:service_type]**Qual tipo de serviço** você quer avaliar? (UBS, escola, hospital, CEU, biblioteca, centro esportivo) [SERVICE_TYPE_PICKER]'
          };
        }
        if (!args.service_name || args.service_name.trim().length < 3) {
          return {
            success: false,
            message: '[FIELD_REQUEST:service_name]**Qual o nome** do serviço que você visitou? (ex: UBS Vila Madalena, EMEF João XXIII) [SERVICE_PICKER]'
          };
        }
        const addressConfirmed = args.service_address_confirmed || 
                                 accumulatedFields?.service_address_confirmed ||
                                 accumulatedFields?._address_reconfirmed;
        if (!addressConfirmed) {
          const address = args.service_address || 
                          accumulatedFields?.service_address || 
                          (accumulatedFields?.service_neighborhood ? 
                            `${args.service_name} - ${accumulatedFields.service_neighborhood}` : null) ||
                          'Endereço não informado';
          return {
            success: false,
            message: `[FIELD_REQUEST:service_address_confirmed]O serviço fica em **${address}**. Está correto? [SERVICE_ADDRESS_CONFIRM:${address}]`
          };
        }
        
          const serviceNameArg = (args.service_name as string || '').trim();
          const serviceTypeArg = (args.service_type as string || '').toLowerCase();
          const neighborhood = (args.service_neighborhood || accumulatedFields?.service_neighborhood) as string | undefined;

          const tryFindService = async (
            typeFilter: string | null,
            namePattern: string
          ): Promise<{ id: string; name: string } | null> => {
            let q = supabase.from('public_services').select('id, name').ilike('name', namePattern).limit(5);
            if (typeFilter) q = q.eq('service_type', typeFilter);
            const { data } = await q;
            if (data?.length) return data[0];
            return null;
          };

          const tryFindByDistrict = async (namePart: string): Promise<{ id: string; name: string } | null> => {
            if (!neighborhood || namePart.length < 3) return null;
            const districtClean = neighborhood.split(/[-–—,]/)[0]?.trim().slice(0, 25);
            if (!districtClean) return null;
            const { data } = await supabase
          .from('public_services')
              .select('id, name')
              .ilike('name', `%${namePart}%`)
              .ilike('district', `%${districtClean}%`)
              .limit(3);
            return data?.length ? data[0] : null;
          };

          // Extrai a parte distintiva: "CEU - Rosa Da China" -> "Rosa Da China" (o banco usa "CEU AT COMPL ROSA DA CHINA")
          const partsAfterDash = serviceNameArg.split(/\s*[-–—]\s*/);
          const distinctivePart = (partsAfterDash.length > 1 ? partsAfterDash[partsAfterDash.length - 1] : serviceNameArg).trim();

          let found = await tryFindService(serviceTypeArg, `%${serviceNameArg}%`);
          if (!found && distinctivePart.length >= 4) {
            found = await tryFindService(serviceTypeArg, `%${distinctivePart}%`)
              || await tryFindService(null, `%${distinctivePart}%`);
          }
          if (!found && serviceNameArg.length > 8) {
            const withoutPrefix = serviceNameArg.replace(/^(biblioteca|ubs|emef|hospital|centro|ceu)\s+(de\s+)?/i, '').trim();
            if (withoutPrefix.length >= 4) found = await tryFindService(serviceTypeArg, `%${withoutPrefix}%`)
              || await tryFindService(null, `%${withoutPrefix}%`);
          }
          if (!found && distinctivePart.length >= 4) {
            found = await tryFindByDistrict(distinctivePart);
          }
          if (!found) found = await tryFindService(null, `%${serviceNameArg}%`);
          if (!found && distinctivePart.length >= 4) {
            found = await tryFindService(null, `%${distinctivePart}%`);
          }
          if (!found && serviceTypeArg === 'ceu') {
            found = await tryFindService('library', `%${serviceNameArg}%`)
              || (distinctivePart.length >= 4 ? await tryFindService('library', `%${distinctivePart}%`) : null);
          }

          if (found) {
            serviceId = found.id;
            serviceNameForMessage = found.name;
          const expires = new Date();
          expires.setDate(expires.getDate() + 7);
          const { data: visitData, error: visitError } = await supabase
            .from('service_visits')
            .insert({
              user_id: userId,
              service_id: serviceId,
              expires_at: expires.toISOString(),
              status: 'completed'
            })
            .select('id')
            .single();
            if (!visitError && visitData) visitId = visitData.id;
          }
          if (!serviceId || !visitId) {
            console.warn('[create_service_rating] Service not found in DB:', { serviceTypeArg, serviceNameArg, neighborhood });
            return {
              success: false,
              message: 'Não encontrei esse serviço na base cadastrada. Tente informar apenas o nome principal (ex: "CEU Rosa da China"). Se o serviço não estiver cadastrado, entre em contato com o suporte.',
            };
          }
        }
        
        if (!serviceId || !visitId) {
          return { success: false, message: 'Não encontrei esse serviço na base cadastrada. Tente informar apenas o nome principal (ex: "CEU Rosa da China"). Se o serviço não estiver cadastrado, entre em contato com o suporte.' };
        }
        
        const trimmedComment = args.rating_text.trim();
        const { data: modStatus, error: modRpcError } = await supabase.rpc(
          'compute_service_rating_publication_status',
          { p_text: trimmedComment },
        );
        if (modRpcError) {
          console.warn('[create_service_rating] moderation RPC error:', modRpcError.message);
        }
        const preModeration =
          typeof modStatus === 'string' && ['published', 'pending_review', 'rejected'].includes(modStatus)
            ? modStatus
            : null;
        if (preModeration === 'rejected') {
          return {
            success: false,
            message:
              '[FIELD_REQUEST:rating_text]**Não foi possível enviar este comentário.** Remova links (http/https), evite palavrões ou insultos graves e tente de novo com um texto respeitoso sobre o atendimento.',
          };
        }

        console.log('[create_service_rating] Attempting to insert rating:', {
          userId,
          serviceId,
          visitId,
          rating_stars: stars,
          moderation_preview: preModeration,
        });

        const insertRow: Record<string, unknown> = {
          user_id: userId,
          service_id: serviceId,
          visit_id: visitId,
          rating_stars: stars,
          rating_text: trimmedComment,
          sentiment: args.sentiment || 'neutral',
        };
        if (ratingDimensionsJson) {
          insertRow.rating_dimensions = ratingDimensionsJson;
        }

        const { data, error } = await supabase
          .from('service_ratings')
          .insert(insertRow)
          .select('id, publication_status')
          .single();

        if (error) {
          console.error('[create_service_rating] Database insert error:', error.code, error.message, error.details);
          return {
            success: false,
            message: 'Não foi possível salvar sua avaliação no momento. Por favor, tente novamente. Se o problema continuar, entre em contato com o suporte.'
          };
        }

        const publicationStatus = (data?.publication_status as string) || 'published';
        if (publicationStatus === 'rejected') {
          const { error: delErr } = await supabase.from('service_ratings').delete().eq('id', data.id);
          if (delErr) console.warn('[create_service_rating] cleanup rejected row:', delErr.message);
          return {
            success: false,
            message:
              '[FIELD_REQUEST:rating_text]**Não foi possível enviar este comentário.** Ajuste o texto (sem links, linguagem adequada) e envie novamente.',
          };
        }
        
        if (args.visit_id) {
          await supabase
            .from('service_visits')
            .update({ status: 'completed' })
            .eq('id', visitId);
        }
        
        console.log('[create_service_rating] Rating saved successfully:', {
          id: data.id,
          publication_status: publicationStatus,
        });

        const commentPreview = trimmedComment.substring(0, 80) + (trimmedComment.length > 80 ? '...' : '');
        const moderationNote =
          publicationStatus === 'pending_review'
            ? '\n\n⏳ **Seu comentário passará por revisão** antes de aparecer publicamente para outros cidadãos. A nota já foi registrada.'
            : '';
        const dimLine = ratingDimensionsJson
          ? `\n📊 **Por dimensão:** Atendimento ${ratingDimensionsJson.atendimento}/5 · Limpeza ${ratingDimensionsJson.limpeza}/5 · Infraestrutura ${ratingDimensionsJson.infraestrutura}/5 · Tempo de espera ${ratingDimensionsJson.tempo_espera}/5`
          : '';

        return {
          success: true,
          message: `[RATING_CREATED:${data.id}]\n\n✅ **Avaliação registrada!**\n\n🏥 **Serviço:** ${serviceNameForMessage}\n⭐ **Nota geral (média):** ${'★'.repeat(stars)}${'☆'.repeat(5 - stars)}${dimLine}\n📝 **Comentário:** ${commentPreview}${moderationNote}\n\nObrigado pelo seu feedback! Ele ajuda a melhorar os serviços públicos.\n\nPosso ajudar com mais alguma coisa?`,
          data: { id: data.id, type: 'rating', publication_status: publicationStatus },
        };
      }
      
      case 'search_knowledge_base': {
        const result = await searchKnowledgeBase(supabase, args.query);
        return { 
          success: true, 
          message: result || 'Não encontrei informações sobre isso. Tente reformular a pergunta.' 
        };
      }

      case 'get_service_occupancy_status': {
        const serviceId = typeof args.service_id === 'string' ? args.service_id.trim() : '';
        if (serviceId && /^[a-f0-9-]{36}$/i.test(serviceId)) {
          const result = await getServiceOccupancyStatusByServiceId(supabase, serviceId);
          return { success: true, message: result };
        }
        const serviceName = typeof args.service_name === 'string' ? args.service_name.trim() : '';
        const district = typeof args.district === 'string' ? args.district.trim() : '';
        if (!serviceName) {
          return {
            success: false,
            message: 'Me diga o nome do equipamento para eu consultar a ocupação (ex.: "CEU Butantã").'
          };
        }
        const result = await getServiceOccupancyStatusByName(supabase, serviceName, district || undefined);
        return { success: true, message: result };
      }
      
      case 'find_nearby_services': {
        let userLat: number | null = null;
        let userLon: number | null = null;
        // Prioridade: args (modelo) > accumulatedFields (conversa) > endereço cadastrado
        if (args.user_lat != null && args.user_lon != null) {
          userLat = Number(args.user_lat);
          userLon = Number(args.user_lon);
        }
        if ((userLat == null || userLon == null) && accumulatedFields?.user_lat != null && accumulatedFields?.user_lon != null) {
          userLat = Number(accumulatedFields.user_lat);
          userLon = Number(accumulatedFields.user_lon);
        }
        if (userLat == null || userLon == null) {
          const { data: addr } = await supabase
            .from('user_addresses')
            .select('latitude, longitude, street, number, neighborhood, zip_code, city')
            .eq('user_id', userId)
            .eq('is_primary', true)
            .maybeSingle();
          if (addr?.latitude != null && addr?.longitude != null) {
            userLat = Number(addr.latitude);
            userLon = Number(addr.longitude);
          } else if (addr?.street && addr?.neighborhood) {
            let coords = await geocodeAddressWithGoogle(supabase, {
              street: addr.street,
              street_number: addr.number,
              neighborhood: addr.neighborhood,
              cep: addr.zip_code,
              city: addr.city || 'São Paulo',
            });
            if (!coords) {
              coords = await geocodeAddressToCoord({
                street: addr.street,
                street_number: addr.number,
                neighborhood: addr.neighborhood,
                cep: addr.zip_code,
                city: addr.city || 'São Paulo',
              });
            }
            if (coords) {
              userLat = coords.lat;
              userLon = coords.lon;
            }
          }
        }

        /** Texto legível para "perto de …" (GPS → reverse geocoding; cadastrado/manual → endereço conhecido). */
        let referenceLocationText: string | null = null;
        if (userLat != null && userLon != null && Number.isFinite(userLat) && Number.isFinite(userLon)) {
          const method = typeof accumulatedFields?.location_method === 'string' ? accumulatedFields.location_method : '';
          const street = typeof accumulatedFields?.street === 'string' ? accumulatedFields.street.trim() : '';
          const neighborhood = typeof accumulatedFields?.neighborhood === 'string' ? accumulatedFields.neighborhood.trim() : '';
          const streetNumber = typeof accumulatedFields?.street_number === 'string' ? accumulatedFields.street_number.trim() : '';

          if (street && neighborhood) {
            referenceLocationText = streetNumber
              ? `${street}, ${streetNumber} - ${neighborhood}`
              : `${street} - ${neighborhood}`;
          } else if (method === 'registered_address' && userId) {
            const { data: addrRow } = await supabase
              .from('user_addresses')
              .select('street, number, neighborhood')
              .eq('user_id', userId)
              .eq('is_primary', true)
              .maybeSingle();
            const s = addrRow?.street?.trim();
            const n = addrRow?.neighborhood?.trim();
            const num = addrRow?.number?.trim();
            if (s && n) {
              referenceLocationText = num ? `${s}, ${num} - ${n}` : `${s} - ${n}`;
            }
          }
          // GPS e demais casos só com lat/lon: converter coordenadas em endereço legível
          if (!referenceLocationText) {
            referenceLocationText = await reverseGeocodeLatLon(userLat, userLon);
          }
        }

        const radiusMeters = typeof args.radius_meters === 'number' ? args.radius_meters : 2000;
        const minRating = typeof args.min_rating === 'number' ? args.min_rating : 0;
        const searchQuery = typeof args.search_query === 'string' ? args.search_query : null;
        const result = await findNearbyServices(
          supabase,
          args.service_type,
          args.district,
          args.limit || 10,
          userLat,
          userLon,
          radiusMeters,
          minRating,
          searchQuery,
          referenceLocationText,
        );
        return { success: true, message: result };
      }
      
      case 'search_audiencias': {
        const result = await searchAudiencias(
          supabase,
          args.tema,
          args.status,
          args.inscricoes_abertas,
          args.data_inicio,
          args.data_fim,
          args.regiao
        );
        return { success: true, message: result };
      }

      case 'subscribe_audiencia_topic_alert': {
        if (!userId) {
          return { success: false, message: 'Para receber avisos quando houver audiências sobre um tema, faça login no app. Depois peça de novo: "avise quando tiver audiências sobre [tema]".' };
        }
        const temaRaw = typeof args.tema === 'string' ? args.tema.trim() : '';
        if (!temaRaw) {
          return { success: false, message: 'Informe o tema sobre o qual você quer receber avisos (ex.: Esportes, Saúde, Educação).' };
        }
        const tema = temaRaw.charAt(0).toUpperCase() + temaRaw.slice(1).toLowerCase();
        // Service role evita RLS: o JWT do usuário nem sempre é repassado ao PostgREST no contexto da tool; userId já foi validado acima
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        const client = (serviceKey && supabaseUrl) ? createClient(supabaseUrl, serviceKey) : supabase;
        const { error } = await client
          .from('audiencia_topic_alerts')
          .upsert({ user_id: userId, tema }, { onConflict: 'user_id,tema' });
        if (error) {
          console.error('[subscribe_audiencia_topic_alert]', error.code, error.message, error.details);
          if (error.code === '42P01' || error.message?.includes('does not exist')) {
            return { success: false, message: 'O recurso de avisos por tema ainda não está disponível neste ambiente. Em breve você poderá ativar esse aviso.' };
          }
          return { success: false, message: 'Não foi possível registrar seu aviso. Tente novamente em instantes.' };
        }
        return {
          success: true,
          message: `Anotado! Você receberá uma notificação no app quando houver novas audiências públicas sobre **${tema}**. Quer que eu busque agora se já existe alguma agendada sobre esse tema?`
        };
      }
      
      case 'suggest_council_member': {
        const result = await suggestCouncilMember(args.issue_type, args.description, args.district);
        return { success: true, message: result };
      }
      
      case 'get_citizen_history': {
        const result = await getCitizenHistory(supabase, userId, args.history_type, args.status_filter, args.limit);
        return { success: true, message: result };
      }

      // === OLHO VIVO (SPTrans ônibus São Paulo) ===
      case 'search_bus_lines': {
        const termos = typeof args.termos_busca === 'string' ? args.termos_busca.trim() : '';
        if (!termos) {
          return { success: false, message: 'Informe o número ou nome da linha para buscar (ex: 8000 ou Lapa).' };
        }
        const out = await olhoVivoSearchLines(termos);
        if (!out.success) {
          return { success: false, message: out.error || 'Não foi possível consultar as linhas. Tente mais tarde.' };
        }
        if (!out.lines?.length) {
          return { success: true, message: `Nenhuma linha encontrada para "${termos}". Tente outro número ou nome.` };
        }
        const linesText = out.lines.slice(0, 15).map((l) => {
          const sentido = l.sl === 1 ? `${l.tp} → ${l.ts}` : `${l.ts} → ${l.tp}`;
          return `• **${l.lt}** (cód. ${l.cl}): ${sentido}`;
        }).join('\n');
        return { success: true, message: `**Linhas encontradas:**\n${linesText}\n\n_Use o código (cód.) para consultar itinerário ou previsão._` };
      }

      case 'search_bus_stops': {
        const termos = typeof args.termos_busca === 'string' ? args.termos_busca.trim() : '';
        if (!termos) {
          return { success: false, message: 'Informe o nome da parada ou endereço (rua, logradouro). A API não busca por coordenadas; peça um endereço ou nome de rua ao cidadão.' };
        }
        let out = await olhoVivoSearchStops(termos);
        if (!out.success) {
          return { success: false, message: out.error || 'Não foi possível consultar as paradas.' };
        }
        if (!out.stops?.length && termos.includes(' ')) {
          const fallback = termos.split(/\s+/).filter((w) => w.length > 2).pop() || termos;
          if (fallback !== termos) {
            out = await olhoVivoSearchStops(fallback);
          }
        }
        if (!out.stops?.length) {
          return { success: true, message: `Nenhuma parada encontrada para "${termos}". Peça ao cidadão o nome da rua ou do ponto (ex.: Afonso Braz, Balthazar da Veiga). A API da SPTrans não permite busca por coordenadas.` };
        }
        const stopsText = out.stops.slice(0, 12).map((s) =>
          `• **${s.np}** (cód. ${s.cp}) – ${s.ed}`
        ).join('\n');
        return { success: true, message: `**Paradas encontradas:**\n${stopsText}\n\n_Use o código (cód.) para consultar previsão de chegada._` };
      }

      case 'get_bus_line_itinerary': {
        const codigoLinha = typeof args.codigo_linha === 'number' ? args.codigo_linha : parseInt(String(args.codigo_linha), 10);
        if (!Number.isFinite(codigoLinha)) {
          return { success: false, message: 'Informe o código da linha (obtido em "buscar linhas").' };
        }
        const out = await olhoVivoGetStopsByLine(codigoLinha);
        if (!out.success) {
          return { success: false, message: out.error || 'Não foi possível buscar o itinerário.' };
        }
        if (!out.stops?.length) {
          return { success: true, message: 'Itinerário não disponível para esta linha.' };
        }
        const itineraryText = out.stops.map((s, i) => `${i + 1}. ${s.np} – ${s.ed}`).join('\n');
        return { success: true, message: `**Itinerário da linha (paradas em ordem):**\n${itineraryText}` };
      }

      case 'get_bus_arrival_forecast': {
        const codigoParada = typeof args.codigo_parada === 'number' ? args.codigo_parada : parseInt(String(args.codigo_parada), 10);
        const codigoLinha = typeof args.codigo_linha === 'number' ? args.codigo_linha : parseInt(String(args.codigo_linha), 10);
        if (!Number.isFinite(codigoParada) || !Number.isFinite(codigoLinha)) {
          return { success: false, message: 'Informe o código da parada e o código da linha.' };
        }
        const out = await olhoVivoPrevisao(codigoParada, codigoLinha);
        if (!out.success) {
          return { success: false, message: out.error || 'Não foi possível obter a previsão.' };
        }
        const p = out.parada;
        if (!p?.l?.length) {
          return { success: true, message: `Parada **${p?.np || '?'}**: nenhuma previsão no momento para esta linha.` };
        }
        const parts: string[] = [`**Previsão – ${p.np}**`];
        for (const lin of p.l) {
          const vs = lin.vs || [];
          if (vs.length === 0) {
            parts.push(`\n• Linha **${lin.c}** (${lin.lt0} → ${lin.lt1}): sem previsão no momento.`);
          } else {
            const times = vs.slice(0, 5).map((v) => v.t || '--').join(', ');
            parts.push(`\n• Linha **${lin.c}** (${lin.lt0} → ${lin.lt1}): ${times}`);
          }
        }
        return { success: true, message: parts.join('\n') };
      }

      case 'get_bus_stop_forecast_all_lines': {
        const codigoParada = typeof args.codigo_parada === 'number' ? args.codigo_parada : parseInt(String(args.codigo_parada), 10);
        if (!Number.isFinite(codigoParada)) {
          return { success: false, message: 'Informe o código da parada (obtido em "buscar paradas").' };
        }
        const out = await olhoVivoPrevisaoParada(codigoParada);
        if (!out.success) {
          return { success: false, message: out.error || 'Não foi possível obter a previsão.' };
        }
        const p = out.parada;
        if (!p?.l?.length) {
          return { success: true, message: `Parada **${p?.np || '?'}**: nenhuma previsão no momento.` };
        }
        const parts: string[] = [`**Previsão – ${p.np}** (todas as linhas)`];
        for (const lin of p.l.slice(0, 15)) {
          const vs = lin.vs || [];
          if (vs.length === 0) {
            parts.push(`\n• Linha **${lin.c}** (${lin.lt0} → ${lin.lt1}): sem previsão.`);
          } else {
            const times = vs.slice(0, 3).map((v) => v.t || '--').join(', ');
            parts.push(`\n• Linha **${lin.c}** (${lin.lt0} → ${lin.lt1}): ${times}`);
          }
        }
        if (p.l.length > 15) parts.push(`\n_… e mais ${p.l.length - 15} linhas._`);
        return { success: true, message: parts.join('\n') };
      }

      // === JORNADA CONSCIENTE: Handlers de Detecção e Transição ===
      case 'detect_user_intent': {
        const { 
          intent, confidence, reasoning, suggested_alternatives,
          urban_category, transport_type, extracted_description, category_confidence 
        } = args;
        
        console.log('[detect_user_intent] Intent:', intent, 'Confidence:', confidence);
        console.log('[detect_user_intent] Reasoning:', reasoning);
        console.log('[detect_user_intent] Extracted - Category:', urban_category, 'Type:', transport_type, 'Description:', extracted_description);
        
        // Map intent to collection type for tracker
        const intentToCollection: Record<string, string | null> = {
          'urban_report': 'urban_report',
          'transport_report': 'transport_report',
          'service_rating': 'service_rating',
          'services': null, // Light journey, no tracker
          'general': null,  // Light journey, no tracker
          'unknown': null
        };
        
        const collectionType = intentToCollection[intent];
        
        // Human-readable category names
        const categoryLabels: Record<string, string> = {
          iluminacao: 'Iluminação',
          via_publica: 'Via Pública',
          pavimentacao: 'Pavimentação',
          calcada: 'Calçada',
          sinalizacao: 'Sinalização',
          drenagem: 'Drenagem',
          lixo: 'Lixo/Entulho',
          esgoto: 'Esgoto/Bueiro',
          area_verde: 'Área Verde',
          higiene_urbana: 'Higiene Urbana',
          animais: 'Animais',
          poluicao: 'Poluição',
          feedback_camara: 'Feedback Câmara',
          outro: 'Outro'
        };
        
        // Human-readable names for intents
        const intentNames: Record<string, string> = {
          'urban_report': 'Relato Urbano',
          'transport_report': 'Diagnóstico de Transporte',
          'service_rating': 'Avaliação de Serviço',
          'services': 'Busca de Serviços',
          'general': 'Dúvidas Gerais'
        };
        
        if (confidence >= 0.8 && collectionType) {
          // High confidence: activate journey with extracted data
          
          // Build progress data including category/description if extracted
          const progressData: Record<string, unknown> = {};
          
          if (intent === 'urban_report') {
            // Include category if extracted with high confidence
            if (urban_category && (category_confidence || 0) >= 0.8) {
              progressData.category = urban_category;
              progressData.category_confidence = category_confidence;
            }
            // Include description if extracted (>= 30 chars)
            if (extracted_description && extracted_description.length >= 30) {
              progressData.description = extracted_description;
            }
          } else if (intent === 'transport_report') {
            // Include report_type if extracted - EXCLUDE "outro" (it's not a real classification)
            if (transport_type && transport_type !== 'outro' && (category_confidence || 0) >= 0.8) {
              progressData.report_type = transport_type;
            }
            // Only include description if it's substantive (>= 30 chars, not generic)
            const genericPhrases = ['problema no transporte', 'reclamar do transporte', 'problema com onibus', 'problema com ônibus'];
            const isGeneric = genericPhrases.some(p => (extracted_description || '').toLowerCase().includes(p));
            if (extracted_description && extracted_description.length >= 30 && !isGeneric) {
              progressData.description = extracted_description;
            }
          }
          
          const progressMarker = `[COLLECTION_PROGRESS:${collectionType}:${JSON.stringify(progressData)}]`;
          
          // Generate natural response based on intent and extracted data
          let naturalResponse = '';
          
          switch (intent) {
            case 'urban_report':
              if (urban_category && (category_confidence || 0) >= 0.8) {
                const catLabel = categoryLabels[urban_category] || urban_category;
                naturalResponse = `${progressMarker}Entendi! Vou registrar esse problema de **${catLabel}**. Para localizar o local exato, qual o **CEP**?\n\n_Se não souber, me diz a rua e bairro._`;
              } else {
                naturalResponse = `${progressMarker}Entendi! Vou registrar esse problema. Para localizar o local exato, qual o **CEP**?\n\n_Se não souber, me diz a rua e bairro._`;
              }
              break;
            case 'transport_report':
              // Perguntar tipo PRIMEIRO se não foi detectado (pergunta ABERTA, sem viés)
              if (transport_type && transport_type !== 'outro' && (category_confidence || 0) >= 0.8) {
                const typeLabels: Record<string, string> = {
                  atraso: 'Atraso',
                  lotacao: 'Lotação',
                  seguranca: 'Segurança',
                  acessibilidade: 'Acessibilidade',
                  limpeza: 'Limpeza'
                };
                const typeLabel = typeLabels[transport_type] || transport_type;
                naturalResponse = `${progressMarker}Entendi! Vou registrar esse problema de **${typeLabel}** no transporte. Qual **linha ou estação** teve o problema?`;
              } else {
                // Pergunta ABERTA sem listar opções (evita viés)
                naturalResponse = `${progressMarker}Entendi! Vou registrar o problema no transporte.\n\n**O que aconteceu?** Me conta o problema.`;
              }
              break;
            case 'service_rating':
              naturalResponse = `${progressMarker}Entendi! Vou registrar sua avaliação. Qual **tipo de serviço** você quer avaliar? (UBS, escola, hospital, CEU...)`;
              break;
            default:
              naturalResponse = `${progressMarker}Entendi! Como posso ajudar?`;
          }
          
          return {
            success: true,
            message: naturalResponse,
            data: {
              status: 'activated',
              journey: intent,
              collection_type: collectionType,
              confidence: confidence,
              extracted_data: progressData
            }
          };
        } else if (confidence < 0.8 && collectionType) {
          // Low confidence: ask for clarification naturally
          const alternativesList = (suggested_alternatives || [])
            .map((alt: string) => intentNames[alt] || alt)
            .slice(0, 2)
            .join(' ou ');
          
          return {
            success: true,
            message: `Isso é um problema para **${intentNames[intent]}** ou ${alternativesList}? Me ajuda a entender melhor.`,
            data: {
              status: 'needs_confirmation',
              detected: intent,
              alternatives: suggested_alternatives || [],
              confidence: confidence
            }
          };
        } else {
          // Light journey (services, general): respond naturally
          return {
            success: true,
            message: `Claro! Como posso ajudar?`,
            data: {
              status: 'light_journey',
              intent: intent
            }
          };
        }
      }
      
      case 'confirm_journey_switch': {
        const { current_journey, detected_journey, current_progress_summary } = args;
        
        console.log('[confirm_journey_switch] Current:', current_journey, 'Detected:', detected_journey);
        console.log('[confirm_journey_switch] Progress summary:', current_progress_summary);
        
        // Human-readable names for ALL journeys
        const journeyNames: Record<string, string> = {
          'urban_report': 'Relato Urbano',
          'transport_report': 'Diagnóstico de Transporte',
          'service_rating': 'Avaliação de Serviço',
          'services': 'Busca de Serviços',
          'audiencias': 'Audiências Públicas',
          'history': 'Meu Histórico',
          'general': 'Dúvidas Gerais',
          'vereadores': 'Vereadores da Região',
          'noticias': 'Notícias Legislativas',
          'chamber_feedback': 'Feedback sobre Vereador'
        };
        
        const currentName = journeyNames[current_journey] || current_journey;
        const detectedName = journeyNames[detected_journey] || detected_journey;
        
        // The frontend will render buttons based on this marker
        const switchMarker = `[JOURNEY_SWITCH_PROMPT:${detected_journey}:${current_journey}]`;
        
        return {
          success: true,
          message: `Percebi que você quer falar sobre **${detectedName}**, mas ainda não terminamos seu **${currentName}**${current_progress_summary ? ` (${current_progress_summary})` : ''}. O que prefere fazer?\n\n${switchMarker}`,
          data: {
            status: 'switch_pending',
            current: current_journey,
            current_name: currentName,
            detected: detected_journey,
            detected_name: detectedName,
            progress: current_progress_summary
          }
        };
      }
      
      default:
        return { success: false, message: `Função ${name} não reconhecida.` };
    }
  } catch (error) {
    console.error(`[executeTool] Error executing ${name}:`, error);
    return { success: false, message: `Erro ao executar ${name}: ${(error as Error).message}` };
  }
}
