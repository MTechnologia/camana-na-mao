import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ========== NLP: BRAZILIAN PORTUGUESE PATTERNS (CENTRALIZED) ==========

/**
 * Detects affirmative responses in Brazilian Portuguese
 * Expanded patterns for natural language understanding
 */
function isAffirmativeResponse(text: string): boolean {
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
function isNegativeResponse(text: string): boolean {
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
    'horário', 'horario', 'endereço', 'endereco', 'telefone', 'contato', 'atendimento'
  ]
};

/**
 * Validates if text is a valid description for the given domain
 * Uses flexible threshold: >= 20 chars OR (>= 8 chars + domain keyword)
 */
function isValidDomainDescription(text: string, domain: string): boolean {
  if (!text || isGenericIntentText(text)) return false;
  
  const keywords = DOMAIN_KEYWORDS[domain] || [];
  const lower = text.toLowerCase();
  const hasKeyword = keywords.some(kw => lower.includes(kw));
  
  // FLEXIBLE: >= 20 chars (detailed) OR >= 8 chars + keyword (short but specific)
  return text.length >= 20 || (text.length >= 8 && hasKeyword);
}

/**
 * Extracts implicit data from user response based on context
 * Uses the last assistant question to understand what data to infer
 */
function extractImplicitData(
  userMessage: string, 
  lastAssistantQuestion: string,
  domain: string
): Record<string, any> {
  const lower = userMessage.toLowerCase().trim();
  const questionLower = lastAssistantQuestion.toLowerCase();
  const extracted: Record<string, any> = {};
  
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
    if (/manhã|de manhã|cedo|logo cedo/i.test(lower)) {
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
function tryPatternBasedLabel(description: string, category: string): string | null {
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
      { pattern: /lombada\s*(irregular|alta)/i, label: 'Lombada Irregular' },
      { pattern: /semaforo|semáforo/i, label: 'Semáforo com Defeito' }
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
async function generateIntelligentLabel(
  description: string,
  category: string
): Promise<string> {
  // First try pattern-based matching
  const patternLabel = tryPatternBasedLabel(description, category);
  if (patternLabel) return patternLabel;
  
  // Try AI-based label generation
  try {
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      return generateLabelFromDescription(description);
    }
    
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${lovableApiKey}`
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite',
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
const EMERGING_PATTERNS = [
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
async function detectEmergingCategory(
  description: string,
  currentCategory: string,
  supabaseClient: any
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
async function createDynamicCategory(
  key: string,
  name: string,
  parentCategory: string,
  description: string,
  supabaseClient: any
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
function extractCategoryKeywords(text: string): string[] {
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
async function logCategoryUsage(
  category: string,
  subcategory: string | null,
  description: string,
  userId: string | null,
  supabaseClient: any
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

interface CitizenLearningProfile {
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
async function loadCitizenProfile(
  userId: string,
  supabaseClient: any
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
async function learnFromConversation(
  userId: string,
  messages: Array<{ role: string; content: string }>,
  reportData: Record<string, any>,
  supabaseClient: any
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
      const updates: any = {
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
function getPersonalizedPromptAdditions(profile: CitizenLearningProfile | null): string {
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

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
function normalizeForMatching(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics (accents)
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')        // Replace punctuation with spaces
    .replace(/\s+/g, ' ')             // Collapse multiple spaces
    .trim();
}

// Simple Levenshtein distance for fuzzy matching
function levenshteinDistance(a: string, b: string): number {
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
function fuzzyMatchKeyword(token: string, keywords: string[], maxDistance: number = 1): boolean {
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
function inferTransportTypeFromText(text: string): string | null {
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
type CollectionIntent = {
  type: 'urban_report' | 'transport_report' | 'service_rating' | 'services' | 'audiencias' | 'general' | 'history' | 'vereadores' | 'noticias';
  fields: Record<string, any>;
  accumulatedFields?: Record<string, any>; // All fields collected across conversation
};

interface DetectionScore {
  type: 'urban_report' | 'transport_report' | 'service_rating' | 'chamber_feedback' | 'services' | 'audiencias' | 'general' | 'history' | 'vereadores' | 'noticias';
  score: number;
  fields: Record<string, any>;
}

// Tool hint for light journeys (services, audiencias, general, history)
function getToolHintForIntent(intentType: string): string | null {
  const hints: Record<string, string> = {
    'services': '[TOOL_HINT:find_nearby_services]',
    'audiencias': '[TOOL_HINT:search_audiencias]',
    'general': '[TOOL_HINT:search_knowledge_base]',
    'history': '[TOOL_HINT:get_citizen_history]',
  };
  return hints[intentType] || null;
}

// Intent keywords - EXPANDED for natural language detection
const INTENT_KEYWORDS = [
  // === Mensagens dos chips (PromptChips.tsx) - HIGH PRIORITY ===
  'relatar um problema', 'problema na cidade', 'problema no transporte',
  'avaliar um serviço', 'me diz o que está acontecendo', 'qual linha e o que aconteceu',
  'quero relatar um problema', 'problema urbano',
  
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
  'audiência', 'audiencia', 'consulta pública',
  
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
  
  // === Perguntas sobre a Câmara ===
  'como funciona', 'o que é', 'quem é', 'me explica', 'dúvida sobre'
];

// Extract transport-specific fields - EXPANDED VOCABULARY
function extractTransportFields(context: string): Record<string, any> {
  const fields: Record<string, any> = {};
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
  const timeMatch = context.match(/(\d{1,2})[h:](\d{2})?/);
  if (timeMatch) {
    fields.occurrence_time = `${timeMatch[1].padStart(2, '0')}:${timeMatch[2] || '00'}`;
  } else if (context.includes('manhã') || context.includes('cedo')) {
    fields.occurrence_time = '08:00';
  } else if (context.includes('tarde')) {
    fields.occurrence_time = '14:00';
  } else if (context.includes('noite')) {
    fields.occurrence_time = '19:00';
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

// Lookup CEP via ViaCEP API
async function lookupCEP(cep: string): Promise<{
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

// Valid categories for urban reports (source of truth)
const VALID_URBAN_CATEGORIES = [
  'iluminacao', 'calcada', 'via_publica', 'lixo', 'esgoto', 
  'area_verde', 'higiene_urbana', 'animais', 'poluicao', 'feedback_camara', 'outro'
] as const;

// State to track if category has been classified via AI for current conversation
const classifiedCategories = new Map<string, { category: string; confidence: number; user_confirmed: boolean }>();

// Extract urban report-specific fields - SIMPLIFIED: NO category inference, NO location extraction
// Category is now EXCLUSIVELY determined by classify_report_category tool (AI classification)
function extractUrbanFields(context: string): Record<string, any> {
  const fields: Record<string, any> = {};
  
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
function normalizeTextForMatching(text: string): string {
  return text
    .replace(/\*\*/g, '') // Remove bold markers
    .replace(/_/g, '')    // Remove italic markers
    .replace(/\n+/g, ' ') // Replace newlines with spaces
    .replace(/\s+/g, ' ') // Collapse multiple spaces
    .toLowerCase()
    .trim();
}

// Check if text is a generic intent phrase (not a real description)
function isGenericIntentText(text: string): boolean {
  const genericPhrases = [
    /^quero\s*(relatar|reportar|fazer|registrar)/i,
    /^preciso\s*(relatar|reportar|fazer|registrar)/i,
    /^tenho\s*um\s*(problema|relato)/i,
    /^problema\s*(na|no)\s*(cidade|bairro|rua)/i,
    /^relatar\s*(um\s*)?problema/i,
    /^fazer\s*(um\s*)?(relato|denuncia)/i,
    /^quero\s*avaliar/i,
    /^avaliar\s*(um\s*)?servi[çc]o/i,
    /^(sim|não|ok|pode|quero|desejo|aceito)$/i,
    // Transport generic intents - NOT actual descriptions
    /^quero\s*(denunciar|relatar|reportar)\s*(um\s*)?(problema|issue)/i,
    /^problema\s*(de|no|com)\s*transporte/i,
    /^relatar.*transporte/i,
  ];
  
  const normalized = text.trim().toLowerCase();
  
  // Short messages without specifics are generic
  if (normalized.length < 8) return true;
  
  // Check generic patterns
  if (genericPhrases.some(pattern => pattern.test(normalized))) return true;
  
  return false;
}

// Transport keywords for semantic detection
const TRANSPORT_KEYWORDS = [
  'atraso', 'atrasado', 'atrasou', 'demora', 'demorou', 'esperando', 'nunca chega', 'não passou', 'nao passou',
  'lotado', 'lotação', 'lotacao', 'cheio', 'superlotado', 'apertado', 'sem espaço', 'sem espaco', 'não coube', 'nao coube',
  'segurança', 'seguranca', 'assalto', 'roubo', 'assédio', 'assedio', 'perigo', 'medo', 'ameaça', 'briga', 'agressão', 'agressao',
  'sujo', 'sujeira', 'limpeza', 'fedendo', 'fedor', 'nojento', 'imundo', 'lixo', 'vômito', 'vomito',
  'acessibilidade', 'cadeirante', 'elevador', 'rampa', 'deficiente', 'muleta', 'pcd', 'mobilidade',
  'motorista', 'cobrador', 'rude', 'grosso', 'mal educado', 'não parou', 'nao parou', 'condução', 'conducao', 'freada', 'perigoso',
  'ônibus', 'onibus', 'metrô', 'metro', 'trem', 'linha', 'estação', 'estacao', 'ponto', 'terminal'
];

// Check if text contains transport-specific keywords (for flexible validation)
function hasTransportKeywords(text: string): boolean {
  const lower = text.toLowerCase();
  return TRANSPORT_KEYWORDS.some(kw => lower.includes(kw));
}

// Heuristic auto-classification of urban category from description
// Returns category, confidence, AND a suggested intuitive label for subcategory
function autoClassifyCategory(description: string): { 
  category: string | null; 
  confidence: number;
  suggestedLabel: string | null;
} {
  const desc = description.toLowerCase();
  
  // Label mapping: more specific patterns → intuitive labels
  const labelPatterns: Array<{ pattern: RegExp; label: string }> = [
    // Poluição sonora - labels intuitivos
    { pattern: /som\s*alto|m[úu]sica\s*alta|musica\s*alta/, label: 'Perturbação Sonora' },
    { pattern: /bar\s*(barulho|barulhento|som|muito)?|balada|danceteria|boate|casa\s*noturna/, label: 'Estabelecimento Barulhento' },
    { pattern: /festa|evento|show/, label: 'Evento com Barulho' },
    { pattern: /vizinho\s*(barulho|som|incomoda)?/, label: 'Perturbação por Vizinho' },
    { pattern: /obra\s*(barulho|cedo|madrugada|domingo)?/, label: 'Barulho de Obra' },
    { pattern: /buzina|alarme/, label: 'Poluição Sonora' },
    { pattern: /latido|cachorro|cao|cães/, label: 'Barulho de Animais' },
    { pattern: /fuma[çc]a|queimada|fumacca/, label: 'Poluição Atmosférica' },
    { pattern: /contamina[çc][ãa]o|qu[ií]mico|t[óo]xico/, label: 'Contaminação Ambiental' },
    
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
    // === ESGOTO / ALAGAMENTO (HIGHEST priority) ===
    { keywords: /vazamento|alagamento|alagad[oa]|água\s*na\s*rua|bueiro\s*(entupido|transbordando|aberto|tampa)|esgoto|córrego|valeta|enchente|inundad?[oa]?|transbord/i, category: 'esgoto', weight: 10 },
    
    // === ILUMINAÇÃO (EXPANDED - weight 9 para auto-classificar) ===
    // Padrões curtos como "poste caído" devem classificar com alta confiança
    { keywords: /poste\s*(apagad|sem\s*luz|queimad|ca[íi]d|quebrad|danificad|torto|pendend|inclinad)|luz\s*(apagad|queimad)|ilumina[çc][ãa]o|sem\s*luz|escuro|escurid[ãa]o|l[âa]mpada\s*(queimad|apagad|quebrad)/i, category: 'iluminacao', weight: 9 },
    
    // === POLUIÇÃO SONORA (weight 9) ===
    { keywords: /som\s*alto|m[úu]sica\s*alta|musica\s*alta|bar\s*(com\s*)?(som|barulho|barulhento)|balada|danceteria|boate|casa\s*noturna|festa\s*(barulho|vizinho)?|vizinho\s*(barulho|som)|perturbação\s*(sonora)?|perturbacao|madrugada.*barulho|barulho.*madrugada/i, category: 'poluicao', weight: 9 },
    
    // === VIA PÚBLICA (EXPANDED - weight 8) ===
    { keywords: /buraco|asfalto\s*(danificad|quebrad|esburacad)?|rua\s*(esburacad|quebrad)|pavimenta[çc][ãa]o|cratera|eros[ãa]o|desmoron|sem[áa]foro|sinaliza[çc][ãa]o|faixa\s*(de\s*pedestre|apagad)|lombada|via\s*p[úu]blica/i, category: 'via_publica', weight: 8 },
    
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
    
    // === POLUIÇÃO GERAL (smoke, contamination) ===
    { keywords: /fuma[çc]a|polui[çc][ãa]o\s*(ar|atmosf)?|contamina[çc][ãa]o|t[óo]xico|qu[íi]mico/i, category: 'poluicao', weight: 7 },
    
    // === POLUIÇÃO SONORA GENÉRICA (weight 6 - pede confirmação) ===
    { keywords: /barulho|ru[íi]do|buzina|alarme|latido|bagun[çc]a|obra\s*(barulho|cedo)?/i, category: 'poluicao', weight: 6 },
    
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

// Generate intuitive label from description when no pattern matches
function generateLabelFromDescription(description: string): string {
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
function generateTransportLabelFromDescription(description: string): string {
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
function getTransportTypeLabel(reportType: string): string {
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
function mapLabelToCategory(label: string): string | null {
  if (!label) return null;
  const labelLower = label.toLowerCase();
  
  // Semantic mapping: keywords that indicate specific categories
  const semanticMap: Record<string, string[]> = {
    'iluminacao': [
      'poste', 'luz', 'lampada', 'lâmpada', 'escuro', 'escuridão', 'iluminação', 
      'apagado', 'queimado', 'caído', 'caido', 'torto', 'inclinado', 'pendendo'
    ],
    'via_publica': [
      'buraco', 'asfalto', 'rua', 'via', 'semáforo', 'semaforo', 'sinalização', 
      'sinalizacao', 'cratera', 'pista', 'faixa', 'erosão', 'desmoronamento'
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
function autoInferRisk(description: string): { 
  risk_level: string | null; 
  confidence: number;
  risk_types?: string[];
  reason?: string;
} {
  const desc = description.toLowerCase();
  
  // Critical risk patterns with weights
  const criticalPatterns: Array<{ pattern: RegExp; weight: number; type?: string; reason: string }> = [
    // Flooding - most common high-risk
    { pattern: /completamente\s*alagad[oa]|totalmente\s*alagad[oa]|muito\s*alagad[oa]/, weight: 0.95, type: 'flooding', reason: 'alagamento grave' },
    { pattern: /alagad[oa]|inundad[oa]|chei[oa]\s*d[e']?\s*[áa]gua/, weight: 0.85, type: 'flooding', reason: 'alagamento' },
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

// Parse user response for specific field types
function parseFieldResponse(fieldType: string, userResponse: string): Record<string, any> {
  const response = userResponse.trim();
  const responseLower = response.toLowerCase();
  const result: Record<string, any> = {};
  
  switch (fieldType) {
    case 'street_number':
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
      
    case 'category':
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
        'buraco': 'via_publica', 'asfalto': 'via_publica', 'via pública': 'via_publica', 'via publica': 'via_publica', 'semáforo': 'via_publica', 'semaforo': 'via_publica', 'rua': 'via_publica',
        'calçada': 'calcada', 'calcada': 'calcada', 'passeio': 'calcada',
        'lixo': 'lixo', 'entulho': 'lixo', 'sujeira': 'lixo',
        'esgoto': 'esgoto', 'bueiro': 'esgoto', 'vazamento': 'esgoto', 'alagamento': 'esgoto', 'água': 'esgoto', 'agua': 'esgoto',
        'área verde': 'area_verde', 'area verde': 'area_verde', 'árvore': 'area_verde', 'arvore': 'area_verde', 'praça': 'area_verde', 'praca': 'area_verde', 'mato': 'area_verde',
        'higiene': 'higiene_urbana', 'fedor': 'higiene_urbana', 'cheiro': 'higiene_urbana',
        'animais': 'animais', 'rato': 'animais', 'barata': 'animais', 'animal': 'animais',
        // EXPANDED: Poluição with noise-related terms
        'poluição': 'poluicao', 'poluicao': 'poluicao', 'barulho': 'poluicao', 'ruido': 'poluicao', 'ruído': 'poluicao',
        'som': 'poluicao', 'som alto': 'poluicao', 'música': 'poluicao', 'musica': 'poluicao', 'festa': 'poluicao',
        'perturbação': 'poluicao', 'perturbacao': 'poluicao', 'vizinho': 'poluicao', 'bar': 'poluicao', 'balada': 'poluicao',
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
      
    case 'risk_level':
      // Parse risk level from natural language - EXPANDED VOCABULARY
      // Simple yes/no responses first
      if (responseLower === 'sim' || responseLower === 's' || responseLower === 'yes' || responseLower === 'y') {
        result.risk_level = 'critical';
        result.urgency_reason = response;
        break;
      }
      if (responseLower === 'não' || responseLower === 'nao' || responseLower === 'n' || responseLower === 'no') {
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
        // Emergency/urgency
        'risco imediato', 'emergência', 'urgente', 'urgência', 'gravíssimo', 'muito grave', 'muito perigoso',
        // Injury/health immediate
        'ferido', 'machucado', 'hospital', 'ambulância', 'samu',
        // Intensity boosters (with context)
        'completamente', 'totalmente', 'extremamente'
      ];
      const moderateKeywords = [
        'risco de', 'pode causar', 'perigoso', 'perigo', 'acidente', 
        'risco de doença', 'doença', 'doenças', 'contaminação', 'transtorno', 'prejudica',
        'arriscado', 'preocupante', 'pode machucar', 'pode alagar', 'grande', 'sério'
      ];
      const lowKeywords = ['incômodo', 'incomodo', 'chato', 'desconfortável', 'feio', 'ruim', 'só atrapalha', 'so atrapalha'];
      const noRiskKeywords = ['sem risco', 'não tem risco', 'nao tem risco', 'nenhum risco', 'tranquilo', 'não há risco', 'nao ha risco', 'só incômodo', 'so incomodo'];
      
      if (noRiskKeywords.some(k => responseLower.includes(k))) {
        result.risk_level = 'none';
      } else if (criticalKeywords.some(k => responseLower.includes(k))) {
        result.risk_level = 'critical';
        // Also extract risk types
        const riskTypes: string[] = [];
        if (responseLower.includes('fio') || responseLower.includes('choque') || responseLower.includes('elétric') || responseLower.includes('eletric')) riskTypes.push('electrical');
        if (responseLower.includes('bloqueada') || responseLower.includes('não passa') || responseLower.includes('trânsito') || responseLower.includes('transito')) riskTypes.push('traffic');
        if (responseLower.includes('alagad') || responseLower.includes('inundad') || responseLower.includes('água') || responseLower.includes('agua') || responseLower.includes('enchente')) riskTypes.push('flooding');
        if (responseLower.includes('caindo') || responseLower.includes('desab') || responseLower.includes('tomb') || responseLower.includes('rachando')) riskTypes.push('structural');
        if (riskTypes.length > 0) result.risk_types = riskTypes;
      } else if (moderateKeywords.some(k => responseLower.includes(k))) {
        result.risk_level = 'moderate';
        // Extract risk types for moderate too
        const riskTypes: string[] = [];
        if (responseLower.includes('doença') || responseLower.includes('saúde') || responseLower.includes('contaminação') || responseLower.includes('contaminacao')) riskTypes.push('health');
        if (responseLower.includes('acidente') || responseLower.includes('trânsito') || responseLower.includes('transito')) riskTypes.push('traffic');
        if (riskTypes.length > 0) result.risk_types = riskTypes;
      } else if (lowKeywords.some(k => responseLower.includes(k))) {
        result.risk_level = 'low';
      }
      // Store urgency reason with user's actual words
      if (result.risk_level) {
        result.urgency_reason = response;
      }
      break;
      
    case 'affected_scope':
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
      
    case 'active_consequences':
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
      
    case 'description':
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
  
  return result;
}

// Accumulate fields from all messages in conversation for better tracking
function accumulateFieldsFromHistory(
  messages: Array<{ role: string; content: string }>,
  collectionType: 'urban_report' | 'transport_report' | 'service_rating' | 'services' | 'audiencias' | 'general' | 'history' | 'vereadores' | 'noticias'
): Record<string, any> {
  // Only accumulate for structured journeys
  if (!['urban_report', 'transport_report', 'service_rating'].includes(collectionType)) {
    return {};
  }
  const accumulated: Record<string, any> = {};
  
  // Check for fields already collected via [COLLECTION_PROGRESS] markers
  for (const msg of messages) {
    if (msg.role === 'assistant' && msg.content.includes('[COLLECTION_PROGRESS:')) {
      const match = msg.content.match(/\[COLLECTION_PROGRESS:[^:]+:(\{[^}]+\})\]/);
      if (match) {
        try {
          const fields = JSON.parse(match[1]);
          Object.assign(accumulated, fields);
        } catch (e) {}
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
      
      console.log('[accumulateFields] Parsed Google Places address:', {
        street: accumulated.street,
        neighborhood: accumulated.neighborhood,
        cep: accumulated.cep
      });
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
          contentLower.includes('linha selecionada:') ||
          contentLower.includes('nota:') ||
          contentLower.includes('data:') ||
          /^\d+$/.test(msg.content.trim());
        
        // Skip generic intent messages that don't describe a specific problem
        const isGeneric = isGenericIntentText(msg.content);
        
        // USE CENTRALIZED NLP: accepts 8+ chars with keyword OR 20+ chars OR 15+ with keyword
        if (!isStructured && !isGeneric && isValidDomainDescription(msg.content, domain)) {
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
          { pattern: /problema de \*?\*?cal[çc]ada\*?\*?/i, category: 'calcada' },
          { pattern: /problema de \*?\*?lixo\*?\*?/i, category: 'lixo' },
          { pattern: /problema de \*?\*?esgoto\*?\*?/i, category: 'esgoto' },
          { pattern: /problema de \*?\*?[áa]rea verde\*?\*?/i, category: 'area_verde' },
          { pattern: /feedback.*c[âa]mara/i, category: 'feedback_camara' },
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
          // Try to parse as number first
          const numberMatch = answer.match(/^(\d+)/);
          if (numberMatch) {
            accumulated.street_number = numberMatch[1];
          } else if (answer.toLowerCase().includes('altura') || answer.toLowerCase().includes('perto') || 
                     answer.toLowerCase().includes('frente') || answer.toLowerCase().includes('próximo')) {
            accumulated.reference_point = answer;
          } else {
            accumulated.street_number = answer;
          }
        }
        
        // Extract neighborhood from specific question (fallback if no CEP)
        if ((question.includes('qual o bairro') || question.includes('qual é o bairro') ||
             question.includes('bairro?')) && answer.length > 2) {
          accumulated.neighborhood = answer;
        }
        
        // === NEW: Heuristic parsing for impact fields (as fallback) ===
        // Risk level detection from question context
        if ((question.includes('risco imediato') || question.includes('há algum risco') ||
             question.includes('gravidade')) && !accumulated.risk_level) {
          const parsedRisk = parseFieldResponse('risk_level', answer);
          Object.assign(accumulated, parsedRisk);
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
             question.includes('qual o problema') || question.includes('qual é o problema')) && 
            isValidDomainDescription(answer, 'urban') && !accumulated.description) {
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
  }
  
  // ========== SERVICE_RATING SPECIFIC PARSING ==========
  if (collectionType === 'service_rating') {
    // Service type mapping from display names to IDs
    const serviceTypeMap: Record<string, string> = {
      'ubs': 'ubs', 'hospital': 'hospital', 'escola': 'school', 
      'ceu': 'ceu', 'biblioteca': 'library', 'centro esportivo': 'sports_center'
    };
    
    // === FLEXIBLE ADDRESS CONFIRMATION PATTERNS ===
    const addressConfirmPatterns = [
      /^sim$/i,
      /^s$/i,
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
      
      // === IMPROVED: Parse address confirmation responses with flexible patterns ===
      // Only parse if we're awaiting confirmation (service_address_confirmed is undefined)
      if (accumulated.service_address_confirmed === undefined) {
        if (addressConfirmPatterns.some(p => p.test(contentLower))) {
          accumulated.service_address_confirmed = true;
          console.log('[accumulateFields] Service address confirmed by user (flexible match)');
        } else if (addressDenyPatterns.some(p => p.test(contentLower))) {
          accumulated.service_address_confirmed = false;
          console.log('[accumulateFields] Service address denied by user - will ask for neighborhood');
        }
      }
      
      // Parse "Nota: X estrelas" format from InlineRatingPicker
      const ratingMatch = content.match(/nota:\s*(\d)\s*estrelas?/i);
      if (ratingMatch && !accumulated.rating_stars) {
        accumulated.rating_stars = parseInt(ratingMatch[1]);
        console.log('[accumulateFields] Parsed rating_stars from picker:', accumulated.rating_stars);
      }
      
      // Also detect rating from natural language if not already captured
      if (!accumulated.rating_stars) {
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
            case 'service_type':
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
            case 'service_name':
              const nameMatch = answer.match(/serviço:\s*(.+?)(?:\s*-\s*(.+))?$/i);
              if (nameMatch) {
                accumulated.service_name = nameMatch[1].trim();
                if (nameMatch[2]) accumulated.service_neighborhood = nameMatch[2].trim();
              } else {
                accumulated.service_name = answer;
              }
              break;
            case 'rating_stars':
              const starsMatch = answer.match(/(\d)/);
              if (starsMatch) {
                accumulated.rating_stars = parseInt(starsMatch[1]);
              }
              break;
            case 'rating_text':
              if (answer.length >= 5) {
                accumulated.rating_text = answer;
              }
              break;
            case 'service_address_confirmed':
              // Parse sim/não response for address confirmation
              const confirmLower = answer.toLowerCase().trim();
              if (/^(sim|s|isso|correto|confirmo)$/i.test(confirmLower) || 
                  confirmLower.includes('correto') || confirmLower.includes('isso mesmo')) {
                accumulated.service_address_confirmed = true;
                console.log('[accumulateFields] FIELD_REQUEST: Service address confirmed');
              } else if (/^(n[aã]o|n|errado|incorreto)$/i.test(confirmLower) || 
                         confirmLower.includes('errado') || confirmLower.includes('outro')) {
                accumulated.service_address_confirmed = false;
                console.log('[accumulateFields] FIELD_REQUEST: Service address denied');
              }
              break;
            case 'service_neighborhood':
              // User provided neighborhood after denying address
              if (answer.length >= 2 && answer.length <= 60) {
                accumulated.service_neighborhood = answer.trim();
                // Update the service address with the new neighborhood
                if (accumulated.service_name) {
                  accumulated.service_address = `${accumulated.service_name} - ${answer.trim()}`;
                }
                // Reset confirmation to undefined so we can re-ask
                accumulated.service_address_confirmed = undefined;
                accumulated._needs_address_reconfirm = true;
                console.log('[accumulateFields] FIELD_REQUEST: Service neighborhood captured:', answer);
              }
              break;
            case 'service_address_reconfirm':
              // Parse reconfirmation response
              const reconfirmLower = answer.toLowerCase().trim();
              if (/^(sim|s|isso|correto|confirmo)$/i.test(reconfirmLower) || 
                  reconfirmLower.includes('correto') || reconfirmLower.includes('isso mesmo')) {
                accumulated.service_address_confirmed = true;
                accumulated._address_reconfirmed = true;
                console.log('[accumulateFields] FIELD_REQUEST: Service address reconfirmed');
              }
              break;
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
      const timeMatch = content.match(/horário:\s*(\d{1,2}:\d{2})/i);
      if (timeMatch && !accumulated.occurrence_time) {
        accumulated.occurrence_time = timeMatch[1];
        console.log('[accumulateFields] Parsed occurrence_time from picker:', accumulated.occurrence_time);
      }
    }
  }
  
  return accumulated;
}

// Extract service rating-specific fields
function extractServiceFields(context: string): Record<string, any> {
  const fields: Record<string, any> = {};
  
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
  
  // Detect rating
  const starsMatch = context.match(/(\d)\s*(?:estrela|nota)/);
  if (starsMatch) {
    fields.rating_stars = parseInt(starsMatch[1]);
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
const COUNCIL_MEMBERS = [
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
function findCouncilMemberMatches(partialName: string): { found: boolean; matches: Array<{ name: string; party: string }>; suggestion?: string } {
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
function extractChamberFields(context: string): Record<string, any> {
  const fields: Record<string, any> = {
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
const STRUCTURED_JOURNEY_TYPES = ['urban_report', 'transport_report', 'service_rating'] as const;

// Detect existing structured journey from conversation history
function detectExistingJourney(
  conversationHistory: Array<{ role: string; content: string }>
): 'urban_report' | 'transport_report' | 'service_rating' | null {
  // Check for COLLECTION_PROGRESS markers in reverse order (most recent first)
  for (let i = conversationHistory.length - 1; i >= 0; i--) {
    const msg = conversationHistory[i];
    if (msg.role === 'assistant') {
      const progressMatch = msg.content.match(/\[COLLECTION_PROGRESS:(\w+):/);
      if (progressMatch) {
        const type = progressMatch[1] as any;
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

function detectCollectionIntent(
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
  
  // Check for intent keywords (REQUIRED to activate tracker)
  const hasIntent = INTENT_KEYWORDS.some(kw => fullUserContext.includes(kw));
  
  if (!hasIntent) {
    console.log('[detectCollectionIntent] No intent keywords found, skipping tracker activation');
    return null;
  }
  
  // Calculate scores for each type using USER-ONLY context
  const scores: DetectionScore[] = [];
  
  // === EXPLICIT INTENT PHRASES (strongly indicate journey switch) ===
  // IMPORTANT: Urban phrases must be SPECIFIC to avoid matching transport/other contexts
  const explicitUrbanPhrases = [
    'quero fazer uma reclamação', 'quero fazer reclamação', 'quero fazer reclamacao',
    'quero denunciar', 'problema na minha rua', 'problema na cidade', 'problema urbano',
    'tem um buraco', 'poste apagado', 'lixo acumulado', 'quero abrir um chamado',
    'quero registrar um problema urbano', 'relatar problema urbano', 'fazer um relato urbano',
    'problema na rua', 'problema no bairro', 'problema de infraestrutura'
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
    // Journey switch phrases
    'quero falar de transporte', 'quero falar do transporte', 'falar de transporte',
    'falar sobre transporte', 'mudar para transporte', 'trocar para transporte'
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
    'qual ubs mais perto', 'como chegar na ubs', 'serviços perto de mim',
    'servicos perto de mim', 'onde tem hospital', 'onde tem escola'
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
  
  // NEW: Vereadores phrases
  const explicitVereadoresPhrases = [
    'vereadores da minha região', 'vereadores da minha regiao',
    'quais vereadores representam', 'quem me representa na câmara',
    'quem me representa na camara', 'vereadores do meu bairro',
    'meus vereadores', 'vereador da zona', 'vereadores da zona',
    'quais vereadores representam minha região', 'quais vereadores representam minha regiao'
  ];
  
  // NEW: Noticias phrases
  const explicitNoticiasPhrases = [
    'últimas notícias', 'ultimas noticias', 'notícias da câmara',
    'noticias da camara', 'novidades legislativas', 'o que está acontecendo na câmara',
    'o que esta acontecendo na camara', 'notícias recentes', 'noticias recentes',
    'quais as últimas notícias', 'quais as ultimas noticias'
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
  type ExplicitIntentType = 'service_rating' | 'urban_report' | 'transport_report' | 'services' | 'audiencias' | 'history' | 'vereadores' | 'noticias';
  const queroFalarMatch = msgLower.match(/(?:quero|vou|vamos)\s+falar\s+(?:de|do|da|sobre)\s+(\w+)/);
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
      'serviço': 'service_rating',
      'servico': 'service_rating',
      'cidade': 'urban_report',
      'problema': 'urban_report',
      'rua': 'urban_report',
      'bairro': 'urban_report',
      'serviços': 'services',
      'servicos': 'services',
      'audiência': 'audiencias',
      'audiencia': 'audiencias',
      'vereador': 'vereadores',
      'vereadores': 'vereadores',
      'notícia': 'noticias',
      'noticia': 'noticias',
      'histórico': 'history',
      'historico': 'history'
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

  // Transport scoring
  const transportDomain = ['ônibus', 'onibus', 'metrô', 'metro', 'trem', 'cptm', 'estação', 'estacao', 'terminal', 'ponto de ônibus', 'transporte', 'transporte público', 'transporte publico'];
  const transportProblems = ['lotado', 'lotação', 'lotacao', 'atraso', 'atrasou', 'demora', 'não passou', 'nao passou', 'quebrou'];
  let transportScore = 0;
  transportDomain.forEach(kw => { if (fullUserContext.includes(kw)) transportScore += 4; });
  transportProblems.forEach(kw => { if (fullUserContext.includes(kw)) transportScore += 3; });
  // Check for explicit transport intent
  const hasExplicitTransportIntent = explicitTransportPhrases.some(phrase => fullUserContext.includes(phrase));
  if (hasExplicitTransportIntent) {
    transportScore += 5;
    console.log('[detectCollectionIntent] Explicit transport intent detected');
  }
  if (transportScore > 0) {
    scores.push({ type: 'transport_report', score: transportScore, fields: extractTransportFields(fullUserContext) });
  }
  
  // Urban scoring - using USER-ONLY context to prevent assistant contamination
  const urbanDomain = ['buraco', 'poste', 'iluminação', 'iluminacao', 'lixo', 'entulho', 'calçada', 'calcada', 'esgoto', 'árvore', 'arvore', 'poda', 'fedor', 'fedido', 'bicho morto', 'animal morto', 'rato', 'bueiro', 'vazamento', 'sujeira', 'fedendo', 'cheiro'];
  const urbanProblems = ['quebrado', 'apagado', 'acumulado', 'vazando', 'caindo', 'fedendo', 'fedido', 'entupido', 'alagado', 'alagando'];
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
  if (serviceScore > 0) {
    scores.push({ type: 'service_rating', score: serviceScore, fields: extractServiceFields(fullUserContext) });
  }
  
  // Chamber feedback scoring - use user-only context
  const chamberDomain = ['vereador', 'vereadora', 'câmara', 'camara', 'parlamentar', 'gabinete', 'cmsp'];
  const feedbackTerms = ['elogiar', 'elogio', 'reclamar', 'reclamação', 'reclamacao', 'sugestão', 'sugestao', 'denunciar', 'agradecer', 'parabenizar'];
  let chamberScore = 0;
  chamberDomain.forEach(kw => { if (fullUserContext.includes(kw)) chamberScore += 5; });
  feedbackTerms.forEach(kw => { if (fullUserContext.includes(kw)) chamberScore += 4; });
  if (chamberScore > 0) {
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
  const knowledgeDomain = ['como funciona', 'o que é', 'o que e', 'quem é', 'quem e', 'qual é', 'qual e',
                           'me explica', 'dúvida sobre', 'duvida sobre', 'informação sobre', 'informacao sobre'];
  let knowledgeScore = 0;
  knowledgeDomain.forEach(kw => { if (fullUserContext.includes(kw)) knowledgeScore += 4; });
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
    'chamber_feedback': 5,  // Higher: needs explicit chamber reference
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
                           'services', 'audiencias', 'general', 'history',
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
  const lightTypes = ['services', 'audiencias', 'general', 'history'];
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

// Unified tools for all citizen actions
const tools = [
  {
    type: "function",
    function: {
      name: "classify_report_category",
      description: "Classifica a categoria do relato urbano. CHAMAR APENAS quando o cidadão DESCREVER um problema específico (ex: 'poste apagado', 'buraco na rua', 'bueiro entupido'). NÃO CHAMAR para mensagens genéricas como 'quero relatar um problema' ou 'problema na cidade'. Se confiança >= 80%, classificar automaticamente. Se < 80%, perguntar entre 2-3 opções. SEMPRE gerar subcategory_label intuitivo.",
      parameters: {
        type: "object",
        properties: {
          category: {
            type: "string",
            enum: ["iluminacao", "calcada", "via_publica", "lixo", "esgoto", "area_verde", "higiene_urbana", "animais", "poluicao", "feedback_camara", "outro"],
            description: "Categoria PAI mais próxima: iluminacao (poste, luz), calcada (passeio), via_publica (buraco, asfalto, semáforo), lixo (entulho), esgoto (bueiro, vazamento, alagamento), area_verde (praça, árvore), higiene_urbana (fedor genérico, sujeira), animais (bicho morto, rato), poluicao (fumaça, barulho, som alto, perturbação), feedback_camara (vereador), outro (quando não encaixar)"
          },
          subcategory_label: {
            type: "string",
            description: "Label INTUITIVO em português que descreve o problema específico. SEMPRE gerar. Exemplos: 'Perturbação Sonora' (som alto de bar), 'Barulho de Obra' (obra fora de horário), 'Veículo Abandonado' (carro parado há meses), 'Estabelecimento Barulhento' (bar/balada), 'Poste Apagado', 'Bueiro Entupido', etc."
          },
          confidence: {
            type: "number",
            minimum: 0,
            maximum: 1,
            description: "Nível de confiança na classificação (0.0 a 1.0). Se >= 0.8, classificação automática. Se < 0.8, perguntar ao usuário."
          },
          reasoning: {
            type: "string",
            description: "Justificativa da classificação (para auditoria)"
          },
          user_confirmed: {
            type: "boolean",
            description: "Se o usuário confirmou a categoria (true quando usuário escolheu entre opções)"
          },
          alternative_categories: {
            type: "array",
            items: { type: "string" },
            description: "Quando confiança < 80%, listar 2-3 categorias alternativas mais prováveis"
          }
        },
        required: ["category", "subcategory_label", "confidence", "reasoning", "user_confirmed"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "classify_transport_type",
      description: "Classifica o tipo de problema no transporte público. CHAMAR APENAS quando o cidadão DESCREVER um problema específico (ex: 'ônibus atrasou', 'metrô lotado', 'motorista imprudente'). NÃO CHAMAR para mensagens genéricas como 'quero relatar problema no transporte'. Se confiança >= 80%, classificar automaticamente. Se < 80%, perguntar entre 2-3 opções. SEMPRE gerar subcategory_label intuitivo.",
      parameters: {
        type: "object",
        properties: {
          report_type: {
            type: "string",
            enum: ["atraso", "lotacao", "seguranca", "acessibilidade", "limpeza", "conducao", "outro"],
            description: "Tipo PAI mais próximo: atraso (demora, espera), lotacao (cheio, superlotado), seguranca (assédio, roubo, briga), acessibilidade (elevador, rampa), limpeza (sujo, fedido), conducao (motorista, freada), outro (quando não encaixar)"
          },
          subcategory_label: {
            type: "string",
            description: "Label INTUITIVO em português. SEMPRE gerar. Exemplos: 'Atraso de Veículo', 'Superlotação', 'Assédio no Transporte', 'Elevador Quebrado', 'Veículo Sujo', 'Freada Brusca', etc."
          },
          confidence: {
            type: "number",
            minimum: 0,
            maximum: 1,
            description: "Nível de confiança (0.0-1.0). Se >= 0.8, classificação automática. Se < 0.8, perguntar ao usuário."
          },
          reasoning: {
            type: "string",
            description: "Justificativa da classificação (para auditoria)"
          },
          user_confirmed: {
            type: "boolean",
            description: "Se o usuário confirmou o tipo (true quando usuário escolheu entre opções)"
          },
          alternative_types: {
            type: "array",
            items: { type: "string" },
            description: "Quando confiança < 80%, listar 2-3 tipos alternativos mais prováveis"
          }
        },
        required: ["report_type", "subcategory_label", "confidence", "reasoning", "user_confirmed"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "validate_cep",
      description: "Valida CEP e retorna endereço completo. CHAMAR SEMPRE que cidadão informar um CEP (8 dígitos). Retorna rua, bairro, cidade automaticamente.",
      parameters: {
        type: "object",
        properties: {
          cep: { type: "string", description: "CEP no formato 00000-000 ou 00000000 (8 dígitos)" }
        },
        required: ["cep"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_urban_report",
      description: "Registra problema urbano ou feedback sobre a Câmara. SOMENTE chamar quando tiver: 1) categoria, 2) descrição (min 15 chars), 3) rua + bairro (via CEP validado ou informados manualmente). Para categorias de risco (via_publica, iluminacao, esgoto, area_verde), coletar também dados de impacto.",
      parameters: {
        type: "object",
        properties: {
          category: {
            type: "string",
            enum: ["iluminacao", "calcada", "via_publica", "lixo", "esgoto", "area_verde", "higiene_urbana", "animais", "poluicao", "feedback_camara", "outro"],
            description: "Categoria: iluminacao (poste, luz), calcada (passeio), via_publica (buraco, asfalto, semáforo), lixo (entulho), esgoto (bueiro, vazamento), area_verde (praça, árvore), higiene_urbana (fedor, sujeira), animais (bicho morto, rato), poluicao (fumaça, barulho), feedback_camara (vereador/câmara), outro"
          },
          subcategory: { type: "string", description: "Subcategoria (para feedback_camara: elogio, reclamacao, sugestao)" },
          description: { type: "string", description: "Descrição completa do problema (mínimo 15 caracteres)" },
          cep: { type: "string", description: "CEP do local (se validado via validate_cep)" },
          street: { type: "string", description: "OBRIGATÓRIO: Nome da rua/avenida (ex: Rua Augusta, Av. Paulista)" },
          street_number: { type: "string", description: "Número ou 'sem número' ou 'altura X'" },
          reference_point: { type: "string", description: "Ponto de referência (ex: perto do metrô, em frente à escola)" },
          neighborhood: { type: "string", description: "OBRIGATÓRIO: Bairro de São Paulo (ex: Consolação, Pinheiros, Centro)" },
          council_member_name: { type: "string", description: "Para feedback_camara: nome COMPLETO do vereador" },
          council_member_party: { type: "string", description: "Para feedback_camara: partido do vereador" },
          risk_level: { 
            type: "string", 
            enum: ["critical", "moderate", "low", "none"],
            description: "Nível de risco imediato: critical (risco de vida, fios expostos, desabamento), moderate (bloqueio parcial, risco de acidente), low (incômodo, desconforto), none (sem risco)"
          },
          risk_types: { 
            type: "array", 
            items: { type: "string", enum: ["electrical", "traffic", "flooding", "structural", "health", "fire"] },
            description: "Tipos de risco presentes: electrical (fios/choque), traffic (via bloqueada), flooding (alagamento), structural (desabamento), health (contaminação), fire (incêndio)"
          },
          affected_scope: { 
            type: "string", 
            enum: ["individual", "street", "neighborhood", "zone", "city"],
            description: "Alcance da afetação: individual (só eu), street (toda a rua), neighborhood (bairro todo), zone (zona inteira), city (cidade)"
          },
          affected_estimate: { 
            type: "integer", 
            description: "Estimativa de pessoas afetadas (quando conseguir inferir)"
          },
          active_consequences: { 
            type: "array", 
            items: { type: "string", enum: ["power_outage", "water_outage", "traffic_blocked", "flooding", "health_hazard", "service_disruption"] },
            description: "Consequências já em andamento: power_outage (falta luz), water_outage (falta água), traffic_blocked (trânsito parado), flooding (alagando), health_hazard (risco saúde), service_disruption (serviço interrompido)"
          },
          urgency_reason: { 
            type: "string", 
            description: "Motivo de urgência descrito pelo cidadão em suas palavras"
          }
        },
        required: ["category", "description", "street", "neighborhood"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_transport_report",
      description: "Registra problema no transporte público. CHAMAR APENAS quando tiver: 1) descrição (min 10 chars), 2) data da ocorrência. NÃO CHAMAR para mensagens genéricas. Se não conseguir classificar o tipo, usar 'outro' e gerar subcategory_label intuitivo.",
      parameters: {
        type: "object",
        properties: {
          report_type: {
            type: "string",
            enum: ["atraso", "lotacao", "seguranca", "acessibilidade", "limpeza", "conducao", "outro"],
            description: "Tipo PAI mais próximo. Se não encaixar, usar 'outro'."
          },
          subcategory_label: {
            type: "string",
            description: "Label INTUITIVO em português. SEMPRE gerar. Exemplos: 'Atraso de Veículo', 'Veículo Lotado', 'Problema com Motorista', 'Veículo Não Parou', 'Porta com Defeito', etc."
          },
          description: { type: "string", description: "Descrição do problema (mínimo 10 caracteres)" },
          occurrence_date: { type: "string", description: "Data YYYY-MM-DD (inferir 'hoje' se contexto indicar)" },
          occurrence_time: { type: "string", description: "Horário HH:MM (perguntar horário aproximado)" },
          line_code: { type: "string", description: "Código da linha de ônibus/metrô" },
          location: { type: "string", description: "Ponto, estação ou trecho" },
          severity: {
            type: "string",
            enum: ["baixa", "media", "alta", "critica"],
            description: "Gravidade: critica (acidente, agressão), alta (atraso >30min), media (atraso 15-30min), baixa (desconforto)"
          },
          impact_description: { type: "string", description: "Como afetou a rotina do cidadão" }
        },
        required: ["report_type", "description", "occurrence_date"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_service_rating",
      description: "Registra avaliação de serviço público. NUNCA CHAMAR COM rating_stars=0 ou rating_text vazio. VERIFICAR que todos os campos foram coletados: 1) service_type, 2) service_name (mínimo 3 chars), 3) rating_stars (1-5, NUNCA 0), 4) rating_text (mínimo 10 chars). Se faltar algum dado, PERGUNTAR antes de chamar. NÃO CHAMAR para mensagens genéricas como 'quero avaliar'.",
      parameters: {
        type: "object",
        properties: {
          service_type: {
            type: "string",
            enum: ["ubs", "school", "ceu", "hospital", "library", "sports_center", "other"],
            description: "PERGUNTAR PRIMEIRO: tipo do serviço (ubs, escola, hospital, etc)"
          },
          service_name: { type: "string", description: "Nome do serviço avaliado - MÍNIMO 3 caracteres (ex: UBS Vila Madalena)" },
          service_neighborhood: { type: "string", description: "Bairro onde fica o serviço (ajuda a localizar)" },
          rating_stars: { type: "integer", minimum: 1, maximum: 5, description: "OBRIGATÓRIO: Nota 1-5 estrelas. NUNCA usar 0!" },
          rating_text: { type: "string", description: "OBRIGATÓRIO: Comentário da avaliação - MÍNIMO 10 caracteres" },
          sentiment: {
            type: "string",
            enum: ["positive", "neutral", "negative"],
            description: "Sentimento inferido do comentário"
          }
        },
        required: ["service_type", "service_name", "rating_stars", "rating_text", "sentiment"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "search_knowledge_base",
      description: "Busca informações sobre a Câmara Municipal: vereadores, audiências, projetos de lei, notícias, funcionamento legislativo.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Termo de busca" }
        },
        required: ["query"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "find_nearby_services",
      description: "Busca serviços públicos próximos ao cidadão. Usar quando perguntar sobre: UBS perto, escola próxima, hospital mais próximo, CEU na região, biblioteca perto de mim.",
      parameters: {
        type: "object",
        properties: {
          service_type: {
            type: "string",
            enum: ["ubs", "school", "ceu", "hospital", "library", "sports_center", "other"],
            description: "Tipo do serviço buscado"
          },
          district: { type: "string", description: "Bairro ou região (ex: Pinheiros, Centro, Zona Sul)" },
          limit: { type: "integer", description: "Quantidade máxima de resultados (padrão: 5)", minimum: 1, maximum: 10 }
        },
        required: ["service_type"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "search_audiencias",
      description: "Busca audiências públicas da Câmara. Usar quando cidadão perguntar sobre: audiências, consultas públicas, participação popular, eventos legislativos, próximas audiências.",
      parameters: {
        type: "object",
        properties: {
          tema: { type: "string", description: "Tema de interesse (ex: transporte, saúde, educação)" },
          status: {
            type: "string",
            enum: ["scheduled", "ongoing", "finished"],
            description: "Status da audiência: scheduled (agendada), ongoing (em andamento), finished (encerrada)"
          },
          inscricoes_abertas: { type: "boolean", description: "Filtrar apenas audiências com inscrições abertas" }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "suggest_council_member",
      description: "Sugere vereadores para encaminhar uma demanda cidadã. Usar quando cidadão quiser: encaminhar reclamação a vereador, saber qual vereador procurar, indicar vereador especialista no tema.",
      parameters: {
        type: "object",
        properties: {
          issue_type: {
            type: "string",
            enum: ["transporte", "urbanismo", "saude", "educacao", "meio_ambiente", "seguranca", "habitacao", "assistencia_social"],
            description: "Tipo do problema/demanda"
          },
          description: { type: "string", description: "Descrição do problema para matching mais preciso" },
          district: { type: "string", description: "Bairro ou região do cidadão" }
        },
        required: ["issue_type", "description"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_citizen_history",
      description: "Consulta histórico completo do cidadão: relatos urbanos, relatos de transporte, avaliações de serviços, inscrições em audiências e encaminhamentos a vereadores. Usar quando cidadão perguntar: 'meus relatos', 'status das minhas denúncias', 'minhas avaliações', 'minhas participações', 'o que eu já fiz no app', 'meu histórico'.",
      parameters: {
        type: "object",
        properties: {
          history_type: {
            type: "string",
            enum: ["all", "urban_reports", "transport_reports", "ratings", "audiencias", "referrals"],
            description: "Tipo de histórico: all (tudo), urban_reports (relatos urbanos), transport_reports (transporte), ratings (avaliações), audiencias (inscrições), referrals (encaminhamentos)"
          },
          status_filter: {
            type: "string",
            enum: ["all", "pending", "in_progress", "resolved", "closed"],
            description: "Filtrar por status: all (todos), pending (pendente), in_progress (em andamento), resolved (resolvido), closed (fechado)"
          },
          limit: {
            type: "integer",
            description: "Quantidade máxima de resultados por tipo (padrão: 5)",
            minimum: 1,
            maximum: 20
          }
        },
        required: []
      }
    }
  },
  // === JORNADA CONSCIENTE: Tools de Detecção e Transição ===
  {
    type: "function",
    function: {
      name: "detect_user_intent",
      description: "Classificar a intenção do cidadão. USAR APENAS quando a mensagem contiver descrição específica do problema (>= 15 chars com contexto). Para mensagens genéricas como 'quero relatar', 'problema na cidade', 'avaliar serviço' SEM detalhes, NÃO CHAMAR - apenas pergunte 'Qual o problema/serviço e onde fica?'. Se a mensagem já contém descrição detalhada, extrair categoria/tipo junto.",
      parameters: {
        type: "object",
        properties: {
          intent: {
            type: "string",
            enum: ["urban_report", "transport_report", "service_rating", "services", "general", "unknown"],
            description: "Intenção detectada semanticamente. Exemplos: 'ônibus capotou na avenida' = urban_report (acidente urbano), 'ônibus atrasou 30 minutos' = transport_report (problema de serviço)"
          },
          confidence: {
            type: "number",
            minimum: 0,
            maximum: 1,
            description: "Nível de confiança (0.0-1.0). Se >= 0.8, ativar jornada automaticamente."
          },
          reasoning: {
            type: "string",
            description: "Justificativa semântica da classificação"
          },
          suggested_alternatives: {
            type: "array",
            items: { type: "string" },
            description: "Se confiança < 80%, listar alternativas prováveis"
          },
          // NOVO: Campos extraídos da mensagem inicial
          urban_category: {
            type: "string",
            enum: ["iluminacao", "calcada", "via_publica", "lixo", "esgoto", "area_verde", "higiene_urbana", "animais", "poluicao", "feedback_camara", "outro"],
            description: "PARA urban_report: categoria inferida do problema. Ex: 'ônibus capotou' = via_publica, 'poste apagado' = iluminacao, 'bueiro entupido' = esgoto"
          },
          transport_type: {
            type: "string",
            enum: ["atraso", "lotacao", "seguranca", "acessibilidade", "limpeza", "outro"],
            description: "PARA transport_report: tipo de problema inferido"
          },
          extracted_description: {
            type: "string",
            description: "Se a mensagem inicial já contém descrição detalhada do problema (>= 30 chars), extrair aqui. Ex: 'Ônibus capotou na Paulista' → 'Ônibus capotou na Avenida Paulista'"
          },
          category_confidence: {
            type: "number",
            minimum: 0,
            maximum: 1,
            description: "Confiança na categoria/tipo extraído (0.0-1.0)"
          }
        },
        required: ["intent", "confidence", "reasoning"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "confirm_journey_switch",
      description: "USAR quando detectar mudança de intenção durante uma jornada de coleta estruturada (urban_report, transport_report, service_rating). Gera prompt de confirmação com botões para o usuário decidir. NÃO usar para jornadas leves (services, general).",
      parameters: {
        type: "object",
        properties: {
          current_journey: {
            type: "string",
            enum: ["urban_report", "transport_report", "service_rating"],
            description: "Jornada atual em andamento"
          },
          detected_journey: {
            type: "string",
            enum: ["urban_report", "transport_report", "service_rating", "services", "general"],
            description: "Nova jornada detectada"
          },
          current_progress_summary: {
            type: "string",
            description: "Resumo do que já foi coletado na jornada atual (ex: 'Problema de iluminação na Rua Augusta')"
          }
        },
        required: ["current_journey", "detected_journey", "current_progress_summary"]
      }
    }
  }
];

// Lean system prompt with AI-driven classification and CEP-first collection
// OPTIMIZED: Concise responses, combined questions, flexible thresholds
const systemPrompt = `Você é o Assistente CMSP. Ajuda cidadãos de São Paulo de forma direta e eficiente.

=== TOM E EXTENSÃO (CRÍTICO) ===

MÁXIMO 2 frases por resposta durante coleta de dados.
Formato ideal:
✓ [Confirmação breve] → [Próxima pergunta]

EXEMPLOS:
✓ "Entendi, poste apagado. Qual o CEP do local?"
✓ "CEP válido! Qual o número ou referência?"
✓ "Registrei seu relato (URB-2026-000123). Deseja encaminhar a algum vereador?"

NUNCA fazer:
- Explicações longas sobre o processo
- Repetir informações já confirmadas
- Múltiplos parágrafos desnecessários

=== PERGUNTAS COMBINADAS (EFICIÊNCIA) ===

Na PRIMEIRA interação, preferir perguntas combinadas quando fizer sentido:

URBANO: Se usuário clicar chip ou disser algo genérico:
→ "Qual o problema e onde fica? (CEP ou rua/bairro)"

TRANSPORTE: Se usuário clicar chip:
→ "Qual linha teve problema e o que aconteceu?"

AVALIAÇÃO: Se usuário clicar chip:
→ "Qual serviço você quer avaliar e que nota dá (1-5)?"

=== REGRA ZERO: MENSAGEM GENÉRICA (CRÍTICO) ===

MENSAGENS GENÉRICAS - NÃO classificar, NÃO chamar classify_report_category:
- "Quero relatar um problema"
- "Problema na cidade"
- "Tenho um problema"
- "Preciso relatar algo"
- Qualquer frase SEM descrição específica do problema

AÇÃO OBRIGATÓRIA: Perguntar "Qual o problema e onde fica?"

MENSAGENS ESPECÍFICAS - classificar normalmente:
- "Poste apagado na minha rua"
- "Buraco perigoso na Avenida Paulista"
- "Lixo acumulado no parque"
- "Bueiro entupido fedendo"

AÇÃO: Chamar classify_report_category

=== CLASSIFICAÇÃO DE CATEGORIA ===

Quando cidadão DESCREVER problema específico:

1. CLASSIFICAR via classify_report_category
2. SE CONFIANÇA >= 80%: Confirmar e pedir CEP
3. SE CONFIANÇA < 80%: Perguntar entre 2-3 opções

EXEMPLOS:
| Descrição | Categoria | Confiança |
|-----------|-----------|-----------|
| "bueiro fedido" | esgoto | 95% |
| "poste apagado" | iluminacao | 95% |
| "buraco na rua" | via_publica | 95% |
| "cheiro ruim na rua" | 70% → perguntar |

=== THRESHOLD FLEXÍVEL DE DESCRIÇÃO ===

Descrição VÁLIDA se:
- >= 30 caracteres OU
- >= 15 caracteres + palavra-chave de categoria (buraco, poste, lixo, bueiro, etc.)

EXEMPLOS DE DESCRIÇÕES CURTAS MAS VÁLIDAS:
- "Buraco enorme perigoso" (21 chars + "buraco") → VÁLIDA
- "Poste apagado há dias" (21 chars + "poste") → VÁLIDA
- "Muito lixo na esquina" (21 chars + "lixo") → VÁLIDA

=== COLETA DE DADOS ===

FLUXO URBANO:
1. Classificar categoria
2. Perguntar CEP (ou rua+bairro se não souber)
3. Pedir número/referência
4. Se descrição < threshold: pedir mais detalhes
5. Para categorias de risco: perguntar impacto
6. Criar relato

CATEGORIAS DE RISCO (exigem dados de impacto):
- via_publica, iluminacao, esgoto, area_verde

Perguntas de impacto:
→ "[FIELD_REQUEST:risk_level]Há risco imediato? (fios expostos, via bloqueada, alagando)"
→ Se risco >= moderate: "[FIELD_REQUEST:affected_scope]Afeta só você, a rua ou o bairro?"

=== TRANSIÇÃO INTELIGENTE DE JORNADAS ===

TRANSIÇÃO AUTOMÁTICA (sem confirm_journey_switch):
- Se < 2 campos coletados na jornada atual
- E nova intenção tem confiança >= 90%
→ Trocar automaticamente

PEDIR CONFIRMAÇÃO (com confirm_journey_switch):
- Se >= 2 campos já coletados
- OU confiança < 90%

=== APÓS CONFIRMAÇÃO DE TROCA DE JORNADA ===

JORNADAS ESTRUTURADAS:
Se a mensagem do usuário contiver [JOURNEY_SWITCHED:transport_report]:
→ Responder DIRETAMENTE: "Ok! [FIELD_REQUEST:line_code]Qual linha de ônibus ou metrô?[LINE_PICKER]"
→ NÃO perguntar "o que aconteceu?" - assumir que já foi mencionado antes

Se a mensagem contiver [JOURNEY_SWITCHED:urban_report]:
→ Responder: "Ok! [FIELD_REQUEST:description]O que está acontecendo?"

Se a mensagem contiver [JOURNEY_SWITCHED:service_rating]:
→ Responder: "Ok! [FIELD_REQUEST:service_type]Qual tipo de serviço?[SERVICE_TYPE_PICKER]"

JORNADAS LEVES:
Se a mensagem contiver [JOURNEY_SWITCHED:services]:
→ Responder: "Ok! [FIELD_REQUEST:service_type]Que tipo de serviço você procura?[SERVICE_TYPE_PICKER]"

Se a mensagem contiver [JOURNEY_SWITCHED:audiencias]:
→ Responder: "Ok! Qual tema de audiência te interessa? (Ex: transporte, saúde, educação, meio ambiente)"

Se a mensagem contiver [JOURNEY_SWITCHED:general]:
→ Responder: "Ok! Qual sua dúvida sobre a Câmara Municipal?"

Se a mensagem contiver [JOURNEY_SWITCHED:history]:
→ Chamar get_citizen_history AUTOMATICAMENTE e mostrar resumo ao usuário

=== TEMPLATES DE PERGUNTAS ===

URBANO:
1ª: "Qual o CEP?" (ou "[ADDRESS_PICKER]" se não souber)
2ª: "[FIELD_REQUEST:street_number]Qual número ou referência?"
3ª: (se descrição curta) "[FIELD_REQUEST:description]Mais detalhes sobre o problema?"
4ª: (risco) "[FIELD_REQUEST:risk_level]Há risco imediato?"

TRANSPORTE:
1ª: "[FIELD_REQUEST:description]O que aconteceu?"
2ª: "[FIELD_REQUEST:line_code]Qual linha?[LINE_PICKER]"
3ª: "[FIELD_REQUEST:occurrence_date]Quando?[DATE_PICKER]"

AVALIAÇÃO:
1ª: "[FIELD_REQUEST:service_type]Qual tipo?[SERVICE_TYPE_PICKER]"
2ª: "[FIELD_REQUEST:service_name]Qual serviço?[SERVICE_PICKER]"
3ª: "[FIELD_REQUEST:rating_stars]Nota 1-5?[RATING_PICKER]"
4ª: "[FIELD_REQUEST:rating_text]Como foi?"

=== CATEGORIAS URBANAS COM SUBCATEGORIAS ===

CATEGORIA PAI (enum fixo) + SUBCATEGORY_LABEL (texto intuitivo):

| Categoria | Quando Usar | Exemplo de subcategory_label |
|-----------|-------------|------------------------------|
| iluminacao | poste, luz | "Poste Apagado", "Lâmpada Queimada" |
| via_publica | buraco, asfalto, semáforo | "Buraco na Via", "Semáforo com Defeito" |
| calcada | passeio, acessibilidade | "Calçada Quebrada" |
| lixo | entulho, coleta | "Lixo Acumulado", "Entulho na Via" |
| esgoto | bueiro, vazamento, alagamento | "Bueiro Entupido", "Alagamento", "Vazamento" |
| area_verde | praça, árvore, mato | "Árvore com Risco", "Mato Alto" |
| higiene_urbana | fedor, sujeira | "Mau Cheiro", "Sujeira na Via" |
| animais | bicho morto, rato, infestação | "Animal Morto", "Infestação de Ratos" |
| poluicao | fumaça, BARULHO, som alto, perturbação | "Perturbação Sonora", "Estabelecimento Barulhento", "Barulho de Obra" |
| feedback_camara | vereador, câmara | "Feedback sobre Vereador" |
| outro | QUALQUER coisa que não encaixe acima | "Veículo Abandonado", "Ocupação Irregular", "Obra Irregular" |

REGRA DE OURO DO SUBCATEGORY_LABEL:
- SEMPRE gerar label intuitivo em português
- Usar palavras do cidadão quando possível
- Se 'poluicao' + barulho → subcategory_label = "Perturbação Sonora" ou "Estabelecimento Barulhento"
- Se 'outro' → gerar label a partir da descrição (ex: "Bar com Som Alto" → "Perturbação por Estabelecimento")

QUANDO USAR 'outro':
- Problema não se encaixa em nenhuma categoria acima
- Situação complexa ou única (ex: carro abandonado, invasão, obra irregular)
- NUNCA DEIXAR CIDADÃO SEM ATENDIMENTO - use 'outro' como fallback seguro
- SEMPRE preservar 100% do relato original na descrição

POLUIÇÃO SONORA (categoria: poluicao):
- Som alto, música, festa, balada, bar barulhento
- Vizinho fazendo barulho, obra fora de horário
- Alarmes, buzinas, latidos excessivos
- subcategory_label: "Perturbação Sonora", "Estabelecimento Barulhento", "Barulho de Obra", etc.

=== TIPOS DE TRANSPORTE COM SUBCATEGORIAS ===

TIPO PAI (enum fixo) + SUBCATEGORY_LABEL (texto intuitivo):

| Tipo | Quando Usar | Exemplo de subcategory_label |
|------|-------------|------------------------------|
| atraso | veículo demorou | "Atraso de Veículo", "Longa Espera" |
| lotacao | veículo cheio | "Veículo Lotado", "Superlotação" |
| seguranca | assédio, roubo, briga | "Problema de Segurança", "Assédio" |
| acessibilidade | cadeirante, elevador | "Problema de Acessibilidade" |
| limpeza | sujeira, mau cheiro | "Problema de Limpeza" |
| conducao | motorista, freada | "Problema com Motorista", "Condução Perigosa" |
| outro | QUALQUER coisa que não encaixe | "Porta com Defeito", "Veículo Quebrado", "Ar Condicionado" |

REGRA: Se não conseguir classificar → usar 'outro' + subcategory_label intuitivo

=== CLASSIFICAÇÃO SEMÂNTICA TRANSPORTE vs URBANO ===

URBANO (VIA/INFRAESTRUTURA):
- "ônibus capotou" → via_publica
- "ponto destruído" → via_publica
- "lixo no ponto" → lixo

TRANSPORTE (SERVIÇO/OPERAÇÃO):
- "ônibus atrasou" → transport_report
- "metrô lotado" → transport_report
- "motorista rude" → transport_report

=== REGRA DE OURO: NUNCA BLOQUEAR FLUXO ===

1. Se não conseguir classificar categoria/tipo → usar 'outro' com label gerado
2. Se busca retornar vazia → oferecer alternativa mais próxima
3. NUNCA interromper o fluxo pedindo classificação que a IA não conseguiu inferir
4. SEMPRE preservar 100% do relato original na descrição

EXEMPLO: "Não encontrei UBS em Pinheiros, mas a UBS Vila Mariana fica perto. Quer a rota?"

=== TOOLS DISPONÍVEIS ===
• classify_report_category → classificar categoria (GERAR subcategory_label)
• validate_cep → endereço via CEP
• create_urban_report → registrar problema urbano
• create_transport_report → registrar problema transporte (GERAR subcategory_label se outro)
• create_service_rating → registrar avaliação
• search_knowledge_base → dúvidas sobre Câmara
• find_nearby_services → serviços próximos
• search_audiencias → audiências públicas
• get_citizen_history → histórico do cidadão
• suggest_council_member → encaminhar a vereador
• detect_user_intent → detectar intenção
• confirm_journey_switch → confirmar mudança de jornada

TOM: Breve, direto, máximo 2 frases.
Data: ${new Date().toISOString().split('T')[0]}`;

// Helper: Get friendly service type name
function getServiceTypeName(type: string): string {
  const names: Record<string, string> = {
    'ubs': 'UBS',
    'school': 'escolas',
    'ceu': 'CEUs',
    'hospital': 'hospitais',
    'library': 'bibliotecas',
    'sports_center': 'centros esportivos',
    'other': 'serviços'
  };
  return names[type] || 'serviços';
}

// Helper: Format services with positive context (Never Negative pattern)
function formatServicesWithContext(
  services: any[], 
  serviceType: string, 
  originalDistrict: string | null,
  isExpanded: boolean
): string {
  const typeName = getServiceTypeName(serviceType);
  const header = isExpanded 
    ? `Não encontrei ${typeName} em ${originalDistrict}, mas aqui estão as opções mais próximas:`
    : `Encontrei ${services.length} ${typeName}:`;
  
  const list = services.map((s: any, i: number) => {
    const districtInfo = isExpanded ? ` (${s.district})` : '';
    const rating = s.average_rating ? ` ⭐ ${Number(s.average_rating).toFixed(1)}` : '';
    return `${i+1}. ${s.name}${districtInfo}\n   📍 ${s.address}${rating}`;
  }).join('\n\n');
  
  const footer = isExpanded 
    ? '\n\n💡 Quer que eu calcule a rota para alguma delas?' 
    : '';
  
  return `${header}\n\n${list}${footer}`;
}

// Helper: Search knowledge base (with positive alternatives)
async function searchKnowledgeBase(supabase: any, query: string): Promise<string> {
  const searchTerms = query.toLowerCase().split(' ').filter(t => t.length > 2).slice(0, 5);
  if (searchTerms.length === 0) {
    return 'Posso te ajudar com informações sobre a Câmara Municipal, audiências públicas, vereadores e serviços da cidade. O que você gostaria de saber?';
  }

  const { data, error } = await supabase
    .from('knowledge_base')
    .select('content, content_type, title')
    .or(searchTerms.map(term => `content.ilike.%${term}%`).join(','))
    .limit(5);

  if (error || !data?.length) {
    // NEVER NEGATIVE: Suggest alternatives instead of just saying "not found"
    const suggestions = [
      '• Como funciona a Câmara Municipal',
      '• Próximas audiências públicas',
      '• Informações sobre vereadores',
      '• Serviços públicos na cidade'
    ];
    return `Não encontrei informações específicas sobre "${query}", mas posso te ajudar com:\n\n${suggestions.join('\n')}\n\n📌 Ou você pode visitar cmsp.sp.gov.br para mais detalhes.`;
  }

  return data.map((doc: any, i: number) => {
    const source = doc.content_type === 'noticia' ? 'Notícia' : 
                   doc.content_type === 'audiencia' ? 'Audiência' : 'Info';
    return `[${i+1}] ${doc.title || source}: ${doc.content.slice(0, 300)}...`;
  }).join('\n\n');
}

// Helper: Find nearby services (with progressive geographic fallback)
async function findNearbyServices(supabase: any, serviceType: string, district?: string, limit: number = 5): Promise<string> {
  const typeName = getServiceTypeName(serviceType);
  
  // 1st attempt: specific district
  if (district) {
    const { data, error } = await supabase
      .from('public_services')
      .select('name, address, district, phone, average_rating, service_type')
      .eq('service_type', serviceType)
      .ilike('district', `%${district}%`)
      .limit(limit);
    
    if (!error && data?.length) {
      return formatServicesWithContext(data, serviceType, district, false);
    }
    
    // 2nd attempt: NEVER NEGATIVE - expand to entire city
    console.log(`[findNearbyServices] No results in ${district}, expanding to city-wide search`);
    const { data: cityWide, error: cityError } = await supabase
      .from('public_services')
      .select('name, address, district, phone, average_rating, service_type')
      .eq('service_type', serviceType)
      .limit(limit * 2);
    
    if (!cityError && cityWide?.length) {
      // Return with expanded context (NEVER NEGATIVE)
      return formatServicesWithContext(cityWide, serviceType, district, true);
    }
  } else {
    // No district specified, search city-wide
    const { data, error } = await supabase
      .from('public_services')
      .select('name, address, district, phone, average_rating, service_type')
      .eq('service_type', serviceType)
      .limit(limit);
    
    if (!error && data?.length) {
      return formatServicesWithContext(data, serviceType, null, false);
    }
  }
  
  // NEVER NEGATIVE: If still no results, suggest other service types
  const { data: otherTypes } = await supabase
    .from('public_services')
    .select('service_type')
    .limit(20);
  
  const availableTypes = [...new Set((otherTypes || []).map((s: any) => s.service_type))] as string[];
  const typeNames = availableTypes.map((t: string) => getServiceTypeName(t)).slice(0, 4);
  
  if (typeNames.length > 0) {
    return `Ainda não tenho ${typeName} cadastradas no sistema, mas posso te ajudar a encontrar:\n\n${typeNames.map((t, i) => `${i+1}. ${t}`).join('\n')}\n\nQual desses te interessa?`;
  }
  
  return `Estou atualizando minha base de serviços. Por enquanto, você pode buscar ${typeName} em sp156.prefeitura.sp.gov.br`;
}

// Helper: Search audiencias (with fallback to upcoming or related)
async function searchAudiencias(supabase: any, tema?: string, status?: string, inscricoesAbertas?: boolean): Promise<string> {
  let query = supabase
    .from('audiencias')
    .select('titulo, tema, data, hora, local, status, inscricoes_abertas, vagas_disponiveis')
    .order('data', { ascending: true })
    .limit(5);
  
  if (tema) {
    query = query.or(`tema.ilike.%${tema}%,titulo.ilike.%${tema}%`);
  }
  if (status) {
    query = query.eq('status', status);
  }
  if (inscricoesAbertas) {
    query = query.eq('inscricoes_abertas', true);
  }
  
  const { data, error } = await query;
  
  if (error || !data?.length) {
    // NEVER NEGATIVE: Fallback to any upcoming audiencias
    console.log(`[searchAudiencias] No results for tema="${tema}", falling back to upcoming`);
    
    const { data: upcoming } = await supabase
      .from('audiencias')
      .select('titulo, tema, data, hora, local, status, inscricoes_abertas, vagas_disponiveis')
      .eq('status', 'scheduled')
      .order('data', { ascending: true })
      .limit(3);
    
    if (upcoming?.length) {
      const formattedUpcoming = upcoming.map((a: any, i: number) => {
        const inscricao = a.inscricoes_abertas ? `🎫 Inscrições abertas` : '';
        return `${i+1}. ${a.titulo}\n   📋 ${a.tema}\n   📅 ${a.data} às ${a.hora} ${inscricao}`;
      }).join('\n\n');
      
      const temaText = tema ? `sobre "${tema}"` : 'com esses critérios';
      return `Não encontrei audiências ${temaText} no momento, mas aqui estão as próximas agendadas:\n\n${formattedUpcoming}\n\n📬 Quer que eu te avise quando houver audiências sobre ${tema || 'seu tema de interesse'}?`;
    }
    
    // Fallback 2: Suggest available themes
    const { data: allAudiencias } = await supabase
      .from('audiencias')
      .select('tema')
      .limit(50);
    
    const availableThemes = [...new Set((allAudiencias || []).map((a: any) => a.tema))].slice(0, 5);
    
    if (availableThemes.length > 0) {
      return `Não há audiências ${tema ? `sobre "${tema}"` : 'agendadas'} no momento.\n\nTemas com histórico de audiências:\n${availableThemes.map((t, i) => `• ${t}`).join('\n')}\n\nQuer saber mais sobre algum desses?`;
    }
    
    return 'Não há audiências agendadas no momento. Você pode acompanhar a agenda em cmsp.sp.gov.br/agenda';
  }
  
  return data.map((a: any, i: number) => {
    const statusText = a.status === 'scheduled' ? '📅 Agendada' : 
                       a.status === 'ongoing' ? '🔴 Em andamento' : '✅ Encerrada';
    const inscricao = a.inscricoes_abertas ? `🎫 Inscrições abertas (${a.vagas_disponiveis || '?'} vagas)` : '';
    return `${i+1}. ${a.titulo}\n   📋 Tema: ${a.tema}\n   📅 ${a.data} às ${a.hora}\n   📍 ${a.local}\n   ${statusText} ${inscricao}`;
  }).join('\n\n');
}

// Helper: Suggest council member
async function suggestCouncilMember(issueType: string, description: string, district?: string): Promise<string> {
  const themes = COMMISSION_THEMES[issueType] || [];
  const descLower = description.toLowerCase();
  
  // Find relevant council members based on theme
  const relevantMembers = COUNCIL_MEMBERS.filter((_, i) => i < 3).map(m => `${m.name} (${m.party})`);
  
  return `Para questões de ${issueType}, você pode procurar:\n\n${relevantMembers.map((m, i) => `${i+1}. ${m}`).join('\n')}\n\nDeseja que eu encaminhe sua demanda para algum deles?`;
}

// Helper: Get citizen history
async function getCitizenHistory(
  supabase: any, 
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
      .select('id, category, subcategory, status, created_at, location_address, street, neighborhood')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }
    
    const { data, error } = await query;
    if (!error && data?.length) {
      results.push('📍 **Relatos Urbanos:**');
      data.forEach((r: any, i: number) => {
        const statusEmoji = r.status === 'pending' ? '⏳' : r.status === 'in_progress' ? '🔄' : r.status === 'resolved' ? '✅' : '❌';
        const location = r.street ? `${r.street}, ${r.neighborhood}` : r.location_address || 'Local não informado';
        results.push(`${i+1}. ${r.subcategory || r.category} - ${location}\n   ${statusEmoji} ${r.status} | ${new Date(r.created_at).toLocaleDateString('pt-BR')}`);
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
      data.forEach((r: any, i: number) => {
        const statusEmoji = r.status === 'pending' ? '⏳' : r.status === 'in_progress' ? '🔄' : r.status === 'resolved' ? '✅' : '❌';
        results.push(`${i+1}. ${r.report_type} ${r.line_code_custom ? `- Linha ${r.line_code_custom}` : ''}\n   ${statusEmoji} ${r.status} | ${new Date(r.created_at).toLocaleDateString('pt-BR')}`);
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
      data.forEach((r: any, i: number) => {
        const stars = '⭐'.repeat(r.rating_stars);
        const serviceName = r.service?.name || 'Serviço';
        results.push(`${i+1}. ${serviceName} - ${stars}\n   ${new Date(r.created_at).toLocaleDateString('pt-BR')}`);
      });
    }
  }
  
  // Audiencia inscricoes
  if (historyType === 'all' || historyType === 'audiencias') {
    const { data, error } = await supabase
      .from('audiencia_inscricoes')
      .select('id, status, created_at, audiencia:audiencias(titulo, data, status)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (!error && data?.length) {
      if (results.length) results.push('');
      results.push('🎫 **Inscrições em Audiências:**');
      data.forEach((r: any, i: number) => {
        const audiencia = r.audiencia;
        const statusEmoji = audiencia?.status === 'finished' ? '✅' : '📅';
        results.push(`${i+1}. ${audiencia?.titulo || 'Audiência'}\n   ${statusEmoji} ${audiencia?.data || ''}`);
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
      data.forEach((r: any, i: number) => {
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
async function executeTool(
  name: string, 
  args: any, 
  userId: string, 
  supabase: any,
  accumulatedFields?: any
): Promise<{ success: boolean; message: string; data?: any }> {
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
          calcada: 'Calçada',
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
        // Validate category is provided
        if (!args.category) {
          return {
            success: false,
            message: 'Preciso saber a categoria do problema. É um problema de iluminação, buraco, esgoto, lixo...?'
          };
        }
        
        // Validate category against enum
        const validCategories = VALID_URBAN_CATEGORIES;
        if (!validCategories.includes(args.category)) {
          console.error('[create_urban_report] Invalid category:', args.category);
          return {
            success: false,
            message: `Categoria inválida: ${args.category}. Categorias válidas: ${validCategories.join(', ')}`
          };
        }
        
        // USE CENTRALIZED NLP FUNCTION for flexible description validation
        // Accepts: 8+ chars with keyword OR 20+ chars OR 15+ with keyword
        const isValidDescription = args.description && isValidDomainDescription(args.description.trim(), 'urban');
        
        if (!isValidDescription) {
          return {
            success: false,
            message: '[FIELD_REQUEST:description]Por favor, descreva o problema com mais detalhes. O que está acontecendo exatamente?'
          };
        }
        
        // Validate required address fields
        if (!args.street || !args.neighborhood) {
          return {
            success: false,
            message: 'Preciso saber a rua e o bairro para registrar o relato. Qual o CEP ou endereço do local?'
          };
        }
        
        // === HARD VALIDATION FOR RISK CATEGORIES ===
        const RISK_CATEGORIES = ['via_publica', 'iluminacao', 'esgoto', 'area_verde'];
        
        if (RISK_CATEGORIES.includes(args.category)) {
          // Require risk_level for risk categories
          if (!args.risk_level) {
            const categoryLabels: Record<string, string> = {
              via_publica: 'via pública',
              iluminacao: 'iluminação',
              esgoto: 'esgoto/alagamento',
              area_verde: 'área verde'
            };
            const label = categoryLabels[args.category] || args.category;
            // Add FIELD_REQUEST marker for deterministic capture of risk_level
            return {
              success: false,
              message: `[FIELD_REQUEST:risk_level]Como seu relato é sobre **${label}**, preciso entender a gravidade.\n\nHá algum risco imediato? _(ex: fios expostos, via bloqueada, alagando)_`
            };
          }
          
          // If risk is moderate or critical, require affected_scope
          if (['critical', 'moderate'].includes(args.risk_level) && !args.affected_scope) {
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
        if (args.street) locationParts.push(args.street);
        if (args.street_number) locationParts.push(args.street_number);
        if (args.reference_point) locationParts.push(`(${args.reference_point})`);
        if (args.neighborhood) locationParts.push(`- ${args.neighborhood}`);
        const location_address = locationParts.join(' ');
        
        // Generate protocol code atomically
        const { data: protocolData, error: protocolError } = await supabase
          .rpc('generate_protocol_code', { p_type: 'urban' });
        
        if (protocolError) {
          console.error('[executeTool] Protocol generation failed:', protocolError);
        }
        const protocolCode = protocolData || null;
        
        const { data, error } = await supabase
          .from('urban_reports')
          .insert({
            user_id: userId,
            protocol_code: protocolCode,
            category: args.category, // Use AI-classified category directly
            subcategory: args.subcategory || null,
            description: args.description,
            location_address: location_address,
            cep: args.cep || null,
            street: args.street || null,
            street_number: args.street_number || null,
            reference_point: args.reference_point || null,
            neighborhood: args.neighborhood || null,
            ai_classification: {
              council_member_name: args.council_member_name || null,
              council_member_party: args.council_member_party || null
            },
            // Impact fields (new)
            risk_level: args.risk_level || null,
            risk_types: args.risk_types || [],
            affected_scope: args.affected_scope || null,
            affected_estimate: args.affected_estimate || null,
            active_consequences: args.active_consequences || [],
            urgency_reason: args.urgency_reason || null,
            status: 'pending'
          })
          .select('id, protocol_code')
          .single();
        
        if (error) throw error;
        
        // Notify n8n
        try {
          await supabase.functions.invoke('notify-n8n', {
            body: { 
              event_type: 'urban_report.created',
              entity_type: 'urban_report',
              entity_id: data.id,
              payload: { ...args, user_id: userId }
            }
          });
        } catch (n8nError) {
          console.error('[executeTool] N8N notification failed:', n8nError);
        }
        
        // Build comprehensive success message with full summary
        const categoryLabels: Record<string, string> = {
          iluminacao: 'Iluminação',
          via_publica: 'Via Pública',
          calcada: 'Calçada',
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
        
        const riskLabels: Record<string, string> = {
          critical: 'Crítico',
          moderate: 'Moderado',
          low: 'Baixo',
          none: 'Nenhum'
        };
        
        const scopeLabels: Record<string, string> = {
          individual: 'Apenas eu',
          street: 'Rua toda',
          building: 'Meu prédio/vizinhança',
          block: 'Quadra inteira',
          neighborhood: 'Bairro todo',
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
        let addressParts = [];
        if (args.street) addressParts.push(args.street);
        if (args.street_number) addressParts.push(args.street_number);
        const addressLine = addressParts.join(', ');
        const neighborhoodLine = args.neighborhood || '';
        const cepLine = args.cep ? `CEP ${args.cep}` : '';
        
        // Build impact section (only for risk categories)
        let impactSection = '';
        const riskCategories = ['via_publica', 'iluminacao', 'esgoto', 'area_verde', 'calcada'];
        if (riskCategories.includes(args.category) && args.risk_level) {
          const impactParts = [];
          if (args.risk_level) impactParts.push(`- **Nível de risco:** ${riskLabels[args.risk_level] || args.risk_level}`);
          if (args.risk_types?.length) {
            const translatedTypes = args.risk_types.map((t: string) => riskTypeLabels[t] || t);
            impactParts.push(`- **Tipo de risco:** ${translatedTypes.join(', ')}`);
          }
          if (args.affected_scope) impactParts.push(`- **Escopo:** ${scopeLabels[args.affected_scope] || args.affected_scope}`);
          if (args.affected_estimate) impactParts.push(`- **Pessoas afetadas:** ~${args.affected_estimate}`);
          if (args.active_consequences?.length) {
            const translatedConseq = args.active_consequences.map((c: string) => consequenceLabels[c] || c);
            impactParts.push(`- **Consequências:** ${translatedConseq.join(', ')}`);
          }
          
          if (impactParts.length > 0) {
            impactSection = `\n\n⚠️ **Avaliação de Impacto:**\n${impactParts.join('\n')}`;
          }
        }
        
        // Compose full message
        const successMessage = [
          `[REPORT_CREATED:${data.id}]`,
          '',
          '✅ **Relato registrado com sucesso!**',
          '',
          data.protocol_code ? `🔖 **Protocolo:** \`${data.protocol_code}\`\n` : '',
          '**Resumo do seu relato:**',
          '',
          `📋 **Categoria:** ${categoryLabel}${args.subcategory ? ` - ${args.subcategory}` : ''}`,
          '',
          `📝 **Descrição:** ${args.description}`,
          '',
          `📍 **Endereço:**`,
          addressLine ? `- ${addressLine}` : '',
          neighborhoodLine ? `- ${neighborhoodLine}` : '',
          cepLine ? `- ${cepLine}` : '',
          args.reference_point ? `- Referência: ${args.reference_point}` : '',
          impactSection,
          '',
          '---',
          '',
          '🔗 [Ver Meus Relatos](/relato-urbano/historico) para acompanhar o status',
          '',
          'Posso ajudar com mais alguma coisa?'
        ].filter(line => line !== '').join('\n');
        
        // Track emerging category patterns for NLP learning (async, non-blocking)
        try {
          await detectEmergingCategory(args.description, args.category, supabase);
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
        
        const { data, error } = await supabase
          .from('transport_reports')
          .insert({
            user_id: userId,
            protocol_code: protocolCode,
            report_type: validReportType,
            description: args.description,
            occurrence_date: args.occurrence_date,
            occurrence_time: args.occurrence_time || null,
            line_id: lineId,
            line_code_custom: args.line_code || null,
            location: args.location || null,
            severity: inferredSeverity,
            impact_description: args.impact_description || null,
            status: 'pending'
          })
          .select('id, protocol_code')
          .single();
        
        if (error) throw error;
        
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
          args.location ? `📍 **Local:** ${args.location}` : '',
          `⚠️ **Gravidade:** ${severityLabel}`,
          '',
          `📝 **Descrição:** ${args.description.substring(0, 100)}${args.description.length > 100 ? '...' : ''}`,
          '',
          '---',
          '',
          '🔗 [Ver Meus Relatos](/transporte/meus-relatos) para acompanhar.',
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
        // === VALIDATION: Prevent premature tool call with invalid data ===
        
        // 1. Validate service_type
        if (!args.service_type) {
          return {
            success: false,
            message: '[FIELD_REQUEST:service_type]**Qual tipo de serviço** você quer avaliar? (UBS, escola, hospital, CEU, biblioteca, centro esportivo) [SERVICE_TYPE_PICKER]'
          };
        }
        
        // 2. Validate service_name
        if (!args.service_name || args.service_name.trim().length < 3) {
          return {
            success: false,
            message: '[FIELD_REQUEST:service_name]**Qual o nome** do serviço que você visitou? (ex: UBS Vila Madalena, EMEF João XXIII) [SERVICE_PICKER]'
          };
        }
        
        // 3. Validate service_address_confirmed
        // Check both args and accumulatedFields (deterministic flow sets it there)
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
        
        // 4. Validate rating_stars (CRITICAL: must be 1-5, never 0)
        const stars = args.rating_stars;
        if (!stars || stars < 1 || stars > 5) {
          return {
            success: false,
            message: '[FIELD_REQUEST:rating_stars]**Qual nota de 1 a 5** você dá para o atendimento? [RATING_PICKER]'
          };
        }
        
        // 5. Validate rating_text
        if (!args.rating_text || args.rating_text.trim().length < 10) {
          return {
            success: false,
            message: '[FIELD_REQUEST:rating_text]**Pode descrever sua experiência?** Me conta como foi o atendimento. (mínimo 10 caracteres)'
          };
        }
        
        // === PROCESSING: All validations passed ===
        
        // Find service by name/type
        let serviceId = null;
        let visitId = null;
        
        const { data: services } = await supabase
          .from('public_services')
          .select('id')
          .eq('service_type', args.service_type)
          .ilike('name', `%${args.service_name}%`)
          .limit(1);
        
        if (services?.length) {
          serviceId = services[0].id;
          
          // Create a visit record
          const expires = new Date();
          expires.setDate(expires.getDate() + 7);
          
          const { data: visitData } = await supabase
            .from('service_visits')
            .insert({
              user_id: userId,
              service_id: serviceId,
              expires_at: expires.toISOString(),
              status: 'completed'
            })
            .select('id')
            .single();
          
          visitId = visitData?.id;
        }
        
        if (!serviceId || !visitId) {
          return { success: false, message: 'Não encontrei o serviço. Pode informar o nome completo e o bairro?' };
        }
        
        const { data, error } = await supabase
          .from('service_ratings')
          .insert({
            user_id: userId,
            service_id: serviceId,
            visit_id: visitId,
            rating_stars: stars,
            rating_text: args.rating_text.trim(),
            sentiment: args.sentiment || 'neutral'
          })
          .select('id')
          .single();
        
        if (error) throw error;
        
        return { 
          success: true, 
          message: `[RATING_CREATED:${data.id}]\n\n✅ **Avaliação registrada!**\n\n🏥 **Serviço:** ${args.service_name}\n⭐ **Nota:** ${'★'.repeat(stars)}${'☆'.repeat(5 - stars)}\n📝 **Comentário:** ${args.rating_text.substring(0, 80)}${args.rating_text.length > 80 ? '...' : ''}\n\nObrigado pelo seu feedback! Ele ajuda a melhorar os serviços públicos.\n\nPosso ajudar com mais alguma coisa?`,
          data: { id: data.id, type: 'rating' }
        };
      }
      
      case 'search_knowledge_base': {
        const result = await searchKnowledgeBase(supabase, args.query);
        return { 
          success: true, 
          message: result || 'Não encontrei informações sobre isso. Tente reformular a pergunta.' 
        };
      }
      
      case 'find_nearby_services': {
        const result = await findNearbyServices(supabase, args.service_type, args.district, args.limit || 5);
        return { success: true, message: result };
      }
      
      case 'search_audiencias': {
        const result = await searchAudiencias(supabase, args.tema, args.status, args.inscricoes_abertas);
        return { success: true, message: result };
      }
      
      case 'suggest_council_member': {
        const result = await suggestCouncilMember(args.issue_type, args.description, args.district);
        return { success: true, message: result };
      }
      
      case 'get_citizen_history': {
        const result = await getCitizenHistory(supabase, userId, args.history_type, args.status_filter, args.limit);
        return { success: true, message: result };
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
          calcada: 'Calçada',
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
          const progressData: Record<string, any> = {};
          
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

serve(async (req) => {
  const requestStartTime = Date.now();
  console.log('[ai-orchestrator] Request started at', new Date().toISOString());

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, conversationId, collectionType: frontendCollectionType } = await req.json();
    
    // Log frontend collection type for debugging
    if (frontendCollectionType) {
      console.log('[ai-orchestrator] Frontend collectionType received:', frontendCollectionType);
    }
    
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    if (!lovableApiKey || !supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing required environment variables');
    }
    
    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Unauthorized');
    }
    
    // Detect collection intent from user message for later injection
    const lastUserMsg = messages.filter((m: any) => m.role === 'user').pop()?.content || '';
    
    // === CRITICAL: Check for explicit JOURNEY_SWITCHED marker in last user message ===
    // When user clicks "Sim, iniciar X" button, the message contains [JOURNEY_SWITCHED:type]
    // This MUST take precedence over any other detection logic
    const journeySwitchMatch = lastUserMsg.match(/\[JOURNEY_SWITCHED:(\w+)\]/);
    
    // PRIORITY: Use frontend collection type if it's a structured journey type
    const STRUCTURED_TYPES_SET = new Set(['urban_report', 'transport_report', 'service_rating']);
    const LIGHT_JOURNEY_TYPES = ['services', 'audiencias', 'history', 'general', 'vereadores', 'noticias'];
    let collectionIntent: CollectionIntent | null = null;
    
    if (journeySwitchMatch) {
      // User explicitly switched journey via button click - HIGHEST PRIORITY
      const switchedToType = journeySwitchMatch[1];
      console.log('[ai-orchestrator] JOURNEY_SWITCHED detected in message, forcing type:', switchedToType);
      
      if (STRUCTURED_TYPES_SET.has(switchedToType)) {
        collectionIntent = {
          type: switchedToType as 'urban_report' | 'transport_report' | 'service_rating',
          fields: {}, // Reset fields for new journey
        };
      } else {
        // Light journey switch - still respect it
        collectionIntent = {
          type: switchedToType as any,
          fields: {},
        };
      }
    }
    
    // === CHECK FOR JOURNEY_DECLINED marker - user wants to continue current ===
    const journeyDeclinedMatch = lastUserMsg.match(/\[JOURNEY_DECLINED:(\w+)\]/);
    if (journeyDeclinedMatch) {
      const declinedType = journeyDeclinedMatch[1];
      console.log('[ai-orchestrator] User declined switch to:', declinedType, '- continuing current journey');
      
      // Force use of frontend type (the one user chose to continue)
      if (frontendCollectionType && STRUCTURED_TYPES_SET.has(frontendCollectionType)) {
        collectionIntent = {
          type: frontendCollectionType as 'urban_report' | 'transport_report' | 'service_rating',
          fields: accumulateFieldsFromHistory(messages, frontendCollectionType),
        };
      }
    } else if (frontendCollectionType && STRUCTURED_TYPES_SET.has(frontendCollectionType)) {
      // Frontend has a journey type - but check if user wants to switch
      console.log('[ai-orchestrator] Frontend collectionType received:', frontendCollectionType);
      
      // === CHECK FOR RECENTLY DECLINED JOURNEY SWITCHES ===
      const getDeclinedJourneys = (msgs: any[]): Set<string> => {
        const declined = new Set<string>();
        for (const msg of msgs) {
          if (msg.role === 'user') {
            const declineMatch = msg.content?.match?.(/\[JOURNEY_DECLINED:(\w+)\]/);
            if (declineMatch) {
              declined.add(declineMatch[1]);
            }
          }
        }
        return declined;
      };
      
      const declinedJourneys = getDeclinedJourneys(messages);
      if (declinedJourneys.size > 0) {
        console.log('[ai-orchestrator] Declined journeys in history:', Array.from(declinedJourneys));
      }
      
      // ALWAYS detect intent first to check for journey switch
      const detectedIntent = detectCollectionIntent(lastUserMsg, messages);
      
      // Check for JOURNEY CONFLICT (user wants to switch to different structured journey)
      const structuredTypes = ['urban_report', 'transport_report', 'service_rating'] as const;
      const isDetectedStructured = detectedIntent && structuredTypes.includes(detectedIntent.type as typeof structuredTypes[number]);
      const wasRecentlyDeclined = detectedIntent && declinedJourneys.has(detectedIntent.type);
      
      const isJourneyConflict = detectedIntent && 
        isDetectedStructured &&
        detectedIntent.type !== frontendCollectionType &&
        !wasRecentlyDeclined; // Don't ask again if user already said no
      
      if (wasRecentlyDeclined) {
        console.log(`[ai-orchestrator] Journey ${detectedIntent?.type} was recently declined, skipping confirmation`);
      }
      
      if (isJourneyConflict) {
        // ALWAYS ask for confirmation - never auto-switch
        console.log(`[ai-orchestrator] Journey conflict detected: ${frontendCollectionType} → ${detectedIntent.type}`);
        
        const journeyNames: Record<string, string> = {
          urban_report: 'Relato Urbano',
          transport_report: 'Diagnóstico de Transporte', 
          service_rating: 'Avaliação de Serviço',
          services: 'Busca de Serviços',
          audiencias: 'Audiências Públicas',
          history: 'Meu Histórico',
          general: 'Dúvidas Gerais',
          vereadores: 'Vereadores da Região',
          noticias: 'Notícias Legislativas',
          chamber_feedback: 'Feedback sobre Vereador'
        };
        
        const currentName = journeyNames[frontendCollectionType] || frontendCollectionType;
        const newName = journeyNames[detectedIntent.type] || detectedIntent.type;
        
        // Check accumulated fields to show progress (informational only)
        const existingFields = accumulateFieldsFromHistory(messages, frontendCollectionType);
        const rawFieldKeys = Object.keys(existingFields).filter(k => !k.startsWith('_'));
        let meaningfulFieldCount = rawFieldKeys.length;
        
        // Treat generic "intent phrases" as NOT real progress
        if (existingFields.description && isGenericIntentText(String(existingFields.description))) {
          meaningfulFieldCount = Math.max(0, meaningfulFieldCount - 1);
        }
        
        const progressNote = meaningfulFieldCount > 0 
          ? ` (você já informou ${meaningfulFieldCount} dado${meaningfulFieldCount > 1 ? 's' : ''})` 
          : '';
        
        // FIX: Use correct 2-parameter format that frontend expects
        const confirmationResponse = `[JOURNEY_SWITCH_PROMPT:${detectedIntent.type}:${frontendCollectionType}]` +
          `Parece que você quer iniciar um **${newName}**.\n\n` +
          `Você estava em **${currentName}**${progressNote}. Deseja:\n\n`;
        
        console.log('[ai-orchestrator] Returning journey switch confirmation with buttons');
        
        return new Response(
          `data: ${JSON.stringify({ choices: [{ delta: { content: confirmationResponse } }] })}\n\ndata: [DONE]\n\n`,
          { headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' } }
        );
      }
      
      // No conflict - use frontend type with detected fields
      if (!collectionIntent) {
        console.log('[ai-orchestrator] Using frontend collectionType:', frontendCollectionType);
        collectionIntent = {
          type: frontendCollectionType as 'urban_report' | 'transport_report' | 'service_rating',
          fields: detectedIntent?.fields || {},
        };
      }
    } else if (frontendCollectionType && LIGHT_JOURNEY_TYPES.includes(frontendCollectionType)) {
      // === LIGHT JOURNEY from frontend - maintain context ===
      console.log('[ai-orchestrator] Frontend light journey received:', frontendCollectionType);
      
      // Check if user EXPLICITLY wants to switch to a STRUCTURED journey
      // Only switch if user uses explicit intent phrases like "quero relatar", "quero avaliar"
      const explicitSwitchKeywords = [
        // Relato urbano
        'quero relatar', 'preciso relatar', 'relatar um problema',
        'problema urbano', 'relatar problema',
        // Transporte
        'problema no transporte', 'problema de transporte',
        'relatar transporte', 'problema no ônibus', 'problema no metrô',
        // Avaliação - expanded variations
        'quero avaliar', 'preciso avaliar', 'avaliar um serviço',
        'quero fazer uma avaliação', 'quero fazer avaliação', 'fazer uma avaliação',
        'quero dar nota', 'dar minha avaliação', 'avaliar o serviço',
        'avaliar atendimento', 'avaliar uma ubs', 'avaliar uma escola',
        'avaliar este serviço', 'avaliar essa', 'quero avaliar essa'
      ];
      const userMsgLower = lastUserMsg.toLowerCase();
      const hasExplicitSwitch = explicitSwitchKeywords.some(kw => userMsgLower.includes(kw));
      
      if (hasExplicitSwitch) {
        // User explicitly wants to switch - detect which journey
        const detectedIntent = detectCollectionIntent(lastUserMsg, messages);
        if (detectedIntent && STRUCTURED_TYPES_SET.has(detectedIntent.type)) {
          console.log('[ai-orchestrator] Explicit switch from light journey to structured:', detectedIntent.type);
          
          // === RETURN CONFIRMATION PROMPT ===
          // Ask user to confirm before switching from light to structured journey
          const journeyNames: Record<string, string> = {
            'services': 'Busca de Serviços',
            'service_rating': 'Avaliação de Serviço',
            'urban_report': 'Relato Urbano',
            'transport_report': 'Diagnóstico de Transporte',
            'audiencias': 'Audiências Públicas',
            'history': 'Meu Histórico',
            'general': 'Dúvidas Gerais',
            'vereadores': 'Vereadores',
            'noticias': 'Notícias'
          };
          
          const currentName = journeyNames[frontendCollectionType] || frontendCollectionType;
          const newName = journeyNames[detectedIntent.type] || detectedIntent.type;
          
          const confirmationResponse = `[JOURNEY_SWITCH_PROMPT:${detectedIntent.type}:${frontendCollectionType}]` +
            `Entendi! Você quer iniciar uma **${newName}**.\n\n` +
            `Você estava em **${currentName}**. Deseja trocar?`;
          
          console.log('[ai-orchestrator] Returning journey switch confirmation prompt');
          
          return new Response(
            `data: ${JSON.stringify({ choices: [{ delta: { content: confirmationResponse } }] })}\n\ndata: [DONE]\n\n`,
            { headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' } }
          );
        } else {
          // Can't determine target - stay in light journey
          collectionIntent = { type: frontendCollectionType as CollectionIntent['type'], fields: {} };
        }
      } else {
        // Stay in light journey - pass through to AI without deterministic flow
        collectionIntent = { type: frontendCollectionType as CollectionIntent['type'], fields: {} };
      }
    } else {
      // Fallback: detect intent from message content
      collectionIntent = detectCollectionIntent(lastUserMsg, messages);
    }
    
    // Accumulate fields from conversation history for better tracking
    // BUT if journey was just switched, start fresh
    let accumulatedFields: Record<string, any> = {};
    if (collectionIntent) {
      if (journeySwitchMatch) {
        // Fresh start - don't accumulate from previous journey
        accumulatedFields = {};
        console.log('[ai-orchestrator] Journey switched, starting with fresh fields');
      } else {
        accumulatedFields = accumulateFieldsFromHistory(messages, collectionIntent.type);
        // Merge with detected fields from current message
        accumulatedFields = { ...accumulatedFields, ...collectionIntent.fields };
      }
      
      // ========== AUTO-LOOKUP CEP ==========
      // If we have CEP but missing street/neighborhood, auto-resolve via ViaCEP
      if (accumulatedFields.cep && (!accumulatedFields.street || !accumulatedFields.neighborhood)) {
        const cepLookup = await lookupCEP(accumulatedFields.cep);
        if (cepLookup.valid) {
          console.log('[ai-orchestrator] Auto-resolved CEP:', accumulatedFields.cep, '→', cepLookup.street, cepLookup.neighborhood);
          if (!accumulatedFields.street && cepLookup.street) {
            accumulatedFields.street = cepLookup.street;
          }
          if (!accumulatedFields.neighborhood && cepLookup.neighborhood) {
            accumulatedFields.neighborhood = cepLookup.neighborhood;
          }
          if (!accumulatedFields.city && cepLookup.city) {
            accumulatedFields.city = cepLookup.city;
          }
          if (!accumulatedFields.state && cepLookup.state) {
            accumulatedFields.state = cepLookup.state;
          }
        }
      }
      
      console.log('[ai-orchestrator] Effective collectionType:', collectionIntent.type);
      console.log('[ai-orchestrator] Accumulated fields:', JSON.stringify(accumulatedFields));
    }
    
    // Build dynamic system prompt with collected fields context
    let dynamicSystemPrompt = systemPrompt;
    
    // ========== DETERMINISTIC NEXT STEP ENGINE ==========
    // Smart field sequencing that prevents repeated questions
    
    function getNextMissingField(
      collectionType: string, 
      fields: Record<string, any>
    ): { field: string | null; picker: string | null; prompt: string | null } {
      
      if (collectionType === 'urban_report') {
        // === NEW FLOW: Description FIRST, then category, then location ===
        
        // 1. DESCRIPTION first - let user tell us what's happening
        // CRITICAL: Use centralized NLP validation (isValidDomainDescription)
        const description = fields.description || '';
        const isGeneric = isGenericIntentText(description);
        const descToCheck = isGeneric ? '' : description;
        const isValidDesc = isValidDomainDescription(descToCheck, 'urban');
        
        console.log('[getNextMissingField] Urban description check:', {
          description: description.substring(0, 40),
          isGeneric,
          isValidDesc
        });
        
        if (!isValidDesc) {
          return { field: 'description', picker: null, prompt: '**O que está acontecendo?** Me conta o problema.' };
        }
        
        // 2. CATEGORY + SUBCATEGORY - try auto-classification with intuitive label, fallback to 'outro'
        if (!fields.category) {
          // Try to auto-classify from description
          const autoClass = autoClassifyCategory(fields.description || '');
          
          if (autoClass.category && autoClass.confidence >= 0.8) {
            // High confidence - auto-set category AND subcategory label
            fields.category = autoClass.category;
            fields.subcategory = autoClass.suggestedLabel || generateLabelFromDescription(fields.description || '');
            fields._auto_classified = true;
            console.log('[getNextMissingField] Auto-classified:', autoClass.category, 'label:', fields.subcategory, 'confidence:', autoClass.confidence);
          } else if (autoClass.category && autoClass.confidence >= 0.5) {
            // Medium confidence - ask for confirmation using intuitive label if available
            const intuitiveName = autoClass.suggestedLabel || (() => {
              const categoryLabels: Record<string, string> = {
                iluminacao: 'iluminação', via_publica: 'via pública', calcada: 'calçada',
                lixo: 'lixo/entulho', esgoto: 'esgoto/alagamento', area_verde: 'área verde',
                higiene_urbana: 'higiene urbana', animais: 'animais', poluicao: 'barulho/poluição', outro: 'outro'
              };
              return categoryLabels[autoClass.category!] || autoClass.category;
            })();
            
            // Pre-set pending category and subcategory for when user confirms
            fields._pending_category = autoClass.category;
            fields._pending_subcategory = autoClass.suggestedLabel || generateLabelFromDescription(fields.description || '');
            return { field: 'category', picker: null, prompt: `[FIELD_REQUEST:category]Parece ser **${intuitiveName}**. Confirma? (sim/não, ou diga outro tipo)` };
          } else {
            // Low confidence - check if we already asked once
            const alreadyAskedCategory = fields._asked_category === true;
            
            if (alreadyAskedCategory) {
              // FALLBACK: Already asked and still no match - use 'outro' with generated label
              fields.category = 'outro';
              fields.subcategory = generateLabelFromDescription(fields.description || '');
              fields._fallback_category = true;
              console.log('[getNextMissingField] Fallback to outro with label:', fields.subcategory);
            } else {
              // First time - ask with expanded options including "outro"
              fields._asked_category = true;
              return { field: 'category', picker: null, prompt: 'Qual **tipo de problema** é esse? (iluminação, buraco, esgoto, lixo, barulho, ou descreva o problema)' };
            }
          }
        }
        
        // 2b. Ensure subcategory is set when category was just confirmed
        if (fields.category && !fields.subcategory) {
          if (fields._pending_subcategory) {
            fields.subcategory = fields._pending_subcategory;
            delete fields._pending_subcategory;
          } else {
            // Generate from description if missing
            const autoClass = autoClassifyCategory(fields.description || '');
            fields.subcategory = autoClass.suggestedLabel || generateLabelFromDescription(fields.description || '');
          }
          console.log('[getNextMissingField] Set subcategory:', fields.subcategory);
        }
        
        // 3. Location: CEP OR (street AND neighborhood) - FLEXIBLE GROUP
        const hasLocationViaCep = !!fields.cep && fields.cep.length === 8;
        const hasLocationViaAddress = !!fields.street && !!fields.neighborhood;
        const hasLocation = hasLocationViaCep || hasLocationViaAddress;
        
        if (!hasLocation) {
          // If user already gave street without neighborhood (or vice versa), ask for the missing one
          if (fields.street && !fields.neighborhood) {
            return { field: 'neighborhood', picker: null, prompt: 'Em qual **bairro** fica essa rua?' };
          }
          if (fields.neighborhood && !fields.street) {
            return { field: 'street', picker: '[ADDRESS_PICKER]', prompt: 'Qual o **nome da rua**?' };
          }
          // Default: ask for CEP with address picker fallback
          return { field: 'cep', picker: '[ADDRESS_PICKER]', prompt: 'Qual o **CEP** do local?\n\n_Se não souber, me diz a rua e bairro._' };
        }
        
        // 4. Street number / reference (optional but helpful)
        if (!fields.street_number && !fields.reference_point) {
          return { field: 'street_number', picker: null, prompt: 'Qual o **número** ou **ponto de referência** próximo?' };
        }
        
        // 5. Risk assessment for risk categories - WITH AUTO-INFERENCE
        const RISK_CATEGORIES = ['via_publica', 'iluminacao', 'esgoto', 'area_verde', 'calcada'];
        if (RISK_CATEGORIES.includes(fields.category)) {
          if (!fields.risk_level) {
            // TRY AUTO-INFERENCE from description before asking
            const autoRisk = autoInferRisk(fields.description || '');
            if (autoRisk.risk_level && autoRisk.confidence >= 0.7) {
              // High confidence - auto-set and skip question
              fields.risk_level = autoRisk.risk_level;
              if (autoRisk.risk_types && autoRisk.risk_types.length > 0) {
                fields.risk_types = autoRisk.risk_types;
              }
              fields.urgency_reason = `Auto-inferido: ${autoRisk.reason}`;
              console.log('[getNextMissingField] Auto-inferred risk:', autoRisk);
              // Don't return - continue to next field check
            } else {
              // Low confidence - need to ask
              return { field: 'risk_level', picker: null, prompt: 'Há algum **risco imediato**? (sim/não) _(ex: fios expostos, via bloqueada, alagando)_' };
            }
          }
          if (['critical', 'moderate'].includes(fields.risk_level) && !fields.affected_scope) {
            return { field: 'affected_scope', picker: null, prompt: 'Isso está afetando **só você**, **toda a rua** ou **o bairro todo**?' };
          }
        }
        
        // All required fields collected
        return { field: null, picker: null, prompt: null };
      }
      
      if (collectionType === 'transport_report') {
        const description = fields.description || '';
        const isGeneric = isGenericIntentText(description);
        const descToCheck = isGeneric ? '' : description;
        const isValidDesc = isValidDomainDescription(descToCheck, 'transport');
        
        console.log('[getNextMissingField] Transport description check:', {
          description: description.substring(0, 40),
          isGeneric,
          isValidDesc
        });
        
        // If no valid description yet, ask for it
        if (!isValidDesc) {
          return { field: 'description', picker: null, prompt: '**O que aconteceu?** Me conta o problema.' };
        }
        
        // 2. Report type - TRY AUTO-INFERENCE from description using FUZZY MATCHING
        // If can't infer, use 'outro' with generated label (NEVER block the flow)
        if (!fields.report_type) {
          // First try the new fuzzy inference
          const fuzzyInferredType = inferTransportTypeFromText(description);
          if (fuzzyInferredType) {
            fields.report_type = fuzzyInferredType;
            console.log('[getNextMissingField] Fuzzy-inferred transport report_type:', fields.report_type);
          } else {
            // Fallback to extractTransportFields for exact matching
            const inferredFields = extractTransportFields(description.toLowerCase());
            if (inferredFields.report_type) {
              fields.report_type = inferredFields.report_type;
              console.log('[getNextMissingField] Auto-inferred transport report_type:', fields.report_type);
            } else {
              // FALLBACK: Can't infer - use 'outro' and continue (NEVER ASK, NEVER BLOCK)
              fields.report_type = 'outro';
              fields._fallback_report_type = true;
              console.log('[getNextMissingField] Fallback transport report_type to outro');
            }
          }
        }
        
        // 3. Line/station - GO HERE DIRECTLY if we have description + type
        if (!fields.line_code) {
          return { field: 'line_code', picker: '[LINE_PICKER]', prompt: 'Qual **linha ou estação** teve o problema?' };
        }
        
        // 4. Date (REQUIRED - user must confirm)
        if (!fields.occurrence_date) {
          return { field: 'occurrence_date', picker: '[DATE_PICKER]', prompt: '**Quando isso aconteceu?** (hoje, ontem, ou me diz a data)' };
        }
        
        // All required fields collected
        return { field: null, picker: null, prompt: null };
      }
      
      if (collectionType === 'service_rating') {
        // 1. Service type
        if (!fields.service_type) {
          return { field: 'service_type', picker: '[SERVICE_TYPE_PICKER]', prompt: 'Qual **tipo de serviço** você quer avaliar? (UBS, escola, hospital, CEU...)' };
        }
        
        // 2. Service name
        if (!fields.service_name || fields.service_name.length < 3) {
          return { field: 'service_name', picker: '[SERVICE_PICKER]', prompt: 'Qual o **nome** do serviço que você visitou?' };
        }
        
        // 3. Address confirmation (NEW - CRITICAL)
        // If service_address_confirmed is undefined, we need to ask
        if (fields.service_address_confirmed === undefined) {
          const serviceTypeLabel: Record<string, string> = {
            ubs: 'UBS', school: 'escola', hospital: 'hospital',
            ceu: 'CEU', library: 'biblioteca', sports_center: 'centro esportivo'
          };
          const typeLabel = serviceTypeLabel[fields.service_type] || fields.service_type;
          
          // Build address from available info
          const address = fields.service_address || 
                          (fields.service_neighborhood ? `${fields.service_name} - ${fields.service_neighborhood}` : null);
          
          if (address) {
            return { 
              field: 'service_address_confirmed', 
              picker: `[SERVICE_ADDRESS_CONFIRM:${address}]`, 
              prompt: `O serviço fica em **${address}**. Está correto? (sim/não)` 
            };
          }
          // If no address info yet, ask for neighborhood first
          return {
            field: 'service_neighborhood',
            picker: null,
            prompt: `Em qual **bairro** fica a ${typeLabel} que você visitou?`
          };
        }
        
        // 3b. If user said "no" to address, ask for correct neighborhood
        if (fields.service_address_confirmed === false && !fields.service_neighborhood) {
          const serviceTypeLabel: Record<string, string> = {
            ubs: 'UBS', school: 'escola', hospital: 'hospital',
            ceu: 'CEU', library: 'biblioteca', sports_center: 'centro esportivo'
          };
          const typeLabel = serviceTypeLabel[fields.service_type] || 'serviço';
          return {
            field: 'service_neighborhood',
            picker: null,
            prompt: `Ok, qual o **bairro** correto onde fica a ${typeLabel}?`
          };
        }
        
        // 3c. After getting neighborhood, reconfirm address
        if (fields._needs_address_reconfirm && fields.service_neighborhood && !fields._address_reconfirmed) {
          const address = fields.service_address || `${fields.service_name} - ${fields.service_neighborhood}`;
          return {
            field: 'service_address_reconfirm',
            picker: `[SERVICE_ADDRESS_CONFIRM:${address}]`,
            prompt: `Então é **${address}**. Correto?`
          };
        }
        
        // 4. Rating stars (REQUIRED 1-5)
        if (!fields.rating_stars || fields.rating_stars < 1 || fields.rating_stars > 5) {
          return { field: 'rating_stars', picker: '[RATING_PICKER]', prompt: 'Qual **nota de 1 a 5** você dá para o atendimento?' };
        }
        
        // 5. Rating text
        const textLen = (fields.rating_text || '').length;
        if (textLen < 10) {
          return { field: 'rating_text', picker: null, prompt: 'Pode **descrever sua experiência**? Como foi o atendimento?' };
        }
        
        // All required fields collected
        return { field: null, picker: null, prompt: null };
      }
      
      // Unknown collection type
      return { field: null, picker: null, prompt: null };
    }
    
    // Compute next field ONCE
    let nextFieldInfo: { field: string | null; picker: string | null; prompt: string | null } = { field: null, picker: null, prompt: null };
    
    // === LIGHT JOURNEY MARKER ===
    // If collection intent is a light journey, we'll prepend a marker to the response
    // so the frontend can persist it
    let lightJourneyMarker = '';
    if (collectionIntent && LIGHT_JOURNEY_TYPES.includes(collectionIntent.type)) {
      lightJourneyMarker = `[LIGHT_JOURNEY:${collectionIntent.type}]`;
      console.log('[ai-orchestrator] Will emit light journey marker:', lightJourneyMarker);
    }
    
    if (collectionIntent && ['urban_report', 'transport_report', 'service_rating'].includes(collectionIntent.type)) {
      nextFieldInfo = getNextMissingField(collectionIntent.type, accumulatedFields);
      console.log('[ai-orchestrator] Deterministic next field:', nextFieldInfo.field);
    }
    
    if (collectionIntent && Object.keys(accumulatedFields).length > 0) {
      const fieldsList = Object.entries(accumulatedFields)
        .filter(([k, v]) => v && (typeof v === 'string' ? v.length > 0 : true))
        .map(([k, v]) => `• ${k}: ${String(v).substring(0, 100)}`)
        .join('\n');
      
      const collectionContext = `

=== CONTEXTO ATUAL DA COLETA ===

**Jornada ativa:** ${collectionIntent.type}
**Campos JÁ COLETADOS (NÃO PERGUNTAR NOVAMENTE):**
${fieldsList}
${nextFieldInfo.field ? `\n**PRÓXIMO CAMPO A PEDIR:** ${nextFieldInfo.field}\n**PERGUNTA SUGERIDA:** ${nextFieldInfo.prompt || ''}` : '\n**STATUS:** Todos os campos obrigatórios foram coletados. Chame a ferramenta de criação para finalizar.'}

**REGRAS CRÍTICAS:**
1. NUNCA pergunte por campos já listados acima (cep, street, neighborhood, category, line_code, etc.)
2. Se o usuário já deu CEP, rua e bairro estão resolvidos via auto-lookup - NÃO peça novamente
3. Se o usuário deu rua E bairro manualmente, localização está completa - NÃO peça CEP
4. Pergunte APENAS o próximo campo listado acima
5. Seja DIRETO: uma pergunta curta por mensagem
===`;
      
      dynamicSystemPrompt = systemPrompt + '\n\n' + collectionContext;
      console.log('[ai-orchestrator] Injected collection context. Next field:', nextFieldInfo.field);
    }
    
    // ========== DETERMINISTIC SHORT-CIRCUIT ==========
    // If we have a structured journey and know the next field, respond directly without LLM
    // This prevents the LLM from re-asking already collected fields
    // CRITICAL FIX: Also short-circuit on journey switch for structured journeys
    
    const shouldShortCircuit = collectionIntent && 
      nextFieldInfo.field && 
      ['urban_report', 'transport_report', 'service_rating'].includes(collectionIntent.type);
    
    if (shouldShortCircuit && nextFieldInfo.prompt) {
      // If this is a journey switch, add a friendly confirmation prefix
      const prefix = journeySwitchMatch ? 'Ok! ' : '';
      
      console.log('[ai-orchestrator] SHORT-CIRCUIT: Responding deterministically for field:', nextFieldInfo.field, 
        journeySwitchMatch ? '(journey switch)' : '');
      
      // Build the deterministic response
      const fieldsJson = JSON.stringify(accumulatedFields);
      const progressMarker = `[COLLECTION_PROGRESS:${collectionIntent!.type}:${fieldsJson}]`;
      const fieldMarker = `[FIELD_REQUEST:${nextFieldInfo.field}]`;
      const pickerMarker = nextFieldInfo.picker || '';
      
      const deterministicResponse = `${progressMarker}${fieldMarker}${prefix}${nextFieldInfo.prompt}${pickerMarker ? '\n\n' + pickerMarker : ''}`;
      
      const ssePayload = JSON.stringify({
        choices: [{ delta: { content: deterministicResponse } }]
      });
      
      console.log('[ai-orchestrator] Request completed in', Date.now() - requestStartTime, 'ms (deterministic)');
      return new Response(`data: ${ssePayload}\n\ndata: [DONE]\n\n`, {
        headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' }
      });
    }

    // Call AI API (Lovable AI Gateway) with streaming enabled and timeout
    const controller = new AbortController();
    const apiTimeoutId = setTimeout(() => {
      console.warn('[ai-orchestrator] API timeout (45s), aborting request');
      controller.abort();
    }, 45000);

    let response: Response;
    try {
      response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${lovableApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: dynamicSystemPrompt },
            ...messages.slice(-10) // Last 10 messages for context
          ],
          tools,
          tool_choice: 'auto',
          temperature: 0.7,
          stream: true, // Enable streaming
        }),
        signal: controller.signal,
      });
      clearTimeout(apiTimeoutId);
    } catch (fetchError: any) {
      clearTimeout(apiTimeoutId);
      if (fetchError.name === 'AbortError') {
        console.error('[ai-orchestrator] API call timeout after 45s');
        const timeoutMsg = 'O serviço está demorando mais que o normal. Por favor, tente novamente.';
        console.log('[ai-orchestrator] Request completed in', Date.now() - requestStartTime, 'ms (timeout)');
        return new Response(`data: ${JSON.stringify({ choices: [{ delta: { content: timeoutMsg } }] })}\n\ndata: [DONE]\n\n`, {
          headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' }
        });
      }
      throw fetchError;
    }
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[ai-orchestrator] API error:', response.status, errorText);
      
      // Handle rate limiting and payment errors
      if (response.status === 429) {
        console.log('[ai-orchestrator] Request completed in', Date.now() - requestStartTime, 'ms (rate limit)');
        return new Response(`data: ${JSON.stringify({ choices: [{ delta: { content: 'Desculpe, estamos com muitas solicitações no momento. Tente novamente em alguns segundos.' } }] })}\n\ndata: [DONE]\n\n`, {
          headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' }
        });
      }
      if (response.status === 402) {
        console.log('[ai-orchestrator] Request completed in', Date.now() - requestStartTime, 'ms (payment)');
        return new Response(`data: ${JSON.stringify({ choices: [{ delta: { content: 'Desculpe, o serviço de IA está temporariamente indisponível. Tente novamente mais tarde.' } }] })}\n\ndata: [DONE]\n\n`, {
          headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' }
        });
      }
      
      throw new Error(`AI API error: ${response.status}`);
    }
    
    const contentType = response.headers.get('content-type') || '';
    console.log('[ai-orchestrator] Response content-type:', contentType);
    
    // If streaming response, we need to intercept for tool calls
    if (contentType.includes('text/event-stream') && response.body) {
      // Create a TransformStream to process the SSE and handle tool calls
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';
      let toolCallData: any = null;
      let toolCallArguments = '';
      
      // Read the entire stream with timeout protection (30s total, 10s per read)
      let textBuffer = '';
      const streamStartTime = Date.now();
      const STREAM_TIMEOUT_MS = 30000;
      const READ_TIMEOUT_MS = 10000;
      
      while (true) {
        // Check for total stream timeout
        if (Date.now() - streamStartTime > STREAM_TIMEOUT_MS) {
          console.warn('[ai-orchestrator] Stream reading timeout after', STREAM_TIMEOUT_MS, 'ms');
          reader.cancel();
          break;
        }
        
        // Race between read and timeout
        try {
          const readPromise = reader.read();
          const timeoutPromise = new Promise<{ done: true; value: undefined }>((resolve) => 
            setTimeout(() => resolve({ done: true, value: undefined }), READ_TIMEOUT_MS)
          );
          
          const { done, value } = await Promise.race([readPromise, timeoutPromise]);
          if (done) break;
          if (value) {
            textBuffer += decoder.decode(value, { stream: true });
          }
        } catch (readError) {
          console.warn('[ai-orchestrator] Stream read error:', readError);
          reader.cancel();
          break;
        }
      }
      
      // Parse SSE events
      const lines = textBuffer.split('\n');
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const jsonStr = line.slice(6).trim();
        if (jsonStr === '[DONE]') continue;
        
        try {
          const parsed = JSON.parse(jsonStr);
          const delta = parsed.choices?.[0]?.delta;
          
          if (delta?.content) {
            fullContent += delta.content;
          }
          
          if (delta?.tool_calls) {
            for (const tc of delta.tool_calls) {
              if (tc.function?.name) {
                toolCallData = { name: tc.function.name, id: tc.id };
              }
              if (tc.function?.arguments) {
                toolCallArguments += tc.function.arguments;
              }
            }
          }
        } catch (e) {
          // Ignore parse errors for incomplete chunks
        }
      }
      
      console.log('[ai-orchestrator] Parsed content:', fullContent.substring(0, 100));
      console.log('[ai-orchestrator] Tool call detected:', toolCallData?.name || 'none');
      
      // If tool call was found, execute it
      if (toolCallData?.name) {
        try {
          const toolArgs = JSON.parse(toolCallArguments);
          console.log('[ai-orchestrator] Executing tool:', toolCallData.name, toolArgs);
          
          const result = await executeTool(toolCallData.name, toolArgs, user.id, supabase, accumulatedFields);
          
          // CRITICAL: Merge toolArgs into accumulatedFields for COLLECTION_PROGRESS
          // This ensures fields like risk_level that come directly from AI args are reflected in tracker
          const finalFields = {
            ...accumulatedFields,
            ...(toolArgs.category && { category: toolArgs.category }),
            ...(toolArgs.description && { description: toolArgs.description }),
            ...(toolArgs.street && { street: toolArgs.street }),
            ...(toolArgs.neighborhood && { neighborhood: toolArgs.neighborhood }),
            ...(toolArgs.cep && { cep: toolArgs.cep }),
            ...(toolArgs.street_number && { street_number: toolArgs.street_number }),
            ...(toolArgs.reference_point && { reference_point: toolArgs.reference_point }),
            ...(toolArgs.risk_level && { risk_level: toolArgs.risk_level }),
            ...(toolArgs.risk_types && { risk_types: toolArgs.risk_types }),
            ...(toolArgs.affected_scope && { affected_scope: toolArgs.affected_scope }),
            ...(toolArgs.affected_estimate && { affected_estimate: toolArgs.affected_estimate }),
            ...(toolArgs.active_consequences && { active_consequences: toolArgs.active_consequences }),
            // Transport fields
            ...(toolArgs.report_type && { report_type: toolArgs.report_type }),
            ...(toolArgs.line_code && { line_code: toolArgs.line_code }),
            ...(toolArgs.occurrence_date && { occurrence_date: toolArgs.occurrence_date }),
            ...(toolArgs.occurrence_time && { occurrence_time: toolArgs.occurrence_time }),
            ...(toolArgs.severity && { severity: toolArgs.severity }),
            // Service rating fields
            ...(toolArgs.service_type && { service_type: toolArgs.service_type }),
            ...(toolArgs.rating_stars && { rating_stars: toolArgs.rating_stars }),
            ...(toolArgs.sentiment && { sentiment: toolArgs.sentiment }),
          };
          
          console.log('[ai-orchestrator] Final fields for tracker:', Object.keys(finalFields));
          
          // Inject collection progress with merged fields
          let responseContent = result.message;
          
          // Add light journey marker if applicable
          if (lightJourneyMarker && !responseContent.includes('[LIGHT_JOURNEY:')) {
            responseContent = lightJourneyMarker + responseContent;
          }
          
          if (collectionIntent && !responseContent.includes('[COLLECTION_PROGRESS:')) {
            const fieldsJson = JSON.stringify(finalFields);
            responseContent = `[COLLECTION_PROGRESS:${collectionIntent.type}:${fieldsJson}]${responseContent}`;
          }
          
          // Format as SSE for frontend
          const ssePayload = JSON.stringify({
            choices: [{ delta: { content: responseContent } }]
          });
          
          console.log('[ai-orchestrator] Request completed in', Date.now() - requestStartTime, 'ms (tool call)');
          return new Response(`data: ${ssePayload}\n\ndata: [DONE]\n\n`, {
            headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' }
          });
        } catch (e) {
          console.error('[ai-orchestrator] Tool execution error:', e);
          const errorPayload = JSON.stringify({
            choices: [{ delta: { content: 'Desculpe, houve um erro ao processar sua solicitação. Pode tentar novamente?' } }]
          });
          console.log('[ai-orchestrator] Request completed in', Date.now() - requestStartTime, 'ms (tool error)');
          return new Response(`data: ${errorPayload}\n\ndata: [DONE]\n\n`, {
            headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' }
          });
        }
      }
      
      // No tool call - inject collection progress with accumulated fields
      let responseContent = fullContent;
      
      // Add light journey marker if applicable
      if (lightJourneyMarker && !responseContent.includes('[LIGHT_JOURNEY:')) {
        responseContent = lightJourneyMarker + responseContent;
      }
      
      if (collectionIntent && !responseContent.includes('[COLLECTION_PROGRESS:')) {
        const fieldsJson = JSON.stringify(accumulatedFields);
        responseContent = `[COLLECTION_PROGRESS:${collectionIntent.type}:${fieldsJson}]${responseContent}`;
      }
      
      const ssePayload = JSON.stringify({
        choices: [{ delta: { content: responseContent } }]
      });
      
      console.log('[ai-orchestrator] Request completed in', Date.now() - requestStartTime, 'ms (stream)');
      return new Response(`data: ${ssePayload}\n\ndata: [DONE]\n\n`, {
        headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' }
      });
    }
    
    // Fallback: non-streaming response (shouldn't happen but handle gracefully)
    const data = await response.json();
    const choice = data.choices?.[0];
    
    if (!choice) {
      throw new Error('No response from AI');
    }
    
    // Handle tool calls in non-streaming mode
    if (choice.message?.tool_calls?.length) {
      const toolCall = choice.message.tool_calls[0];
      const toolName = toolCall.function.name;
      const toolArgs = JSON.parse(toolCall.function.arguments);
      
      console.log('[ai-orchestrator] Tool call (non-stream):', toolName);
      
      const result = await executeTool(toolName, toolArgs, user.id, supabase);
      
      // Merge toolArgs for non-streaming mode too
      const finalFields = {
        ...accumulatedFields,
        ...(toolArgs.category && { category: toolArgs.category }),
        ...(toolArgs.description && { description: toolArgs.description }),
        ...(toolArgs.street && { street: toolArgs.street }),
        ...(toolArgs.neighborhood && { neighborhood: toolArgs.neighborhood }),
        ...(toolArgs.cep && { cep: toolArgs.cep }),
        ...(toolArgs.risk_level && { risk_level: toolArgs.risk_level }),
        ...(toolArgs.risk_types && { risk_types: toolArgs.risk_types }),
        ...(toolArgs.affected_scope && { affected_scope: toolArgs.affected_scope }),
        ...(toolArgs.report_type && { report_type: toolArgs.report_type }),
        ...(toolArgs.service_type && { service_type: toolArgs.service_type }),
        ...(toolArgs.rating_stars && { rating_stars: toolArgs.rating_stars }),
      };
      
      let responseContent = result.message;
      if (collectionIntent && !responseContent.includes('[COLLECTION_PROGRESS:')) {
        const fieldsJson = JSON.stringify(finalFields);
        responseContent = `[COLLECTION_PROGRESS:${collectionIntent.type}:${fieldsJson}]${responseContent}`;
      }
      
      const ssePayload = JSON.stringify({
        choices: [{ delta: { content: responseContent } }]
      });
      
      console.log('[ai-orchestrator] Request completed in', Date.now() - requestStartTime, 'ms (non-stream tool)');
      return new Response(`data: ${ssePayload}\n\ndata: [DONE]\n\n`, {
        headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' }
      });
    }
    
    // Regular response
    let content = choice.message?.content || '';
    if (collectionIntent && !content.includes('[COLLECTION_PROGRESS:')) {
      const fieldsJson = JSON.stringify(accumulatedFields);
      content = `[COLLECTION_PROGRESS:${collectionIntent.type}:${fieldsJson}]${content}`;
    }
    
    const ssePayload = JSON.stringify({
      choices: [{ delta: { content } }]
    });
    
    console.log('[ai-orchestrator] Request completed in', Date.now() - requestStartTime, 'ms (regular)');
    return new Response(`data: ${ssePayload}\n\ndata: [DONE]\n\n`, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' }
    });
    
  } catch (error) {
    console.error('[ai-orchestrator] Fatal error:', error);
    console.log('[ai-orchestrator] Request completed in', Date.now() - requestStartTime, 'ms (error)');
    
    // Always return a valid SSE response so frontend doesn't hang
    const errorMessage = 'Desculpe, ocorreu um erro inesperado. Por favor, tente novamente.';
    return new Response(`data: ${JSON.stringify({ choices: [{ delta: { content: errorMessage } }] })}\n\ndata: [DONE]\n\n`, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' }
    });
  }
});
