import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

// Intent detection for collection progress tracking with scoring system
type CollectionIntent = {
  type: 'urban_report' | 'transport_report' | 'service_rating';
  fields: Record<string, any>;
  accumulatedFields?: Record<string, any>; // All fields collected across conversation
};

interface DetectionScore {
  type: 'urban_report' | 'transport_report' | 'service_rating' | 'chamber_feedback';
  score: number;
  fields: Record<string, any>;
}

// Intent keywords - REQUIRED to activate tracker (prevents false positives)
const INTENT_KEYWORDS = [
  'quero reclamar', 'preciso relatar', 'quero reportar', 'aconteceu',
  'tem um problema', 'está com problema', 'não está funcionando',
  'quero avaliar', 'quero elogiar', 'quero denunciar', 'preciso informar',
  'gostaria de registrar', 'vim falar sobre um', 'tenho uma reclamação',
  'quero fazer', 'preciso fazer', 'quero registrar', 'tive um problema',
  'sofri um', 'passei por', 'enfrentei', 'reclamar sobre', 'reclamar do',
  'agradecer', 'parabenizar', 'sugerir', 'dar uma sugestão'
];

// Extract transport-specific fields
function extractTransportFields(context: string): Record<string, any> {
  const fields: Record<string, any> = {};
  const today = new Date().toISOString().split('T')[0];
  
  // Detect report_type
  if (context.includes('atraso') || context.includes('atrasou') || context.includes('demora')) {
    fields.report_type = 'atraso';
  } else if (context.includes('lotad') || context.includes('chei') || context.includes('superlotad')) {
    fields.report_type = 'lotacao';
  } else if (context.includes('segurança') || context.includes('assalto') || context.includes('roubo')) {
    fields.report_type = 'seguranca';
  } else if (context.includes('sujo') || context.includes('limpeza') || context.includes('fedendo')) {
    fields.report_type = 'limpeza';
  } else if (context.includes('acessib') || context.includes('cadeirante') || context.includes('elevador')) {
    fields.report_type = 'acessibilidade';
  }
  
  // Detect line
  const lineMatch = context.match(/linha\s*(\d{3,4}[a-z]?[-/]?\d*)/i);
  if (lineMatch) fields.line_code = lineMatch[1].toUpperCase();
  
  // Detect date
  if (context.includes('hoje') || context.includes('agora') || context.includes('acabou de')) {
    fields.occurrence_date = today;
  } else if (context.includes('ontem')) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    fields.occurrence_date = yesterday.toISOString().split('T')[0];
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
      
    case 'risk_level':
      // Parse risk level from natural language
      const criticalKeywords = ['bloqueada', 'bloqueado', 'não passa', 'nao passa', 'não dá para', 'nao da para',
        'fios expostos', 'exposto', 'choque', 'alagando', 'água subindo', 'inundando', 'transbordando',
        'desabando', 'caindo', 'desmoronando', 'risco imediato', 'emergência', 'urgente'];
      const moderateKeywords = ['risco de', 'pode causar', 'perigoso', 'perigo', 'acidente', 
        'risco de doença', 'doença', 'doenças', 'contaminação', 'transtorno', 'prejudica'];
      const lowKeywords = ['incômodo', 'incomodo', 'chato', 'desconfortável', 'feio', 'ruim'];
      const noRiskKeywords = ['sem risco', 'não tem risco', 'nenhum risco', 'tranquilo'];
      
      if (noRiskKeywords.some(k => responseLower.includes(k))) {
        result.risk_level = 'none';
      } else if (criticalKeywords.some(k => responseLower.includes(k))) {
        result.risk_level = 'critical';
        // Also extract risk types
        const riskTypes: string[] = [];
        if (responseLower.includes('fio') || responseLower.includes('choque') || responseLower.includes('elétric')) riskTypes.push('electrical');
        if (responseLower.includes('bloqueada') || responseLower.includes('não passa') || responseLower.includes('trânsito')) riskTypes.push('traffic');
        if (responseLower.includes('alagando') || responseLower.includes('inundando') || responseLower.includes('água')) riskTypes.push('flooding');
        if (responseLower.includes('caindo') || responseLower.includes('desab')) riskTypes.push('structural');
        if (riskTypes.length > 0) result.risk_types = riskTypes;
      } else if (moderateKeywords.some(k => responseLower.includes(k))) {
        result.risk_level = 'moderate';
        // Extract risk types for moderate too
        const riskTypes: string[] = [];
        if (responseLower.includes('doença') || responseLower.includes('saúde') || responseLower.includes('contaminação')) riskTypes.push('health');
        if (responseLower.includes('acidente') || responseLower.includes('trânsito')) riskTypes.push('traffic');
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
      // Any response with 30+ chars is considered a valid description
      if (response.length >= 30) {
        result.description = response;
      }
      break;
  }
  
  return result;
}

