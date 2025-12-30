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

// Extract urban report-specific fields - SIMPLIFIED: NO automatic location extraction
// PRIORITY ORDER: esgoto > higiene_urbana > iluminacao (prevents "bueiro fedido" → iluminacao)
function extractUrbanFields(context: string): Record<string, any> {
  const fields: Record<string, any> = {};
  
  // PRIORITY 1: Esgoto/bueiro (highest priority - includes "bueiro fedido")
  if (context.includes('esgoto') || context.includes('bueiro') || context.includes('vazamento') || context.includes('alagamento') || context.includes('alagando')) {
    fields.category = 'esgoto';
  }
  // PRIORITY 2: Animals (before hygiene to handle "bicho morto fedendo")
  else if (context.includes('bicho morto') || context.includes('animal morto') || context.includes('rato') || context.includes('barata') || context.includes('infestação') || context.includes('infestacao')) {
    fields.category = 'animais';
  }
  // PRIORITY 3: Urban hygiene (fedor/sujeira when NOT related to esgoto)
  else if (context.includes('fedor') || context.includes('cheiro') || context.includes('fedendo') || context.includes('urina') || context.includes('fezes') || context.includes('sujeira')) {
    fields.category = 'higiene_urbana';
  }
  // PRIORITY 4: Lighting
  else if (context.includes('poste') || context.includes('luz apagad') || context.includes('escuro') || context.includes('iluminaç')) {
    fields.category = 'iluminacao';
  }
  // PRIORITY 5: Roads
  else if (context.includes('buraco') || context.includes('asfalto') || context.includes('semáforo') || context.includes('semaforo')) {
    fields.category = 'via_publica';
  }
  // PRIORITY 6: Sidewalk
  else if (context.includes('calçada') || context.includes('calcada') || context.includes('passeio')) {
    fields.category = 'calcada';
  }
  // PRIORITY 7: Trash
  else if (context.includes('lixo') || context.includes('entulho')) {
    fields.category = 'lixo';
  }
  // PRIORITY 8: Green areas
  else if (context.includes('árvore') || context.includes('arvore') || context.includes('poda') || context.includes('praça') || context.includes('praca') || context.includes('mato')) {
    fields.category = 'area_verde';
  }
  // PRIORITY 9: Pollution
  else if (context.includes('poluição') || context.includes('poluicao') || context.includes('fumaça') || context.includes('fumaca') || context.includes('barulho')) {
    fields.category = 'poluicao';
  }
  
  // Detect CEP pattern
  const cepMatch = context.match(/\b(\d{5}[-]?\d{3})\b/);
  if (cepMatch) {
    fields.cep = cepMatch[1].replace('-', '');
  }
  
  return fields;
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
        const question = msg.content.toLowerCase();
        const answer = nextMsg.content.trim();
        
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
        
        // Extract number/reference from specific question
        if ((question.includes('qual o número') || question.includes('qual é o número') ||
             question.includes('número ou ponto')) && answer.length > 0) {
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
  const urbanDomain = ['buraco', 'poste', 'iluminação', 'iluminacao', 'lixo', 'entulho', 'calçada', 'calcada', 'esgoto', 'árvore', 'arvore', 'poda', 'fedor', 'bicho morto', 'animal morto', 'rato', 'bueiro', 'vazamento', 'sujeira', 'fedendo'];
  const urbanProblems = ['quebrado', 'apagado', 'acumulado', 'vazando', 'caindo', 'fedendo'];
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
      description: "Registra problema urbano ou feedback sobre a Câmara. SOMENTE chamar quando tiver: 1) categoria, 2) descrição (min 15 chars), 3) rua + bairro (via CEP validado ou informados manualmente).",
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
          council_member_party: { type: "string", description: "Para feedback_camara: partido do vereador" }
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

// Lean system prompt with CEP-first collection
const systemPrompt = `Você é o Assistente CMSP, da Câmara Municipal de São Paulo. Ajuda cidadãos de forma empática e direta.

REGRAS CRÍTICAS DE COLETA DE DADOS:

1. PRIORIZAR CEP PARA ENDEREÇO (mais preciso e rápido)
   - Quando cidadão relatar problema urbano, perguntar CEP PRIMEIRO
   - Se cidadão informar CEP (8 dígitos): CHAMAR validate_cep imediatamente
   - Se CEP válido: rua e bairro são preenchidos automaticamente → pular para número
   - Se CEP inválido ou desconhecido: perguntar rua e bairro manualmente

2. NUNCA extrair localização da descrição do problema
   - Se o cidadão disser "tem fedor na minha rua", você NÃO sabe qual é a rua
   - Perguntar: "Qual o CEP do local?" (ou rua/bairro se não souber CEP)
   
3. NUNCA aceitar respostas vagas como localização
   - "na minha rua" → "Qual o CEP do local?"
   - "aqui perto" → "Qual o CEP? (se não souber, me diz a rua e bairro)"
   - "não sei o CEP" → "Qual o nome da rua e bairro?"

4. NUNCA chamar create_urban_report sem ter:
   - Categoria definida
   - Descrição com no mínimo 30 caracteres
   - Nome da rua/avenida (street) - via CEP ou manual
   - Bairro de São Paulo (neighborhood) - via CEP ou manual

5. MANTER A CATEGORIA ORIGINAL
   - Se o cidadão disse "bueiro entupido", a categoria é "esgoto"
   - NÃO mudar para outra categoria nas perguntas seguintes

TEMPLATES DE PERGUNTAS (seguir rigorosamente, UMA POR VEZ):

RELATO URBANO (FLUXO CEP-FIRST):
1ª pergunta: "Qual é o problema? (buraco, poste apagado, lixo, mau cheiro, bicho morto...)"
2ª pergunta: "Qual o CEP do local? (se não souber, me diz a rua e bairro)"
   → Se informar CEP: CHAMAR validate_cep
   → Se CEP válido: confirmar endereço e pedir número
   → Se CEP inválido: "CEP não encontrado. Qual o nome da rua?"
   → Se não souber CEP: "Qual o nome da rua e bairro?"
3ª pergunta: "Qual o número ou ponto de referência?"
4ª pergunta (se descrição < 30 chars): "Pode dar mais detalhes sobre o problema?"
→ Só então chamar create_urban_report

TRANSPORTE:
1ª pergunta: "Qual linha ou estação teve o problema?"
2ª pergunta: "O que aconteceu? (atraso, lotação, segurança, limpeza)"
3ª pergunta: "Quando aconteceu? (data e horário aproximado)"
4ª pergunta (se descrição < 30 chars): "Pode descrever melhor o que aconteceu?"

AVALIAÇÃO DE SERVIÇO:
1ª pergunta: "Qual serviço você quer avaliar? (UBS, escola, hospital, CEU...)"
2ª pergunta: "Qual o nome do serviço?"
3ª pergunta: "Em qual bairro fica?"
4ª pergunta: "De 1 a 5, que nota você dá? Por quê?"

FEEDBACK SOBRE VEREADOR/CÂMARA:
1ª pergunta: "Qual o nome completo do vereador?"
→ Se só primeiro nome: "Qual [Nome]? Temos: [listar opções com partido]"
2ª pergunta: "É um elogio, reclamação ou sugestão?"
3ª pergunta: "Descreva seu feedback (quanto mais detalhes, melhor)"

CATEGORIAS DE PROBLEMAS URBANOS:
- iluminacao: poste apagado, falta de luz, escuro
- via_publica: buraco, asfalto, semáforo
- calcada: calçada quebrada, passeio
- lixo: lixo, entulho acumulado
- esgoto: bueiro ENTUPIDO, vazamento, alagamento
- area_verde: árvore, praça, poda, mato
- higiene_urbana: fedor, sujeira, urina, fezes
- animais: bicho morto, rato, barata, infestação
- poluicao: fumaça, barulho
- feedback_camara: sobre vereador ou câmara

VALIDAÇÃO DE VEREADORES (CRÍTICO):
Lista oficial: Milton Leite (UNIÃO), Rodrigo Goulart (PSD), Celso Giannazi (PSOL), 
Soninha Francine (CIDADANIA), Erika Hilton (PSOL), Amanda Paschoal (PSOL), 
Luna Zarattini (PT), Janaína Lima (PP), José Turin (REPUBLICANOS), José Ferreira (MDB),
Juliana Cardoso (PT), Eduardo Suplicy (PT), Professor Toninho Vespoli (PSOL)...

Se cidadão mencionar só "José", perguntar: "Qual José? José Turin (Republicanos) ou José Ferreira (MDB)?"

OUTRAS CAPACIDADES:
• validate_cep → validar CEP e retornar endereço completo
• search_knowledge_base → informações sobre a Câmara
• find_nearby_services → UBS, escolas, hospitais próximos
• search_audiencias → audiências públicas
• get_citizen_history → histórico do cidadão
• suggest_council_member → sugerir vereador para demanda

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
      case 'validate_cep': {
        const result = await lookupCEP(args.cep);
        if (result.valid) {
          // FIX: Include COLLECTION_PROGRESS marker with validated address data
          const cleanCep = args.cep.replace(/\D/g, '');
          const addressData = { 
            cep: cleanCep,
            street: result.street, 
            neighborhood: result.neighborhood,
            city: result.city,
            state: result.state
          };
          const progressMarker = `[COLLECTION_PROGRESS:urban_report:${JSON.stringify(addressData)}]`;
          
          return {
            success: true,
            message: `${progressMarker}✅ CEP válido! Endereço encontrado:\n📍 ${result.street}\n🏘️ ${result.neighborhood}, ${result.city}/${result.state}\n\nQual o número ou ponto de referência próximo?`,
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
        // FIX: Hard validation for description length (min 30 chars)
        if (!args.description || args.description.trim().length < 30) {
          return {
            success: false,
            message: 'Por favor, descreva o problema com mais detalhes (mínimo 30 caracteres). Como está afetando você ou o local?'
          };
        }
        
        // FIX: Validate required fields
        if (!args.street || !args.neighborhood) {
          return {
            success: false,
            message: 'Preciso saber a rua e o bairro para registrar o relato. Qual o CEP ou endereço do local?'
          };
        }
        
        // FIX: Normalize category based on description (server-side last line of defense)
        let normalizedCategory = args.category;
        const descLower = args.description.toLowerCase();
        if (descLower.includes('bueiro') || descLower.includes('esgoto') || descLower.includes('vazamento') || descLower.includes('alagamento') || descLower.includes('alagando')) {
          normalizedCategory = 'esgoto';
        } else if (descLower.includes('bicho morto') || descLower.includes('animal morto') || descLower.includes('rato') || descLower.includes('infestação')) {
          normalizedCategory = 'animais';
        }
        
        // Build location_address from structured fields
        const locationParts = [];
        if (args.street) locationParts.push(args.street);
        if (args.street_number) locationParts.push(args.street_number);
        if (args.reference_point) locationParts.push(`(${args.reference_point})`);
        if (args.neighborhood) locationParts.push(`- ${args.neighborhood}`);
        const location_address = locationParts.join(' ');
        
        const { data, error } = await supabase
          .from('urban_reports')
          .insert({
            user_id: userId,
            category: normalizedCategory, // Use normalized category
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
            status: 'pending'
          })
          .select('id')
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
        
        // Build success message with CTA
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
        
        return { 
          success: true, 
          message: `[REPORT_CREATED:${data.id}]\n\n✅ **Relato registrado com sucesso!**\n\n📍 **Local:** ${args.street}${args.street_number ? `, ${args.street_number}` : ''} - ${args.neighborhood}\n📋 **Categoria:** ${categoryLabel}\n\n👉 [Ver meus relatos](/relato-urbano/historico) para acompanhar o status.\n\nPosso ajudar com mais alguma coisa?`,
          data: { id: data.id, type: 'urban' }
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
        
        const { data, error } = await supabase
          .from('transport_reports')
          .insert({
            user_id: userId,
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
          .select('id')
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
        
        return { 
          success: true, 
          message: `Relato de transporte registrado! ID: ${data.id.slice(0,8)}`,
          data: { id: data.id, type: 'transport' }
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
          message: `Avaliação registrada! Obrigado pelo feedback sobre ${args.service_name}.`,
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
    
    // Call AI API (Lovable AI Gateway) with streaming enabled
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[ai-orchestrator] API error:', response.status, errorText);
      
      // Handle rate limiting and payment errors
      if (response.status === 429) {
        return new Response(`data: ${JSON.stringify({ choices: [{ delta: { content: 'Desculpe, estamos com muitas solicitações no momento. Tente novamente em alguns segundos.' } }] })}\n\ndata: [DONE]\n\n`, {
          headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' }
        });
      }
      if (response.status === 402) {
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
      
      // Read the entire stream first to check for tool calls
      let textBuffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });
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
          
          return new Response(`data: ${ssePayload}\n\ndata: [DONE]\n\n`, {
            headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' }
          });
        } catch (e) {
          console.error('[ai-orchestrator] Tool execution error:', e);
          const errorPayload = JSON.stringify({
            choices: [{ delta: { content: 'Desculpe, houve um erro ao processar sua solicitação. Pode tentar novamente?' } }]
          });
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
    
    return new Response(`data: ${ssePayload}\n\ndata: [DONE]\n\n`, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' }
    });
    
  } catch (error) {
    console.error('[ai-orchestrator] Error:', error);
    return new Response(JSON.stringify({
      content: 'Desculpe, tive um problema técnico. Pode tentar novamente?',
      success: false,
      error: (error as Error).message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
