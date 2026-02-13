import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

import * as lib from "./lib.ts";

serve(async (req) => {
  const requestStartTime = Date.now();
  console.log('[ai-orchestrator] ========== REQUEST RECEIVED ==========');
  console.log('[ai-orchestrator] DEPLOY VERSION: 2026-01-31-v4 (deteccao deterministica ANTES do short-circuit)');
  console.log('[ai-orchestrator] Request started at', new Date().toISOString());
  console.log('[ai-orchestrator] Method:', req.method);
  console.log('[ai-orchestrator] URL:', req.url);

  if (req.method === 'OPTIONS') {
    console.log('[ai-orchestrator] OPTIONS request, returning CORS headers');
    return new Response(null, { status: 204, headers: lib.corsHeaders });
  }

  try {
    // === AI Provider Configuration (load first to check env) ===
    console.log('[ai-orchestrator] Loading environment variables...');
    const aiChatBaseUrl = Deno.env.get('AI_CHAT_BASE_URL');
    const aiChatApiKey = Deno.env.get('AI_CHAT_API_KEY');
    const aiBaseUrl = Deno.env.get('AI_BASE_URL');
    const aiApiKey = Deno.env.get('AI_API_KEY');
    const aiChatModel = Deno.env.get('AI_CHAT_MODEL') || 'meta-llama/Meta-Llama-3.1-8B-Instruct';
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    console.log('[ai-orchestrator] Environment check:', {
      hasAiChatBaseUrl: !!aiChatBaseUrl,
      hasAiBaseUrl: !!aiBaseUrl,
      hasSupabaseUrl: !!supabaseUrl,
      hasSupabaseAnonKey: !!supabaseAnonKey,
      aiChatModel,
      supabaseUrl: supabaseUrl ? supabaseUrl.substring(0, 50) + '...' : 'missing',
      supabaseAnonKeyLength: supabaseAnonKey?.length || 0
    });
    
    // Determine which AI provider to use
    let finalAiBaseUrl = aiChatBaseUrl || aiBaseUrl;
    let finalAiApiKey = aiChatApiKey || aiApiKey;

    // Vertex AI: obter token de um endpoint (ex.: GCP Cloud Function) quando configurado
    const vertexTokenUrl = Deno.env.get('VERTEX_TOKEN_URL');
    const vertexTokenSecret = Deno.env.get('VERTEX_TOKEN_SECRET');
    const vertexRagDatastore = Deno.env.get('VERTEX_RAG_DATASTORE'); // Vertex AI Search datastore path (optional)
    const vertexRagCorpus = Deno.env.get('VERTEX_RAG_CORPUS');       // RAG Engine corpus path (optional)
    if (vertexTokenUrl && vertexTokenSecret) {
      try {
        const tokenRes = await fetch(vertexTokenUrl, {
          method: 'GET',
          headers: { 'X-Token-Secret': vertexTokenSecret },
        });
        if (tokenRes.ok) {
          const data = (await tokenRes.json()) as { token?: string };
          if (data?.token) {
            finalAiApiKey = data.token;
            console.log('[ai-orchestrator] Vertex token obtained from', vertexTokenUrl);
          } else {
            console.warn('[ai-orchestrator] Vertex token URL returned OK but no token in body');
          }
        } else {
          console.warn('[ai-orchestrator] Vertex token URL returned', tokenRes.status, await tokenRes.text());
        }
      } catch (e) {
        console.warn('[ai-orchestrator] VERTEX_TOKEN_URL fetch failed:', (e as Error).message);
      }
    }
    
    if (!finalAiBaseUrl || !supabaseUrl || !supabaseAnonKey) {
      console.error('[ai-orchestrator] Missing required environment variables');
      console.error('[ai-orchestrator] Missing:', {
        aiChatBaseUrl: !aiChatBaseUrl,
        aiBaseUrl: !aiBaseUrl,
        supabaseUrl: !supabaseUrl,
        supabaseAnonKey: !supabaseAnonKey
      });
      const errorMsg = `⚠️ Assistente IA indisponível neste ambiente.\n\n` +
        `Faltam configurações na Edge Function: **AI_CHAT_BASE_URL** (ou AI_BASE_URL) e **SUPABASE_URL**.\n\n` +
        `Configure os secrets do Supabase e tente novamente.`;
      const ssePayload = JSON.stringify({
        choices: [{ delta: { content: errorMsg } }]
      });
      return new Response(`data: ${ssePayload}\n\ndata: [DONE]\n\n`, {
        headers: { ...lib.corsHeaders, 'Content-Type': 'text/event-stream' }
      });
    }
    
    console.log('[ai-orchestrator] Using AI provider:', finalAiBaseUrl);
    
    // === AUTHENTICATION: Validate user FIRST before parsing body ===
    console.log('[ai-orchestrator] Validating authentication...');
    const authHeader = req.headers.get('Authorization');
    console.log('[ai-orchestrator] Authorization header present:', !!authHeader);
    console.log('[ai-orchestrator] Authorization header length:', authHeader?.length || 0);
    console.log('[ai-orchestrator] Authorization header starts with Bearer:', authHeader?.startsWith('Bearer ') || false);
    
    if (!authHeader) {
      console.error('[ai-orchestrator] Missing authorization header');
      return new Response(
        JSON.stringify({ error: 'Missing authorization header. Please log in again.' }),
        { status: 401, headers: { ...lib.corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!authHeader.startsWith('Bearer ')) {
      console.error('[ai-orchestrator] Authorization header does not start with Bearer');
      return new Response(
        JSON.stringify({ error: 'Invalid authorization header format. Please log in again.' }),
        { status: 401, headers: { ...lib.corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Extract token for logging (first 20 chars only for security)
    const tokenPreview = authHeader.substring(7, 27);
    console.log('[ai-orchestrator] Token preview:', tokenPreview + '...');
    console.log('[ai-orchestrator] Full auth header length:', authHeader.length);
    console.log('[ai-orchestrator] Token length (without Bearer):', authHeader.length - 7);
    
    // Try to decode token to check if it's valid JWT format
    try {
      const token = authHeader.substring(7); // Remove "Bearer "
      const parts = token.split('.');
      console.log('[ai-orchestrator] JWT parts count:', parts.length);
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]));
        console.log('[ai-orchestrator] Token payload (safe):', {
          exp: payload.exp,
          iat: payload.iat,
          iss: payload.iss,
          sub: payload.sub,
          aud: payload.aud,
          now: Math.floor(Date.now() / 1000),
          isExpired: payload.exp ? payload.exp < Math.floor(Date.now() / 1000) : 'unknown'
        });
      }
    } catch (decodeError) {
      console.warn('[ai-orchestrator] Could not decode token:', decodeError);
    }
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    
    console.log('[ai-orchestrator] Verifying user authentication...');
    console.log('[ai-orchestrator] Using Supabase URL:', supabaseUrl);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.error('[ai-orchestrator] Auth error:', {
        message: authError.message,
        status: authError.status,
        name: authError.name
      });
      return new Response(
        JSON.stringify({ 
          code: 401,
          message: authError.message || 'Authentication failed. Please log in again.' 
        }),
        { status: 401, headers: { ...lib.corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!user) {
      console.error('[ai-orchestrator] No user found after authentication');
      return new Response(
        JSON.stringify({ 
          code: 401,
          message: 'User not found. Please log in again.' 
        }),
        { status: 401, headers: { ...lib.corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('[ai-orchestrator] User authenticated:', user.id);
    
    // === Parse request body AFTER authentication ===
    console.log('[ai-orchestrator] Parsing request body...');
    let requestBodyData: any;
    try {
      requestBodyData = await req.json();
      console.log('[ai-orchestrator] Request parsed successfully');
    } catch (parseError) {
      console.error('[ai-orchestrator] Failed to parse request body:', parseError);
      console.error('[ai-orchestrator] Request body might be empty or invalid JSON');
      return new Response(
        JSON.stringify({ error: 'Invalid request body. Expected JSON.' }),
        { status: 400, headers: { ...lib.corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const { messages, conversationId, collectionType: frontendCollectionType } = requestBodyData;
    console.log('[ai-orchestrator] Request parsed successfully. Messages count:', messages?.length || 0);
    
    // Log frontend collection type for debugging
    if (frontendCollectionType) {
      console.log('[ai-orchestrator] Frontend collectionType received:', frontendCollectionType);
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
    let collectionIntent: lib.CollectionIntent | null = null;
    
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
          fields: lib.accumulateFieldsFromHistory(messages, frontendCollectionType),
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
      const detectedIntent = lib.detectCollectionIntent(lastUserMsg, messages);
      
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
        const existingFields = lib.accumulateFieldsFromHistory(messages, frontendCollectionType);
        const rawFieldKeys = Object.keys(existingFields).filter(k => !k.startsWith('_'));
        let meaningfulFieldCount = rawFieldKeys.length;
        
        // Treat generic "intent phrases" as NOT real progress
        if (existingFields.description && lib.isGenericIntentText(String(existingFields.description))) {
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
          { headers: { ...lib.corsHeaders, 'Content-Type': 'text/event-stream' } }
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
        const detectedIntent = lib.detectCollectionIntent(lastUserMsg, messages);
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
            { headers: { ...lib.corsHeaders, 'Content-Type': 'text/event-stream' } }
          );
        } else {
          // Can't determine target - stay in light journey
          collectionIntent = { type: frontendCollectionType as lib.CollectionIntent['type'], fields: {} };
        }
      } else {
        // Stay in light journey - pass through to AI without deterministic flow
        collectionIntent = { type: frontendCollectionType as lib.CollectionIntent['type'], fields: {} };
      }
    } else {
      // Fallback: detect intent from message content
      collectionIntent = lib.detectCollectionIntent(lastUserMsg, messages);
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
        accumulatedFields = lib.accumulateFieldsFromHistory(messages, collectionIntent.type);
        // Merge with detected fields from current message
        accumulatedFields = { ...accumulatedFields, ...collectionIntent.fields };
      }
      
      // ========== AUTO-LOOKUP CEP ==========
      // If we have CEP but missing street/neighborhood, auto-resolve via ViaCEP
      if (accumulatedFields.cep && (!accumulatedFields.street || !accumulatedFields.neighborhood)) {
        const cepLookup = await lib.lookupCEP(accumulatedFields.cep);
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
    let dynamicSystemPrompt = lib.systemPrompt;
    
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
        const isGeneric = lib.isGenericIntentText(description);
        const descToCheck = isGeneric ? '' : description;
        const isValidDesc = lib.isValidDomainDescription(descToCheck, 'urban');
        
        console.log('[getNextMissingField] Urban description check:', {
          description: description.substring(0, 40),
          isGeneric,
          isValidDesc
        });
        
        if (!isValidDesc)
          return { field: 'description', picker: null, prompt: '**O que está acontecendo?** Me conta o problema.' };
        
        // 2. CATEGORY + SUBCATEGORY - try auto-classification with intuitive label, fallback to 'outro'
        if (!fields.category) {
          const description = (fields.description || '').toLowerCase();
          
          // CRITICAL: Check for urgent/grave problems first (security, violence, drugs, noise)
          if (/(armado|arma|armas|drogas?|tráfico|trafico|violência|violencia|agressão|agressao|baderna|funkeiros?)/i.test(description)) {
            // Security/violence issues - classify as 'poluicao' (noise/disturbance) or 'outro' (security)
            if (/(barulho|som|música|música|festa|balada|ruído|ruido)/i.test(description)) {
              fields.category = 'poluicao';
              fields.subcategory = 'Perturbação Sonora com Risco';
              fields._auto_classified = true;
              fields._urgent_content = true;
              console.log('[getNextMissingField] Auto-classified as poluicao (urgent noise/disturbance)');
            } else {
              fields.category = 'outro';
              fields.subcategory = 'Questão de Segurança';
              fields._auto_classified = true;
              fields._urgent_content = true;
              console.log('[getNextMissingField] Auto-classified as outro (security issue)');
            }
          } else {
            // Try to auto-classify from description
            const autoClass = lib.autoClassifyCategory(fields.description || '');
            
            if (autoClass.category && autoClass.confidence >= 0.8) {
            // High confidence - auto-set category AND subcategory label
            fields.category = autoClass.category;
            fields.subcategory = autoClass.suggestedLabel || lib.generateLabelFromDescription(fields.description || '');
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
            fields._pending_subcategory = autoClass.suggestedLabel || lib.generateLabelFromDescription(fields.description || '');
            return { field: 'category', picker: null, prompt: `[FIELD_REQUEST:category]Parece ser **${intuitiveName}**. Confirma? (sim/não, ou diga outro tipo)` };
          } else {
            // Low confidence - check if we already asked once
            const alreadyAskedCategory = fields._asked_category === true;
            
            if (alreadyAskedCategory) {
              // FALLBACK: Already asked and still no match - use 'outro' with generated label
              fields.category = 'outro';
              fields.subcategory = lib.generateLabelFromDescription(fields.description || '');
              fields._fallback_category = true;
              console.log('[getNextMissingField] Fallback to outro with label:', fields.subcategory);
            } else {
              // First time - ask with expanded options including "outro"
              fields._asked_category = true;
              return { field: 'category', picker: null, prompt: 'Qual **tipo de problema** é esse? (iluminação, buraco, esgoto, lixo, barulho, ou descreva o problema)' };
            }
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
            const autoClass = lib.autoClassifyCategory(fields.description || '');
            fields.subcategory = autoClass.suggestedLabel || lib.generateLabelFromDescription(fields.description || '');
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
            const autoRisk = lib.autoInferRisk(fields.description || '');
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
        const isGeneric = lib.isGenericIntentText(description);
        const descToCheck = isGeneric ? '' : description;
        const isValidDesc = lib.isValidDomainDescription(descToCheck, 'transport');
        
        console.log('[getNextMissingField] Transport description check:', {
          description: description.substring(0, 40),
          isGeneric,
          isValidDesc
        });
        
        // If no valid description yet, ask for it
        if (!isValidDesc)
          return { field: 'description', picker: null, prompt: '**O que aconteceu?** Me conta o problema.' };
        
        // 2. Report type - TRY AUTO-INFERENCE from description using FUZZY MATCHING
        // If can't infer, use 'outro' with generated label (NEVER block the flow)
        if (!fields.report_type) {
          // First try the new fuzzy inference
          const fuzzyInferredType = lib.inferTransportTypeFromText(description);
          if (fuzzyInferredType) {
            fields.report_type = fuzzyInferredType;
            console.log('[getNextMissingField] Fuzzy-inferred transport report_type:', fields.report_type);
          } else {
            // Fallback to extractTransportFields for exact matching
            const inferredFields = lib.extractTransportFields(description.toLowerCase());
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
        if (!fields.line_code)
          return { field: 'line_code', picker: '[LINE_PICKER]', prompt: 'Qual **linha ou estação** teve o problema?' };
        
        // 4. Date (REQUIRED - user must confirm)
        if (!fields.occurrence_date)
          return { field: 'occurrence_date', picker: '[DATE_PICKER]', prompt: '**Quando isso aconteceu?** (hoje, ontem, ou me diz a data)' };
        
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
        if (!fields.rating_stars || fields.rating_stars < 1 || fields.rating_stars > 5)
          return { field: 'rating_stars', picker: '[RATING_PICKER]', prompt: 'Qual **nota de 1 a 5** você dá para o atendimento?' };
        
        // 5. Rating text
        const textLen = (fields.rating_text || '').length;
        if (textLen < 10)
          return { field: 'rating_text', picker: null, prompt: 'Pode **descrever sua experiência**? Como foi o atendimento?' };
        
        // All required fields collected
        return { field: null, picker: null, prompt: null };
      }
      
      // === LIGHT JOURNEY: services (busca de serviços próximos) ===
      // Ordem: 1) como informar localização (GPS / cadastrado / digitar), 2) se manual → CEP/endereço, 3) se GPS → aguardar coords, 4) tipo de serviço
      if (collectionType === 'services') {
        if (!fields.location_method) {
          return { field: 'location_method', picker: '[LOCATION_METHOD_PICKER]', prompt: '[FIELD_REQUEST:location_method]Como você quer informar sua localização para buscar serviços próximos?' };
        }
        if (fields.location_method === 'manual') {
          const hasCep = !!(fields.cep && String(fields.cep).replace(/\D/g, '').length === 8);
          const hasAddress = !!(fields.street && fields.neighborhood);
          if (!hasCep && !hasAddress) {
            return { field: 'cep', picker: '[ADDRESS_PICKER]', prompt: '[FIELD_REQUEST:cep]Qual seu CEP ou endereço? (Digite o CEP ou a rua e o bairro.)' };
          }
        }
        if (fields.location_method === 'gps' && (fields.user_lat == null || fields.user_lon == null)) {
          return { field: 'gps_coords', picker: null, prompt: '[FIELD_REQUEST:gps_coords]Permita o acesso à sua localização no navegador (e no celular, se pedir). Depois confirme para continuar.' };
        }
        if (!fields.service_type) {
          return { field: 'service_type', picker: '[SERVICE_TYPE_PICKER]', prompt: '[FIELD_REQUEST:service_type]Qual tipo de serviço você está procurando? (UBS, escola, hospital, CEU, biblioteca...)' };
        }
        return { field: null, picker: null, prompt: null };
      }
      
      // Unknown collection type
      return { field: null, picker: null, prompt: null };
    }
    
    // Compute next field ONCE
    let nextFieldInfo: { field: string | null; picker: string | null; prompt: string | null } = { field: null, picker: null, prompt: null };
    
    // === LIGHT JOURNEY MARKER ===
    let lightJourneyMarker = '';
    if (collectionIntent && LIGHT_JOURNEY_TYPES.includes(collectionIntent.type)) {
      lightJourneyMarker = `[LIGHT_JOURNEY:${collectionIntent.type}]`;
      console.log('[ai-orchestrator] Will emit light journey marker:', lightJourneyMarker);
    }
    
    // === PEDIDO DE ROTA (antes do bloco services para não chamar find_nearby de novo) ===
    const lastUserMessage = messages.filter((m: any) => m.role === 'user').pop()?.content || '';
    const msgLower = lastUserMessage.toLowerCase().trim();
    const lastAssistantMessage = messages.filter((m: any) => m.role === 'assistant').pop()?.content || '';
    const lastAssistantLower = lastAssistantMessage.toLowerCase();
    const justShowedServicesList = lastAssistantLower.includes('quer que eu calcule a rota') || lastAssistantLower.includes('opções mais próximas') || lastAssistantLower.includes('opções mais próximas de');
    const wantsRoute = /(calcule?\s+a\s+rota|calcular\s+rota|rota\s+para|quero\s+a\s+rota)/i.test(lastUserMessage) || lastUserMessage.includes(' | ');
    let destinationAddress = '';
    if (lastUserMessage.includes(' | ')) {
      destinationAddress = lastUserMessage.split(' | ').pop()?.trim() || lastUserMessage.trim();
    } else if (/rota\s+para\s+(.+)/i.test(lastUserMessage)) {
      destinationAddress = lastUserMessage.replace(/rota\s+para\s+/i, '').trim();
    } else if (wantsRoute && lastUserMessage.trim().length > 5) {
      destinationAddress = lastUserMessage.replace(/^(calcule?\s+a\s+rota\s+para?\s*|calcular\s+rota\s+para?\s*)/i, '').trim();
    }
    if (justShowedServicesList && wantsRoute && destinationAddress) {
      let originLat: number | null = null;
      let originLon: number | null = null;
      // Helper: content pode ser string ou array OpenAI-style [{ type: 'text', text: '...' }]
      const getMessageText = (m: any): string => {
        const raw = m?.content;
        if (typeof raw === 'string') return raw;
        if (Array.isArray(raw)) {
          const part = raw.find((p: any) => p?.type === 'text' && p?.text);
          return part ? String(part.text) : '';
        }
        return '';
      };
      // 1) Prioridade: coordenadas na conversa ("Localização GPS: lat,lon") ou accumulatedFields (services)
      const allMessages = [...messages].reverse(); // mais recente primeiro
      for (const m of allMessages) {
        const c = getMessageText(m).trim();
        if (!c) continue;
        const hasGpsHint = /Localiza[cç][aã]o\s*GPS/i.test(c) || /localiza[cç][aã]o\s*gps/i.test(c);
        const coordMatch = c.match(/Localiza[cç][aã]o\s*GPS\s*[-:]?\s*(-?[\d.]+)\s*[,，]\s*(-?[\d.]+)/i)
          || (hasGpsHint ? c.match(/(-?[\d.]+)\s*[,，]\s*(-?[\d.]+)/) : null)
          || c.match(/(-?[\d.]+)\s*[,，]\s*(-?[\d.]+)/);
        if (coordMatch) {
          const lat = parseFloat(coordMatch[1].trim());
          const lon = parseFloat(coordMatch[2].trim());
          if (!Number.isNaN(lat) && !Number.isNaN(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
            originLat = lat;
            originLon = lon;
            console.log('[ai-orchestrator] Route origin from conversation GPS:', originLat, originLon);
            break;
          }
        }
      }
      if ((originLat == null || originLon == null) && accumulatedFields.user_lat != null && accumulatedFields.user_lon != null) {
        originLat = Number(accumulatedFields.user_lat);
        originLon = Number(accumulatedFields.user_lon);
        console.log('[ai-orchestrator] Route origin from accumulatedFields (user_lat/user_lon):', originLat, originLon);
      }
      if (originLat == null || originLon == null) {
        const { data: addr } = await supabase.from('user_addresses').select('latitude, longitude').eq('user_id', user.id).eq('is_primary', true).maybeSingle();
        if (addr?.latitude != null && addr?.longitude != null) {
          originLat = Number(addr.latitude);
          originLon = Number(addr.longitude);
          console.log('[ai-orchestrator] Route origin from user_addresses (fallback)');
        }
      }
      if (originLat != null && originLon != null) {
        const routeUrl = lib.buildGoogleMapsDirectionsUrl(originLat, originLon, destinationAddress);
        const routeMessage = `Aqui está a rota até **${destinationAddress}**:\n\n🗺️ [Abrir no Google Maps](${routeUrl})\n\nO link abre o trajeto da sua localização até o endereço. Posso ajudar em mais alguma coisa?`;
        const ssePayload = JSON.stringify({ choices: [{ delta: { content: routeMessage } }] });
        console.log('[ai-orchestrator] Route link generated, origin:', originLat, originLon);
        return new Response(`data: ${ssePayload}\n\ndata: [DONE]\n\n`, {
          headers: { ...lib.corsHeaders, 'Content-Type': 'text/event-stream' }
        });
      }
    }
    
    // === DÚVIDAS SOBRE A CÂMARA (general): saudação adequada, não relato de problema ===
    if (collectionIntent?.type === 'general') {
      const isDuvidaOpener = /d[uú]vida|pergunta|como funciona|quero saber|informa[cç][aã]o/i.test(lastUserMessage);
      if (isDuvidaOpener && messages.filter((m: any) => m.role === 'user').length <= 1) {
        const greeting = `[LIGHT_JOURNEY:general]Claro! Pode perguntar sobre a Câmara Municipal: funcionamento, audiências, vereadores, processos ou qualquer outra dúvida. Qual sua pergunta?`;
        const ssePayload = JSON.stringify({ choices: [{ delta: { content: greeting } }] });
        return new Response(`data: ${ssePayload}\n\ndata: [DONE]\n\n`, {
          headers: { ...lib.corsHeaders, 'Content-Type': 'text/event-stream' }
        });
      }
    }
    
    if (collectionIntent && ['urban_report', 'transport_report', 'service_rating', 'services'].includes(collectionIntent.type)) {
      nextFieldInfo = getNextMissingField(collectionIntent.type, accumulatedFields);
      console.log('[ai-orchestrator] Deterministic next field:', nextFieldInfo.field);
      
      // === CRITICAL FIX: Auto-call create function when all fields are ready ===
      // Since vLLM doesn't have tool calling, we need to call it deterministically
      if (!nextFieldInfo.field && accumulatedFields) {
        console.log('[ai-orchestrator] All fields collected, auto-calling create function for:', collectionIntent.type);
        
        let toolResult;
        try {
          if (collectionIntent.type === 'urban_report') {
            // Build args from accumulated fields
            const toolArgs = {
              category: accumulatedFields.category,
              subcategory: accumulatedFields.subcategory,
              description: accumulatedFields.description,
              cep: accumulatedFields.cep,
              street: accumulatedFields.street,
              street_number: accumulatedFields.street_number,
              reference_point: accumulatedFields.reference_point,
              neighborhood: accumulatedFields.neighborhood,
              risk_level: accumulatedFields.risk_level,
              risk_types: accumulatedFields.risk_types,
              affected_scope: accumulatedFields.affected_scope,
              affected_estimate: accumulatedFields.affected_estimate,
              active_consequences: accumulatedFields.active_consequences,
              urgency_reason: accumulatedFields.urgency_reason,
              council_member_name: accumulatedFields.council_member_name,
              council_member_party: accumulatedFields.council_member_party
            };
            toolResult = await lib.executeTool('create_urban_report', toolArgs, user.id, supabase, accumulatedFields);
          } else if (collectionIntent.type === 'transport_report') {
            const toolArgs = {
              description: accumulatedFields.description,
              report_type: accumulatedFields.report_type,
              line_code: accumulatedFields.line_code,
              occurrence_date: accumulatedFields.occurrence_date,
              occurrence_time: accumulatedFields.occurrence_time,
              location: accumulatedFields.location,
              severity: accumulatedFields.severity,
              impact_description: accumulatedFields.impact_description,
              subcategory_label: accumulatedFields.subcategory_label
            };
            toolResult = await lib.executeTool('create_transport_report', toolArgs, user.id, supabase, accumulatedFields);
          } else if (collectionIntent.type === 'service_rating') {
            const toolArgs = {
              service_type: accumulatedFields.service_type,
              service_name: accumulatedFields.service_name,
              service_neighborhood: accumulatedFields.service_neighborhood,
              service_address_confirmed: accumulatedFields.service_address_confirmed || accumulatedFields._address_reconfirmed,
              rating_stars: accumulatedFields.rating_stars,
              rating_text: accumulatedFields.rating_text,
              sentiment: accumulatedFields.sentiment
            };
            toolResult = await lib.executeTool('create_service_rating', toolArgs, user.id, supabase, accumulatedFields);
          }
          
          if (toolResult && toolResult.success) {
            // Inject collection progress and return tool result
            let responseContent = toolResult.message;
            
            // Add light journey marker if applicable
            if (lightJourneyMarker && !responseContent.includes('[LIGHT_JOURNEY:')) {
              responseContent = lightJourneyMarker + responseContent;
            }
            
            // Add collection progress marker (empty fields since journey is complete)
            if (!responseContent.includes('[COLLECTION_PROGRESS:')) {
              responseContent = `[COLLECTION_PROGRESS:${collectionIntent.type}:{}]${responseContent}`;
            }
            
            const ssePayload = JSON.stringify({
              choices: [{ delta: { content: responseContent } }]
            });
            
            console.log('[ai-orchestrator] Request completed in', Date.now() - requestStartTime, 'ms (auto-create)');
            return new Response(`data: ${ssePayload}\n\ndata: [DONE]\n\n`, {
              headers: { ...lib.corsHeaders, 'Content-Type': 'text/event-stream' }
            });
          } else if (toolResult && !toolResult.success) {
            // Tool validation failed - continue to LLM to ask for missing field
            console.log('[ai-orchestrator] Auto-create validation failed, continuing to LLM:', toolResult.message);
            // Update nextFieldInfo to ask for the missing field
            // The tool result message should contain [FIELD_REQUEST:...] markers
            nextFieldInfo = { field: null, picker: null, prompt: toolResult.message };
          }
        } catch (error) {
          console.error('[ai-orchestrator] Auto-create error:', error);
          // Continue to LLM on error
        }
      }
    }
    
    // === LIGHT JOURNEY: services — resposta determinística (perguntar tipo → CEP) ou chamar find_nearby_services
    if (collectionIntent?.type === 'services') {
      if (nextFieldInfo.field && nextFieldInfo.prompt) {
        let responseContent = lightJourneyMarker + '[COLLECTION_PROGRESS:services:' + JSON.stringify(accumulatedFields) + ']' + nextFieldInfo.prompt;
        if (nextFieldInfo.picker) {
          responseContent += '\n\n' + nextFieldInfo.picker;
        }
        const ssePayload = JSON.stringify({
          choices: [{ delta: { content: responseContent } }]
        });
        console.log('[ai-orchestrator] Services: deterministic ask', nextFieldInfo.field);
        return new Response(`data: ${ssePayload}\n\ndata: [DONE]\n\n`, {
          headers: { ...lib.corsHeaders, 'Content-Type': 'text/event-stream' }
        });
      }
      if (!nextFieldInfo.field && accumulatedFields.service_type) {
        const method = accumulatedFields.location_method;
        const hasCep = !!(accumulatedFields.cep && String(accumulatedFields.cep).replace(/\D/g, '').length === 8);
        const hasAddress = !!(accumulatedFields.street && accumulatedFields.neighborhood);
        const hasGpsCoords = method === 'gps' && accumulatedFields.user_lat != null && accumulatedFields.user_lon != null;
        const hasLocation = (method === 'manual' && (hasCep || hasAddress)) || method === 'registered_address' || hasGpsCoords;
        if (hasLocation) {
          const district = accumulatedFields.neighborhood || undefined;
          const toolArgs: Record<string, unknown> = {
            service_type: accumulatedFields.service_type,
            district,
            limit: 10
          };
          if (hasGpsCoords) {
            toolArgs.user_lat = accumulatedFields.user_lat;
            toolArgs.user_lon = accumulatedFields.user_lon;
          }
          let toolResult: { success: boolean; message: string } | null = null;
          try {
            toolResult = await lib.executeTool('find_nearby_services', toolArgs, user.id, supabase, accumulatedFields);
          } catch (e) {
            console.error('[ai-orchestrator] find_nearby_services error:', e);
          }
          if (toolResult?.success) {
            const responseContent = (lightJourneyMarker || '') + '[COLLECTION_PROGRESS:services:{}]' + toolResult.message;
            const ssePayload = JSON.stringify({
              choices: [{ delta: { content: responseContent } }]
            });
            console.log('[ai-orchestrator] Services: find_nearby_services completed');
            return new Response(`data: ${ssePayload}\n\ndata: [DONE]\n\n`, {
              headers: { ...lib.corsHeaders, 'Content-Type': 'text/event-stream' }
            });
          }
        }
      }
    }
    
    if (collectionIntent && Object.keys(accumulatedFields).length > 0) {
      const fieldsList = Object.entries(accumulatedFields)
        .filter(([k, v]) => v && (typeof v === 'string' ? v.length > 0 : true))
        .map(([k, v]) => `• ${k}: ${String(v).substring(0, 100)}`)
        .join('\n');
      
      // Check if description contains urgent/grave problems for empathy context
      const description = accumulatedFields.description || '';
      const descLower = description.toLowerCase();
      const hasUrgentContent = /(armado|arma|armas|drogas?|tráfico|trafico|violência|violencia|agressão|agressao|baderna|funkeiros?|perigo|risco iminente)/i.test(descLower);
      const empathyNote = hasUrgentContent ? '\n\n⚠️ **ATENÇÃO - PROBLEMA GRAVE DETECTADO:**\nA descrição menciona situações de risco, violência, armas ou drogas. SEMPRE:\n1. Reconheça a gravidade e seja empático\n2. NÃO pergunte "qual tipo de problema" de forma genérica - já temos a descrição\n3. Se precisar de categoria, classifique automaticamente como "poluicao" (barulho) ou "outro" (segurança) baseado na descrição\n4. Mantenha tom empático e preocupado, mas eficiente\n' : '';
      
      const collectionContext = `

=== CONTEXTO ATUAL DA COLETA ===

**Jornada ativa:** ${collectionIntent.type}
**Campos JÁ COLETADOS (NÃO PERGUNTAR NOVAMENTE):**
${fieldsList}
${nextFieldInfo.field ? `\n**PRÓXIMO CAMPO A PEDIR:** ${nextFieldInfo.field}\n**PERGUNTA SUGERIDA:** ${nextFieldInfo.prompt || ''}` : '\n**STATUS:** Todos os campos obrigatórios foram coletados. Chame a ferramenta de criação para finalizar.'}
${empathyNote}
**REGRAS CRÍTICAS:**
1. NUNCA pergunte por campos já listados acima (cep, street, neighborhood, category, line_code, etc.)
2. Se o usuário já deu CEP, rua e bairro estão resolvidos via auto-lookup - NÃO peça novamente
3. Se o usuário deu rua E bairro manualmente, localização está completa - NÃO peça CEP
4. Pergunte APENAS o próximo campo listado acima
5. Seja DIRETO: uma pergunta curta por mensagem
6. Se a descrição já contém detalhes suficientes, NÃO pergunte "qual tipo de problema" - classifique automaticamente
===`;
      
      dynamicSystemPrompt = lib.systemPrompt + '\n\n' + collectionContext;
      console.log('[ai-orchestrator] Injected collection context. Next field:', nextFieldInfo.field, hasUrgentContent ? '(URGENT CONTENT DETECTED)' : '');
    }
    
    // ========== DETERMINISTIC SHORT-CIRCUIT ==========
    // If we have a structured journey and know the next field, respond directly without LLM
    // This prevents the LLM from re-asking already collected fields
    // === DETERMINISTIC SERVICE ADDRESS LOOKUP ===
    // "Qual o endereço do CEU Butantã?" → busca no banco e retorna o endereço correto (não deixa a LLM inventar)
    const addressLookupMatch = msgLower.match(/(?:qual\s+(?:é\s+)?o\s+)?(?:endere[cç]o\s+(?:do\s+|de\s+)?|onde\s+fica\s+)(.+?)(?:\?|\.|$)/i);
    const serviceNameForAddress = addressLookupMatch?.[1]?.trim();
    if (serviceNameForAddress && serviceNameForAddress.length >= 3) {
      const addressFromDb = await lib.getServiceAddressByName(supabase, serviceNameForAddress);
      if (addressFromDb) {
        console.log('[ai-orchestrator] Service address from DB for:', serviceNameForAddress);
        const ssePayload = JSON.stringify({
          choices: [{ delta: { content: addressFromDb } }]
        });
        return new Response(`data: ${ssePayload}\n\ndata: [DONE]\n\n`, {
          headers: { ...lib.corsHeaders, 'Content-Type': 'text/event-stream' }
        });
      }
    }
    
    // === DETERMINISTIC FIND NEARBY SERVICES (substitui tool calling para garantir endereços do banco) ===
    // 1) "UBS próximo a mim" / "estou procurando UBS" → pedir CEP (determinístico). Não disparar se a mensagem for só CEP.
    const isOnlyCep = /^\d{5}-?\d{3}$/.test(lastUserMessage.trim());
    const serviceSearchMatch = !isOnlyCep && msgLower.match(/(?:pr[oó]ximo[s]?\s+a\s+mim|perto\s+de\s+mim|perto\s+aqui|na\s+minha\s+regi[aã]o|pr[oó]ximo|procurando|buscar|encontrar)/);
    const inferredServiceType = lib.inferServiceTypeFromText(lastUserMessage);
    if (inferredServiceType && serviceSearchMatch && lastUserMessage.length < 120) {
      const askCep = `Vou te ajudar a encontrar ${lib.getServiceTypeName(inferredServiceType)} próximas a você. Qual é o CEP da sua região? (Se não souber, pode informar o bairro.)`;
      console.log('[ai-orchestrator] Deterministic ask CEP for service search:', inferredServiceType);
      const ssePayload = JSON.stringify({
        choices: [{ delta: { content: askCep } }]
      });
      return new Response(`data: ${ssePayload}\n\ndata: [DONE]\n\n`, {
        headers: { ...lib.corsHeaders, 'Content-Type': 'text/event-stream' }
      });
    }
    // 2) Usuário manda "05601-001" após ter pedido UBS/CEU/etc → buscamos no banco e retornamos lista real
    const cepOnlyMatch = lastUserMessage.trim().match(/^(\d{5}-?\d{3})$/);
    if (cepOnlyMatch) {
      const cepRaw = cepOnlyMatch[1].replace(/\D/g, '');
      if (cepRaw.length === 8) {
        const previousUserMessages = messages.filter((m: any) => m.role === 'user').map((m: any) => (m.content || '').toLowerCase());
        let serviceType: string | null = null;
        for (let i = previousUserMessages.length - 1; i >= 0 && !serviceType; i--) {
          if (previousUserMessages[i] === lastUserMessage.toLowerCase()) continue; // skip current (CEP)
          serviceType = lib.inferServiceTypeFromText(previousUserMessages[i]);
        }
        if (serviceType) {
          const cepLookup = await lib.lookupCEP(cepRaw);
          const district = cepLookup.valid ? cepLookup.neighborhood : undefined;
          const listFromDb = await lib.findNearbyServices(supabase, serviceType, district, 5);
          const intro = cepLookup.valid && district
            ? `Com o CEP ${cepRaw.slice(0, 5)}-${cepRaw.slice(5)}, aqui estão opções de ${lib.getServiceTypeName(serviceType)} próximas a você:\n\n${listFromDb}`
            : `Aqui estão opções de ${lib.getServiceTypeName(serviceType)}:\n\n${listFromDb}`;
          console.log('[ai-orchestrator] Find nearby services from DB:', serviceType, district || 'city-wide');
          const ssePayload = JSON.stringify({
            choices: [{ delta: { content: intro } }]
          });
          return new Response(`data: ${ssePayload}\n\ndata: [DONE]\n\n`, {
            headers: { ...lib.corsHeaders, 'Content-Type': 'text/event-stream' }
          });
        }
      }
    }
    
    // Check for greetings - respond immediately without API call
    const greetingPatterns = [
      /^(olá|oi|bom dia|boa tarde|boa noite)/i,
      /(olá|oi|bom dia|boa tarde|boa noite).*problema/i,
      /(você poderia ser mais empática|seja mais simpático|me diga boa tarde|me diga bom dia)/i,
    ];
    
    const isGreeting = greetingPatterns.some(pattern => pattern.test(msgLower));
    const isEmpathyRequest = /(empática|simpático|simpática|empático)/i.test(msgLower);

    // Off-topic / "sem sentido": greeting + small talk (tudo bem, céu azul, etc.) without service intent
    const smallTalkPatterns = [
      /tudo bem\??/i, /tudo bom\??/i, /como vai\??/i, /como (está|esta) (você|vc|voce)\??/i,
      /céu (está|esta) azul/i, /(o )?que acha\??/i, /(que )?tal\??/i, /e (aí|ai)\??/i,
      /(o )?tempo (está|esta|hoje)/i, /(está|esta) (frio|calor|bonito)/i, /(bom|ótimo) dia (pra|para) (todos|você)/i,
    ];
    const hasSmallTalk = smallTalkPatterns.some(p => p.test(msgLower));
    const serviceKeywords = /relatar|problema|transporte|avaliar|serviço|servicos|dúvida|duvida|câmara|camara|audiência|audiencia|vereador|histórico|historico|denúncia|denuncia|reclamar|reportar|inscrever/i;
    const hasServiceIntent = serviceKeywords.test(msgLower);
    const isOffTopic = isGreeting && hasSmallTalk && !hasServiceIntent;
    
    // Check for generic urban report messages (always check, not just first message)
    const genericReportPatterns = [
      /^quero relatar (um )?problema/i,
      /^tenho (um )?problema/i,
      /^preciso relatar/i,
      /^problema na (cidade|rua|bairro)/i,
      /^relatar (um )?problema/i,
      /quero relatar um problema na cidade/i,
      /relatar problema/i,
    ];
    const isGenericReport = genericReportPatterns.some(pattern => pattern.test(msgLower));
    
    // Check for urgent problems - EXPANDED to include violence, drugs, security
    const urgentPatterns = [
      /(incêndio|fogo|queimando|chamas)/i,
      /(fios expostos|cabos soltos|eletricidade)/i,
      /(explosão|transformador)/i,
      /(alagamento|enchente|água subindo)/i,
      /(acidente|atropelamento)/i,
      /(risco iminente|perigo|armado|arma|armas)/i,
      /(drogas?|tráfico|trafico|drogados?|usuários? de droga)/i,
      /(violência|violencia|agressão|agressao|briga|confronto)/i,
      /(baderna|vandalismo|destruição|destruicao)/i,
      /(funkeiros?|grupo.*armado|pessoas.*armadas?)/i,
    ];
    const isUrgent = urgentPatterns.some(pattern => pattern.test(msgLower));
    
    // Also check accumulated description for urgent patterns (if user already described the problem)
    const accumulatedDesc = accumulatedFields?.description || '';
    const hasUrgentInDescription = accumulatedDesc && urgentPatterns.some(pattern => pattern.test(accumulatedDesc.toLowerCase()));
    
    if (isGreeting || isEmpathyRequest || isGenericReport || isOffTopic) {
      console.log('[ai-orchestrator] Deterministic response detected:', { isGreeting, isEmpathyRequest, isGenericReport, isOffTopic, isUrgent, msgLower });

      // Mensagem sem relação com os serviços: saudação + desculpa + lista de serviços
      if (isOffTopic) {
        let greeting = 'Olá!';
        if (msgLower.includes('boa noite')) greeting = 'Boa noite!';
        else if (msgLower.includes('bom dia')) greeting = 'Bom dia!';
        else if (msgLower.includes('boa tarde')) greeting = 'Boa tarde!';
        else if (msgLower.includes('olá') || msgLower.includes('oi')) greeting = 'Olá!';
        const servicesList = '• Problema na cidade\n• Transporte\n• Avaliar serviço\n• Serviços próximos\n• Tirar dúvida sobre a Câmara';
        const offTopicResponse = `${greeting} Desculpe, o intuito deste canal é poder te ajudar com estes serviços:\n\n${servicesList}\n\n[SHOW_SERVICES_CHIPS]`;
        const ssePayload = JSON.stringify({ choices: [{ delta: { content: offTopicResponse } }] });
        return new Response(`data: ${ssePayload}\n\ndata: [DONE]\n\n`, {
          headers: { ...lib.corsHeaders, 'Content-Type': 'text/event-stream' }
        });
      }
      
      // Determine appropriate response
      let response = '';
      
      if (isEmpathyRequest) {
        response = 'Claro! Desculpe. Boa tarde! Como posso ajudar?';
      } else if (msgLower.includes('bom dia')) {
        response = 'Bom dia! Como posso ajudar hoje?';
      } else if (msgLower.includes('boa tarde')) {
        response = 'Boa tarde! Como posso ajudar?';
      } else if (msgLower.includes('boa noite')) {
        response = 'Boa noite! Como posso ajudar?';
      } else if (msgLower.includes('olá') || msgLower.includes('oi')) {
        response = 'Olá! Como posso ajudar?';
      } else if (isGenericReport) {
        // Generic report - always be empathetic
        response = 'Olá! Claro, vou te ajudar. Qual o problema e onde fica?';
      } else {
        response = 'Olá! Como posso ajudar?';
      }
      
      // If urgent problem detected, add urgency recognition
      if (isUrgent || hasUrgentInDescription) {
        if (msgLower.includes('incêndio') || msgLower.includes('fogo') || msgLower.includes('queimando') || accumulatedDesc.toLowerCase().includes('incêndio') || accumulatedDesc.toLowerCase().includes('fogo')) {
          response = 'Isso é muito perigoso! Vamos registrar urgentemente. Qual o CEP do local?';
        } else if (msgLower.includes('fios') || msgLower.includes('expostos') || accumulatedDesc.toLowerCase().includes('fios') || accumulatedDesc.toLowerCase().includes('expostos')) {
          response = 'Isso é perigoso! Vamos resolver rápido. Qual o CEP do local?';
        } else if (msgLower.includes('risco') || msgLower.includes('perigo') || msgLower.includes('armado') || msgLower.includes('arma') || accumulatedDesc.toLowerCase().includes('armado') || accumulatedDesc.toLowerCase().includes('arma') || accumulatedDesc.toLowerCase().includes('drogas') || accumulatedDesc.toLowerCase().includes('violência') || accumulatedDesc.toLowerCase().includes('baderna')) {
          response = 'Entendi a gravidade da situação. Isso é muito preocupante! Vamos registrar como alto risco imediato. Qual o CEP do local?';
        } else {
          response = 'Isso é perigoso! Vamos resolver rápido. Qual o CEP do local?';
        }
      } else if (msgLower.includes('problema') || msgLower.includes('relatar')) {
        // Problem mentioned but not urgent
        if (response.includes('Como posso ajudar')) {
          response = response.replace('Como posso ajudar?', 'Claro, vou te ajudar. Qual o problema e onde fica?');
        }
      }
      
      console.log('[ai-orchestrator] Deterministic response:', response);
      const ssePayload = JSON.stringify({
        choices: [{ delta: { content: response } }]
      });
      return new Response(`data: ${ssePayload}\n\ndata: [DONE]\n\n`, {
        headers: { ...lib.corsHeaders, 'Content-Type': 'text/event-stream' }
      });
    }

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
        headers: { ...lib.corsHeaders, 'Content-Type': 'text/event-stream' }
      });
    }


    // === Opção B: RAG no Vertex para perguntas "gerais" ===
    // Se intenção é "general" e há data store ou corpus configurado, chama generateContent com retrieval
    // e injeta o contexto grounded no system prompt antes de chamar chat/completions.
    if (
      collectionIntent?.type === 'general' &&
      (vertexRagDatastore || vertexRagCorpus) &&
      finalAiApiKey &&
      lastUserMessage.trim().length > 3
    ) {
      try {
        const baseUrl = finalAiBaseUrl.replace(/\/$/, '');
        const match = baseUrl.match(/\/projects\/([^/]+)\/locations\/([^/]+)/);
        const project = match?.[1];
        const location = match?.[2];
        if (project && location) {
          const generateContentUrl = `https://${location}-aiplatform.googleapis.com/v1beta1/projects/${project}/locations/${location}/publishers/google/models/${aiChatModel}:generateContent`;
          // Datastore: aceitar path completo ou só o ID (ex.: camara-na-mao-rag_1770999938229)
          let datastorePath = (vertexRagDatastore || '').trim();
          if (vertexRagDatastore && !datastorePath.startsWith('projects/')) {
            datastorePath = `projects/${project}/locations/global/collections/default_collection/dataStores/${datastorePath}`;
            console.log('[ai-orchestrator] VERTEX_RAG_DATASTORE build full path:', datastorePath);
          }
          const retrievalTool = vertexRagDatastore
            ? { retrieval: { vertexAiSearch: { datastore: datastorePath } } }
            : { retrieval: { vertexRagStore: { ragResources: [{ ragCorpus: vertexRagCorpus }] } } };
          const ragBody = {
            contents: [{ role: 'user', parts: [{ text: lastUserMessage }] }],
            tools: [retrievalTool],
          };
          const ragRes = await fetch(generateContentUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${finalAiApiKey}` },
            body: JSON.stringify(ragBody),
          });
          if (ragRes.ok) {
            const ragJson = (await ragRes.json()) as {
              candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
            };
            const textPart = ragJson.candidates?.[0]?.content?.parts?.[0]?.text;
            if (textPart && textPart.trim()) {
              dynamicSystemPrompt = dynamicSystemPrompt + '\n\n[Contexto da base de conhecimento da Câmara (Vertex RAG)]:\n' + textPart.trim()
                + '\n\nInstrução: Para esta dúvida, use APENAS o texto do bloco [Contexto da base de conhecimento da Câmara (Vertex RAG)] acima para responder. Não invoque search_knowledge_base nem outras buscas.';
              console.log('[ai-orchestrator] Injected Vertex RAG context for general intent, length:', textPart.trim().length);
            }
          } else {
            console.warn('[ai-orchestrator] Vertex RAG generateContent failed:', ragRes.status, await ragRes.text());
          }
        } else {
          console.warn('[ai-orchestrator] Could not parse project/location from AI base URL for Vertex RAG');
        }
      } catch (e) {
        console.warn('[ai-orchestrator] Vertex RAG fetch error:', (e as Error).message);
      }
    }

    // Se injetamos contexto do Vertex RAG, não expor search_knowledge_base para evitar que o modelo prefira a tool e "alucine"
    const vertexRagInjected = dynamicSystemPrompt.includes('[Contexto da base de conhecimento da Câmara (Vertex RAG)]');
    const effectiveTools = vertexRagInjected
      ? (lib.tools as Array<{ type?: string; function?: { name?: string } }>).filter(
          t => t?.function?.name !== 'search_knowledge_base'
        )
      : lib.tools;
    if (vertexRagInjected) {
      console.log('[ai-orchestrator] Vertex RAG context injected → search_knowledge_base excluded from tools (prefer RAG)');
    }

    // Call AI API with streaming enabled and timeout
    const controller = new AbortController();
    const apiTimeoutId = setTimeout(() => {
      console.warn('[ai-orchestrator] API timeout (60s), aborting request');
      controller.abort();
    }, 60000); // Increased to 60s to prevent premature timeouts

    // Build headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (finalAiApiKey) {
      headers['Authorization'] = `Bearer ${finalAiApiKey}`;
    }

    let response: Response;
    try {
      const apiUrl = `${finalAiBaseUrl.replace(/\/$/, '')}/chat/completions`;
      // Vertex OpenAI-compatible API exige model no formato "google/gemini-2.5-flash"
      const isVertex = !!(vertexTokenUrl || finalAiBaseUrl.includes('aiplatform'));
      const effectiveModel = isVertex && !aiChatModel.startsWith('google/')
        ? `google/${aiChatModel}`
        : aiChatModel;
      console.log('[ai-orchestrator] Calling AI API:', apiUrl, 'model:', effectiveModel);
      
      // Build request body with tools for vLLM (requires --enable-auto-tool-choice and --tool-call-parser llama3_json)
      const requestBody: Record<string, unknown> = {
        model: effectiveModel,
        messages: [
          { role: 'system', content: dynamicSystemPrompt },
          ...messages.slice(-10) // Last 10 messages for context
        ],
        temperature: 0.75,
        stream: true,
        tools: effectiveTools,
        tool_choice: 'auto',
      };
      
      console.log('[ai-orchestrator] Request body has tools?', !!requestBody.tools);
      console.log('[ai-orchestrator] Tools count:', Array.isArray(requestBody.tools) ? (requestBody.tools as unknown[]).length : 0);
      
      const requestBodyJson = JSON.stringify(requestBody);
      console.log('[ai-orchestrator] Request body JSON length:', requestBodyJson.length);
      console.log('[ai-orchestrator] Request body JSON contains "tool_choice":', requestBodyJson.includes('tool_choice'));
      console.log('[ai-orchestrator] Request body JSON contains "tools":', requestBodyJson.includes('"tools"'));
      console.log('[ai-orchestrator] Request body JSON (first 1000 chars):', requestBodyJson.substring(0, 1000));
      console.log('[ai-orchestrator] Request body JSON (last 200 chars):', requestBodyJson.substring(Math.max(0, requestBodyJson.length - 200)));
      
      response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: requestBodyJson,
        signal: controller.signal,
      });
      clearTimeout(apiTimeoutId);
    } catch (fetchError: any) {
      clearTimeout(apiTimeoutId);
      if (fetchError.name === 'AbortError') {
        console.error('[ai-orchestrator] API call timeout after 60s');
        const timeoutMsg = '[TIMEOUT]O serviço está demorando mais que o normal. Isso pode acontecer quando há muitos usuários simultâneos ou quando o servidor está reiniciando. Tentando novamente automaticamente...';
        console.log('[ai-orchestrator] Request completed in', Date.now() - requestStartTime, 'ms (timeout)');
        return new Response(`data: ${JSON.stringify({ choices: [{ delta: { content: timeoutMsg } }] })}\n\ndata: [DONE]\n\n`, {
          headers: { ...lib.corsHeaders, 'Content-Type': 'text/event-stream' }
        });
      }
      throw fetchError;
    }
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[ai-orchestrator] API error:', response.status, errorText);
      
      // Handle 401 Unauthorized (Vertex/Gemini: token inválido ou expirado)
      if (response.status === 401) {
        console.error('[ai-orchestrator] 401 Unauthorized da API de IA. Se estiver usando Vertex: confira VERTEX_TOKEN_URL, VERTEX_TOKEN_SECRET e se a Cloud Function vertex-token retorna token válido; confira também a conta de serviço do GCP (Vertex AI User).');
        const errorMsg = 'Desculpe, o serviço de IA não autorizou a requisição. Tente novamente em alguns instantes; se o problema continuar, o administrador precisa verificar a configuração do Vertex (token e permissões).';
        console.log('[ai-orchestrator] Request completed in', Date.now() - requestStartTime, 'ms (401)');
        return new Response(`data: ${JSON.stringify({ choices: [{ delta: { content: errorMsg } }] })}\n\ndata: [DONE]\n\n`, {
          headers: { ...lib.corsHeaders, 'Content-Type': 'text/event-stream' }
        });
      }
      
      // Handle 400 Bad Request - check if it's tool_choice/tools error or Vertex model/format
      if (response.status === 400) {
        const oneLine = (errorText || '').replace(/\s+/g, ' ').trim();
        console.error('[ai-orchestrator] Bad Request (400) body:', oneLine);
        if (/tool|function.call|tool_choice/i.test(errorText)) {
          console.error('[ai-orchestrator] Dica: se o vLLM não tiver tool calling ativo, suba o container com --enable-auto-tool-choice e --tool-call-parser llama3_json (ver docs/VM_LLM_CHAT_GPU_L4_INFO.md).');
        }
        // If it's a tool_choice error, this shouldn't happen with current code
        // But handle it gracefully anyway
        const errorMsg = 'Desculpe, houve um erro ao processar sua solicitação. Por favor, tente novamente.';
        console.log('[ai-orchestrator] Request completed in', Date.now() - requestStartTime, 'ms (400 error)');
        return new Response(`data: ${JSON.stringify({ choices: [{ delta: { content: errorMsg } }] })}\n\ndata: [DONE]\n\n`, {
          headers: { ...lib.corsHeaders, 'Content-Type': 'text/event-stream' }
        });
      }
      
      // Handle rate limiting and payment errors
      if (response.status === 429) {
        console.log('[ai-orchestrator] Request completed in', Date.now() - requestStartTime, 'ms (rate limit)');
        return new Response(`data: ${JSON.stringify({ choices: [{ delta: { content: 'Desculpe, estamos com muitas solicitações no momento. Tente novamente em alguns segundos.' } }] })}\n\ndata: [DONE]\n\n`, {
          headers: { ...lib.corsHeaders, 'Content-Type': 'text/event-stream' }
        });
      }
      if (response.status === 402) {
        console.log('[ai-orchestrator] Request completed in', Date.now() - requestStartTime, 'ms (payment)');
        return new Response(`data: ${JSON.stringify({ choices: [{ delta: { content: 'Desculpe, o serviço de IA está temporariamente indisponível. Tente novamente mais tarde.' } }] })}\n\ndata: [DONE]\n\n`, {
          headers: { ...lib.corsHeaders, 'Content-Type': 'text/event-stream' }
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
      let parsedEvents = 0;
      let contentEvents = 0;
      let toolCallEvents = 0;
      
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const jsonStr = line.slice(6).trim();
        if (jsonStr === '[DONE]') continue;
        
        try {
          const parsed = JSON.parse(jsonStr);
          parsedEvents++;
          const delta = parsed.choices?.[0]?.delta;
          
          if (delta?.content) {
            fullContent += delta.content;
            contentEvents++;
          }
          
          if (delta?.tool_calls) {
            toolCallEvents++;
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
          console.warn('[ai-orchestrator] Failed to parse SSE line:', line.substring(0, 100));
        }
      }
      
      console.log('[ai-orchestrator] Stream parsing stats:', {
        totalEvents: parsedEvents,
        contentEvents,
        toolCallEvents,
        contentLength: fullContent.length,
        hasToolCall: !!toolCallData?.name
      });
      console.log('[ai-orchestrator] Parsed content:', fullContent.substring(0, 100) || '(empty)');
      console.log('[ai-orchestrator] Tool call detected:', toolCallData?.name || 'none');
      
      // If tool call was found, execute it
      if (toolCallData?.name) {
        try {
          const toolArgs = JSON.parse(toolCallArguments);
          console.log('[ai-orchestrator] Executing tool:', toolCallData.name, toolArgs);
          
          const result = await lib.executeTool(toolCallData.name, toolArgs, user.id, supabase, accumulatedFields);
          
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
            headers: { ...lib.corsHeaders, 'Content-Type': 'text/event-stream' }
          });
        } catch (e) {
          console.error('[ai-orchestrator] Tool execution error:', e);
          const errorPayload = JSON.stringify({
            choices: [{ delta: { content: 'Desculpe, houve um erro ao processar sua solicitação. Pode tentar novamente?' } }]
          });
          console.log('[ai-orchestrator] Request completed in', Date.now() - requestStartTime, 'ms (tool error)');
          return new Response(`data: ${errorPayload}\n\ndata: [DONE]\n\n`, {
            headers: { ...lib.corsHeaders, 'Content-Type': 'text/event-stream' }
          });
        }
      }
      
      // No tool call - inject collection progress with accumulated fields
      let responseContent = fullContent;
      
      // CRITICAL FIX: Handle empty content case
      // This can happen when the LLM returns only tool calls or the stream is malformed
      if (!responseContent || responseContent.trim() === '') {
        console.warn('[ai-orchestrator] Empty content received from LLM, using fallback message');
        // If we have a collection intent, ask for the next field
        if (collectionIntent && nextFieldInfo.field) {
          const fieldsJson = JSON.stringify(accumulatedFields);
          const progressMarker = `[COLLECTION_PROGRESS:${collectionIntent.type}:${fieldsJson}]`;
          const fieldMarker = `[FIELD_REQUEST:${nextFieldInfo.field}]`;
          const pickerMarker = nextFieldInfo.picker || '';
          responseContent = `${progressMarker}${fieldMarker}${nextFieldInfo.prompt}${pickerMarker ? '\n\n' + pickerMarker : ''}`;
        } else {
          // Generic fallback message
          responseContent = 'Desculpe, não consegui processar sua mensagem. Pode reformular?';
        }
      }
      
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
        headers: { ...lib.corsHeaders, 'Content-Type': 'text/event-stream' }
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
      
      const result = await lib.executeTool(toolName, toolArgs, user.id, supabase);
      
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
        headers: { ...lib.corsHeaders, 'Content-Type': 'text/event-stream' }
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
      headers: { ...lib.corsHeaders, 'Content-Type': 'text/event-stream' }
    });
    
  } catch (error) {
    console.error('[ai-orchestrator] ========== FATAL ERROR ==========');
    const errObj = error instanceof Error ? error : null;
    console.error('[ai-orchestrator] Error type:', errObj && errObj.constructor ? errObj.constructor.name : 'unknown');
    console.error('[ai-orchestrator] Error message:', error instanceof Error ? error.message : String(error));
    console.error('[ai-orchestrator] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    try {
      console.error('[ai-orchestrator] Full error object:', JSON.stringify(error, error != null && typeof error === 'object' ? Object.getOwnPropertyNames(error as object) : []));
    } catch (stringifyError) {
      console.error('[ai-orchestrator] Could not stringify error:', stringifyError);
    }
    
    console.log('[ai-orchestrator] Request completed in', Date.now() - requestStartTime, 'ms (error)');
    
    // Always return a valid SSE response so frontend doesn't hang
    const errorMessage = 'Desculpe, ocorreu um erro inesperado. Por favor, tente novamente.';
    return new Response(`data: ${JSON.stringify({ choices: [{ delta: { content: errorMessage } }] })}\n\ndata: [DONE]\n\n`, {
      headers: { ...lib.corsHeaders, 'Content-Type': 'text/event-stream' }
    });
  }
});