// Accumulate fields from all messages in conversation for better tracking
function accumulateFieldsFromHistory(
  messages: Array<{ role: string; content: string }>,
  collectionType: 'urban_report' | 'transport_report' | 'service_rating'
): Record<string, any> {
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
        
        // === DESCRIPTION detection from detailed questions ===
        if ((question.includes('me conte mais') || question.includes('descreva') || 
             question.includes('mais detalhes') || question.includes('o que está acontecendo') ||
             question.includes('qual o problema') || question.includes('qual é o problema')) && 
            answer.length >= 30 && !accumulated.description) {
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
          Object.assign(accumulated, parsedFields);
        }
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

function detectCollectionIntent(
  userMessage: string, 
  conversationHistory: Array<{ role: string; content: string }>
): CollectionIntent | null {
  const msgLower = userMessage.toLowerCase();
  
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
  
  // Transport scoring
  const transportDomain = ['ônibus', 'onibus', 'metrô', 'metro', 'trem', 'cptm', 'estação', 'estacao', 'terminal', 'ponto de ônibus'];
  const transportProblems = ['lotado', 'lotação', 'lotacao', 'atraso', 'atrasou', 'demora', 'não passou', 'nao passou', 'quebrou'];
  let transportScore = 0;
  transportDomain.forEach(kw => { if (fullUserContext.includes(kw)) transportScore += 4; });
  transportProblems.forEach(kw => { if (fullUserContext.includes(kw)) transportScore += 3; });
  if (transportScore > 0) {
    scores.push({ type: 'transport_report', score: transportScore, fields: extractTransportFields(fullUserContext) });
  }
  
  // Urban scoring - using USER-ONLY context to prevent assistant contamination
  const urbanDomain = ['buraco', 'poste', 'iluminação', 'iluminacao', 'lixo', 'entulho', 'calçada', 'calcada', 'esgoto', 'árvore', 'arvore', 'poda', 'fedor', 'fedido', 'bicho morto', 'animal morto', 'rato', 'bueiro', 'vazamento', 'sujeira', 'fedendo', 'cheiro'];
  const urbanProblems = ['quebrado', 'apagado', 'acumulado', 'vazando', 'caindo', 'fedendo', 'fedido', 'entupido', 'alagado', 'alagando'];
  let urbanScore = 0;
  urbanDomain.forEach(kw => { if (fullUserContext.includes(kw)) urbanScore += 4; });
  urbanProblems.forEach(kw => { if (fullUserContext.includes(kw)) urbanScore += 2; });
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
  
  // No matches found
  if (scores.length === 0) {
    console.log('[detectCollectionIntent] Intent found but no domain keywords matched');
    return null;
  }
  
  // Sort by score and select winner (threshold of 5)
  const winner = scores.sort((a, b) => b.score - a.score)[0];
  console.log('[detectCollectionIntent] Scores:', JSON.stringify(scores.map(s => ({ type: s.type, score: s.score }))));
  console.log('[detectCollectionIntent] Winner:', winner.type, 'with score:', winner.score);
  
  if (winner.score < 5) {
    console.log('[detectCollectionIntent] Winner score below threshold (5), skipping');
    return null;
  }
  
  // Chamber feedback is stored as urban_report with category=feedback_camara
  if (winner.type === 'chamber_feedback') {
    return { type: 'urban_report', fields: winner.fields };
  }
  
  return { type: winner.type as CollectionIntent['type'], fields: winner.fields };
}

// Unified tools for all citizen actions
const tools = [
  {
    type: "function",
    function: {
      name: "classify_report_category",
      description: "OBRIGATÓRIO: Classifica a categoria do relato urbano ANTES de coletar outros dados. Chamar IMEDIATAMENTE quando detectar que cidadão quer fazer um relato urbano. Se confiança >= 80%, classificar automaticamente. Se < 80%, apresentar opções ao cidadão e aguardar confirmação.",
      parameters: {
        type: "object",
        properties: {
          category: {
            type: "string",
            enum: ["iluminacao", "calcada", "via_publica", "lixo", "esgoto", "area_verde", "higiene_urbana", "animais", "poluicao", "feedback_camara", "outro"],
            description: "Categoria classificada: iluminacao (poste, luz), calcada (passeio), via_publica (buraco, asfalto, semáforo), lixo (entulho), esgoto (bueiro, vazamento, alagamento), area_verde (praça, árvore), higiene_urbana (fedor genérico, sujeira), animais (bicho morto, rato), poluicao (fumaça, barulho), feedback_camara (vereador), outro"
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
        required: ["category", "confidence", "reasoning", "user_confirmed"]
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
      description: "Registra problema no transporte público. Usar quando cidadão falar de: ônibus, metrô, CPTM, atrasos, lotação, segurança em transporte.",
      parameters: {
        type: "object",
        properties: {
          report_type: {
            type: "string",
            enum: ["atraso", "lotacao", "seguranca", "acessibilidade", "limpeza", "outro"],
            description: "Tipo do problema"
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
      description: "Registra avaliação de serviço público. Usar quando cidadão quiser avaliar: UBS, escola, hospital, CEU, biblioteca, centro esportivo.",
      parameters: {
        type: "object",
        properties: {
          service_type: {
            type: "string",
            enum: ["ubs", "school", "ceu", "hospital", "library", "sports_center", "other"],
            description: "PERGUNTAR PRIMEIRO: tipo do serviço"
          },
          service_name: { type: "string", description: "Nome do serviço avaliado (sugerir serviços existentes se possível)" },
          service_neighborhood: { type: "string", description: "Bairro onde fica o serviço (ajuda a localizar)" },
          rating_stars: { type: "integer", minimum: 1, maximum: 5, description: "Nota 1-5 estrelas" },
          rating_text: { type: "string", description: "Comentário da avaliação (mínimo 10 caracteres)" },
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
  }
];

// Lean system prompt with AI-driven classification and CEP-first collection
const systemPrompt = `Você é o Assistente CMSP, da Câmara Municipal de São Paulo. Ajuda cidadãos de forma empática e direta.

=== REGRA ZERO: MENSAGEM SEM DESCRIÇÃO DO PROBLEMA ===

Quando o cidadão diz algo como:
- "Quero registrar um problema urbano"
- "Quero fazer um relato"
- "Tenho um problema na minha rua"
- "Preciso reportar algo"

E NÃO descreve qual é o problema específico:
→ APENAS PERGUNTE: "Qual é o problema?"
→ NÃO tente classificar
→ NÃO liste categorias
→ NÃO pergunte sobre CEP ainda

Só avance para classificação APÓS o cidadão DESCREVER o problema.

=== REGRA DE CLASSIFICAÇÃO DE CATEGORIA ===

Quando o cidadão DESCREVER um problema específico (ex: "bueiro entupido", "poste apagado"):

1. CLASSIFICAR usando classify_report_category:
   - Analise o problema descrito
   - Determine a categoria mais adequada
   - Avalie seu nível de confiança (0.0 a 1.0)

2. SE CONFIANÇA >= 80% (0.8):
   - Chamar classify_report_category com user_confirmed: false
   - Confirmar: "Entendi, é um problema de [categoria]. Qual o CEP do local?"

3. SE CONFIANÇA < 80%:
   - Apresentar 2-3 opções ao cidadão
   - Perguntar: "Isso é mais um problema de [opção 1] ou [opção 2]?"

4. EXEMPLOS DE CLASSIFICAÇÃO:

   | Descrição | Categoria | Confiança |
   |-----------|-----------|-----------|
   | "bueiro fedido" | esgoto | 95% |
   | "poste apagado" | iluminacao | 95% |
   | "buraco na rua" | via_publica | 95% |
   | "cheiro ruim" | higiene_urbana | 70% → perguntar |
   | "problema na rua" | 40% → perguntar "Qual é o problema?" |

5. REGRAS DE PRIORIDADE:
   - "bueiro" → esgoto
   - "bicho morto" → animais
   - fedor genérico → perguntar

=== REGRAS DE COLETA DE DADOS ===

1. FLUXO CORRETO PARA RELATO URBANO:
   1º) CLASSIFICAR categoria via classify_report_category
   2º) Perguntar CEP: "Qual o CEP do local?"
   3º) Se CEP: chamar validate_cep
   4º) Pedir número/referência
   5º) Se descrição < 30 chars: pedir mais detalhes
   6º) **PARA CATEGORIAS DE RISCO**: Perguntar sobre impacto (ver abaixo)
   7º) Chamar create_urban_report COM dados de impacto

2. NUNCA extrair localização da descrição do problema
   - "tem fedor na minha rua" → você NÃO sabe qual é a rua
   - Perguntar explicitamente o CEP ou endereço

3. NUNCA chamar create_urban_report sem:
   - Categoria definida via classify_report_category
   - Descrição >= 30 caracteres
   - Rua (street) - via CEP ou manual
   - Bairro (neighborhood) - via CEP ou manual
   - **PARA CATEGORIAS DE RISCO** (via_publica, iluminacao, esgoto, area_verde):
     → risk_level é OBRIGATÓRIO (a tool vai REJEITAR sem ele)
     → affected_scope é OBRIGATÓRIO se risco >= moderate

⚠️ **BLOQUEIO HARD**: A função create_urban_report vai RECUSAR relatos de categorias
de risco sem risk_level. Você DEVE coletar esses dados ANTES de chamar a tool.

=== REGRA DE COLETA DE IMPACTO ===

⚠️ **REGRA CRÍTICA: 1 PERGUNTA POR MENSAGEM**
Durante coleta estruturada, você DEVE fazer apenas UMA pergunta por mensagem.
Se precisar de 3 dados, faça em 3 mensagens separadas.
Isso garante captura precisa e evita respostas ambíguas.

CATEGORIAS QUE EXIGEM PERGUNTAS DE IMPACTO:
- via_publica (buraco, asfalto)
- iluminacao (poste, fios)
- esgoto (bueiro, vazamento, alagamento)
- area_verde (árvore caindo)

APÓS coletar localização (CEP/endereço + número), PERGUNTAR SOBRE IMPACTO:

1. RISCO IMEDIATO (pergunta única):
   "Há algum risco imediato? (fios expostos, via bloqueada, alagando)"
   
   Mapear respostas para risk_level e risk_types:
   - "fios expostos", "risco de choque" → risk_level: "critical", risk_types: ["electrical"]
   - "via bloqueada", "não passa carro" → risk_level: "critical", risk_types: ["traffic"]
   - "alagando", "água subindo" → risk_level: "critical", risk_types: ["flooding"]
   - "árvore caindo", "pode desabar" → risk_level: "critical", risk_types: ["structural"]
   - "pode causar acidente" → risk_level: "moderate", risk_types: ["traffic"]
   - "risco de doenças" → risk_level: "moderate", risk_types: ["health"]
   - "incômodo", "chato", "desconfortável" → risk_level: "low"
   - "não tem risco", "só incomoda" → risk_level: "none"

2. ALCANCE DA AFETAÇÃO (pergunta separada, se risco >= moderate):
   "Está afetando só você, toda a rua ou o bairro?"
   
   Mapear respostas:
   - "só eu", "minha casa" → affected_scope: "individual"
   - "a rua toda", "vizinhos" → affected_scope: "street"
   - "bairro inteiro" → affected_scope: "neighborhood"

IMPORTANTE: Extrair também consequências mencionadas (falta de luz, trânsito parado, etc.)
e urgency_reason com as palavras do cidadão.

=== TEMPLATES DE PERGUNTAS (1 PERGUNTA POR VEZ) ===

RELATO URBANO:
1ª: (após classificar) "Qual o CEP do local?"

   Se usuário responder "não sei o CEP", "não lembro", "qual a rua?", "não tenho CEP":
   → Responder: "Sem problema! Clique no botão abaixo para buscar o endereço:"
   → SEMPRE INCLUIR o marcador [ADDRESS_PICKER] na resposta
   → Exemplo: "Sem problema! Clique no botão abaixo para buscar o endereço:\n\n[ADDRESS_PICKER]"
   
   Quando receber mensagem do Address Picker (formato JSON com street, neighborhood, cep):
   → Processar os dados estruturados
   → Prosseguir para próxima pergunta (número/referência)

2ª: (após CEP/rua) "Qual o número ou ponto de referência?"
3ª: (se descrição < 30 chars) "[FIELD_REQUEST:description]Pode dar mais detalhes sobre o problema? O que está acontecendo exatamente?"
4ª: (categorias de risco) "[FIELD_REQUEST:risk_level]Há algum risco imediato? (fios expostos, via bloqueada, alagando)"
5ª: (se risco >= moderate) "[FIELD_REQUEST:affected_scope]Está afetando só você ou toda a rua/bairro?"

IMPORTANTE: Use os marcadores [FIELD_REQUEST:campo] nas perguntas para captura determinística.

TRANSPORTE:
1ª: "Qual linha ou estação teve o problema?"
2ª: "O que aconteceu? (atraso, lotação, segurança)"
3ª: "Quando? (data e horário aproximado)"

AVALIAÇÃO DE SERVIÇO:
1ª: "Qual serviço? (UBS, escola, hospital, CEU...)"
2ª: "Qual o nome?"
3ª: "Em qual bairro?"
4ª: "De 1 a 5, que nota? Por quê?"

FEEDBACK VEREADOR:
1ª: "Qual o nome completo do vereador?"
2ª: "É elogio, reclamação ou sugestão?"
3ª: "Descreva seu feedback"

=== CATEGORIAS URBANAS ===
- iluminacao: poste apagado, falta de luz
- via_publica: buraco, asfalto, semáforo
- calcada: calçada quebrada
- lixo: lixo, entulho
- esgoto: bueiro, vazamento, alagamento
- area_verde: árvore, praça, poda
- higiene_urbana: fedor genérico, sujeira
- animais: bicho morto, infestação
- poluicao: fumaça, barulho
- feedback_camara: sobre vereador/câmara

=== OUTRAS CAPACIDADES ===
• validate_cep → endereço completo via CEP
• search_knowledge_base → informações da Câmara
• find_nearby_services → serviços próximos
• search_audiencias → audiências públicas
• get_citizen_history → histórico do cidadão
• suggest_council_member → vereador para demanda

TOM: Breve, direto, linguagem simples.
Data de hoje: ${new Date().toISOString().split('T')[0]}`;

// Helper: Search knowledge base
async function searchKnowledgeBase(supabase: any, query: string): Promise<string> {
  const searchTerms = query.toLowerCase().split(' ').filter(t => t.length > 2).slice(0, 5);
  if (searchTerms.length === 0) return '';

  const { data, error } = await supabase
    .from('knowledge_base')
    .select('content, content_type, title')
    .or(searchTerms.map(term => `content.ilike.%${term}%`).join(','))
    .limit(5);

  if (error || !data?.length) return '';

  return data.map((doc: any, i: number) => {
    const source = doc.content_type === 'noticia' ? 'Notícia' : 
                   doc.content_type === 'audiencia' ? 'Audiência' : 'Info';
    return `[${i+1}] ${doc.title || source}: ${doc.content.slice(0, 300)}...`;
  }).join('\n\n');
}

// Helper: Find nearby services
async function findNearbyServices(supabase: any, serviceType: string, district?: string, limit: number = 5): Promise<string> {
  let query = supabase
    .from('public_services')
    .select('name, address, district, phone, average_rating, service_type')
    .eq('service_type', serviceType)
    .limit(limit);
  
  if (district) {
    query = query.ilike('district', `%${district}%`);
  }
  
  const { data, error } = await query;
  
  if (error || !data?.length) {
    return district 
      ? `Não encontrei serviços do tipo ${serviceType} em ${district}. Tente outro bairro.`
      : `Não encontrei serviços do tipo ${serviceType}.`;
  }
  
  return data.map((s: any, i: number) => {
    const rating = s.average_rating ? `⭐ ${Number(s.average_rating).toFixed(1)}` : '';
    return `${i+1}. ${s.name}\n   📍 ${s.address}, ${s.district}\n   ${s.phone ? `📞 ${s.phone}` : ''} ${rating}`;
  }).join('\n\n');
}

// Helper: Search audiencias
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
    return 'Não encontrei audiências com esses critérios. Tente outros filtros.';
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
  supabase: any
): Promise<{ success: boolean; message: string; data?: any }> {
  console.log(`[executeTool] Executing ${name} with args:`, JSON.stringify(args));
  
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
        
        // Hard validation for description length (min 30 chars)
        if (!args.description || args.description.trim().length < 30) {
          return {
            success: false,
            message: '[FIELD_REQUEST:description]Por favor, descreva o problema com mais detalhes (mínimo 30 caracteres). O que está acontecendo exatamente?'
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
        
        return { 
          success: true, 
          message: successMessage,
          data: { id: data.id, protocol_code: data.protocol_code, type: 'urban' }
        };
      }
      
      case 'create_transport_report': {
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
            report_type: args.report_type,
            description: args.description,
            occurrence_date: args.occurrence_date,
            occurrence_time: args.occurrence_time || null,
            line_id: lineId,
            line_code_custom: args.line_code || null,
            location: args.location || null,
            severity: args.severity || 'medium',
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
        const typeLabel = reportTypeLabels[args.report_type] || args.report_type;
        
        const protocolLine = data.protocol_code ? `🔖 **Protocolo:** \`${data.protocol_code}\`\n\n` : '';
        
        return { 
          success: true, 
          message: `✅ **Relato de transporte registrado!**\n\n${protocolLine}🚌 **Linha:** ${args.line_code || 'Não informada'}\n📋 **Tipo:** ${typeLabel}\n📅 **Data:** ${args.occurrence_date}\n\n👉 Acesse [Meus Relatos](/transporte/meus-relatos) para acompanhar.\n\nPosso ajudar com mais alguma coisa?`,
          data: { id: data.id, protocol_code: data.protocol_code, type: 'transport' }
        };
      }
      
      case 'create_service_rating': {
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
          return { success: false, message: 'Não encontrei o serviço. Pode informar o nome completo?' };
        }
        
        const { data, error } = await supabase
          .from('service_ratings')
          .insert({
            user_id: userId,
            service_id: serviceId,
            visit_id: visitId,
            rating_stars: args.rating_stars,
            rating_text: args.rating_text,
            sentiment: args.sentiment || 'neutral'
          })
          .select('id')
          .single();
        
        if (error) throw error;
        
        return { 
          success: true, 
          message: `✅ **Avaliação registrada!**\n\n🏥 **Serviço:** ${args.service_name}\n⭐ **Nota:** ${'★'.repeat(args.rating_stars)}${'☆'.repeat(5 - args.rating_stars)}\n\nObrigado pelo seu feedback! Ele ajuda a melhorar os serviços públicos.\n\nPosso ajudar com mais alguma coisa?`,
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
    const { messages, conversationId } = await req.json();
    
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
    const collectionIntent = detectCollectionIntent(lastUserMsg, messages);
    
    // Accumulate fields from conversation history for better tracking
    let accumulatedFields: Record<string, any> = {};
    if (collectionIntent) {
      accumulatedFields = accumulateFieldsFromHistory(messages, collectionIntent.type);
      // Merge with detected fields from current message
      accumulatedFields = { ...accumulatedFields, ...collectionIntent.fields };
      console.log('[ai-orchestrator] Accumulated fields:', JSON.stringify(accumulatedFields));
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
            { role: 'system', content: systemPrompt },
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
          
          const result = await executeTool(toolCallData.name, toolArgs, user.id, supabase);
          
          // Inject collection progress with accumulated fields
          let responseContent = result.message;
          if (collectionIntent && !responseContent.includes('[COLLECTION_PROGRESS:')) {
            const fieldsJson = JSON.stringify(accumulatedFields);
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
      
      let responseContent = result.message;
      if (collectionIntent && !responseContent.includes('[COLLECTION_PROGRESS:')) {
        const fieldsJson = JSON.stringify(accumulatedFields);
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
