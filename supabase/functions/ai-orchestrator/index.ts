/// <reference path="./deno-runtime-shim.d.ts" />
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { CollectionIntent } from "./lib.ts";

// CORS para preflight: entrypoint NÃO importa lib para OPTIONS passar mesmo se lib falhar no cold start
const PREFLIGHT_CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

function transportPreviewJsonMarker(fields: Record<string, unknown>): string {
  const payload = {
    description: fields.description ?? null,
    report_type: fields.report_type ?? null,
    sub_category: fields.sub_category ?? null,
    line_code: fields.line_code ?? null,
    stop_name: fields.stop_name ?? null,
    occurrence_date: fields.occurrence_date ?? null,
    occurrence_time: fields.occurrence_time ?? null,
    direction: fields.direction ?? null,
    recurrence_frequency: fields.recurrence_frequency ?? null,
    personal_impact: fields.personal_impact ?? null,
    location: fields.location ?? null,
    stop_location: fields.stop_location ?? null,
    accessibility_details: fields.accessibility_details ?? null,
  };
  try {
    const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
    return `\n\n[TRANSPORT_PREVIEW_JSON:${b64}]`;
  } catch {
    return "";
  }
}

function serviceRatingSubmitPreviewJsonMarker(payload: {
  rating_stars: number;
  rating_dimensions: Record<string, number> | null;
  service_name: string;
  comment_preview: string;
}): string {
  try {
    const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
    return `\n\n[RATING_SUBMIT_PREVIEW_JSON:${b64}]`;
  } catch {
    return "";
  }
}

function transportImpactSummaryLine(pi: unknown): string {
  const n =
    typeof pi === "number" && Number.isFinite(pi)
      ? pi
      : parseInt(String(pi ?? "").trim(), 10);
  if (!Number.isFinite(n)) return "Não informado";
  if (n >= 5) return "Alto (compromisso / não embarcou)";
  if (n >= 4) return "Atraso relevante (>30 min)";
  if (n >= 3) return "Atraso moderado (<30 min)";
  return "Desconforto";
}

function hasTransportAccessibilityDetails(value: unknown): boolean {
  return Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      Object.keys(value as Record<string, unknown>).length > 0,
  );
}

function formatTransportAccessibilitySummary(value: unknown): string | null {
  if (!hasTransportAccessibilityDetails(value)) return null;
  const details = value as Record<string, unknown>;
  const labels: Record<string, string> = {
    rampa: "Rampa",
    elevador: "Elevador / escada rolante",
    piso_tatil: "Piso tátil",
    embarque_assistido: "Apoio para embarque",
    observacoes: "Observações",
  };
  const parts = Object.entries(details)
    .map(([key, raw]) => {
      const label = labels[key] || key.replace(/_/g, " ");
      if (raw === true) return label;
      if (raw === false) return `${label}: não`;
      const text = String(raw ?? "").trim();
      return text ? `${label}: ${text}` : null;
    })
    .filter(Boolean);
  return parts.length ? parts.join("; ") : null;
}

function buildTransportPreviewOptionalLines(fields: Record<string, unknown>): string {
  const lines: string[] = [];
  if (fields.location) lines.push(`• **Local:** ${fields.location}`);
  if (fields.stop_name) lines.push(`• **Parada / estação:** ${fields.stop_name}`);
  if (fields.stop_location) lines.push(`• **Ponto / referência:** ${fields.stop_location}`);
  const accessibilitySummary = formatTransportAccessibilitySummary(fields.accessibility_details);
  if (accessibilitySummary) {
    lines.push(`• **Acessibilidade:** ${accessibilitySummary}`);
  }
  return lines.length ? `\n${lines.join("\n")}` : "";
}

function transportTypeWithSubcategory(fields: Record<string, unknown>): string {
  const typeLabels: Record<string, string> = {
    atraso: "Atraso",
    lotacao: "Lotação",
    seguranca: "Segurança",
    acessibilidade: "Acessibilidade",
    limpeza: "Limpeza",
    conducao: "Condução",
    outro: "Outro",
  };
  const subLabels: Record<string, string> = {
    nao_passou: "Não passou",
    atraso_maior_30: "Veio com mais de 30 min de atraso",
    atraso_menor_30: "Veio com menos de 30 min de atraso",
    intervalo_irregular: "Intervalo irregular",
    superlotado: "Veículo superlotado",
    nao_conseguiu_embarcar: "Não consegui embarcar",
    fila_excessiva: "Fila excessiva no ponto/estação",
    ar_condicionado_inoperante: "Ar-condicionado inoperante",
    assedio: "Assédio/Importunação",
    furto_roubo: "Furto/Roubo",
    agressao_ameaca: "Agressão/Ameaça",
    briga_confusao: "Briga/Confusão",
    elevador_escada: "Elevador/Escada rolante indisponível",
    rampa_bloqueada: "Rampa bloqueada/inacessível",
    veiculo_sem_acessibilidade: "Veículo sem acessibilidade",
    falta_assistencia: "Falta de assistência para embarque",
    veiculo_sujo: "Veículo sujo",
    mau_cheiro: "Mau cheiro",
    lixo_acumulado: "Lixo acumulado",
    presenca_pragas: "Presença de pragas/insetos",
    freada_brusca: "Freada brusca",
    aceleracao_excessiva: "Aceleração excessiva",
    motorista_imprudente: "Condução imprudente do motorista",
    nao_parou_ponto: "Não parou no ponto",
    outro: "Outro (descrever)",
  };

  const reportType = String(fields.report_type || "").trim().toLowerCase();
  const subCategory = String(fields.sub_category || "").trim().toLowerCase();
  const typeLabel = reportType ? typeLabels[reportType] || reportType : "Não informado";
  if (!subCategory) return typeLabel;
  const subLabel = subLabels[subCategory];
  return subLabel ? `${typeLabel} — ${subLabel}` : typeLabel;
}

/** Resumo final + marcador JSON + Confirmar/Corrigir (paridade com relato urbano, HU-5.6). */
function buildTransportFinalPreviewMessage(
  accumulatedFields: Record<string, unknown>,
  extraPhotoLine: string,
  typeLine?: string,
): string {
  const recurrenceLabelMap: Record<string, string> = {
    primeira_vez: "Primeira vez",
    algumas_vezes_mes: "Algumas vezes/mês",
    toda_semana: "Toda semana",
    todos_os_dias: "Todos os dias",
  };
  const desc = (accumulatedFields.description || "").toString();
  const typeHuman = typeLine || transportTypeWithSubcategory(accumulatedFields);
  const bullets = `**Resumo do relato de transporte**
• **Problema:** ${desc.slice(0, 150)}${desc.length > 150 ? "..." : ""}
• **Tipo:** ${typeHuman}
• **Linha:** ${accumulatedFields.line_code || "Não informada"}
• **Ponto de embarque/parada:** ${
    accumulatedFields.stop_name === "__skip__" ? "Não lembro" : (accumulatedFields.stop_name || "Não informado")
  }
• **Quando:** ${accumulatedFields.occurrence_date || ""}${
    accumulatedFields.occurrence_time ? ` às ${accumulatedFields.occurrence_time}` : ""
  }${extraPhotoLine}
• **Sentido:** ${accumulatedFields.direction || "Não informado"}
• **Frequência:** ${
    recurrenceLabelMap[String(accumulatedFields.recurrence_frequency || "")] ||
    accumulatedFields.recurrence_frequency ||
    "Não informada"
  }
• **Impacto na rotina:** ${transportImpactSummaryLine(accumulatedFields.personal_impact)}${buildTransportPreviewOptionalLines(accumulatedFields)}`;

  return `${bullets}

Se estiver tudo certo, clique em **Confirmar** para registrar ou em **Corrigir** para alterar algo.${transportPreviewJsonMarker(
    accumulatedFields,
  )}[QUICK_REPLY:confirmar,corrigir]`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: PREFLIGHT_CORS });
  }

  try {
  const requestStartTime = Date.now();
  const lib = await import("./lib.ts");
  console.log('[ai-orchestrator] ========== REQUEST RECEIVED ==========');
  console.log('[ai-orchestrator] DEPLOY VERSION: 2026-03-24-v1 (kb camara funcionamento + skip vertex)');
  console.log('[ai-orchestrator] Request started at', new Date().toISOString());
  console.log('[ai-orchestrator] Method:', req.method);
  console.log('[ai-orchestrator] URL:', req.url);

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
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    console.log('[ai-orchestrator] Environment check:', {
      hasAiChatBaseUrl: !!aiChatBaseUrl,
      hasAiBaseUrl: !!aiBaseUrl,
      hasSupabaseUrl: !!supabaseUrl,
      hasSupabaseAnonKey: !!supabaseAnonKey,
      hasSupabaseServiceRoleKey: !!supabaseServiceRoleKey,
      aiChatModel,
      supabaseUrl: supabaseUrl ? supabaseUrl.substring(0, 50) + '...' : 'missing',
      supabaseAnonKeyLength: supabaseAnonKey?.length || 0
    });
    
    // Determine which AI provider to use
    const finalAiBaseUrl = aiChatBaseUrl || aiBaseUrl;
    let finalAiApiKey = aiChatApiKey || aiApiKey;
    let vertexTokenObtained = false;

    // Vertex AI: obter token de um endpoint (ex.: GCP Cloud Function) quando configurado
    const vertexTokenUrl = Deno.env.get('VERTEX_TOKEN_URL');
    const vertexTokenSecret = Deno.env.get('VERTEX_TOKEN_SECRET');
    const vertexRagDatastore = Deno.env.get('VERTEX_RAG_DATASTORE'); // Vertex AI Search datastore path (optional)
    const vertexRagCorpus = Deno.env.get('VERTEX_RAG_CORPUS');       // RAG Engine corpus path (optional)
    if (vertexTokenUrl && vertexTokenSecret) {
      try {
        console.log('[ai-orchestrator] Fetching Vertex token from', vertexTokenUrl.replace(/\/[^/]*$/, '/...'));
        const tokenRes = await fetch(vertexTokenUrl, {
          method: 'GET',
          headers: { 'X-Token-Secret': vertexTokenSecret },
        });
        const responseText = await tokenRes.text();
        if (tokenRes.ok) {
          try {
            const data = JSON.parse(responseText) as { token?: string };
            if (data?.token && typeof data.token === 'string' && data.token.length > 0) {
              finalAiApiKey = data.token;
              vertexTokenObtained = true;
              console.log('[ai-orchestrator] Vertex token obtained successfully (length:', data.token.length, ')');
            } else {
              console.warn('[ai-orchestrator] Vertex token URL returned OK but no token in body. Body keys:', data ? Object.keys(data) : 'null', '| body length:', responseText.length);
            }
          } catch (parseErr) {
            console.warn('[ai-orchestrator] Vertex token URL returned non-JSON or invalid:', responseText.substring(0, 200));
          }
        } else {
          console.warn('[ai-orchestrator] Vertex token URL returned', tokenRes.status, '| body:', responseText.substring(0, 300));
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

    // Leitura de report_classification_feedback: RLS só permite admin/gestor; cidadão no chat usa JWT.
    // Cliente service role (só servidor) para o feedback loop funcionar no fluxo conversacional.
    const supabaseClassificationFeedbackRead =
      supabaseServiceRoleKey && supabaseServiceRoleKey.length > 0
        ? createClient(supabaseUrl, supabaseServiceRoleKey)
        : null;
    if (!supabaseClassificationFeedbackRead) {
      console.warn(
        '[ai-orchestrator] SUPABASE_SERVICE_ROLE_KEY ausente: getClassificationFromFeedback usa JWT do usuário (RLS pode bloquear).'
      );
    }
    
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
    let requestBodyData: Record<string, unknown>;
    try {
      requestBodyData = (await req.json()) as Record<string, unknown>;
      console.log('[ai-orchestrator] Request parsed successfully');
    } catch (parseError) {
      console.error('[ai-orchestrator] Failed to parse request body:', parseError);
      console.error('[ai-orchestrator] Request body might be empty or invalid JSON');
      return new Response(
        JSON.stringify({ error: 'Invalid request body. Expected JSON.' }),
        { status: 400, headers: { ...lib.corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const { messages, conversationId, collectionType: collectionTypeRaw, evaluationContext } = requestBodyData;
    const frontendCollectionType = typeof collectionTypeRaw === 'string' ? collectionTypeRaw : '';
    const chatMessages: Record<string, unknown>[] = Array.isArray(messages)
      ? (messages as Record<string, unknown>[])
      : [];
    // Fotos anexadas no chat (relato urbano): usar a última mensagem do usuário que tiver attachmentUrls
    const userMessages = chatMessages.filter((m: Record<string, unknown>) => m.role === 'user');
    const lastWithAttachments = [...userMessages].reverse().find((m: Record<string, unknown>) => Array.isArray(m.attachmentUrls) && m.attachmentUrls.length > 0);
    const attachmentUrls = (lastWithAttachments?.attachmentUrls as string[] | undefined) ?? [];
    console.log('[ai-orchestrator] Request parsed successfully. Messages count:', chatMessages.length);
    
    // Log frontend collection type for debugging
    if (frontendCollectionType) {
      console.log('[ai-orchestrator] Frontend collectionType received:', frontendCollectionType);
    }
    
    // === EARLY: "Encaminhar meu relato para vereador" logo após relato registrado — NUNCA criar novo relato ===
    const getContentText = (c: unknown): string => {
      if (typeof c === 'string') return c;
      if (Array.isArray(c)) {
        const part = (c as Record<string, unknown>[]).find((p: Record<string, unknown>) => p?.type === 'text' && p?.text);
        return part ? String(part.text) : '';
      }
      return '';
    };
    const chatHistoryTyped: Array<{ role: string; content: string }> = chatMessages.map((m) => ({
      role: typeof m.role === 'string' ? m.role : String(m.role ?? ''),
      content: getContentText(m.content),
    }));
    const lastUserContent = chatMessages.filter((m: Record<string, unknown>) => m.role === 'user').pop()?.content;
    const lastAssistantContent = chatMessages.filter((m: Record<string, unknown>) => m.role === 'assistant').pop()?.content;
    const lastUserMsg = getContentText(lastUserContent);
    const lastUserTextEarly = lastUserMsg.trim();
    const lastAssistantTextEarly = getContentText(lastAssistantContent).toLowerCase();
    const botJustRegisteredReport = /relato\s+registrado|(?:URB|REL)-20\d{2}-\d+/.test(lastAssistantTextEarly);
    const userAsksForwardToCouncil = /(encaminhar|enviar|mandar)\s+(meu\s+)?relato\s+para\s+(um\s+)?vereador|poderia\s+encaminhar\s+meu\s+relato|enviar\s+meu\s+relato\s+para\s+vereador/i.test(lastUserTextEarly);
    if (botJustRegisteredReport && userAsksForwardToCouncil && chatMessages.length >= 2) {
      const catMatch = getContentText(lastAssistantContent).match(/Categoria:\s*\*?\*?\s*([^\n]+)/i);
      const descMatch = getContentText(lastAssistantContent).match(/Descri[cç][aã]o:\s*\*?\*?\s*([^\n]+)/i);
      const descText = (descMatch?.[1] ?? '').trim() || 'Problema urbano reportado';
      const categoryLabel = (catMatch?.[1] ?? '').trim();
      let district: string | undefined;
      const afterEndereco = getContentText(lastAssistantContent).split(/Endere[cç]o:\s*/i)[1];
      if (afterEndereco) {
        const lines = afterEndereco.split(/\n/).map((l: string) => l.replace(/^-\s*/, '').trim()).filter((l: string) => l.length > 0 && !/^\d{5}-?\d{3}$/.test(l.replace(/\s/g, '')) && !/^CEP\s*/i.test(l));
        if (lines.length >= 2) district = lines[1];
      }
      const categoryToIssueType: Record<string, string> = {
        'via_publica': 'urbanismo', 'via pública': 'urbanismo', 'pavimentacao': 'urbanismo', 'pavimentação': 'urbanismo',
        'iluminacao': 'urbanismo', 'iluminação': 'urbanismo',
        'calcada': 'urbanismo', 'calçada': 'urbanismo', 'sinalizacao': 'urbanismo', 'sinalização': 'urbanismo',
        'drenagem': 'urbanismo', 'lixo': 'urbanismo', 'esgoto': 'urbanismo',
        'area_verde': 'meio_ambiente', 'área verde': 'meio_ambiente', 'feedback_camara': 'urbanismo', 'feedback câmara': 'urbanismo'
      };
      let issueType = 'urbanismo';
      const catLower = categoryLabel.toLowerCase();
      for (const [k, v] of Object.entries(categoryToIssueType)) {
        if (catLower.includes(k)) { issueType = v; break; }
      }
      try {
        const councilResult = await lib.suggestCouncilMember(issueType, descText, district);
        const reply = `Claro! Seu relato já foi registrado. Para encaminhar a um vereador, seguem sugestões de parlamentares que podem ajudar com esse tipo de demanda:\n\n${councilResult}\n\nPosso ajudar com mais alguma coisa?`;
        const ssePayload = JSON.stringify({ choices: [{ delta: { content: reply } }] });
        console.log('[ai-orchestrator] EARLY short-circuit: encaminhar relato para vereador (evita criar novo relato)');
        return new Response(`data: ${ssePayload}\n\ndata: [DONE]\n\n`, { headers: { ...lib.corsHeaders, 'Content-Type': 'text/event-stream' } });
      } catch (err) {
        console.error('[ai-orchestrator] suggestCouncilMember failed in early short-circuit:', err);
      }
    }

    // === EARLY: Usuário escolheu um vereador da lista ("Nome (SIGLA)") — registrar encaminhamento, NUNCA criar novo relato ===
    const lastAssistantText = getContentText(lastAssistantContent);
    const botJustShowedCouncilList = /deseja que eu encaminhe sua demanda para algum deles\?/i.test(lastAssistantText);
    const selectionMatch = lastUserTextEarly.match(/^(.+?)\s*\(([^)]+)\)\s*$/); // ex.: "Adrilles Jorge (UNIAO)"
    if (botJustShowedCouncilList && selectionMatch && chatMessages.length > 0) {
      const councilName = selectionMatch[1].trim();
      const councilParty = selectionMatch[2].trim();
      let urbanReportId: string | null = null;
      let transportReportId: string | null = null;
      for (let i = chatMessages.length - 1; i >= 0; i--) {
        const m = chatMessages[i] as Record<string, unknown>;
        if (m.role !== 'assistant') continue;
        const text = getContentText(m.content);
        const urbanMatch = text.match(/\[REPORT_CREATED:([0-9a-f-]{36})\]/);
        const transportMatch = text.match(/\[TRANSPORT_CREATED:([0-9a-f-]{36})\]/);
        if (urbanMatch) {
          urbanReportId = urbanMatch[1];
          break;
        }
        if (transportMatch) {
          transportReportId = transportMatch[1];
          break;
        }
      }
      const councilId = councilName.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'vereador';
      const referralRow: Record<string, unknown> = {
        user_id: user.id,
        council_member_id: councilId,
        council_member_name: councilName,
        council_member_party: councilParty,
        status: 'pending'
      };
      if (urbanReportId) referralRow.urban_report_id = urbanReportId;
      else if (transportReportId) referralRow.transport_report_id = transportReportId;
      if (urbanReportId || transportReportId) {
        const { error: refError } = await supabase.from('council_member_referrals').insert(referralRow);
        if (!refError) {
          const reply = `✅ **Encaminhamento registrado!** Seu relato foi encaminhado para **${councilName}** (${councilParty}). O gabinete poderá entrar em contato. Posso ajudar com mais alguma coisa?`;
          const ssePayload = JSON.stringify({ choices: [{ delta: { content: reply } }] });
          console.log('[ai-orchestrator] User selected council member: referral recorded (no new report)');
          return new Response(`data: ${ssePayload}\n\ndata: [DONE]\n\n`, { headers: { ...lib.corsHeaders, 'Content-Type': 'text/event-stream' } });
        }
      }
    }

    // === EARLY: Perguntas inapropriadas (ofensas/acusações a vereadores) — redirecionar com educação, NÃO entrar em fluxo de relato ===
    const inappropriatePatterns = [
      // "qual vereador mais ladrão?" / "qual o vereador é mais ladrão?" / "qual vereador é o mais ladrão?"
      /\bqual\s+(o\s+)?vereador(\s+[ée]\s+o)?\s*mais\s+ladr[aã]o\b/i,
      /\bqual\s+vereador\s+[ée]\s+ladr[aã]o\b/i,
      /\bquem\s+[ée]\s+o\s+(mais\s+)?(ladr[aã]o|corrupto|pior)\s+(vereador|deles)\b/i,
      /\b(vereador|vereadores)\s+(mais\s+)?(ladr[aã]o|corrupto)s?\b/i,
      /\b(mais\s+)?(ladr[aã]o|corrupto)\s+(vereador|dos\s+vereadores)\b/i,
      /\bpior\s+vereador\b/i,
      /\bvereador\s+(corrupto|ladr[aã]o|bandido|rouba|safado|desonesto)\b/i,
      /\b(qual|quem)\s+[ée]\s+o\s+vereador\s+(mais\s+)?(corrupto|ladr[aã]o)\b/i,
      /\bvereador(es)?\s+que\s+(rouba|roubam|s[aã]o\s+corruptos)\b/i,
      /\b(qual|quem)\s+vereador\s+(rouba|roubou|é\s+corrupto)\b/i,
    ];
    const inappropriateAboutVereador = inappropriatePatterns.some((p) => p.test(lastUserTextEarly));
    if (inappropriateAboutVereador) {
      const reply = `Não posso responder perguntas que envolvam ofensas ou acusações a pessoas. Posso ajudar com informações sobre vereadores da sua região, formas de participação na Câmara ou registro de problemas na cidade. Como posso ajudar?`;
      const ssePayload = JSON.stringify({ choices: [{ delta: { content: reply } }] });
      console.log('[ai-orchestrator] Inappropriate question about vereador: redirecting politely');
      return new Response(`data: ${ssePayload}\n\ndata: [DONE]\n\n`, { headers: { ...lib.corsHeaders, 'Content-Type': 'text/event-stream' } });
    }

    // Detect collection intent from user message for later injection (lastUserMsg = getContentText acima)
    // === CRITICAL: Check for explicit JOURNEY_SWITCHED marker in last user message ===
    // When user clicks "Sim, iniciar X" button, the message contains [JOURNEY_SWITCHED:type]
    // This MUST take precedence over any other detection logic
    const journeySwitchMatch = lastUserMsg.match(/\[JOURNEY_SWITCHED:(\w+)\]/);
    
    // PRIORITY: Use frontend collection type if it's a structured journey type
    const STRUCTURED_TYPES_SET = new Set(['urban_report', 'transport_report', 'service_rating']);
    const LIGHT_JOURNEY_TYPES = ['services', 'occupancy', 'audiencias', 'history', 'general', 'vereadores', 'noticias'];
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
          type: switchedToType as CollectionIntent['type'],
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
        const feStructured = frontendCollectionType as CollectionIntent['type'];
        collectionIntent = {
          type: feStructured as 'urban_report' | 'transport_report' | 'service_rating',
          fields: lib.accumulateFieldsFromHistory(chatHistoryTyped, feStructured),
        };
      }
    } else if (frontendCollectionType && STRUCTURED_TYPES_SET.has(frontendCollectionType)) {
      // Frontend has a journey type - but check if user wants to switch
      console.log('[ai-orchestrator] Frontend collectionType received:', frontendCollectionType);
      
      // === CHECK FOR RECENTLY DECLINED JOURNEY SWITCHES ===
      const getDeclinedJourneys = (msgs: Record<string, unknown>[]): Set<string> => {
        const declined = new Set<string>();
        for (const msg of msgs) {
          if (msg.role === 'user') {
            const declineMatch = getContentText(msg.content).match(/\[JOURNEY_DECLINED:(\w+)\]/);
            if (declineMatch) {
              declined.add(declineMatch[1]);
            }
          }
        }
        return declined;
      };
      
      const declinedJourneys = getDeclinedJourneys(chatMessages);
      if (declinedJourneys.size > 0) {
        console.log('[ai-orchestrator] Declined journeys in history:', Array.from(declinedJourneys));
      }
      
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
      
      // ALWAYS detect intent first to check for journey switch
      const detectedIntent = lib.detectCollectionIntent(lastUserMsg, chatHistoryTyped);
      
      // Check for JOURNEY CONFLICT (user wants to switch to different structured journey)
      const structuredTypes = ['urban_report', 'transport_report', 'service_rating'] as const;
      const isDetectedStructured = detectedIntent && structuredTypes.includes(detectedIntent.type as typeof structuredTypes[number]);
      const wasRecentlyDeclined = detectedIntent && declinedJourneys.has(detectedIntent.type);
      
      let isJourneyConflict = detectedIntent && 
        isDetectedStructured &&
        detectedIntent.type !== frontendCollectionType &&
        !wasRecentlyDeclined; // Don't ask again if user already said no
      
      // Se o usuário já está confirmando ("Sim, quero iniciar X" / "Sim, iniciar X"), não mostrar a pergunta de novo
      const confirmationPhrase = /^\s*sim\s*[,.]?\s*(quero\s+)?iniciar\s+/i.test(lastUserMsg.trim()) ||
        /\[JOURNEY_SWITCHED:\w+\]/i.test(lastUserMsg);
      if (isJourneyConflict && detectedIntent && confirmationPhrase) {
        const nameForNew = journeyNames[detectedIntent.type];
        if (nameForNew && lastUserMsg.toLowerCase().includes(nameForNew.toLowerCase())) {
          isJourneyConflict = false;
          collectionIntent = { type: detectedIntent.type as 'urban_report' | 'transport_report' | 'service_rating', fields: {} };
          console.log('[ai-orchestrator] User already confirmed switch to', detectedIntent.type, '- skipping duplicate confirmation prompt');
        }
      }
      
      if (wasRecentlyDeclined) {
        console.log(`[ai-orchestrator] Journey ${detectedIntent?.type} was recently declined, skipping confirmation`);
      }
      
      if (isJourneyConflict && detectedIntent) {
        // ALWAYS ask for confirmation - never auto-switch
        const feTypeKey = String(frontendCollectionType ?? '');
        const detTypeKey = String(detectedIntent.type);
        console.log(`[ai-orchestrator] Journey conflict detected: ${feTypeKey} → ${detTypeKey}`);

        const currentName = journeyNames[feTypeKey] || feTypeKey;
        const newName = journeyNames[detTypeKey] || detTypeKey;

        // Check accumulated fields to show progress (informational only)
        const existingFields = lib.accumulateFieldsFromHistory(
          chatHistoryTyped,
          feTypeKey as CollectionIntent['type'],
        );
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
        const confirmationResponse = `[JOURNEY_SWITCH_PROMPT:${detTypeKey}:${feTypeKey}]` +
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
        const detectedIntent = lib.detectCollectionIntent(lastUserMsg, chatHistoryTyped);
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
          
          const feTypeKeyLight = String(frontendCollectionType ?? '');
          const detTypeKeyLight = String(detectedIntent.type);
          const currentName = journeyNames[feTypeKeyLight] || feTypeKeyLight;
          const newName = journeyNames[detTypeKeyLight] || detTypeKeyLight;

          const confirmationResponse = `[JOURNEY_SWITCH_PROMPT:${detTypeKeyLight}:${feTypeKeyLight}]` +
            `Entendi! Você quer iniciar uma **${newName}**.\n\n` +
            `Você estava em **${currentName}**. Deseja trocar?`;
          
          console.log('[ai-orchestrator] Returning journey switch confirmation prompt');
          
          return new Response(
            `data: ${JSON.stringify({ choices: [{ delta: { content: confirmationResponse } }] })}\n\ndata: [DONE]\n\n`,
            { headers: { ...lib.corsHeaders, 'Content-Type': 'text/event-stream' } }
          );
        } else {
          // Can't determine target - stay in light journey
          collectionIntent = { type: frontendCollectionType as CollectionIntent['type'], fields: {} };
        }
      } else {
        // Stay in light journey - pass through to AI without deterministic flow
        // Correção: se frontend enviou "services" mas a mensagem é confirmação de endereço e o histórico
        // é de relato urbano (ex.: semáforos + "Qual é a avenida?"), preservar urban_report para não perder contexto
        const isAddressConfirmationLight =
          /endere[cç]o\s*selecionado\s*:/i.test(lastUserMsg) ||
          (/CEP\s*:\s*\d{5}-?\d{3}/i.test(lastUserMsg) && /(avenida|rua|r\.|al\.|pra[cç]a)/i.test(lastUserMsg));
        if (frontendCollectionType === 'services' && isAddressConfirmationLight) {
          const urbanAccumulated = lib.accumulateFieldsFromHistory(chatHistoryTyped, 'urban_report');
          const hasUrbanContext =
            (urbanAccumulated.category || urbanAccumulated.description) &&
            (lib.isGenericIntentText(String(urbanAccumulated.description || '')) === false || urbanAccumulated.category);
          const lastAssistantContentRaw = chatMessages.filter((m: Record<string, unknown>) => m.role === 'assistant').pop()?.content;
          const lastAssistantTextForAddress = getContentText(lastAssistantContentRaw);
          const assistantAskedForAddress =
            /qual\s*(é|e)\s*(a\s*)?(avenida|rua)|CEP\s*do\s*local|endere[cç]o\s*do\s*local|onde\s*fica/i.test(lastAssistantTextForAddress) ||
            /\[COLLECTION_PROGRESS:urban_report\]/i.test(lastAssistantTextForAddress);
          if (hasUrbanContext && assistantAskedForAddress) {
            collectionIntent = { type: 'urban_report', fields: {} };
            console.log('[ai-orchestrator] Overriding services → urban_report: address confirmation in urban report context');
          }
        }
        if (!collectionIntent) {
          collectionIntent = { type: frontendCollectionType as CollectionIntent['type'], fields: {} };
        }
      }
    } else {
      // Fallback: detect intent from message content
      // Preservar contexto: se a última mensagem for só confirmação de endereço/CEP e o histórico
      // já indica relato urbano (categoria + descrição), não re-detectar como "services"
      const isAddressConfirmation =
        /endere[cç]o\s*selecionado\s*:/i.test(lastUserMsg) ||
        (/CEP\s*:\s*\d{5}-?\d{3}/i.test(lastUserMsg) && /(avenida|rua|r\.|al\.|pra[cç]a)/i.test(lastUserMsg));
      if (isAddressConfirmation) {
        const urbanAccumulated = lib.accumulateFieldsFromHistory(chatHistoryTyped, 'urban_report');
        const hasUrbanContext =
          (urbanAccumulated.category || urbanAccumulated.description) &&
          (lib.isGenericIntentText(String(urbanAccumulated.description || '')) === false || urbanAccumulated.category);
        const lastAssistantContentRaw = chatMessages.filter((m: Record<string, unknown>) => m.role === 'assistant').pop()?.content;
        const lastAssistantTextForAddress = getContentText(lastAssistantContentRaw);
        const assistantAskedForAddress =
          /qual\s*(é|e)\s*(a\s*)?(avenida|rua)|CEP\s*do\s*local|endere[cç]o\s*do\s*local|onde\s*fica/i.test(lastAssistantTextForAddress) ||
          /\[COLLECTION_PROGRESS:urban_report\]/i.test(lastAssistantTextForAddress);
        if (hasUrbanContext && assistantAskedForAddress) {
          collectionIntent = { type: 'urban_report', fields: {} };
          console.log('[ai-orchestrator] Preserving urban_report context: last message is address confirmation');
        }
      }
      if (!collectionIntent) {
        collectionIntent = lib.detectCollectionIntent(lastUserMsg, chatHistoryTyped);
      }
    }
    
    // Pergunta informativa sobre audiência ("o que é audiência pública?", etc.) → sempre RAG (general)
    if (collectionIntent && collectionIntent.type !== 'general' && lib.isInformationalQuestionAboutAudience(lastUserMsg)) {
      console.log('[ai-orchestrator] Overriding intent to general: informational question about audiência → RAG');
      collectionIntent = { type: 'general', fields: {} };
    }
    // Pergunta sobre contato com a Câmara (telefone, email, como entrar em contato) → sempre RAG (general)
    if (collectionIntent && collectionIntent.type !== 'general' && lib.isInformationalQuestionAboutContact(lastUserMsg)) {
      console.log('[ai-orchestrator] Overriding intent to general: contact question (como entrar em contato) → RAG');
      collectionIntent = { type: 'general', fields: {} };
    }
    // Pergunta sobre projetos em tramitação → sempre RAG (general)
    if (collectionIntent && collectionIntent.type !== 'general' && lib.isInformationalQuestionAboutProjetosTramitacao(lastUserMsg)) {
      console.log('[ai-orchestrator] Overriding intent to general: projetos em tramitação → RAG');
      collectionIntent = { type: 'general', fields: {} };
    }
    // Pergunta sobre como buscar audiência pública → sempre RAG (general)
    if (collectionIntent && collectionIntent.type !== 'general' && lib.isInformationalQuestionAboutBuscarAudiencia(lastUserMsg)) {
      console.log('[ai-orchestrator] Overriding intent to general: buscar audiência pública → RAG');
      collectionIntent = { type: 'general', fields: {} };
    }
    // Pergunta fora do escopo (shopping, restaurante, prefeito, multa, horário) → general para não pedir CEP
    if (collectionIntent && collectionIntent.type !== 'general' && lib.isOutOfScopeQuestion(lastUserMsg)) {
      console.log('[ai-orchestrator] Overriding intent to general: pergunta fora do escopo (shopping/restaurante/prefeito/multa) → RAG');
      collectionIntent = { type: 'general', fields: {} };
    }
    // Pergunta informativa sobre vereador/Câmara (perfil, frequência, faltas, gastos, falar com vereador) → general (planilha + Pontos Críticos)
    if (collectionIntent && collectionIntent.type !== 'general' && lib.isInformationalQuestionAboutVereadorOrCamara(lastUserMsg)) {
      console.log('[ai-orchestrator] Overriding intent to general: pergunta informativa vereador/câmara → RAG');
      collectionIntent = { type: 'general', fields: {} };
    }

    // Primeira mensagem (ou saudação + fato) descreve incidente urbano grave → relato urbano mesmo sem chip / sem intent genérico
    if (!journeySwitchMatch && (!collectionIntent || collectionIntent.type === 'general')) {
      const userMsgsOpen = chatMessages.filter((m: Record<string, unknown>) => m.role === 'user');
      const nOpen = userMsgsOpen.length;
      const lastOpen = String(lastUserMsg || '').trim();
      const firstOpen = nOpen >= 1 ? String(userMsgsOpen[0].content || '').trim() : '';
      const openFirstNature = lib.normalizeReportNature(firstOpen) !== null;
      const openFirstGreet =
        firstOpen.length > 0 &&
        firstOpen.length <= 24 &&
        /^(oi|ol[aá]|opa|hey|bom\s+dia|boa\s+tarde|boa\s+noite)\b/i.test(firstOpen);
      const openEligible =
        (nOpen === 1 && lastOpen === String(userMsgsOpen[0].content || '').trim()) ||
        (nOpen === 2 &&
          lastOpen === String(userMsgsOpen[1].content || '').trim() &&
          (openFirstNature || openFirstGreet));
      if (
        openEligible &&
        lib.messageLooksLikeUrbanIncidentStarter(lastOpen) &&
        lib.isValidDomainDescription(lastOpen, 'urban') &&
        !lib.isGenericIntentText(lastOpen) &&
        !lib.isBareUrbanReportNatureReply(lastOpen)
      ) {
        collectionIntent = { type: 'urban_report', fields: {} };
        console.log('[ai-orchestrator] Forced urban_report: abertura com incidente na cidade');
      }
    }
    
    // Accumulate fields from conversation history for better tracking
    // BUT if journey was just switched, start fresh
    let accumulatedFields: Record<string, unknown> = {};
    if (collectionIntent) {
      if (journeySwitchMatch) {
        // Fresh start - don't accumulate from previous journey
        accumulatedFields = {};
        console.log('[ai-orchestrator] Journey switched, starting with fresh fields');
      } else {
        accumulatedFields = lib.accumulateFieldsFromHistory(chatHistoryTyped, collectionIntent.type);
        // Merge with detected fields from current message
        accumulatedFields = { ...accumulatedFields, ...collectionIntent.fields };
        // Avaliação conversacional: injeta contexto da visita (visit_id, service_id, service_name, service_type)
        if (evaluationContext && collectionIntent.type === 'service_rating') {
          if (typeof evaluationContext === 'object' && evaluationContext !== null && !Array.isArray(evaluationContext)) {
            const evalCtx = evaluationContext as Record<string, unknown>;
            accumulatedFields = { ...accumulatedFields, ...evalCtx };
            console.log('[ai-orchestrator] Evaluation context injected:', Object.keys(evalCtx));
          }
        }
      }
      
      // ========== AUTO-LOOKUP CEP ==========
      // Se temos CEP, resolver via ViaCEP quando faltar rua/bairro OU cidade (para relato urbano validar Guarulhos/fora de SP)
      const needsCepLookup = accumulatedFields.cep && (
        !accumulatedFields.street ||
        !accumulatedFields.neighborhood ||
        (collectionIntent?.type === 'urban_report' && !accumulatedFields.city)
      );
      if (needsCepLookup) {
        const cepLookup = await lib.lookupCEP(String(accumulatedFields.cep ?? ''));
        if (cepLookup.valid) {
          console.log('[ai-orchestrator] Auto-resolved CEP:', accumulatedFields.cep, '→', cepLookup.street, cepLookup.neighborhood, cepLookup.city);
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

      // Atalho: 1ª mensagem com fato grave (ex. incêndio) → natureza reclamação + descrição; próximo passo = categoria → "como informar o local"
      if (
        collectionIntent.type === 'urban_report' &&
        !journeySwitchMatch &&
        !/\[JOURNEY_DECLINED:/i.test(lastUserMsg)
      ) {
        const userMsgsUrban = chatMessages.filter((m: Record<string, unknown>) => m.role === 'user');
        const nU = userMsgsUrban.length;
        const lastTrim = String(lastUserMsg || '').trim();
        const firstU = nU >= 1 ? String(userMsgsUrban[0].content || '').trim() : '';
        const firstIsNature = lib.normalizeReportNature(firstU) !== null;
        const firstIsShortGreeting =
          firstU.length > 0 &&
          firstU.length <= 24 &&
          /^(oi|ol[aá]|opa|hey|bom\s+dia|boa\s+tarde|boa\s+noite)\b/i.test(firstU);
        const incidentOk =
          lib.messageLooksLikeUrbanIncidentStarter(lastTrim) &&
          lib.isValidDomainDescription(lastTrim, 'urban') &&
          !lib.isGenericIntentText(lastTrim) &&
          !lib.isBareUrbanReportNatureReply(lastTrim);
        const shapeOk =
          (nU === 1 && lastTrim === String(userMsgsUrban[0].content || '').trim()) ||
          (nU === 2 &&
            lastTrim === String(userMsgsUrban[1].content || '').trim() &&
            (firstIsNature || firstIsShortGreeting));
        if (
          shapeOk &&
          incidentOk &&
          accumulatedFields.location_method == null &&
          !accumulatedFields.urban_registered_address_ack
        ) {
          if (!accumulatedFields.report_nature) {
            accumulatedFields.report_nature = 'reclamacao';
          }
          accumulatedFields.description = lastTrim;
          console.log(
            '[ai-orchestrator] Urban incident opening: report_nature + description definidos → fluxo até location_method'
          );
        }
      }
      
      console.log('[ai-orchestrator] Effective collectionType:', collectionIntent.type);
      console.log('[ai-orchestrator] Accumulated fields:', JSON.stringify(accumulatedFields));
    }
    
    // Build dynamic system prompt with collected fields context
    let dynamicSystemPrompt = lib.systemPrompt;
    
    // ========== DETERMINISTIC NEXT STEP ENGINE ==========
    // Smart field sequencing that prevents repeated questions
    
    async function getNextMissingField(
      collectionType: string,
      fields: Record<string, unknown>,
      supabaseClient: SupabaseClient,
      classificationFeedbackReadClient: SupabaseClient,
      userIdForAddress: string
    ): Promise<{ field: string | null; picker: string | null; prompt: string | null }> {
      
      if (collectionType === 'urban_report') {
        // 0. Natureza do relato (reclamação, dúvida, sugestão, elogio) — jornada explícita (PO)
        const natureRaw = fields.report_nature;
        const natureStr = natureRaw != null ? String(natureRaw).trim() : '';
        const natureOk = (lib.URBAN_REPORT_NATURE_VALUES as readonly string[]).includes(natureStr);
        if (!natureOk) {
          return {
            field: 'report_nature',
            picker: null,
            prompt:
              '[FIELD_REQUEST:report_nature]Antes de começarmos, qual é o **tipo do seu relato** sobre a cidade?\n\n[QUICK_REPLY:reclamacao,duvida,sugestao,elogio]',
          };
        }

        // === NEW FLOW: Description FIRST, then category, then location ===
        
        // 1. DESCRIPTION first - let user tell us what's happening
        // CRITICAL: Use centralized NLP validation (isValidDomainDescription)
        const description = String(fields.description ?? '');
        const isGeneric = lib.isGenericIntentText(description);
        const isBareNature = lib.isBareUrbanReportNatureReply(String(description));
        const descToCheck = isGeneric || isBareNature ? '' : description;
        const isValidDesc = lib.isValidDomainDescription(descToCheck, 'urban');
        
        console.log('[getNextMissingField] Urban description check:', {
          description: description.substring(0, 40),
          isGeneric,
          isValidDesc
        });
        
        if (!isValidDesc) {
          const nk = natureStr || 'reclamacao';
          const descPrompts: Record<string, string> = {
            reclamacao: '**O que está acontecendo?** Me conta o problema.',
            duvida: '**Qual é sua dúvida** sobre a cidade, um serviço ou a infraestrutura? Descreva com o máximo de detalhes.',
            sugestao: '**Qual é sua sugestão ou ideia de melhoria?** Conte o que você imagina e, se souber, onde se aplica.',
            elogio: '**O que você quer elogiar?** Conte o que está funcionando bem e quem ou o quê fez diferença.',
          };
          const descPrompt =
            descPrompts[nk] || '**Conte mais:** o que você gostaria de registrar sobre a cidade?';
          return { field: 'description', picker: null, prompt: descPrompt };
        }
        
        // 1b. Abrangência: relatos só São Paulo — se já temos endereço/CEP com cidade (ex. Guarulhos), informar logo
        const cepDigitsEarly = fields.cep ? String(fields.cep).replace(/\D/g, '') : '';
        const hasLocationEarly = cepDigitsEarly.length === 8 || (!!fields.street && !!fields.neighborhood);
        const cityEarly = typeof fields.city === 'string' ? fields.city.trim() : undefined;
        if (hasLocationEarly && cityEarly && !lib.isCitySaoPaulo(cityEarly)) {
          return { field: null, picker: null, prompt: lib.MESSAGE_OUTSIDE_SAO_PAULO(cityEarly) };
        }
        
        // 2. CATEGORY + SUBCATEGORY - feedback loop primeiro, depois auto-classification
        if (!fields.category) {
          const descriptionLower = description.toLowerCase();

          // Feedback loop: correções anteriores com descrição similar têm prioridade
          const feedback = await lib.getClassificationFromFeedback(
            classificationFeedbackReadClient,
            description,
            'urban'
          );
          if (feedback) {
            fields.category = feedback.category;
            fields.subcategory = feedback.subcategory || lib.generateLabelFromDescription(description);
            fields._auto_classified = true;
            fields._from_feedback = true;
            console.log('[getNextMissingField] Category from feedback:', feedback.category, 'label:', fields.subcategory);
          } else if (/(armado|arma|armas|drogas?|tráfico|trafico|violência|violencia|agressão|agressao|baderna|funkeiros?)/i.test(descriptionLower)) {
          // CRITICAL: Check for urgent/grave problems first (security, violence, drugs, noise)
            if (/(barulho|som|música|música|festa|balada|ruído|ruido)/i.test(descriptionLower)) {
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
            const autoClass = lib.autoClassifyCategory(description);

            if (autoClass.category && autoClass.confidence >= 0.8) {
            // High confidence - auto-set category AND subcategory label
            fields.category = autoClass.category;
            fields.subcategory = autoClass.suggestedLabel || lib.generateLabelFromDescription(description);
            fields._auto_classified = true;
            console.log('[getNextMissingField] Auto-classified:', autoClass.category, 'label:', fields.subcategory, 'confidence:', autoClass.confidence);
          } else if (autoClass.category && autoClass.confidence >= 0.5) {
            // Medium confidence - ask for confirmation using intuitive label if available
            const intuitiveName = autoClass.suggestedLabel || (() => {
              const categoryLabels: Record<string, string> = {
                iluminacao: 'iluminação', via_publica: 'via pública', pavimentacao: 'pavimentação', calcada: 'calçada',
                sinalizacao: 'sinalização', drenagem: 'drenagem',
                lixo: 'lixo/entulho', esgoto: 'esgoto/alagamento', area_verde: 'área verde',
                higiene_urbana: 'higiene urbana', animais: 'animais', poluicao: 'poluição (barulho ou ar/fumaça)', outro: 'outro'
              };
              return categoryLabels[autoClass.category!] || autoClass.category;
            })();
            
            // Pre-set pending category and subcategory for when user confirms
            fields._pending_category = autoClass.category;
            fields._pending_subcategory = autoClass.suggestedLabel || lib.generateLabelFromDescription(description);
            return { field: 'category', picker: null, prompt: `[FIELD_REQUEST:category]Parece ser **${intuitiveName}**. Confirma? (sim/não, ou diga outro tipo)` };
          } else {
            // Low confidence - check if we already asked once
            const alreadyAskedCategory = fields._asked_category === true;

            if (alreadyAskedCategory) {
              // FALLBACK: Already asked and still no match - use 'outro' with generated label
              fields.category = 'outro';
              fields.subcategory = lib.generateLabelFromDescription(description);
              fields._fallback_category = true;
              console.log('[getNextMissingField] Fallback to outro with label:', fields.subcategory);
            } else {
              // First time - ask with expanded options including "outro"
              fields._asked_category = true;
              return { field: 'category', picker: null, prompt: 'Qual **tema** melhor descreve seu relato? (iluminação, buraco na via, **pavimentação/recape**, **sinalização** (semáforo/placa/faixa), **drenagem**/água pluvial/sarjeta, esgoto, lixo, barulho, praça/área verde, ou descreva com suas palavras)' };
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
            const autoClass = lib.autoClassifyCategory(String(fields.description ?? ''));
            fields.subcategory = autoClass.suggestedLabel || lib.generateLabelFromDescription(String(fields.description ?? ''));
          }
          console.log('[getNextMissingField] Set subcategory:', fields.subcategory);
        }
        
        // 2c. Como informar o local (GPS / cadastrado / CEP) — antes de pedir só o CEP
        if (!fields.location_method) {
          return {
            field: 'location_method',
            picker: '[LOCATION_METHOD_PICKER]',
            prompt:
              'Como você quer informar **onde fica** o problema?\n\nToque em **Usar minha localização (GPS)** abaixo, ou escolha **endereço cadastrado** / **digitar CEP ou endereço**.',
          };
        }
        if (fields.location_method === 'gps' && (fields.user_lat == null || fields.user_lon == null)) {
          return {
            field: 'gps_coords',
            picker: '[LOCATION_METHOD_PICKER]',
            prompt:
              'Preciso da sua posição: use **Usar minha localização (GPS)** abaixo e permita o acesso no navegador (e no celular, se pedir).',
          };
        }
        if (fields.location_method === 'registered_address' && userIdForAddress) {
          const cepDigitsPre = fields.cep ? String(fields.cep).replace(/\D/g, '') : '';
          const hasLocPre = cepDigitsPre.length === 8 || (!!fields.street && !!fields.neighborhood);
          if (!hasLocPre) {
            const { data: addrRows } = await supabaseClient
              .from('user_addresses')
              .select('street, number, neighborhood, city, zip_code, is_primary')
              .eq('user_id', userIdForAddress)
              .order('is_primary', { ascending: false })
              .limit(1);
            const addr = addrRows?.[0] as
              | { street?: string; number?: string; neighborhood?: string; city?: string; zip_code?: string }
              | undefined;
            if (addr?.street && addr.neighborhood) {
              fields.street = addr.street;
              fields.street_number = addr.number || '';
              fields.neighborhood = addr.neighborhood;
              fields.city = addr.city || fields.city;
              const z = String(addr.zip_code || '').replace(/\D/g, '');
              if (z.length === 8) fields.cep = z;
              fields._location_from_user_profile = true;
              console.log('[getNextMissingField] Urban: filled location from user_addresses');
            } else {
              return {
                field: 'cep',
                picker: '[ADDRESS_PICKER]',
                prompt:
                  'Não há **endereço cadastrado** no seu perfil (ou está incompleto). Qual o **CEP** do local do problema?\n\n_Se não souber, me diz a rua e bairro._',
              };
            }
          }
        }
        if (fields.location_method === 'gps') {
          const ulat = fields.user_lat != null ? Number(fields.user_lat) : NaN;
          const ulon = fields.user_lon != null ? Number(fields.user_lon) : NaN;
          if (Number.isFinite(ulat) && Number.isFinite(ulon)) {
            const cepDigitsG = fields.cep ? String(fields.cep).replace(/\D/g, '') : '';
            const hasLocG = cepDigitsG.length === 8 || (!!fields.street && !!fields.neighborhood);
            if (!hasLocG) {
              const rev = await lib.reverseGeocodeLatLon(ulat, ulon);
              if (rev) {
                const parts = rev.split(',').map((s: string) => s.trim()).filter(Boolean);
                if (parts.length >= 2) {
                  fields.street = parts[0].slice(0, 200);
                  fields.neighborhood = parts[1].slice(0, 120);
                } else {
                  fields.street = rev.slice(0, 200);
                  fields.neighborhood = 'Referência GPS';
                }
              } else {
                fields.street = 'Local informado por GPS';
                fields.neighborhood = 'Aproximação por coordenadas';
              }
              if (!fields.city) fields.city = 'São Paulo';
              console.log('[getNextMissingField] Urban: reverse geocode GPS →', fields.street, '|', fields.neighborhood);
            }
          }
        }
        
        // 3. Location: CEP OR (street AND neighborhood) - FLEXIBLE GROUP
        const cepDigits = fields.cep ? String(fields.cep).replace(/\D/g, '') : '';
        const hasLocationViaCep = cepDigits.length === 8;
        const hasLocationViaAddress = !!fields.street && !!fields.neighborhood;
        const hasResolvedLocation = hasLocationViaCep || hasLocationViaAddress;

        // Abrangência: relatos apenas no município de São Paulo — Guarulhos e demais cidades bloqueados
        const city = typeof fields.city === 'string' ? fields.city.trim() : undefined;
        if (hasResolvedLocation && city && !lib.isCitySaoPaulo(city)) {
          return { field: null, picker: null, prompt: lib.MESSAGE_OUTSIDE_SAO_PAULO(city) };
        }
        
        if (!hasResolvedLocation) {
          // If user already gave street without neighborhood (or vice versa), ask for the missing one
          if (fields.street && !fields.neighborhood) {
            return { field: 'neighborhood', picker: null, prompt: 'Em qual **bairro** fica essa rua?' };
          }
          if (fields.neighborhood && !fields.street) {
            return { field: 'street', picker: '[ADDRESS_PICKER]', prompt: 'Qual o **nome da rua**?' };
          }
          // manual, ou cadastro vazio: pedir CEP / busca de endereço
          const cepPrompt =
            fields.location_method === 'registered_address'
              ? 'Não encontrei endereço no seu **perfil**. Informe o **CEP** ou a rua e o bairro do local.\n\n_Se não souber o CEP, me diz a rua e bairro._'
              : 'Qual o **CEP** do local?\n\n_Se não souber, me diz a rua e bairro._';
          return { field: 'cep', picker: '[ADDRESS_PICKER]', prompt: `[FIELD_REQUEST:cep]${cepPrompt}` };
        }
        
        // 3b. Endereço cadastrado: mostrar o que veio do perfil e pedir confirmação antes de número/risco
        if (
          fields.location_method === 'registered_address' &&
          fields._location_from_user_profile === true &&
          !fields.urban_registered_address_ack &&
          hasLocationViaAddress
        ) {
          const st = String(fields.street || '').trim();
          const nb = String(fields.neighborhood || '').trim();
          const numRaw = fields.street_number != null ? String(fields.street_number).trim() : '';
          const num = numRaw ? `, ${numRaw}` : '';
          const cityPart = fields.city ? `, ${String(fields.city).trim()}` : '';
          const cepRaw = fields.cep ? String(fields.cep).replace(/\D/g, '') : '';
          const cepFmt = cepRaw.length === 8 ? `${cepRaw.slice(0, 5)}-${cepRaw.slice(5)}` : '';
          const cepPart = cepFmt ? ` — CEP ${cepFmt}` : '';
          const line = `**${st}${num}**, ${nb}${cityPart}${cepPart}`;
          return {
            field: 'urban_registered_address_ack',
            picker: null,
            prompt: `Encontrei este **endereço no seu perfil**:\n\n📍 ${line}\n\n**O problema é neste local?** Responda **sim** para continuar ou **não** para informar outro CEP ou endereço.`,
          };
        }

        // 4. Street number / reference (optional but helpful)
        if (!fields.street_number && !fields.reference_point) {
          return { field: 'street_number', picker: null, prompt: 'Qual o **número** ou **ponto de referência** próximo?' };
        }
        
        // 5. Gravidade / criticidade (risco) — inferência automática pelo texto; sem botões; pergunta só se incerto
        if (lib.URBAN_RISK_COLLECTION_CATEGORIES.includes(String(fields.category || ''))) {
          if (!fields.risk_level) {
            const inferText = `${String(fields.description ?? '')} ${fields.subcategory || ''}`.trim();
            const inferred =
              inferText.length >= 4
                ? lib.autoInferRisk(inferText)
                : { risk_level: null as string | null, confidence: 0, risk_types: [] as string[] };
            if (inferred.risk_level != null && inferred.confidence >= 0.4) {
              fields.risk_level = inferred.risk_level;
              if (inferred.risk_types?.length) fields.risk_types = inferred.risk_types;
              fields._risk_auto_inferred = true;
              console.log(
                '[getNextMissingField] Auto-inferred risk_level:',
                inferred.risk_level,
                'confidence:',
                inferred.confidence
              );
            } else {
              return {
                field: 'risk_level',
                picker: null,
                prompt:
                  'Qual o **nível de gravidade** deste relato? Toque em uma opção abaixo (ou descreva em uma frase, se preferir).[QUICK_REPLY:critical,moderate,low,none]',
              };
            }
          }
          if (['critical', 'moderate'].includes(String(fields.risk_level || '')) && !fields.affected_scope) {
            return { field: 'affected_scope', picker: null, prompt: 'Isso está afetando **só você**, **toda a rua** ou **o bairro todo**?' };
          }
        }
        
        // All required fields collected
        return { field: null, picker: null, prompt: null };
      }
      
      if (collectionType === 'transport_report') {
        const description = String(fields.description ?? '');
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
        
        // 2. Report type - feedback loop (correções admin/N8N) → fuzzy → fallback outro
        // If can't infer, use 'outro' with generated label (NEVER block the flow)
        if (!fields.report_type) {
          const transportFeedback = await lib.getClassificationFromFeedback(
            classificationFeedbackReadClient,
            description,
            'transport'
          );
          const validTransportTypes = ['atraso', 'lotacao', 'seguranca', 'acessibilidade', 'limpeza', 'conducao', 'outro'] as const;
          if (
            transportFeedback?.category &&
            (validTransportTypes as readonly string[]).includes(transportFeedback.category)
          ) {
            fields.report_type = transportFeedback.category;
            if (transportFeedback.subcategory) {
              fields.subcategory_label = transportFeedback.subcategory;
            }
            fields._from_classification_feedback = true;
            fields._transport_classification_route = 'feedback_loop';
            console.log(
              '[getNextMissingField] Transport report_type from classification feedback:',
              fields.report_type,
              transportFeedback.subcategory
            );
          }
        }

        // Sempre inferir report_type ANTES de pedir subcategoria (picker alinhado ao tipo real).
        if (!fields.report_type) {
          const fuzzyInferredType = lib.inferTransportTypeFromText(description);
          if (fuzzyInferredType) {
            fields.report_type = fuzzyInferredType;
            fields._transport_classification_route = 'fuzzy_text';
            console.log('[getNextMissingField] Fuzzy-inferred transport report_type:', fields.report_type);
          } else {
            const inferredFields = lib.extractTransportFields(description.toLowerCase());
            if (inferredFields.report_type) {
              fields.report_type = inferredFields.report_type;
              fields._transport_classification_route = 'keyword_extract';
              console.log('[getNextMissingField] Auto-inferred transport report_type:', fields.report_type);
            } else {
              fields.report_type = 'outro';
              fields._fallback_report_type = true;
              fields._transport_classification_route = 'fallback_outro';
              console.log('[getNextMissingField] Fallback transport report_type to outro');
            }
          }
        }

        const reportTypeForSub = String(fields.report_type || "outro").toLowerCase();
        const subTrimmed =
          fields.sub_category != null && String(fields.sub_category).trim() !== ""
            ? String(fields.sub_category).trim()
            : "";
        if (!subTrimmed || !lib.isValidTransportSubcategory(reportTypeForSub, subTrimmed)) {
          return {
            field: "sub_category",
            picker: `[SUBCATEGORY_PICKER:${reportTypeForSub}]`,
            prompt: "Qual detalhe descreve melhor esse problema?",
          };
        }
        
        // 3. Linha/estação — line_id do picker conta; hidratar line_code a partir do banco se faltar
        if (!fields.line_code && fields.line_id) {
          const lid = String(fields.line_id).trim();
          const uuidOk = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(lid);
          if (uuidOk) {
            const { data: tlRow } = await supabaseClient
              .from('transport_lines')
              .select('line_code')
              .eq('id', lid)
              .maybeSingle();
            if (tlRow?.line_code) {
              fields.line_code = String(tlRow.line_code).trim();
              console.log('[getNextMissingField] Hydrated line_code from transport_lines by line_id:', fields.line_code);
            }
          }
        }
        if (!fields.line_code && !fields.line_id) {
          return { field: 'line_code', picker: '[LINE_PICKER]', prompt: 'Qual **linha ou estação** teve o problema?' };
        }

        if (!fields.stop_name) {
          return {
            field: 'stop_name',
            picker: null,
            prompt: 'Qual foi a **parada, ponto, terminal ou estação** específicos onde isso aconteceu?',
          };
        }

        if (!fields.stop_location) {
          return {
            field: 'stop_location',
            picker: null,
            prompt:
              'Qual o **endereço, cruzamento ou referência** desse ponto? Se preferir, você também pode informar coordenadas `lat,lng`.',
          };
        }
        
        // 4. Date (REQUIRED - user must confirm)
        if (!fields.occurrence_date)
          return { field: 'occurrence_date', picker: '[DATE_PICKER]', prompt: '**Quando isso aconteceu?** (hoje, ontem, ou me diz a data)' };

        // 5. Time (REQUIRED - atomic collection)
        if (!fields.occurrence_time)
          return { field: 'occurrence_time', picker: '[TIME_PICKER]', prompt: 'Qual foi o **horário exato** da ocorrência?' };

        // 6. Direction (REQUIRED - atomic collection)
        if (!fields.direction)
          return { field: 'direction', picker: '[DIRECTION_PICKER]', prompt: 'Qual era o **sentido** da viagem?' };

        // 7. Recurrence frequency (REQUIRED - atomic collection)
        if (!fields.recurrence_frequency)
          return {
            field: 'recurrence_frequency',
            picker: '[RECURRENCE_FREQUENCY_PICKER]',
            prompt: 'Com qual frequência isso acontece?',
          };

        // 8. Stop name (REQUIRED - atomic collection, with skip option)
        if (!("stop_name" in fields))
          return {
            field: "stop_name",
            picker: "[QUICK_REPLY:não lembro]",
            prompt: 'Qual é o **ponto de embarque/parada** onde ocorreu o problema? (nome em texto livre)\n\nSe não lembrar, você pode pular.',
          };

        if (fields.personal_impact == null || fields.personal_impact === "")
          return {
            field: "personal_impact",
            picker: "[IMPACT_PICKER]",
            prompt: "Como isso afetou **sua rotina**?",
          };

        if (
          String(fields.report_type || "").toLowerCase() === "acessibilidade" &&
          !hasTransportAccessibilityDetails(fields.accessibility_details)
        ) {
          return {
            field: "accessibility_details",
            picker: "[ACCESSIBILITY_CHECKLIST]",
            prompt:
              "Para detalhar a ocorrência, marque o **checklist de acessibilidade** abaixo (rampa, elevador, piso tátil, apoio para embarque) e complemente se necessário.",
          };
        }
        
        // All required fields collected
        return { field: null, picker: null, prompt: null };
      }
      
      if (collectionType === 'service_rating') {
        // Evita "Butantã Butantã" no texto e nos parâmetros do picker (acúmulo / parsing duplicado)
        if (fields.service_neighborhood != null && String(fields.service_neighborhood).trim() !== '') {
          fields.service_neighborhood = lib.normalizeServiceRatingNeighborhood(fields.service_neighborhood);
        }

        // MODO VISITA: visit_id presente — mesmo roteiro atômico que o modo livre após identificar o serviço:
        // quatro dimensões (tempo, atendimento, infraestrutura, limpeza) + comentário; nota geral = média das dimensões.
        if (fields.visit_id) {
          const legacyFourDims =
            'tempo_espera_score' in fields &&
            'atendimento_score' in fields &&
            'infraestrutura_score' in fields &&
            'limpeza_score' in fields;
          const dimsComplete =
            lib.isCompleteServiceRatingDimensions(fields.rating_dimensions) || legacyFourDims;
          if (!dimsComplete) {
            return {
              field: 'rating_dimensions',
              picker: '[MULTI_DIMENSION_RATING_PICKER]',
              prompt:
                '**Avalie em quatro aspectos** (1 a 5 estrelas cada): tempo de espera, atendimento, infraestrutura e limpeza. Use o formulário abaixo.',
            };
          }
          if (!fields._rating_text_skipped) {
            if (fields.rating_text === undefined) {
              return {
                field: 'rating_text',
                picker: null,
                prompt:
                  'Você tem alguma **sugestão de melhoria** ou quer deixar um comentário extra? (Digite abaixo ou diga "pular")',
              };
            }
            if (typeof fields.rating_text === 'string' && fields.rating_text.length > 0 && fields.rating_text.length < 5) {
              return {
                field: 'rating_text',
                picker: null,
                prompt:
                  'Sua sugestão é um pouco curta. Pode detalhar um pouco mais? (Mín. 5 letras ou diga "pular")',
              };
            }
          }
          return { field: null, picker: null, prompt: null };
        }
        
        // MODO LIVRE: coleta service_type, service_name, confirmação de endereço
        // Bairro efetivo: campo explícito OU inferido de "UBS - Butantã" em service_name (LLM/COLLECTION_PROGRESS)
        let effectiveNeighborhood = String(fields.service_neighborhood || '').trim();
        if (!effectiveNeighborhood && fields.service_name) {
          const inferred = lib.inferServiceRatingNeighborhoodFromCompositeName(
            fields.service_name,
            String(fields.service_type),
          );
          if (inferred) effectiveNeighborhood = inferred;
        }

        // 1. Service type
        if (!fields.service_type) {
          return { field: 'service_type', picker: '[SERVICE_TYPE_PICKER]', prompt: 'Qual **tipo de serviço** você quer avaliar? (UBS, escola, hospital, CEU...)' };
        }
        
        // 2. Neighborhood first (para depois mostrar dropdown de serviços no bairro)
        if (!effectiveNeighborhood && !fields.service_address) {
          return {
            field: 'service_neighborhood',
            picker: null,
            prompt: lib.buildServiceRatingBairroPrompt(String(fields.service_type)),
          };
        }

        // 3. Service name com dropdown (SERVICE_PICKER) — mostra CEUs/serviços daquele bairro
        // Forçar picker se: vazio, muito curto, só o tipo ("CEU"/"UBS"), ou genérico "TIPO - Bairro"
        const nounPt = lib.getServiceRatingNounPt(String(fields.service_type));
        const sn = String(fields.service_name || '').trim();
        const neighStr = effectiveNeighborhood;
        const genericAddr = neighStr ? `${nounPt} - ${neighStr}` : '';
        const isGenericName =
          !!genericAddr &&
          !!sn &&
          lib.normalizeGenericServiceRatingName(sn) === lib.normalizeGenericServiceRatingName(genericAddr);
        const snLower = sn.toLowerCase();
        const isJustTypeLabel =
          !!sn &&
          (snLower === 'ceu' ||
            snLower === 'ubs' ||
            snLower === nounPt.toLowerCase() ||
            snLower === 'hospital' ||
            snLower === 'biblioteca' ||
            snLower === 'escola');
        // Chip "Bibliotecas"/"Hospitais" ou só categoria acumulada no service_name — ainda não é equipamento
        const isTypeOnlyEquipment = lib.isServiceRatingTypeOnlyEquipmentName(fields.service_name, String(fields.service_type));
        if (
          !fields.service_name ||
          String(fields.service_name).length < 3 ||
          isGenericName ||
          isJustTypeLabel ||
          isTypeOnlyEquipment
        ) {
          const labelQual =
            fields.service_type === 'ceu'
              ? 'CEU'
              : fields.service_type === 'ubs'
                ? 'UBS'
                : nounPt;
          const districtHint = neighStr ? ` em **${neighStr}**` : '';
          const typeParam = fields.service_type ? ':type=' + encodeURIComponent(String(fields.service_type)) : '';
          const districtParam = neighStr ? ':district=' + encodeURIComponent(neighStr) : '';
          const hideRatedParam = ':hideRatedToday=1';
          return {
            field: 'service_name',
            picker: `[SERVICE_PICKER${districtParam}${typeParam}${hideRatedParam}]`,
            prompt: `Qual **${labelQual}** você visitou${districtHint}? Selecione na lista abaixo.`,
          };
        }
        
        // 4. Address confirmation (NEW - CRITICAL)
        // If service_address_confirmed is undefined, we need to ask
        if (fields.service_address_confirmed === undefined) {
          const serviceTypeLabel: Record<string, string> = {
            ubs: 'UBS', school: 'escola', hospital: 'hospital',
            ceu: 'CEU', library: 'biblioteca', sports_center: 'centro esportivo'
          };
          const stKey = String(fields.service_type ?? '');
          const typeLabel = serviceTypeLabel[stKey] || stKey;
          
          // Build address - avoid duplication when service_name already contains neighborhood (e.g. "UBS - Butantã")
          const nameStr = String(fields.service_name ?? '');
          const neighForAddr = String(fields.service_neighborhood || '').trim() || effectiveNeighborhood;
          const nameHasNeigh = neighForAddr && nameStr.toLowerCase().includes(neighForAddr.toLowerCase());
          const address = fields.service_address ||
                          (nameStr ? (nameHasNeigh ? nameStr : neighForAddr ? `${nameStr} - ${neighForAddr}` : nameStr) : null);
          
          if (address) {
            return { 
              field: 'service_address_confirmed', 
              picker: `[SERVICE_ADDRESS_CONFIRM:${address}]`, 
              prompt: `O serviço fica em **${address}**. Está correto? (sim/não)` 
            };
          }
        }
        
        // 3b. If user said "no" to address, ask for correct neighborhood
        if (fields.service_address_confirmed === false && !fields.service_neighborhood) {
          const serviceTypeLabel: Record<string, string> = {
            ubs: 'UBS', school: 'escola', hospital: 'hospital',
            ceu: 'CEU', library: 'biblioteca', sports_center: 'centro esportivo'
          };
          const stKey2 = String(fields.service_type ?? '');
          const typeLabel = serviceTypeLabel[stKey2] || 'serviço';
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
        
        const legacyFourDimsFree =
          'tempo_espera_score' in fields &&
          'atendimento_score' in fields &&
          'infraestrutura_score' in fields &&
          'limpeza_score' in fields;
        const dimsCompleteFree =
          lib.isCompleteServiceRatingDimensions(fields.rating_dimensions) || legacyFourDimsFree;
        if (!dimsCompleteFree) {
          return {
            field: 'rating_dimensions',
            picker: '[MULTI_DIMENSION_RATING_PICKER]',
            prompt: lib.buildServiceRatingDimensionsPrompt(String(fields.service_type || "")),
          };
        }

        // 5. Rating text / Sugestão de melhoria (mín. 5 chars, ou pode "pular")
        if (!fields._rating_text_skipped) {
          if (fields.rating_text === undefined) {
            return {
              field: 'rating_text',
              picker: null,
              prompt:
                'Você tem alguma **sugestão de melhoria** ou quer deixar um comentário extra? (Digite abaixo ou diga "pular")',
            };
          }
          if (typeof fields.rating_text === 'string' && fields.rating_text.length > 0 && fields.rating_text.length < 5) {
            return {
              field: 'rating_text',
              picker: null,
              prompt:
                'Sua sugestão é um pouco curta. Pode detalhar um pouco mais? (Mín. 5 letras ou diga "pular")',
            };
          }
        }
        
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
          // Pedir número ou referência para geocodificar com mais precisão (evita resultados distantes)
          if (!fields.street_number && !fields.reference_point) {
            return { field: 'street_number', picker: null, prompt: '[FIELD_REQUEST:street_number]Qual o **número** ou **ponto de referência** próximo? (Ex.: 100, 1477, próximo ao mercado). _Opcional: responda "pular" para continuar._' };
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
    const getMessageText = (m: Record<string, unknown>): string => {
      const raw = m?.content;
      if (typeof raw === 'string') return raw;
      if (Array.isArray(raw)) {
        const part = raw.find((p: Record<string, unknown>) => p?.type === 'text' && p?.text);
        return part ? String(part.text) : '';
      }
      return '';
    };
    const lastUserMessage = getMessageText(chatMessages.filter((m: Record<string, unknown>) => m.role === 'user').pop() || {});
    const msgLower = lastUserMessage.toLowerCase().trim();
    const lastAssistantMessage = getMessageText(chatMessages.filter((m: Record<string, unknown>) => m.role === 'assistant').pop() || {});
    const lastAssistantLower = lastAssistantMessage.toLowerCase();
    const userMessagesOrdered = chatMessages.filter((m: Record<string, unknown>) => m.role === 'user');

    // Ocupação: após seleção no picker (mensagem com [SERVICE_ID:...]) — não cair no fluxo "serviços próximos" (location_method).
    const occupancyServiceIdMatch = lastUserMessage.match(/\[SERVICE_ID:([a-f0-9-]{36})\]/i);
    const lastAssistantHadOccupancyPicker =
      /\[OCCUPANCY_SERVICE_PICK\]/i.test(lastAssistantMessage) ||
      (/consultar a ocupação correta/i.test(lastAssistantMessage) && /\[SERVICE_PICKER/i.test(lastAssistantMessage)) ||
      (/Selecione na lista abaixo \(ou refine por nome\/bairro\)/i.test(lastAssistantMessage) && /\[SERVICE_PICKER/i.test(lastAssistantMessage));
    if (occupancyServiceIdMatch && lastAssistantHadOccupancyPicker) {
      try {
        const toolResult = await lib.executeTool(
          'get_service_occupancy_status',
          { service_id: occupancyServiceIdMatch[1] },
          user.id,
          supabase,
          accumulatedFields
        );
        const replyBody = toolResult.message || 'Não consegui consultar a ocupação agora.';
        const occReply = `[LIGHT_JOURNEY:occupancy]${replyBody}`;
        const ssePayload = JSON.stringify({ choices: [{ delta: { content: occReply } }] });
        console.log('[ai-orchestrator] Occupancy picker follow-up: get_service_occupancy_status by service_id');
        return new Response(`data: ${ssePayload}\n\ndata: [DONE]\n\n`, {
          headers: { ...lib.corsHeaders, 'Content-Type': 'text/event-stream' },
        });
      } catch (e) {
        console.error('[ai-orchestrator] Occupancy short-circuit failed:', e);
      }
    }

    // Encaminhar relato para vereador: se a última resposta do bot foi "Relato registrado com sucesso" e o usuário pede para encaminhar para vereador, NÃO criar novo relato — chamar suggest_council_member
    const lastBotWasReportSuccess = /relato\s+registrado\s+com\s+sucesso|(?:URB|REL)-20\d{2}-\d+/.test(lastAssistantLower);
    const userWantsForwardToCouncil = /(encaminhar|enviar)\s+(meu\s+)?relato\s+para\s+(um\s+)?vereador|(poderia\s+)?encaminhar\s+meu\s+relato\s+para\s+um\s+vereador|enviar\s+meu\s+relato\s+para\s+vereador/i.test(lastUserMessage.trim());
    if (lastBotWasReportSuccess && userWantsForwardToCouncil) {
      const catMatch = lastAssistantMessage.match(/Categoria:\s*\*?\*?\s*([^\n]+)/i);
      const descMatch = lastAssistantMessage.match(/Descri[cç][aã]o:\s*\*?\*?\s*([^\n]+)/i);
      const descText = (descMatch && descMatch[1]) ? descMatch[1].trim() : 'Problema urbano reportado';
      const categoryLabel = (catMatch && catMatch[1]) ? catMatch[1].trim() : '';
      let district: string | undefined;
      const afterEndereco = lastAssistantMessage.split(/Endere[cç]o:\s*/i)[1];
      if (afterEndereco) {
        const lines = afterEndereco.split(/\n/).map((l: string) => l.replace(/^-\s*/, '').trim()).filter((l: string) => l.length > 0 && !/^\d{5}-?\d{3}$/.test(l.replace(/\s/g, '')) && !/^CEP\s*/i.test(l));
        if (lines.length >= 2) district = lines[1];
      }
      const description = descText;
      const categoryToIssueType: Record<string, string> = {
        'via_publica': 'urbanismo', 'via pública': 'urbanismo', 'pavimentacao': 'urbanismo', 'pavimentação': 'urbanismo',
        'iluminacao': 'urbanismo', 'iluminação': 'urbanismo',
        'calcada': 'urbanismo', 'calçada': 'urbanismo', 'sinalizacao': 'urbanismo', 'sinalização': 'urbanismo',
        'drenagem': 'urbanismo', 'lixo': 'urbanismo', 'esgoto': 'urbanismo',
        'area_verde': 'meio_ambiente', 'área verde': 'meio_ambiente', 'feedback_camara': 'urbanismo', 'feedback câmara': 'urbanismo'
      };
      let issueType = 'urbanismo';
      const catLower = categoryLabel.toLowerCase();
      for (const [k, v] of Object.entries(categoryToIssueType)) {
        if (catLower.includes(k)) { issueType = v; break; }
      }
      const councilResult = await lib.suggestCouncilMember(issueType, description, district);
      const reply = `Claro! Seu relato já foi registrado. Para encaminhar a um vereador, seguem sugestões de parlamentares que podem ajudar com esse tipo de demanda:\n\n${councilResult}\n\nPosso ajudar com mais alguma coisa?`;
      const ssePayload = JSON.stringify({ choices: [{ delta: { content: reply } }] });
      console.log('[ai-orchestrator] Encaminhar relato para vereador: short-circuit suggest_council_member (evita criar novo relato)');
      return new Response(`data: ${ssePayload}\n\ndata: [DONE]\n\n`, { headers: { ...lib.corsHeaders, 'Content-Type': 'text/event-stream' } });
    }

    const lastBotWasRatingSuccess = /\[RATING_CREATED:/i.test(lastAssistantMessage);
    const userWantsForwardRatingToCouncil =
      /encaminhar\s+minha\s+avalia[cç][aã]o|avalia[cç][aã]o\s+.*vereador|encaminhar.*avalia[cç][aã]o.*vereador/i.test(
        lastUserMessage.trim(),
      );
    if (lastBotWasRatingSuccess && userWantsForwardRatingToCouncil) {
      const serviceMatch = lastAssistantMessage.match(/\*\*Servi[cç]o:\*\*\s*([^\n]+)/i);
      const commentMatch =
        lastAssistantMessage.match(/📝\s*\*\*Coment[aá]rio:\*\*\s*([^\n]+)/i) ||
        lastAssistantMessage.match(/\*\*Coment[aá]rio:\*\*\s*([^\n]+)/i);
      const description = [
        'Manifestação do cidadão sobre avaliação de serviço público.',
        serviceMatch ? `Equipamento: ${serviceMatch[1].trim()}` : '',
        commentMatch ? `Trecho do comentário: ${commentMatch[1].trim().slice(0, 240)}` : '',
      ]
        .filter(Boolean)
        .join('\n');
      const councilResult = await lib.suggestCouncilMember('urbanismo', description || 'Avaliação de serviço público', undefined);
      const reply = `Certo. Para encaminhar sua **avaliação** a um vereador, seguem sugestões de parlamentares:\n\n${councilResult}\n\nPosso ajudar com mais alguma coisa?`;
      const ssePayload = JSON.stringify({ choices: [{ delta: { content: reply } }] });
      console.log('[ai-orchestrator] Encaminhar avaliação para vereador: short-circuit suggest_council_member');
      return new Response(`data: ${ssePayload}\n\ndata: [DONE]\n\n`, { headers: { ...lib.corsHeaders, 'Content-Type': 'text/event-stream' } });
    }

    // Primeira pergunta "como chegar em X" → resposta fixa com as 3 opções (GPS, endereço cadastrado, digitar)
    const isFirstMessageComoChegar = userMessagesOrdered.length === 1 && (
      /como\s+chegar\s+(?:em|na|no|ao|à|a)\s+/i.test(lastUserMessage) || /como\s+chegar\s+ao?\s+/i.test(lastUserMessage)
    );
    if (isFirstMessageComoChegar) {
      const routeAskOrigin = `[FIELD_REQUEST:location_method]Para te ajudar com a rota, preciso saber de onde você está saindo. Como você quer informar sua localização?\n\n[LOCATION_METHOD_PICKER]`;
      const ssePayload = JSON.stringify({ choices: [{ delta: { content: routeAskOrigin } }] });
      console.log('[ai-orchestrator] Como chegar (first turn): returning location method picker');
      return new Response(`data: ${ssePayload}\n\ndata: [DONE]\n\n`, {
        headers: { ...lib.corsHeaders, 'Content-Type': 'text/event-stream' }
      });
    }

    // Rota entre dois endereços: usuário pediu "como chegar em X", assistente perguntou "de onde?", usuário informou origem (endereço, GPS ou endereço cadastrado)
    // Destino: primeira mensagem do usuário que contém "como chegar em/na/ao X" (pode haver "Digitar CEP" no meio)
    if (userMessagesOrdered.length >= 2) {
      const originCandidate = getMessageText(userMessagesOrdered[userMessagesOrdered.length - 1]).trim();
      let destinationFromHistory = '';
      for (let i = 0; i < userMessagesOrdered.length; i++) {
        const uContent = getMessageText(userMessagesOrdered[i]).trim();
        const matchDest = uContent.match(/como\s+chegar\s+(?:em|na|no|ao|à|a)\s+(.+)/i) || uContent.match(/como\s+chegar\s+ao?\s+(.+)/i);
        if (matchDest) {
          destinationFromHistory = matchDest[1].trim();
          break;
        }
      }
      const assistantAskedOrigin = /(de\s+onde|ponto\s+de\s+partida|onde\s+(você|voce)\s+(está|esta)\s+saindo|qual\s+(é|e)\s+(o\s+)?seu\s+ponto|saindo\s+de\s+qual|gostaria\s+de\s+sair|como\s+você\s+quer\s+informar|informar\s+sua\s+localiza[cç][aã]o|LOCATION_METHOD_PICKER|qual\s+seu\s+cep)/i.test(lastAssistantMessage);
      const assistantAskedCepOrAddress = /(qual\s+seu\s+cep|qual\s+o\s+endere[cç]o|digite\s+o\s+cep)/i.test(lastAssistantMessage);
      const assistantAskedStreetNumber = /(qual\s+o\s+n[uú]mero|n[uú]mero\s+do\s+endere[cç]o|n[uú]mero\s+de\s+partida)/i.test(lastAssistantMessage);
      const isInComoChegarFlow = assistantAskedOrigin || assistantAskedCepOrAddress || assistantAskedStreetNumber;
      if (!isInComoChegarFlow || !destinationFromHistory) {
        // skip
      } else {
        // Não gerar rota quando o usuário só escolheu "Digitar CEP ou endereço" — pedir CEP/endereço e aguardar a próxima mensagem
        const isChoiceDigitarCep = /^digitar\s+cep\s+ou\s+endere[cç]o$/i.test(originCandidate.trim());
        if (isChoiceDigitarCep) {
          const askCepForRoute = `[FIELD_REQUEST:cep]Qual seu CEP ou endereço de partida? (Digite o CEP ou a rua e o bairro.)\n\n[ADDRESS_PICKER]`;
          const ssePayload = JSON.stringify({ choices: [{ delta: { content: askCepForRoute } }] });
          console.log('[ai-orchestrator] Como chegar: user chose digitar CEP, asking for address');
          return new Response(`data: ${ssePayload}\n\ndata: [DONE]\n\n`, { headers: { ...lib.corsHeaders, 'Content-Type': 'text/event-stream' } });
        } else {
        // Se o assistente pediu o número e o usuário enviou só o número, combinar com o endereço da mensagem anterior
        let originForUrl = '';
        if (assistantAskedStreetNumber && userMessagesOrdered.length >= 2) {
          const streetNumberCandidate = originCandidate.trim();
          const looksLikeNumber = /^[\d\s-]+$/.test(streetNumberCandidate) || /^(casa|n[°º]?|n[uú]mero)\s*[\d-]+$/i.test(streetNumberCandidate);
          if (looksLikeNumber) {
            const prevAddress = getMessageText(userMessagesOrdered[userMessagesOrdered.length - 2]).trim();
            const prevAddressRaw = prevAddress.replace(/^Endere[cç]o\s+selecionado\s*:\s*/i, '').trim();
            const num = streetNumberCandidate.replace(/^(casa|n[°º]?|n[uú]mero)\s*/i, '').trim();
            if (prevAddressRaw.length >= 5 && num.length > 0) {
              // Inserir número após o nome da rua (ex: "Rua X - Bairro, Cidade - CEP" → "Rua X, 123 - Bairro, Cidade - CEP")
              originForUrl = prevAddressRaw.includes(' - ') ? prevAddressRaw.replace(/\s+-\s+/, `, ${num} - `) : `${prevAddressRaw}, ${num}`;
            }
          }
        }
        // Origem: endereço digitado (inclui "Endereço selecionado: Rua X - Bairro, Cidade - CEP: ...")
        const originAddressRaw = originCandidate.replace(/^Endere[cç]o\s+selecionado\s*:\s*/i, '').trim();
        const looksLikeAddress = (originAddressRaw.length >= 5 && (/\d/.test(originAddressRaw) || /(rua|av\.|avenida|r\.|alameda|praça|travessa|jd\.|jardim|endereço|cep)/i.test(originAddressRaw))) || /Endere[cç]o\s+selecionado\s*:/i.test(originCandidate);
        // Endereço vindo de CEP geralmente não tem número (ex: "Rua X - Bairro, Cidade - CEP: ...") — pedir o número antes de gerar a rota
        const hasStreetNumber = /,\s*\d{1,5}(\s+[A-Za-z])?\s*-\s+/.test(originAddressRaw);
        if (looksLikeAddress && !hasStreetNumber && !originForUrl) {
          const askNumber = `Qual o número do endereço de partida? (Ex.: 100, 456 A, sobrado)`;
          const ssePayload = JSON.stringify({ choices: [{ delta: { content: askNumber } }] });
          console.log('[ai-orchestrator] Como chegar: address without number, asking for number');
          return new Response(`data: ${ssePayload}\n\ndata: [DONE]\n\n`, { headers: { ...lib.corsHeaders, 'Content-Type': 'text/event-stream' } });
        }
        const originFinal = originForUrl || (looksLikeAddress ? originAddressRaw : originCandidate);
        const hasGps = /Localiza[cç][aã]o\s*GPS/i.test(originCandidate);
        const coordMatch = originCandidate.match(/Localiza[cç][aã]o\s*GPS\s*[-:]?\s*(-?[\d.]+)\s*[,，]\s*(-?[\d.]+)/i) || (hasGps ? originCandidate.match(/(-?[\d.]+)\s*[,，]\s*(-?[\d.]+)/) : null);
        const isRegisteredAddress = /usar\s+endere[cç]o\s+cadastrado/i.test(originCandidate);

        if ((looksLikeAddress || originForUrl) && originFinal.length >= 5) {
          const routeUrl = lib.buildGoogleMapsDirectionsUrlFromAddresses(originFinal, destinationFromHistory);
          let routeMessage = `Trajeto de **${originFinal}** até **${destinationFromHistory}** (transporte público):\n\nNo link abaixo o Google Maps mostra o **passo a passo**: quais ônibus ou metrô pegar, onde embarcar e onde descer. Abra o link para ver as conduções detalhadas.\n\n[Abrir rota no Google Maps](${routeUrl})\n\nPosso ajudar em mais alguma coisa?`;
          const googleMapsKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
          if (googleMapsKey) {
            const directions = await lib.fetchGoogleDirectionsTransit(originFinal, destinationFromHistory, googleMapsKey);
            if (directions.ok && (directions.steps.length || directions.durationText || directions.distanceText)) {
              const previsao: string[] = [];
              if (directions.durationText) previsao.push(`**Tempo estimado:** cerca de ${directions.durationText}`);
              if (directions.distanceText) previsao.push(`**Distância:** ${directions.distanceText}`);
              const previsaoLine = previsao.length ? previsao.join(' · ') + '\n\n' : '';
              const stepsBlock = directions.steps.length ? directions.steps.join('\n') + '\n\n' : '';
              routeMessage = `**Passo a passo:**\n\n${previsaoLine}${stepsBlock}---\n\n${routeMessage}`;
            }
          }
          const ssePayload = JSON.stringify({ choices: [{ delta: { content: routeMessage } }] });
          console.log('[ai-orchestrator] Route link generated (two addresses):', originFinal, '->', destinationFromHistory);
          return new Response(`data: ${ssePayload}\n\ndata: [DONE]\n\n`, { headers: { ...lib.corsHeaders, 'Content-Type': 'text/event-stream' } });
        }
        if (coordMatch) {
          const lat = parseFloat(coordMatch[1].trim());
          const lon = parseFloat(coordMatch[2].trim());
          if (!Number.isNaN(lat) && !Number.isNaN(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
            const routeUrl = lib.buildGoogleMapsDirectionsUrl(lat, lon, destinationFromHistory);
            let routeMessage = `Trajeto da sua localização atual até **${destinationFromHistory}** (transporte público):\n\nNo link abaixo o Google Maps mostra o **passo a passo**: quais ônibus ou metrô pegar, onde embarcar e onde descer. Abra o link para ver as conduções detalhadas.\n\n[Abrir rota no Google Maps](${routeUrl})\n\nPosso ajudar em mais alguma coisa?`;
            const googleMapsKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
            if (googleMapsKey) {
              const originCoord = `${lat},${lon}`;
              const directions = await lib.fetchGoogleDirectionsTransit(originCoord, destinationFromHistory, googleMapsKey);
              if (directions.ok && (directions.steps.length || directions.durationText || directions.distanceText)) {
                const previsao: string[] = [];
                if (directions.durationText) previsao.push(`**Tempo estimado:** cerca de ${directions.durationText}`);
                if (directions.distanceText) previsao.push(`**Distância:** ${directions.distanceText}`);
                const previsaoLine = previsao.length ? previsao.join(' · ') + '\n\n' : '';
                const stepsBlock = directions.steps.length ? directions.steps.join('\n') + '\n\n' : '';
                routeMessage = `**Passo a passo:**\n\n${previsaoLine}${stepsBlock}---\n\n${routeMessage}`;
              }
            }
            const ssePayload = JSON.stringify({ choices: [{ delta: { content: routeMessage } }] });
            console.log('[ai-orchestrator] Route link generated (GPS -> destination):', lat, lon, '->', destinationFromHistory);
            return new Response(`data: ${ssePayload}\n\ndata: [DONE]\n\n`, { headers: { ...lib.corsHeaders, 'Content-Type': 'text/event-stream' } });
          }
        }
        if (isRegisteredAddress) {
          const { data: addr } = await supabase.from('user_addresses').select('latitude, longitude, street, street_number, neighborhood').eq('user_id', user.id).eq('is_primary', true).maybeSingle();
          if (addr?.latitude != null && addr?.longitude != null) {
            const routeUrl = lib.buildGoogleMapsDirectionsUrl(Number(addr.latitude), Number(addr.longitude), destinationFromHistory);
            const originLabel = [addr.street, addr.street_number, addr.neighborhood].filter(Boolean).join(', ') || 'seu endereço cadastrado';
            let routeMessage = `Trajeto de **${originLabel}** até **${destinationFromHistory}** (transporte público):\n\nNo link abaixo o Google Maps mostra o **passo a passo**: quais ônibus ou metrô pegar, onde embarcar e onde descer. Abra o link para ver as conduções detalhadas.\n\n[Abrir rota no Google Maps](${routeUrl})\n\nPosso ajudar em mais alguma coisa?`;
            const googleMapsKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
            if (googleMapsKey) {
              const originCoord = `${addr.latitude},${addr.longitude}`;
              const directions = await lib.fetchGoogleDirectionsTransit(originCoord, destinationFromHistory, googleMapsKey);
              if (directions.ok && (directions.steps.length || directions.durationText || directions.distanceText)) {
                const previsao: string[] = [];
                if (directions.durationText) previsao.push(`**Tempo estimado:** cerca de ${directions.durationText}`);
                if (directions.distanceText) previsao.push(`**Distância:** ${directions.distanceText}`);
                const previsaoLine = previsao.length ? previsao.join(' · ') + '\n\n' : '';
                const stepsBlock = directions.steps.length ? directions.steps.join('\n') + '\n\n' : '';
                routeMessage = `**Passo a passo:**\n\n${previsaoLine}${stepsBlock}---\n\n${routeMessage}`;
              }
            }
            const ssePayload = JSON.stringify({ choices: [{ delta: { content: routeMessage } }] });
            console.log('[ai-orchestrator] Route link generated (registered address -> destination)');
            return new Response(`data: ${ssePayload}\n\ndata: [DONE]\n\n`, { headers: { ...lib.corsHeaders, 'Content-Type': 'text/event-stream' } });
          }
        }
        }
      }
    }

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
      // 1) Prioridade: coordenadas na conversa ("Localização GPS: lat,lon") ou accumulatedFields (services)
      const allMessages = [...chatMessages].reverse(); // mais recente primeiro
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
      const isBusQuery = lib.isBusInformationalQuery(lastUserMessage);
      const isDuvidaOpener = /d[uú]vida|pergunta|como funciona|quero saber|informa[cç][aã]o/i.test(lastUserMessage);
      if (!isBusQuery && isDuvidaOpener && chatMessages.filter((m: Record<string, unknown>) => m.role === 'user').length <= 1) {
        const greeting = `[LIGHT_JOURNEY:general]Claro! Pode perguntar sobre a Câmara Municipal: funcionamento, audiências, vereadores, processos ou qualquer outra dúvida. Qual sua pergunta?`;
        const ssePayload = JSON.stringify({ choices: [{ delta: { content: greeting } }] });
        return new Response(`data: ${ssePayload}\n\ndata: [DONE]\n\n`, {
          headers: { ...lib.corsHeaders, 'Content-Type': 'text/event-stream' }
        });
      }
    }
    
    // === SERVIÇOS PRÓXIMOS: quando o usuário já disse o tipo ("quais hospitais mais perto de mim", "qual UBS perto de mim", etc.) → pedir CEP direto ===
    const isOnlyCepEarly = /^\d{5}-?\d{3}$/.test(lastUserMessage.trim());
    const proximityPhrases = [
      /mais\s+perto\s+de\s+mim/i,
      /mais\s+pr[oó]ximo[s]?\s+(?:de\s+)?mim/i,
      /perto\s+de\s+mim/i,
      /pr[oó]ximo[s]?\s+a\s+mim/i,
      /perto\s+aqui/i,
      /na\s+minha\s+regi[aã]o/i,
      /(?:mais\s+)?pr[oó]ximo[s]?\b/i,
      /procurando|buscar|encontrar/i,
    ];
    const serviceSearchMatchEarly = !isOnlyCepEarly && proximityPhrases.some((p) => p.test(msgLower));
    const inferredServiceTypeEarly = lib.inferServiceTypeFromText(lastUserMessage);
    if (
      inferredServiceTypeEarly &&
      serviceSearchMatchEarly &&
      lastUserMessage.length < 120 &&
      (!collectionIntent || collectionIntent.type === 'general')
    ) {
      const askCepMsg = `Vou te ajudar a encontrar ${lib.getServiceTypeName(inferredServiceTypeEarly)} próximas a você. Qual é o CEP da sua região? (Se não souber, pode informar o bairro.)`;
      const progressPayload = { service_type: inferredServiceTypeEarly };
      const withMarker = (lightJourneyMarker ? lightJourneyMarker : '') + `[COLLECTION_PROGRESS:services:${JSON.stringify(progressPayload)}]${askCepMsg}`;
      const ssePayload = JSON.stringify({ choices: [{ delta: { content: withMarker } }] });
      console.log('[ai-orchestrator] Services: ask CEP first (tipo já na pergunta):', inferredServiceTypeEarly);
      return new Response(`data: ${ssePayload}\n\ndata: [DONE]\n\n`, {
        headers: { ...lib.corsHeaders, 'Content-Type': 'text/event-stream' }
      });
    }

    if (collectionIntent && ['urban_report', 'transport_report', 'service_rating', 'services'].includes(collectionIntent.type)) {
      nextFieldInfo = await getNextMissingField(
        collectionIntent.type,
        accumulatedFields,
        supabase,
        supabaseClassificationFeedbackRead ?? supabase,
        user.id
      );
      console.log('[ai-orchestrator] Deterministic next field:', nextFieldInfo.field);
      
      // === CRITICAL FIX: Auto-call create function when all fields are ready ===
      // Since vLLM doesn't have tool calling, we need to call it deterministically
      if (!nextFieldInfo.field && accumulatedFields) {
        console.log('[ai-orchestrator] All fields collected, auto-calling create function for:', collectionIntent.type);
        
        let toolResult;
        try {
          if (collectionIntent.type === 'urban_report') {
            const lastOfferedCorrectionOptions =
              /Selecione uma opção abaixo/i.test(lastAssistantLower) &&
              /\[QUICK_REPLY:.*gravidade/i.test(lastAssistantMessage);
            const userPickedGravidadeCorrection = /^(gravidade|gravidad)$/i.test(msgLower.trim());
            if (lastOfferedCorrectionOptions && userPickedGravidadeCorrection) {
              const riskAsk =
                `[COLLECTION_PROGRESS:urban_report:${JSON.stringify(accumulatedFields)}]` +
                `[FIELD_REQUEST:risk_level]Qual o **nível de gravidade** correto para este relato?[QUICK_REPLY:critical,moderate,low,none]`;
              const ssePayload = JSON.stringify({ choices: [{ delta: { content: riskAsk } }] });
              console.log('[ai-orchestrator] Urban report: correction → gravidade com botões');
              return new Response(`data: ${ssePayload}\n\ndata: [DONE]\n\n`, {
                headers: { ...lib.corsHeaders, 'Content-Type': 'text/event-stream' },
              });
            }
            // --- Fluxo: perguntar "deseja anexar imagens?" → sim: mostrar anexos; não: mostrar preview → confirmar → criar ---
            const askedPhotoChoice = /deseja\s+anexar\s+imagens|quer\s+anexar\s+fotos/i.test(lastAssistantLower);
            const askedToAttach = /pode\s+anexar\s+at[eé]\s*3\s+fotos|quando\s+terminar.*continuar|envie\s+\*?continuar\*?/i.test(lastAssistantLower);
            const showedPreview = /resumo\s+do\s+relato|se\s+estiver\s+tudo\s+certo|confirmar\s+e\s+registrar/i.test(lastAssistantLower);
            const userSaidYes = /^(sim|quero|quero\s+sim|yes|pode\s+ser|pode|desejo)$/i.test(msgLower);
            const userSaidNo = /^(n[aã]o|nao|no|n[aã]o\s+quero|n[aã]o\s+desejo)$/i.test(msgLower);
            const userConfirms = /^(sim|confirmar|registrar|ok|tudo\s+certo)$/i.test(msgLower);
            const userWantsCorrection = /^(corrigir|corrigir\s+relato|editar|ajustar)$/i.test(msgLower.trim());

            const showedSimilarReports =
              /\[SIMILAR_URBAN_REPORTS_B64:/i.test(lastAssistantLower) ||
              /relatos\s+na\s+mesma\s+categoria/i.test(lastAssistantLower);
            const userWantsNewAfterSimilar =
              /^(novo_relato|novo\s+relato|registrar\s+novo|criar\s+novo|mesmo\s+assim)\b/i.test(msgLower.trim());
            const askedCorrectionField =
              /qual\s+campo\s+voc[eê]\s+gostaria\s+de\s+corrigir|voc[eê]\s+pode\s+me\s+dizer,\s*por\s+exemplo/i.test(lastAssistantLower);
            const userSentCorrectionLikeText =
              /\b(n[aã]o\s+[ée]|n[aã]o\s+est[aá]|est[aá]\s+errad|corrig|deveria\s+ser)\b/i.test(msgLower);

            // 0) Após lista de relatos próximos: usuário escolheu seguir com novo relato → perguntar fotos
            if (
              showedSimilarReports &&
              userWantsNewAfterSimilar &&
              !askedPhotoChoice &&
              !askedToAttach &&
              !showedPreview
            ) {
              const photoChoiceMsg = `[COLLECTION_PROGRESS:urban_report:${JSON.stringify(accumulatedFields)}]Ótimo, já tenho todas as informações. **Você deseja anexar imagens ao seu relato?**[QUICK_REPLY:sim,não]`;
              const ssePayload = JSON.stringify({ choices: [{ delta: { content: photoChoiceMsg } }] });
              console.log('[ai-orchestrator] Urban report: similar reports acknowledged → asking photo choice');
              return new Response(`data: ${ssePayload}\n\ndata: [DONE]\n\n`, {
                headers: { ...lib.corsHeaders, 'Content-Type': 'text/event-stream' }
              });
            }

            // 1) Ainda não perguntamos relatos próximos nem fotos → tentar relatos na mesma região (K mais próximos por distância)
            if (!askedPhotoChoice && !askedToAttach && !showedPreview && !showedSimilarReports) {
              // Se estamos no subfluxo de correção do preview, não reabrir lista de similares;
              // seguir direto para o resumo atualizado para confirmar/corrigir.
              if (askedCorrectionField || userSentCorrectionLikeText) {
                const catLabels: Record<string, string> = {
                  iluminacao: 'Iluminação', via_publica: 'Via Pública', pavimentacao: 'Pavimentação', calcada: 'Calçada', lixo: 'Lixo/Entulho',
                  sinalizacao: 'Sinalização', drenagem: 'Drenagem',
                  esgoto: 'Esgoto/Bueiro', area_verde: 'Área Verde', higiene_urbana: 'Higiene Urbana',
                  animais: 'Animais', poluicao: 'Poluição', feedback_camara: 'Feedback Câmara', outro: 'Outro'
                };
                const cat = String(accumulatedFields.category || '');
                const catLabel = catLabels[cat] || cat;
                const natureK = String(accumulatedFields.report_nature || 'reclamacao');
                const natureLabel =
                  lib.REPORT_NATURE_LABELS[natureK as keyof typeof lib.REPORT_NATURE_LABELS] || natureK;
                const addr = [accumulatedFields.street, accumulatedFields.street_number, accumulatedFields.reference_point]
                  .filter(Boolean).join(', ');
                const neighborhood = accumulatedFields.neighborhood ? ` - ${accumulatedFields.neighborhood}` : '';
                const preview = `[COLLECTION_PROGRESS:urban_report:${JSON.stringify(accumulatedFields)}]**Resumo do relato**

• **Natureza:** ${natureLabel}
• **Categoria:** ${catLabel}${lib.formatUrbanReportPreviewAfterCategory(accumulatedFields as Record<string, unknown>)}
• **Descrição:** ${(accumulatedFields.description || '').toString().slice(0, 200)}${(accumulatedFields.description || '').toString().length > 200 ? '...' : ''}${lib.formatUrbanReportPreviewAfterDescription(accumulatedFields as Record<string, unknown>)}
• **Endereço:** ${addr}${neighborhood}

Se estiver tudo certo, clique em **Confirmar** para registrar ou em **Corrigir** para alterar algo.[QUICK_REPLY:confirmar,corrigir]`;
                const ssePayload = JSON.stringify({ choices: [{ delta: { content: preview } }] });
                console.log('[ai-orchestrator] Urban report: correction context detected → skipping similar list and showing updated preview');
                return new Response(`data: ${ssePayload}\n\ndata: [DONE]\n\n`, {
                  headers: { ...lib.corsHeaders, 'Content-Type': 'text/event-stream' }
                });
              }
              const cat = String(accumulatedFields.category || '');
              if (cat && cat !== 'feedback_camara') {
                try {
                  const coords = await lib.resolveUrbanCoordsForSimilarSearch(supabase, accumulatedFields);
                  if (coords) {
                    const near = await lib.fetchNearestUrbanReportsForSimilarity(
                      supabase,
                      coords.lat,
                      coords.lon,
                      cat,
                      user.id,
                      10,
                    );
                    if (near.length > 0) {
                      const payload = { reports: near, center: coords };
                      const json = JSON.stringify(payload);
                      const b64 = btoa(unescape(encodeURIComponent(json)));
                      const intro =
                        `Encontramos **relatos na mesma categoria** próximos do local informado, **do mais próximo ao mais distante** (até ${near.length} registros). Você pode **apoiar** um relato existente ou **registrar um novo**.`;
                      const similarMsg = `[COLLECTION_PROGRESS:urban_report:${JSON.stringify(accumulatedFields)}]${intro}\n\n[SIMILAR_URBAN_REPORTS_B64:${b64}]\n\nToque em **Registrar novo relato** para seguir com o seu pedido (fotos e confirmação).[QUICK_REPLY:novo_relato]`;
                      const ssePayload = JSON.stringify({ choices: [{ delta: { content: similarMsg } }] });
                      console.log('[ai-orchestrator] Urban report: showing nearest similar reports, count:', near.length);
                      return new Response(`data: ${ssePayload}\n\ndata: [DONE]\n\n`, {
                        headers: { ...lib.corsHeaders, 'Content-Type': 'text/event-stream' }
                      });
                    }
                  }
                } catch (e) {
                  console.warn('[ai-orchestrator] Urban similar reports lookup failed:', e);
                }
              }
              const photoChoiceMsg = `[COLLECTION_PROGRESS:urban_report:${JSON.stringify(accumulatedFields)}]Ótimo, já tenho todas as informações. **Você deseja anexar imagens ao seu relato?**[QUICK_REPLY:sim,não]`;
              const ssePayload = JSON.stringify({ choices: [{ delta: { content: photoChoiceMsg } }] });
              console.log('[ai-orchestrator] Urban report: asking photo choice');
              return new Response(`data: ${ssePayload}\n\ndata: [DONE]\n\n`, {
                headers: { ...lib.corsHeaders, 'Content-Type': 'text/event-stream' }
              });
            }
            // 2) Perguntamos e usuário disse SIM (ou resposta ambígua) → instruir a anexar; só vamos ao preview com "não" explícito
            if (askedPhotoChoice && !userSaidNo) {
              const attachMsg = `[COLLECTION_PROGRESS:urban_report:${JSON.stringify(accumulatedFields)}]Pode anexar até 3 fotos usando os botões **Câmera** ou **Galeria** abaixo. Quando terminar, clique em **Registrar** para finalizar o relato.[QUICK_REPLY:registrar]`;
              const ssePayload = JSON.stringify({ choices: [{ delta: { content: attachMsg } }] });
              console.log('[ai-orchestrator] Urban report: user said yes or unclear → showing attach instructions');
              return new Response(`data: ${ssePayload}\n\ndata: [DONE]\n\n`, {
                headers: { ...lib.corsHeaders, 'Content-Type': 'text/event-stream' }
              });
            }
            // 3) Perguntamos e usuário disse NÃO → mostrar preview
            if (askedPhotoChoice && userSaidNo) {
              const catLabels: Record<string, string> = {
                iluminacao: 'Iluminação', via_publica: 'Via Pública', pavimentacao: 'Pavimentação', calcada: 'Calçada', lixo: 'Lixo/Entulho',
                sinalizacao: 'Sinalização', drenagem: 'Drenagem',
                esgoto: 'Esgoto/Bueiro', area_verde: 'Área Verde', higiene_urbana: 'Higiene Urbana',
                animais: 'Animais', poluicao: 'Poluição', feedback_camara: 'Feedback Câmara', outro: 'Outro'
              };
              const cat = String(accumulatedFields.category || '');
              const catLabel = catLabels[cat] || cat;
              const natureK = String(accumulatedFields.report_nature || 'reclamacao');
              const natureLabel =
                lib.REPORT_NATURE_LABELS[natureK as keyof typeof lib.REPORT_NATURE_LABELS] || natureK;
              const addr = [accumulatedFields.street, accumulatedFields.street_number, accumulatedFields.reference_point]
                .filter(Boolean).join(', ');
              const neighborhood = accumulatedFields.neighborhood ? ` - ${accumulatedFields.neighborhood}` : '';
              const preview = `[COLLECTION_PROGRESS:urban_report:${JSON.stringify(accumulatedFields)}]**Resumo do relato**

• **Natureza:** ${natureLabel}
• **Categoria:** ${catLabel}${lib.formatUrbanReportPreviewAfterCategory(accumulatedFields as Record<string, unknown>)}
• **Descrição:** ${(accumulatedFields.description || '').toString().slice(0, 200)}${(accumulatedFields.description || '').toString().length > 200 ? '...' : ''}${lib.formatUrbanReportPreviewAfterDescription(accumulatedFields as Record<string, unknown>)}
• **Endereço:** ${addr}${neighborhood}

Se estiver tudo certo, clique em **Confirmar** para registrar ou em **Corrigir** para alterar algo.[QUICK_REPLY:confirmar,corrigir]`;
              const ssePayload = JSON.stringify({ choices: [{ delta: { content: preview } }] });
              console.log('[ai-orchestrator] Urban report: user said no to photos, showing preview');
              return new Response(`data: ${ssePayload}\n\ndata: [DONE]\n\n`, {
                headers: { ...lib.corsHeaders, 'Content-Type': 'text/event-stream' }
              });
            }
            // 4) Mostramos preview e usuário clicou em "Corrigir" → oferecer opções guiadas de campos
            if (showedPreview && userWantsCorrection) {
              const correctionOptions =
                `[COLLECTION_PROGRESS:urban_report:${JSON.stringify(accumulatedFields)}]Certo. O que você gostaria de corrigir no resumo do relato?\n\n` +
                `Selecione uma opção abaixo.[QUICK_REPLY:descrição,endereço,categoria,tipo_detalhe,gravidade,tipos_de_risco,afetação,cep,natureza]`;
              const ssePayload = JSON.stringify({ choices: [{ delta: { content: correctionOptions } }] });
              console.log('[ai-orchestrator] Urban report: user requested correction → showing correction options');
              return new Response(`data: ${ssePayload}\n\ndata: [DONE]\n\n`, {
                headers: { ...lib.corsHeaders, 'Content-Type': 'text/event-stream' }
              });
            }

            // 5) Mostramos preview e usuário confirmou → criar relato (com fotos se tiver vindo na conversa)
            if (showedPreview && userConfirms) {
              let photosToSave = attachmentUrls;
              if (photosToSave.length === 0 && conversationId) {
                try {
                  const { data: conv } = await supabase.from('ai_conversations').select('messages').eq('id', conversationId).single();
                  const convMessages = (conv?.messages as Array<Record<string, unknown>>) || [];
                  const lastWithPhotos = [...convMessages].filter((m: Record<string, unknown>) => m.role === 'user').reverse()
                    .find((m: Record<string, unknown>) => Array.isArray(m.attachmentUrls) && m.attachmentUrls.length > 0);
                  if (lastWithPhotos?.attachmentUrls) {
                    photosToSave = lastWithPhotos.attachmentUrls as string[];
                    console.log('[ai-orchestrator] Urban report: got attachmentUrls from conversation fallback, count:', photosToSave.length);
                  }
                } catch (e) {
                  console.warn('[ai-orchestrator] Fallback load conversation for photos failed:', e);
                }
              }
              const toolArgs: Record<string, unknown> = {
                category: accumulatedFields.category,
                subcategory: accumulatedFields.subcategory,
                report_nature: accumulatedFields.report_nature,
                description: accumulatedFields.description,
                cep: accumulatedFields.cep,
                street: accumulatedFields.street,
                street_number: accumulatedFields.street_number,
                reference_point: accumulatedFields.reference_point,
                neighborhood: accumulatedFields.neighborhood,
                city: accumulatedFields.city,
                risk_level: accumulatedFields.risk_level,
                risk_types: accumulatedFields.risk_types,
                affected_scope: accumulatedFields.affected_scope,
                affected_estimate: accumulatedFields.affected_estimate,
                active_consequences: accumulatedFields.active_consequences,
                urgency_reason: accumulatedFields.urgency_reason,
                council_member_name: accumulatedFields.council_member_name,
                council_member_party: accumulatedFields.council_member_party,
              };
              if (photosToSave.length > 0) {
                toolArgs.photos = photosToSave;
              }
              toolResult = await lib.executeTool('create_urban_report', toolArgs, user.id, supabase, accumulatedFields);
            }
            // 6) Instruímos a anexar e usuário enviou "Continuar" (com ou sem anexos) → mostrar PREVIEW e pedir confirmação (não criar ainda)
            if (askedToAttach && !toolResult) {
              const catLabels: Record<string, string> = {
                iluminacao: 'Iluminação', via_publica: 'Via Pública', pavimentacao: 'Pavimentação', calcada: 'Calçada', lixo: 'Lixo/Entulho',
                sinalizacao: 'Sinalização', drenagem: 'Drenagem',
                esgoto: 'Esgoto/Bueiro', area_verde: 'Área Verde', higiene_urbana: 'Higiene Urbana',
                animais: 'Animais', poluicao: 'Poluição', feedback_camara: 'Feedback Câmara', outro: 'Outro'
              };
              const cat = String(accumulatedFields.category || '');
              const catLabel = catLabels[cat] || cat;
              const natureK2 = String(accumulatedFields.report_nature || 'reclamacao');
              const natureLabel2 =
                lib.REPORT_NATURE_LABELS[natureK2 as keyof typeof lib.REPORT_NATURE_LABELS] || natureK2;
              const addr = [accumulatedFields.street, accumulatedFields.street_number, accumulatedFields.reference_point]
                .filter(Boolean).join(', ');
              const neighborhood = accumulatedFields.neighborhood ? ` - ${accumulatedFields.neighborhood}` : '';
              const photoLine = attachmentUrls.length > 0
                ? `\n• **Fotos anexadas:** ${attachmentUrls.length} imagem(ns)\n`
                : '';
              const preview = `[COLLECTION_PROGRESS:urban_report:${JSON.stringify(accumulatedFields)}]**Resumo do relato**
• **Natureza:** ${natureLabel2}
• **Categoria:** ${catLabel}${lib.formatUrbanReportPreviewAfterCategory(accumulatedFields as Record<string, unknown>)}
• **Descrição:** ${(accumulatedFields.description || '').toString().slice(0, 200)}${(accumulatedFields.description || '').toString().length > 200 ? '...' : ''}${lib.formatUrbanReportPreviewAfterDescription(accumulatedFields as Record<string, unknown>)}
• **Endereço:** ${addr}${neighborhood}${photoLine}

Se estiver tudo certo, clique em **Confirmar** para registrar ou em **Corrigir** para alterar algo.[QUICK_REPLY:confirmar,corrigir]`;
              const ssePayload = JSON.stringify({ choices: [{ delta: { content: preview } }] });
              console.log('[ai-orchestrator] Urban report: user sent Continuar (attach flow), showing preview, attachmentUrls count:', attachmentUrls.length);
              return new Response(`data: ${ssePayload}\n\ndata: [DONE]\n\n`, {
                headers: { ...lib.corsHeaders, 'Content-Type': 'text/event-stream' }
              });
            }
            // 1b) Na lista de relatos próximos: mensagem do usuário sem "novo relato" — reforço para não ficar sem resposta
            if (
              showedSimilarReports &&
              !userWantsNewAfterSimilar &&
              !askedPhotoChoice &&
              !askedToAttach &&
              !showedPreview &&
              lastUserMessage.trim().length > 0
            ) {
              const hint = `[COLLECTION_PROGRESS:urban_report:${JSON.stringify(accumulatedFields)}]Para **seguir com um novo relato** (fotos e confirmação), use **Registrar novo relato**. Você pode **apoiar** um dos relatos listados acima.[QUICK_REPLY:novo_relato]`;
              const ssePayload = JSON.stringify({ choices: [{ delta: { content: hint } }] });
              return new Response(`data: ${ssePayload}\n\ndata: [DONE]\n\n`, {
                headers: { ...lib.corsHeaders, 'Content-Type': 'text/event-stream' }
              });
            }
          } else if (collectionIntent.type === 'transport_report') {
            const accRt = String(accumulatedFields.report_type || "outro").toLowerCase();
            const accSub =
              accumulatedFields.sub_category != null && String(accumulatedFields.sub_category).trim() !== ""
                ? String(accumulatedFields.sub_category).trim()
                : "";
            if (!accSub || !lib.isValidTransportSubcategory(accRt, accSub)) {
              const askSubcategoryMsg = `[COLLECTION_PROGRESS:transport_report:${JSON.stringify(accumulatedFields)}][FIELD_REQUEST:sub_category]Qual detalhe descreve melhor esse problema?[SUBCATEGORY_PICKER:${accRt}]`;
              const ssePayload = JSON.stringify({ choices: [{ delta: { content: askSubcategoryMsg } }] });
              return new Response(`data: ${ssePayload}\n\ndata: [DONE]\n\n`, {
                headers: { ...lib.corsHeaders, 'Content-Type': 'text/event-stream' }
              });
            }
            if (!accumulatedFields.occurrence_time) {
              const askTimeMsg = `[COLLECTION_PROGRESS:transport_report:${JSON.stringify(accumulatedFields)}][FIELD_REQUEST:occurrence_time]Qual foi o **horário exato** da ocorrência?[TIME_PICKER]`;
              const ssePayload = JSON.stringify({ choices: [{ delta: { content: askTimeMsg } }] });
              return new Response(`data: ${ssePayload}\n\ndata: [DONE]\n\n`, {
                headers: { ...lib.corsHeaders, 'Content-Type': 'text/event-stream' }
              });
            }
            if (!accumulatedFields.direction) {
              const askDirectionMsg = `[COLLECTION_PROGRESS:transport_report:${JSON.stringify(accumulatedFields)}][FIELD_REQUEST:direction]Qual era o **sentido** da viagem?[DIRECTION_PICKER]`;
              const ssePayload = JSON.stringify({ choices: [{ delta: { content: askDirectionMsg } }] });
              return new Response(`data: ${ssePayload}\n\ndata: [DONE]\n\n`, {
                headers: { ...lib.corsHeaders, 'Content-Type': 'text/event-stream' }
              });
            }
            if (!accumulatedFields.recurrence_frequency) {
              const askRecurrenceMsg = `[COLLECTION_PROGRESS:transport_report:${JSON.stringify(accumulatedFields)}][FIELD_REQUEST:recurrence_frequency]Com qual frequência isso acontece?[RECURRENCE_FREQUENCY_PICKER]`;
              const ssePayload = JSON.stringify({ choices: [{ delta: { content: askRecurrenceMsg } }] });
              return new Response(`data: ${ssePayload}\n\ndata: [DONE]\n\n`, {
                headers: { ...lib.corsHeaders, 'Content-Type': 'text/event-stream' }
              });
            }
            if (!("stop_name" in accumulatedFields)) {
              const askStopMsg = `[COLLECTION_PROGRESS:transport_report:${JSON.stringify(accumulatedFields)}][FIELD_REQUEST:stop_name]Qual é o **ponto de embarque/parada** onde ocorreu o problema? (nome em texto livre)\n\nSe não lembrar, você pode pular.[QUICK_REPLY:não lembro]`;
              const ssePayload = JSON.stringify({ choices: [{ delta: { content: askStopMsg } }] });
              return new Response(`data: ${ssePayload}\n\ndata: [DONE]\n\n`, {
                headers: { ...lib.corsHeaders, 'Content-Type': 'text/event-stream' }
              });
            }
            if (accumulatedFields.personal_impact == null || accumulatedFields.personal_impact === "") {
              const askImpactMsg = `[COLLECTION_PROGRESS:transport_report:${JSON.stringify(accumulatedFields)}][FIELD_REQUEST:personal_impact]Como isso afetou **sua rotina**?[IMPACT_PICKER]`;
              const ssePayload = JSON.stringify({ choices: [{ delta: { content: askImpactMsg } }] });
              return new Response(`data: ${ssePayload}\n\ndata: [DONE]\n\n`, {
                headers: { ...lib.corsHeaders, 'Content-Type': 'text/event-stream' }
              });
            }

            if (!accumulatedFields.stop_name) {
              const askStopNameMsg =
                `[COLLECTION_PROGRESS:transport_report:${JSON.stringify(accumulatedFields)}][FIELD_REQUEST:stop_name]Qual foi a **parada, ponto, terminal ou estação** específicos onde isso aconteceu?`;
              const ssePayload = JSON.stringify({ choices: [{ delta: { content: askStopNameMsg } }] });
              return new Response(`data: ${ssePayload}\n\ndata: [DONE]\n\n`, {
                headers: { ...lib.corsHeaders, 'Content-Type': 'text/event-stream' }
              });
            }

            if (!accumulatedFields.stop_location) {
              const askStopLocationMsg =
                `[COLLECTION_PROGRESS:transport_report:${JSON.stringify(accumulatedFields)}][FIELD_REQUEST:stop_location]Qual o **endereço, cruzamento ou referência** desse ponto? Se preferir, você também pode informar coordenadas \`lat,lng\`.`;
              const ssePayload = JSON.stringify({ choices: [{ delta: { content: askStopLocationMsg } }] });
              return new Response(`data: ${ssePayload}\n\ndata: [DONE]\n\n`, {
                headers: { ...lib.corsHeaders, 'Content-Type': 'text/event-stream' }
              });
            }

            if (
              accRt === "acessibilidade" &&
              !hasTransportAccessibilityDetails(accumulatedFields.accessibility_details)
            ) {
              const askAccessibilityChecklistMsg =
                `[COLLECTION_PROGRESS:transport_report:${JSON.stringify(accumulatedFields)}][FIELD_REQUEST:accessibility_details]Para detalhar a ocorrência, marque o **checklist de acessibilidade** abaixo (rampa, elevador, piso tátil, apoio para embarque) e complemente se necessário.[ACCESSIBILITY_CHECKLIST]`;
              const ssePayload = JSON.stringify({ choices: [{ delta: { content: askAccessibilityChecklistMsg } }] });
              return new Response(`data: ${ssePayload}\n\ndata: [DONE]\n\n`, {
                headers: { ...lib.corsHeaders, 'Content-Type': 'text/event-stream' }
              });
            }

            const userWantsCorrectionTransport =
              /^(corrigir|corrigir\s+relato|editar|ajustar)$/i.test(msgLower.trim());
            const isTransportFinalPreview =
              /resumo\s+do\s+relato\s+de\s+transporte/i.test(lastAssistantLower) &&
              !/deseja\s+anexar\s+imagens/i.test(lastAssistantLower);
            const showedPreviewAfterAttach =
              /resumo\s+do\s+relato\s+de\s+transporte[\s\S]*se\s+estiver\s+tudo\s+certo[\s\S]*(?:registrar\s+para\s+finalizar|confirmar)/i.test(
                lastAssistantLower || "",
              );
            const transportFieldReqMatch = lastAssistantMessage.match(/\[FIELD_REQUEST:(\w+)\]/);
            const prevWasTransportFieldRequest =
              /\[COLLECTION_PROGRESS:transport_report:/i.test(lastAssistantMessage) && !!transportFieldReqMatch;

            // Markdown quebra substring contínua ("de **ajustar**"); normalizar * para o teste.
            const lastAssistantPlain = lastAssistantLower.replace(/\*/g, "");
            // `.*` não atravessa \n — o marcador fica após "Selecione…" na linha seguinte.
            const askedTransportCorrectionMenu =
              /o que voc[eê] gostaria de ajustar/i.test(lastAssistantPlain) &&
              /\[QUICK_REPLY:[^\]]*descri/i.test(lastAssistantMessage);

            const transportCorrectionMenuPick = msgLower.trim().toLowerCase();
            const transportPickNorm = transportCorrectionMenuPick
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "")
              .replace(/ç/g, "c");

            if (askedTransportCorrectionMenu) {
              const progress = `[COLLECTION_PROGRESS:transport_report:${JSON.stringify(accumulatedFields)}]`;
              let reply = "";
              if (transportPickNorm === "descricao" || /^descri/.test(transportPickNorm)) {
                reply =
                  `${progress}[FIELD_REQUEST:description]Qual é a **descrição correta**? Reescreva o que aconteceu com mais detalhes.`;
              } else if (transportPickNorm === "tipo") {
                reply =
                  `${progress}[FIELD_REQUEST:report_type]Qual o **tipo de problema** correto?[QUICK_REPLY:atraso,lotacao,seguranca,acessibilidade,limpeza,conducao,outro]`;
              } else if (transportPickNorm === "linha") {
                reply =
                  `${progress}[FIELD_REQUEST:line_code]Qual a **linha ou estação** correta?[LINE_PICKER]`;
              } else if (transportPickNorm === "data") {
                reply =
                  `${progress}[FIELD_REQUEST:occurrence_date]Qual a **data correta** da ocorrência?[DATE_PICKER]`;
              } else if (transportPickNorm === "horario") {
                reply =
                  `${progress}[FIELD_REQUEST:occurrence_time]Qual o **horário correto** da ocorrência?[TIME_PICKER]`;
              } else if (transportPickNorm === "sentido") {
                reply =
                  `${progress}[FIELD_REQUEST:direction]Qual o **sentido** correto da viagem?[DIRECTION_PICKER]`;
              } else if (transportPickNorm === "frequencia") {
                reply =
                  `${progress}[FIELD_REQUEST:recurrence_frequency]Qual a **frequência** correta?[RECURRENCE_FREQUENCY_PICKER]`;
              } else if (transportPickNorm === "impacto") {
                reply =
                  `${progress}[FIELD_REQUEST:personal_impact]Como isso afetou **sua rotina**? Escolha de novo.[IMPACT_PICKER]`;
              } else if (transportPickNorm === "parada") {
                reply =
                  `${progress}[FIELD_REQUEST:stop_name]Qual foi a **parada, ponto, terminal ou estação** correta (ponto de embarque/parada)?\n\nSe não lembrar, você pode pular.[QUICK_REPLY:não lembro]`;
              } else if (
                transportPickNorm === "ponto" ||
                transportPickNorm === "referencia" ||
                transportPickNorm === "endereco"
              ) {
                reply =
                  `${progress}[FIELD_REQUEST:stop_location]Qual o **endereço, cruzamento ou referência** corretos desse ponto?`;
              } else if (transportPickNorm === "detalhes_acessibilidade") {
                reply =
                  `${progress}[FIELD_REQUEST:accessibility_details]Atualize o **checklist de acessibilidade** abaixo.[ACCESSIBILITY_CHECKLIST]`;
              } else if (transportPickNorm === "local") {
                reply =
                  `${progress}[FIELD_REQUEST:location]Qual o **local** ou ponto de referência correto? (parada, terminal, trecho)`;
              }
              if (reply) {
                const ssePayload = JSON.stringify({ choices: [{ delta: { content: reply } }] });
                console.log("[ai-orchestrator] Transport report: correction menu pick → field request");
                return new Response(`data: ${ssePayload}\n\ndata: [DONE]\n\n`, {
                  headers: { ...lib.corsHeaders, "Content-Type": "text/event-stream" },
                });
              }
              const reaskMenu =
                `[COLLECTION_PROGRESS:transport_report:${JSON.stringify(accumulatedFields)}]Não reconheci essa opção. **O que você gostaria de ajustar** no resumo?\n\n` +
                `Selecione uma opção abaixo.[QUICK_REPLY:descrição,tipo,linha,data,horário,sentido,frequência,impacto,parada,ponto,detalhes_acessibilidade,local]`;
              const sseReask = JSON.stringify({ choices: [{ delta: { content: reaskMenu } }] });
              console.log("[ai-orchestrator] Transport report: correction menu — pick não reconhecido, reexibindo opções");
              return new Response(`data: ${sseReask}\n\ndata: [DONE]\n\n`, {
                headers: { ...lib.corsHeaders, "Content-Type": "text/event-stream" },
              });
            }

            const threadHadTransportSimilarOffer = chatMessages.some((m: Record<string, unknown>) => {
              if (m.role !== 'assistant') return false;
              const t = getMessageText(m).toLowerCase();
              return (
                /\[similar_transport_reports_b64:/i.test(t) ||
                /relatos\s+recentes\s+na\s+mesma\s+linha/i.test(t)
              );
            });
            const threadHadTransportPreviewOrCorrection = chatMessages.some((m: Record<string, unknown>) => {
              if (m.role !== "assistant") return false;
              const t = getMessageText(m).toLowerCase();
              return (
                /resumo\s+do\s+relato\s+de\s+transporte/i.test(t) ||
                /o\s+que\s+voc[eê]\s+gostaria\s+de\s+ajustar/i.test(t)
              );
            });

            if (
              prevWasTransportFieldRequest &&
              lastUserMessage.trim().length > 0 &&
              threadHadTransportPreviewOrCorrection
            ) {
              const menuTokens = new Set([
                "descrição",
                "descricao",
                "tipo",
                "linha",
                "data",
                "horário",
                "horario",
                "sentido",
                "frequência",
                "frequencia",
                "ponto",
                "impacto",
                "parada",
                "ponto",
                "referencia",
                "endereco",
                "detalhes_acessibilidade",
                "local",
              ]);
              const isMenuPick = menuTokens.has(transportCorrectionMenuPick);
              if (
                /^(confirmar|registrar|sim|ok|tudo\s+certo)$/i.test(msgLower.trim()) ||
                (!isMenuPick && !/^(corrigir|editar|ajustar)$/i.test(msgLower.trim()))
              ) {
                const photoLine =
                  attachmentUrls.length > 0
                    ? `\n• **Fotos anexadas:** ${attachmentUrls.length} imagem(ns)`
                    : "";
                const previewBody = buildTransportFinalPreviewMessage(
                  accumulatedFields as Record<string, unknown>,
                  photoLine,
                  lib.formatTransportPreviewTypeLine(accumulatedFields as Record<string, unknown>),
                );
                const preview = `[COLLECTION_PROGRESS:transport_report:${JSON.stringify(accumulatedFields)}]${previewBody}`;
                const ssePayload = JSON.stringify({ choices: [{ delta: { content: preview } }] });
                console.log(
                  "[ai-orchestrator] Transport report: after field correction → showing preview again",
                );
                return new Response(`data: ${ssePayload}\n\ndata: [DONE]\n\n`, {
                  headers: { ...lib.corsHeaders, "Content-Type": "text/event-stream" },
                });
              }
            }

            if (isTransportFinalPreview && userWantsCorrectionTransport) {
              const correctionOptions =
                `[COLLECTION_PROGRESS:transport_report:${JSON.stringify(accumulatedFields)}]Certo. O que você gostaria de **ajustar** no resumo?\n\n` +
                `Selecione uma opção abaixo.[QUICK_REPLY:descrição,tipo,linha,data,horário,sentido,frequência,impacto,parada,ponto,detalhes_acessibilidade,local]`;
              return new Response(`data: ${ssePayload}\n\ndata: [DONE]\n\n`, {
              });
            }

            // Fluxo de fotos para transporte (conforme relato urbano): perguntar → anexar → preview → criar
            const askedPhotoChoice = /deseja\s+anexar\s+imagens|quer\s+anexar\s+fotos/i.test(lastAssistantLower);
            const askedToAttach = /pode\s+anexar\s+at[eé]\s*3\s+fotos|quando\s+terminar.*registrar|envie\s+\*?registrar\*?/i.test(lastAssistantLower);
            const userSaidYes = /^(sim|quero|quero\s+sim|yes|pode\s+ser|pode|desejo)$/i.test(msgLower);
            const userSaidNo = /^(n[aã]o|nao|no|n[aã]o\s+quero|n[aã]o\s+desejo)$/i.test(msgLower);
            const userConfirms = /^(sim|confirmar|registrar|ok|tudo\s+certo)$/i.test(msgLower);

            const showedSimilarTransport =
              /\[SIMILAR_TRANSPORT_REPORTS_B64:/i.test(lastAssistantLower) ||
              /relatos\s+recentes\s+na\s+mesma\s+linha/i.test(lastAssistantLower);
            const userWantsNewAfterSimilarTransport =
              /^(novo_relato|novo\s+relato|registrar\s+novo|criar\s+novo|mesmo\s+assim)\b/i.test(msgLower.trim());

            const looksLikeTransportCorrectionMenuUi =
              /selecione\s+uma\s+op[cç][aã]o\s+abaixo/i.test(lastAssistantLower) &&
              /\[QUICK_REPLY:[^\]]*descri/i.test(lastAssistantMessage) &&
              /gostaria\s+de\s+ajustar|ajustar\s+no\s+resumo/i.test(lastAssistantPlain);

            if (!askedPhotoChoice && !askedToAttach && !isTransportFinalPreview && !looksLikeTransportCorrectionMenuUi) {
              if (showedSimilarTransport && userWantsNewAfterSimilarTransport) {
                const photoChoiceMsg = `[COLLECTION_PROGRESS:transport_report:${JSON.stringify(accumulatedFields)}]Ótimo, já tenho todas as informações. **Você deseja anexar imagens quanto ao problema de transporte?**[QUICK_REPLY:sim,não]`;
                const ssePayload = JSON.stringify({ choices: [{ delta: { content: photoChoiceMsg } }] });
                console.log('[ai-orchestrator] Transport report: similar list acknowledged → asking photo choice');
                return new Response(`data: ${ssePayload}\n\ndata: [DONE]\n\n`, {
                  headers: { ...lib.corsHeaders, 'Content-Type': 'text/event-stream' }
                });
              }
              if (
                showedSimilarTransport &&
                !userWantsNewAfterSimilarTransport &&
                lastUserMessage.trim().length > 0
              ) {
                const hint = `[COLLECTION_PROGRESS:transport_report:${JSON.stringify(accumulatedFields)}]Para **seguir com um novo relato** (fotos e confirmação), use **Registrar novo relato**. Você pode **apoiar** um dos relatos listados acima.[QUICK_REPLY:novo_relato]`;
                const ssePayload = JSON.stringify({ choices: [{ delta: { content: hint } }] });
                return new Response(`data: ${ssePayload}\n\ndata: [DONE]\n\n`, {
                  headers: { ...lib.corsHeaders, 'Content-Type': 'text/event-stream' }
                });
              }
              if (!showedSimilarTransport) {
                try {
                  const similarT = await lib.fetchSimilarTransportReportsForSupport(
                    supabase,
                    accumulatedFields as Record<string, unknown>,
                    user.id,
                    10,
                  );
                  if (similarT.length > 0) {
                    const payload = { reports: similarT };
                    const json = JSON.stringify(payload);
                    const b64 = btoa(unescape(encodeURIComponent(json)));
                    const intro =
                      `Encontramos **relatos recentes na mesma linha e tipo de problema** (até ${similarT.length} registros). Você pode **apoiar** um relato existente ou **registrar um novo**.`;
                    const similarMsg = `[COLLECTION_PROGRESS:transport_report:${JSON.stringify(accumulatedFields)}]${intro}\n\n[SIMILAR_TRANSPORT_REPORTS_B64:${b64}]\n\nToque em **Registrar novo relato** para seguir com o seu pedido (fotos e confirmação).[QUICK_REPLY:novo_relato]`;
                    const ssePayload = JSON.stringify({ choices: [{ delta: { content: similarMsg } }] });
                    console.log('[ai-orchestrator] Transport report: showing similar reports, count:', similarT.length);
                    return new Response(`data: ${ssePayload}\n\ndata: [DONE]\n\n`, {
                      headers: { ...lib.corsHeaders, 'Content-Type': 'text/event-stream' }
                    });
                  }
                } catch (e) {
                  console.warn('[ai-orchestrator] Transport similar reports lookup failed:', e);
                }
              }
              const photoChoiceMsg = `[COLLECTION_PROGRESS:transport_report:${JSON.stringify(accumulatedFields)}]Ótimo, já tenho todas as informações. **Você deseja anexar imagens quanto ao problema de transporte?**[QUICK_REPLY:sim,não]`;
              const ssePayload = JSON.stringify({ choices: [{ delta: { content: photoChoiceMsg } }] });
              console.log('[ai-orchestrator] Transport report: asking photo choice');
              return new Response(`data: ${ssePayload}\n\ndata: [DONE]\n\n`, {
                headers: { ...lib.corsHeaders, 'Content-Type': 'text/event-stream' }
              });
            }
            if (askedPhotoChoice && !userSaidNo) {
              const attachMsg = `[COLLECTION_PROGRESS:transport_report:${JSON.stringify(accumulatedFields)}]Pode anexar até 3 fotos usando os botões **Câmera** ou **Galeria** abaixo. Quando terminar, clique em **Registrar** para ver o resumo e finalizar o relato.[QUICK_REPLY:registrar]`;
              const ssePayload = JSON.stringify({ choices: [{ delta: { content: attachMsg } }] });
              console.log('[ai-orchestrator] Transport report: user said yes → showing attach instructions');
              return new Response(`data: ${ssePayload}\n\ndata: [DONE]\n\n`, {
                headers: { ...lib.corsHeaders, 'Content-Type': 'text/event-stream' }
              });
            }
            if (askedPhotoChoice && userSaidNo) {
              const previewBody = buildTransportFinalPreviewMessage(
                accumulatedFields as Record<string, unknown>,
                "",
                lib.formatTransportPreviewTypeLine(accumulatedFields as Record<string, unknown>),
              );
              const preview = `[COLLECTION_PROGRESS:transport_report:${JSON.stringify(accumulatedFields)}]${previewBody}`;
              const ssePayload = JSON.stringify({ choices: [{ delta: { content: preview } }] });
              console.log('[ai-orchestrator] Transport report: user said no to photos, showing preview');
              return new Response(`data: ${ssePayload}\n\ndata: [DONE]\n\n`, {
                headers: { ...lib.corsHeaders, 'Content-Type': 'text/event-stream' }
              });
            }
            // Preview antes de criar: após "Pode anexar... Registrar", ao clicar Registrar mostramos o resumo; só no segundo passo (Confirmar) criamos
            if (askedToAttach && userConfirms && !showedPreviewAfterAttach) {
              const photoLine =
                attachmentUrls.length > 0
                  ? `\n• **Fotos anexadas:** ${attachmentUrls.length} imagem(ns)`
                  : "";
              const previewBody = buildTransportFinalPreviewMessage(
                accumulatedFields as Record<string, unknown>,
                photoLine,
                lib.formatTransportPreviewTypeLine(accumulatedFields as Record<string, unknown>),
              );
              const preview = `[COLLECTION_PROGRESS:transport_report:${JSON.stringify(accumulatedFields)}]${previewBody}`;
              const ssePayload = JSON.stringify({ choices: [{ delta: { content: preview } }] });
              console.log('[ai-orchestrator] Transport report: showing preview before create (first Registrar)');
              return new Response(`data: ${ssePayload}\n\ndata: [DONE]\n\n`, {
                headers: { ...lib.corsHeaders, 'Content-Type': 'text/event-stream' }
              });
            }
            if (
              userConfirms &&
              (showedPreviewAfterAttach || (isTransportFinalPreview && !askedToAttach))
            ) {
              let photosToSave = attachmentUrls;
              if (photosToSave.length === 0 && conversationId) {
                try {
                  const { data: conv } = await supabase.from('ai_conversations').select('messages').eq('id', conversationId).single();
                  const convMessages = (conv?.messages as Array<Record<string, unknown>>) || [];
                  const lastWithPhotos = [...convMessages].filter((m: Record<string, unknown>) => m.role === 'user').reverse()
                    .find((m: Record<string, unknown>) => Array.isArray(m.attachmentUrls) && m.attachmentUrls.length > 0);
                  if (lastWithPhotos?.attachmentUrls) {
                    photosToSave = lastWithPhotos.attachmentUrls as string[];
                    console.log('[ai-orchestrator] Transport report: got attachmentUrls from conversation, count:', photosToSave.length);
                  }
                } catch (e) {
                  console.warn('[ai-orchestrator] Fallback load conversation for transport photos failed:', e);
                }
              }
              const toolArgs: Record<string, unknown> = {
                description: accumulatedFields.description,
                report_type: accumulatedFields.report_type,
                sub_category: accumulatedFields.sub_category,
                line_code: accumulatedFields.line_code,
                line_id: accumulatedFields.line_id,
                occurrence_date: accumulatedFields.occurrence_date,
                occurrence_time: accumulatedFields.occurrence_time,
                direction: accumulatedFields.direction,
                recurrence_frequency: accumulatedFields.recurrence_frequency,
                location: accumulatedFields.location,
                stop_name: accumulatedFields.stop_name,
                stop_lat: accumulatedFields.stop_lat,
                stop_lon: accumulatedFields.stop_lon,
                stop_location: accumulatedFields.stop_location,
                accessibility_details: accumulatedFields.accessibility_details,
                severity: accumulatedFields.severity,
                impact_description: accumulatedFields.impact_description,
                subcategory_label: accumulatedFields.subcategory_label,
                personal_impact: accumulatedFields.personal_impact,
              };
              if (photosToSave.length > 0) {
                toolArgs.photos = photosToSave;
              }
              toolResult = await lib.executeTool('create_transport_report', toolArgs, user.id, supabase, accumulatedFields);
            }
            if (askedToAttach && !userConfirms && !toolResult) {
              const photoLine =
                attachmentUrls.length > 0
                  ? `\n• **Fotos anexadas:** ${attachmentUrls.length} imagem(ns)`
                  : "";
              const previewBody = buildTransportFinalPreviewMessage(
                accumulatedFields as Record<string, unknown>,
                photoLine,
                lib.formatTransportPreviewTypeLine(accumulatedFields as Record<string, unknown>),
              );
              const preview = `[COLLECTION_PROGRESS:transport_report:${JSON.stringify(accumulatedFields)}]${previewBody}`;
              const ssePayload = JSON.stringify({ choices: [{ delta: { content: preview } }] });
              console.log('[ai-orchestrator] Transport report: user sent Registrar (attach flow), showing preview, attachmentUrls:', attachmentUrls.length);
              return new Response(`data: ${ssePayload}\n\ndata: [DONE]\n\n`, {
                headers: { ...lib.corsHeaders, 'Content-Type': 'text/event-stream' }
              });
            }
            if (!toolResult) {
              const toolArgs: Record<string, unknown> = {
                description: accumulatedFields.description,
                report_type: accumulatedFields.report_type,
                sub_category: accumulatedFields.sub_category,
                line_code: accumulatedFields.line_code,
                line_id: accumulatedFields.line_id,
                occurrence_date: accumulatedFields.occurrence_date,
                occurrence_time: accumulatedFields.occurrence_time,
                direction: accumulatedFields.direction,
                recurrence_frequency: accumulatedFields.recurrence_frequency,
                location: accumulatedFields.location,
                stop_name: accumulatedFields.stop_name,
                stop_lat: accumulatedFields.stop_lat,
                stop_lon: accumulatedFields.stop_lon,
                stop_location: accumulatedFields.stop_location,
                accessibility_details: accumulatedFields.accessibility_details,
                severity: accumulatedFields.severity,
                impact_description: accumulatedFields.impact_description,
                subcategory_label: accumulatedFields.subcategory_label,
                personal_impact: accumulatedFields.personal_impact,
              };
              toolResult = await lib.executeTool('create_transport_report', toolArgs, user.id, supabase, accumulatedFields);
            }
          } else if (collectionIntent.type === 'service_rating') {
            const askedRatingSubmitPreview =
              /\[RATING_SUBMIT_PREVIEW\]/i.test(lastAssistantMessage) ||
              /\[RATING_SUBMIT_PREVIEW_JSON:/i.test(lastAssistantMessage);
            const userPublishes =
              /^(publicar|confirmar|sim|ok|enviar)$/i.test(msgLower) ||
              /^confirmar\s+e\s+publicar$/i.test(msgLower);
            const userWantsEditComment = /^(editar|editar_comentario|corrigir)$/i.test(msgLower);

            const ratingTextStr =
              typeof accumulatedFields.rating_text === 'string' ? accumulatedFields.rating_text.trim() : '';
            const ratingTextReady = ratingTextStr.length >= 5;
            const lastAskedRatingTextOnly =
              /\[FIELD_REQUEST:rating_text\]/i.test(lastAssistantMessage) && !askedRatingSubmitPreview;

            if (askedRatingSubmitPreview && userWantsEditComment) {
              const fieldsJson = JSON.stringify(accumulatedFields);
              const content =
                (lightJourneyMarker || '') +
                `[COLLECTION_PROGRESS:service_rating:${fieldsJson}]` +
                `[FIELD_REQUEST:rating_text]**Altere seu comentário** (mín. 5 caracteres). Envie o novo texto abaixo.`;
              const ssePayload = JSON.stringify({ choices: [{ delta: { content } }] });
              console.log('[ai-orchestrator] Service rating: edit comment after preview');
              return new Response(`data: ${ssePayload}\n\ndata: [DONE]\n\n`, {
                headers: { ...lib.corsHeaders, 'Content-Type': 'text/event-stream' },
              });
            }

            if (askedRatingSubmitPreview && !userPublishes && !userWantsEditComment) {
              const remind =
                (lightJourneyMarker || '') +
                `[COLLECTION_PROGRESS:service_rating:${JSON.stringify(accumulatedFields)}]` +
                `[RATING_SUBMIT_PREVIEW]` +
                `Para **publicar** a avaliação, toque em **Publicar** ou responda \`publicar\`. Para ajustar o comentário, use **Editar** ou responda \`editar\`.\n\n[QUICK_REPLY:publicar,editar_comentario]`;
              const ssePayload = JSON.stringify({ choices: [{ delta: { content: remind } }] });
              return new Response(`data: ${ssePayload}\n\ndata: [DONE]\n\n`, {
                headers: { ...lib.corsHeaders, 'Content-Type': 'text/event-stream' },
              });
            }

            if (!askedRatingSubmitPreview && lastAskedRatingTextOnly && ratingTextReady) {
              const rd =
                accumulatedFields.rating_dimensions &&
                lib.isCompleteServiceRatingDimensions(accumulatedFields.rating_dimensions)
                  ? (accumulatedFields.rating_dimensions as Record<string, number>)
                  : null;
              let stars = typeof accumulatedFields.rating_stars === 'number' ? accumulatedFields.rating_stars : 0;
              if (rd && (!stars || stars < 1 || stars > 5)) {
                stars = lib.aggregateRatingDimensionsStars(rd);
              }
              const sn = String(accumulatedFields.service_name || '').trim();
              const dimLine = rd
                ? `\n• **Dimensões:** Tempo ${rd.tempo_espera}/5 · Atendimento ${rd.atendimento}/5 · Infra ${rd.infraestrutura}/5 · Limpeza ${rd.limpeza}/5`
                : '';
              const commentShow = ratingTextStr.length > 400 ? `${ratingTextStr.slice(0, 400)}…` : ratingTextStr;
              const jsonMarker = serviceRatingSubmitPreviewJsonMarker({
                rating_stars: stars,
                rating_dimensions: rd,
                service_name: sn,
                comment_preview: ratingTextStr.slice(0, 500),
              });
              const preview =
                (lightJourneyMarker || '') +
                `[COLLECTION_PROGRESS:service_rating:${JSON.stringify(accumulatedFields)}]` +
                `[RATING_SUBMIT_PREVIEW]**Resumo da avaliação**\n\n` +
                `🏥 **Serviço:** ${sn || '—'}\n⭐ **Nota geral (média):** ${stars}/5${dimLine}\n\n📝 **Comentário:**\n${commentShow}\n\n` +
                `Confirme para **publicar** no sistema ou edite o comentário antes.` +
                jsonMarker +
                `\n\n[QUICK_REPLY:publicar,editar_comentario]`;
              const ssePayload = JSON.stringify({ choices: [{ delta: { content: preview } }] });
              console.log('[ai-orchestrator] Service rating: submit preview');
              return new Response(`data: ${ssePayload}\n\ndata: [DONE]\n\n`, {
                headers: { ...lib.corsHeaders, 'Content-Type': 'text/event-stream' },
              });
            }

            if (askedRatingSubmitPreview && userPublishes) {
              const accRd = accumulatedFields.rating_dimensions as Record<string, number> | null | undefined;
              let meanForSentiment =
                typeof accumulatedFields.rating_stars === "number" &&
                accumulatedFields.rating_stars >= 1 &&
                accumulatedFields.rating_stars <= 5
                  ? accumulatedFields.rating_stars
                  : 3;
              if (accRd && lib.isCompleteServiceRatingDimensions(accRd)) {
                meanForSentiment = lib.aggregateRatingDimensionsStars(accRd);
              }
              const sentimentAuto = lib.inferServiceRatingSentimentFromMean(meanForSentiment);
              const toolArgs: Record<string, unknown> = {
                service_type: accumulatedFields.service_type,
                service_name: accumulatedFields.service_name,
                service_neighborhood: accumulatedFields.service_neighborhood,
                service_address_confirmed:
                  accumulatedFields.service_address_confirmed || accumulatedFields._address_reconfirmed,
                rating_stars: accumulatedFields.rating_stars,
                rating_dimensions: accumulatedFields.rating_dimensions,
                rating_text: accumulatedFields.rating_text,
                sentiment: sentimentAuto,
              };
              if ('wait_time_score' in accumulatedFields) toolArgs.wait_time_score = accumulatedFields.wait_time_score;
              if ('tempo_espera_score' in accumulatedFields) {
                toolArgs.tempo_espera_score = accumulatedFields.tempo_espera_score;
              }
              if ('atendimento_score' in accumulatedFields) {
                toolArgs.atendimento_score = accumulatedFields.atendimento_score;
              }
              if ('infraestrutura_score' in accumulatedFields) {
                toolArgs.infraestrutura_score = accumulatedFields.infraestrutura_score;
              }
              if ('limpeza_score' in accumulatedFields) toolArgs.limpeza_score = accumulatedFields.limpeza_score;
              if (accumulatedFields.visit_id) {
                toolArgs.visit_id = accumulatedFields.visit_id;
                if (accumulatedFields.service_id) toolArgs.service_id = accumulatedFields.service_id;
                if (accumulatedFields.service_name) toolArgs.service_name = accumulatedFields.service_name;
              } else {
                if (accumulatedFields.service_id) toolArgs.service_id = accumulatedFields.service_id;
              }
              toolResult = await lib.executeTool('create_service_rating', toolArgs, user.id, supabase, accumulatedFields);
            }
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
            // Regra de negócio / erro terminal (ex.: RN-AVA-003) sem campo a corrigir — não enviar ao LLM
            // (senão o modelo inventa mensagem genérica tipo "não foi possível salvar").
            const failMsg = toolResult.message || '';
            const needsFieldFromTool = failMsg.includes('[FIELD_REQUEST:');
            if (collectionIntent?.type === 'service_rating' && !needsFieldFromTool) {
              let responseContent = failMsg;
              if (lightJourneyMarker && !responseContent.includes('[LIGHT_JOURNEY:')) {
                responseContent = lightJourneyMarker + responseContent;
              }
              if (!responseContent.includes('[COLLECTION_PROGRESS:')) {
                responseContent = `[COLLECTION_PROGRESS:${collectionIntent.type}:{}]${responseContent}`;
              }
              const ssePayload = JSON.stringify({
                choices: [{ delta: { content: responseContent } }],
              });
              console.log(
                '[ai-orchestrator] Auto-create service_rating terminal failure, returning tool message directly',
              );
              return new Response(`data: ${ssePayload}\n\ndata: [DONE]\n\n`, {
                headers: { ...lib.corsHeaders, 'Content-Type': 'text/event-stream' },
              });
            }
            // Tool validation failed - continue to LLM to ask for missing field
            console.log('[ai-orchestrator] Auto-create validation failed, continuing to LLM:', toolResult.message);
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
        const hasUserCoords = accumulatedFields.user_lat != null && accumulatedFields.user_lon != null;
        const hasGpsCoords = method === 'gps' && hasUserCoords;
        const hasLocation = (method === 'manual' && (hasCep || hasAddress)) || method === 'registered_address' || hasGpsCoords || (method === 'manual' && hasUserCoords);
        if (hasLocation) {
          const district = accumulatedFields.neighborhood || undefined;
          // Raio padrão 2 km para todos os serviços (CMSP: evita UBS longe, ex. Vila Arriete)
          const defaultRadius = 2000;
          const toolArgs: Record<string, unknown> = {
            service_type: accumulatedFields.service_type,
            district,
            limit: 10,
            radius_meters: accumulatedFields.radius_meters ?? defaultRadius,
            min_rating: accumulatedFields.min_rating ?? 0,
            search_query: accumulatedFields.search_query || undefined
          };
          if (hasUserCoords) {
            toolArgs.user_lat = accumulatedFields.user_lat;
            toolArgs.user_lon = accumulatedFields.user_lon;
          } else if (method === 'manual' && (hasCep || hasAddress)) {
            // Geocodificar CEP/endereço quando o frontend não enviou coordenadas (ex.: seleção só por CEP ViaCEP)
            const coords = await lib.geocodeAddressToCoord({
              street: String(accumulatedFields.street ?? ''),
              street_number: String(accumulatedFields.street_number ?? ''),
              neighborhood: String(accumulatedFields.neighborhood ?? ''),
              cep: String(accumulatedFields.cep ?? ''),
              city: 'São Paulo',
            });
            if (coords) {
              toolArgs.user_lat = coords.lat;
              toolArgs.user_lon = coords.lon;
              accumulatedFields.user_lat = coords.lat;
              accumulatedFields.user_lon = coords.lon;
            }
          } else if (method === 'registered_address') {
            // Usar endereço cadastrado: buscar lat/lon no banco ou geocodificar (Google primeiro, igual ao módulo; fallback Nominatim)
            const { data: addr } = await supabase
              .from('user_addresses')
              .select('latitude, longitude, street, number, neighborhood, zip_code, city')
              .eq('user_id', user.id)
              .eq('is_primary', true)
              .maybeSingle();
            if (addr?.latitude != null && addr?.longitude != null) {
              toolArgs.user_lat = Number(addr.latitude);
              toolArgs.user_lon = Number(addr.longitude);
            } else if (addr?.street && addr?.neighborhood) {
              let coords = await lib.geocodeAddressWithGoogle(supabase, {
                street: addr.street,
                street_number: addr.number,
                neighborhood: addr.neighborhood,
                cep: addr.zip_code,
                city: addr.city || 'São Paulo',
              });
              if (!coords) {
                coords = await lib.geocodeAddressToCoord({
                  street: addr.street,
                  street_number: addr.number,
                  neighborhood: addr.neighborhood,
                  cep: addr.zip_code,
                  city: addr.city || 'São Paulo',
                });
              }
              if (coords) {
                toolArgs.user_lat = coords.lat;
                toolArgs.user_lon = coords.lon;
              }
            }
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
      const description = String(accumulatedFields.description ?? '');
      const descLower = description.toLowerCase();
      const lastUserUrgent = /(incêndio|incendio|fogo|queimando|chamas|armado|arma|armas|drogas?|tráfico|trafico|violência|violencia|agressão|agressao|baderna|funkeiros?|perigo|risco iminente)/i.test(msgLower);
      const hasUrgentContent =
        /(armado|arma|armas|drogas?|tráfico|trafico|violência|violencia|agressão|agressao|baderna|funkeiros?|perigo|risco iminente|incêndio|incendio|fogo|queimando|chamas)/i.test(descLower) ||
        lastUserUrgent;
      const empathyNote = hasUrgentContent
        ? '\n\n⚠️ **ATENÇÃO - CONTEÚDO URGENTE / GRAVE:**\nReconheça a gravidade com empatia e eficiência.\n' +
          '**Localização:** NUNCA peça só "digite o CEP". O próximo passo correto é **location_method** com opções GPS / endereço cadastrado / CEP (o app mostra botões quando o backend envia `[LOCATION_METHOD_PICKER]`).\n' +
          'NÃO pergunte de novo por dados já listados em "Campos JÁ COLETADOS".\n'
        : '';
      
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
    
    // === DETERMINISTIC: usuário manda só CEP após ter pedido UBS/CEU/etc → buscamos no banco e retornamos lista ===
    const cepOnlyMatch = lastUserMessage.trim().match(/^(\d{5}-?\d{3})$/);
    if (cepOnlyMatch) {
      const cepRaw = cepOnlyMatch[1].replace(/\D/g, '');
      if (cepRaw.length === 8) {
        const previousUserMessages = chatMessages.filter((m: Record<string, unknown>) => m.role === 'user').map((m: Record<string, unknown>) => (typeof m.content === 'string' ? m.content : '').toLowerCase());
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

    // Pergunta de conhecimento geral fora do escopo (presidente EUA, capital França, Copa do Mundo, etc.) → resposta padrão sem LLM (relatório M-TECH)
    if (lib.isGeneralKnowledgeOutOfScope(lastUserMsg)) {
      const outOfScopeMessage = 'Essa pergunta não está relacionada aos serviços da Câmara Municipal de São Paulo. Posso ajudar com informações sobre vereadores, projetos de lei, audiências públicas ou outros serviços da Câmara.\n\n[SHOW_SERVICES_CHIPS]';
      const ssePayload = JSON.stringify({ choices: [{ delta: { content: outOfScopeMessage } }] });
      console.log('[ai-orchestrator] Resposta fora do escopo (conhecimento geral):', lastUserMsg.slice(0, 60));
      return new Response(`data: ${ssePayload}\n\ndata: [DONE]\n\n`, {
        headers: { ...lib.corsHeaders, 'Content-Type': 'text/event-stream' }
      });
    }

    // Avaliação / desempenho subjetivo de políticos → resposta padrão sem LLM
    if (lib.isPoliticianPerformanceEvaluationQuestion(lastUserMsg)) {
      const ssePayload = JSON.stringify({ choices: [{ delta: { content: lib.POLITICIAN_EVALUATION_BLOCKED_MESSAGE } }] });
      console.log('[ai-orchestrator] Bloqueio: avaliação/desempenho de políticos:', lastUserMsg.slice(0, 80));
      return new Response(`data: ${ssePayload}\n\ndata: [DONE]\n\n`, {
        headers: { ...lib.corsHeaders, 'Content-Type': 'text/event-stream' }
      });
    }

    // Small talk: "tudo bem?", "como vai?" (reciprocal) vs papo realmente fora (céu azul, tempo, etc.)
    const reciprocalGreetingPatterns = [
      /tudo bem\??/i, /tudo bom\??/i, /como vai\??/i, /como (está|esta) (você|vc|voce)\??/i,
      /(que )?tal\??/i, /e (aí|ai)\??/i,
    ];
    const realOffTopicPatterns = [
      /céu (está|esta) azul/i, /(o )?que acha\??/i,
      /(o )?tempo (está|esta|hoje)/i, /(está|esta) (frio|calor|bonito)/i, /(bom|ótimo) dia (pra|para) (todos|você)/i,
    ];
    const hasReciprocalGreeting = reciprocalGreetingPatterns.some(p => p.test(msgLower));
    const hasRealOffTopic = realOffTopicPatterns.some(p => p.test(msgLower));
    const serviceKeywords = /relatar|problema|transporte|avaliar|serviço|servicos|dúvida|duvida|câmara|camara|audiência|audiencia|vereador|histórico|historico|denúncia|denuncia|reclamar|reportar|inscrever/i;
    const hasServiceIntent = serviceKeywords.test(msgLower);
    // Só mostrar "Desculpe, o intuito deste canal..." para papo realmente fora (ex: céu azul). "Oi, bom dia, tudo bem?" = resposta amigável
    const isOffTopic = isGreeting && hasRealOffTopic && !hasServiceIntent;
    
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
    const accumulatedDesc = String(accumulatedFields?.description ?? '');
    const hasUrgentInDescription =
      accumulatedDesc.length > 0 && urgentPatterns.some((pattern) => pattern.test(accumulatedDesc.toLowerCase()));
    
    // Não responder com saudação/"descreva o problema" se a jornada urbana exige escolher natureza do relato primeiro
    const skipDeterministicForUrbanNature =
      collectionIntent?.type === 'urban_report' &&
      nextFieldInfo.field === 'report_nature';

    if (!skipDeterministicForUrbanNature && (isGreeting || isEmpathyRequest || isGenericReport || isOffTopic)) {
      console.log('[ai-orchestrator] Deterministic response detected:', { isGreeting, isEmpathyRequest, isGenericReport, isOffTopic, isUrgent, msgLower });

      // Mensagem sem relação com os serviços: saudação + desculpa + lista de serviços
      if (isOffTopic) {
        let greeting = 'Olá!';
        if (msgLower.includes('boa noite')) greeting = 'Boa noite!';
        else if (msgLower.includes('bom dia')) greeting = 'Bom dia!';
        else if (msgLower.includes('boa tarde')) greeting = 'Boa tarde!';
        else if (msgLower.includes('olá') || msgLower.includes('oi')) greeting = 'Olá!';
        const servicesList = '• Relato Urbano\n• Transporte\n• Avaliar serviço\n• Serviços próximos\n• Tirar dúvida sobre a Câmara';
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
        response = hasReciprocalGreeting ? 'Bom dia! Tudo bem, e você? Como posso ajudar hoje?' : 'Bom dia! Como posso ajudar hoje?';
      } else if (msgLower.includes('boa tarde')) {
        response = hasReciprocalGreeting ? 'Boa tarde! Tudo bem? Como posso ajudar?' : 'Boa tarde! Como posso ajudar?';
      } else if (msgLower.includes('boa noite')) {
        response = hasReciprocalGreeting ? 'Boa noite! Tudo bem? Como posso ajudar?' : 'Boa noite! Como posso ajudar?';
      } else if (msgLower.includes('olá') || msgLower.includes('oi')) {
        response = hasReciprocalGreeting ? 'Olá! Tudo bem? Como posso ajudar?' : 'Olá! Como posso ajudar?';
      } else if (isGenericReport) {
        // Generic report - always be empathetic (localização vem na próxima pergunta)
        response = 'Olá! Claro, vou te ajudar. Descreva o problema, por favor.';
      } else {
        response = 'Olá! Como posso ajudar?';
      }
      
      // Urgência: nunca pedir só "digite o CEP" — alinhar ao fluxo (GPS / cadastrado / CEP)
      if (isUrgent || hasUrgentInDescription) {
        const urbanUrgent =
          collectionIntent?.type === 'urban_report' &&
          nextFieldInfo.field === 'location_method' &&
          !skipDeterministicForUrbanNature;
        const fieldsJson = JSON.stringify(accumulatedFields || {});
        const progressUrban = `[COLLECTION_PROGRESS:urban_report:${fieldsJson}]`;
        const locationBody =
          'Como você quer informar **onde fica** o problema? Toque em **Usar minha localização (GPS)** abaixo, ou escolha **endereço cadastrado** / **digitar CEP ou endereço**.';

        if (urbanUrgent) {
          let intro = 'Isso é perigoso! Vamos resolver rápido.\n\n';
          if (
            msgLower.includes('incêndio') ||
            msgLower.includes('fogo') ||
            msgLower.includes('queimando') ||
            accumulatedDesc.toLowerCase().includes('incêndio') ||
            accumulatedDesc.toLowerCase().includes('fogo')
          ) {
            intro = 'Isso é muito perigoso! Vamos registrar urgentemente.\n\n';
          } else if (
            msgLower.includes('fios') ||
            msgLower.includes('expostos') ||
            accumulatedDesc.toLowerCase().includes('fios') ||
            accumulatedDesc.toLowerCase().includes('expostos')
          ) {
            intro = 'Isso é perigoso! Vamos resolver rápido.\n\n';
          } else if (
            msgLower.includes('risco') ||
            msgLower.includes('perigo') ||
            msgLower.includes('armado') ||
            msgLower.includes('arma') ||
            accumulatedDesc.toLowerCase().includes('armado') ||
            accumulatedDesc.toLowerCase().includes('arma') ||
            accumulatedDesc.toLowerCase().includes('drogas') ||
            accumulatedDesc.toLowerCase().includes('violência') ||
            accumulatedDesc.toLowerCase().includes('baderna')
          ) {
            intro =
              'Entendi a gravidade da situação. Isso é muito preocupante! Vamos registrar como alto risco imediato.\n\n';
          }
          response = `${progressUrban}[FIELD_REQUEST:location_method]${intro}${locationBody}\n\n[LOCATION_METHOD_PICKER]`;
        } else {
          response =
            'Isso é urgente. Para registrar com segurança, escolha **Relato Urbano** nos serviços abaixo; em seguida você poderá informar o local por **GPS**, **endereço cadastrado** ou **CEP**.\n\n[SHOW_SERVICES_CHIPS]';
          if (
            msgLower.includes('incêndio') ||
            msgLower.includes('fogo') ||
            msgLower.includes('queimando') ||
            accumulatedDesc.toLowerCase().includes('incêndio') ||
            accumulatedDesc.toLowerCase().includes('fogo')
          ) {
            response =
              'Isso é muito perigoso! Vamos registrar urgentemente. Escolha **Relato Urbano** abaixo e, na próxima etapa, indique o local por **GPS**, **endereço cadastrado** ou **CEP**.\n\n[SHOW_SERVICES_CHIPS]';
          }
        }
      } else if (msgLower.includes('problema') || msgLower.includes('relatar')) {
        // Problem mentioned but not urgent
        if (response.includes('Como posso ajudar')) {
          response = response.replace('Como posso ajudar?', 'Claro, vou te ajudar. Descreva o problema, por favor.');
        }
      }
      
      // Saudação simples (com ou sem "tudo bem?"): mostrar chips para o usuário escolher o serviço
      if (
        isGreeting &&
        !isOffTopic &&
        !isGenericReport &&
        !isEmpathyRequest &&
        !response.includes('[LOCATION_METHOD_PICKER]') &&
        !response.includes('[SHOW_SERVICES_CHIPS]')
      ) {
        response = `${response}\n\n[SHOW_SERVICES_CHIPS]`;
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

      let serviceRatingDimensionHints = '';
      if (
        collectionIntent!.type === 'service_rating' &&
        nextFieldInfo.field === 'rating_dimensions' &&
        accumulatedFields?.service_type
      ) {
        try {
          serviceRatingDimensionHints = await lib.fetchServiceTypeRatingQuestionHints(
            supabase,
            String(accumulatedFields.service_type),
          );
        } catch (e) {
          console.warn('[ai-orchestrator] service_type_rating_questions:', (e as Error).message);
        }
      }

      const deterministicResponse =
        `${progressMarker}${fieldMarker}${prefix}${nextFieldInfo.prompt}${serviceRatingDimensionHints}${pickerMarker ? '\n\n' + pickerMarker : ''}`;
      
      const ssePayload = JSON.stringify({
        choices: [{ delta: { content: deterministicResponse } }]
      });
      
      console.log('[ai-orchestrator] Request completed in', Date.now() - requestStartTime, 'ms (deterministic)');
      return new Response(`data: ${ssePayload}\n\ndata: [DONE]\n\n`, {
        headers: { ...lib.corsHeaders, 'Content-Type': 'text/event-stream' }
      });
    }

    // === Notícias: injetar as 5 últimas no system prompt ===
    if (collectionIntent?.type === 'noticias') {
      try {
        const noticiasContext = await lib.getUltimasNoticias(supabase, 5);
        if (noticiasContext) {
          dynamicSystemPrompt = dynamicSystemPrompt + '\n\n' + noticiasContext;
          console.log('[ai-orchestrator] Injected 5 latest notícias for noticias intent');
        }
      } catch (e) {
        console.warn('[ai-orchestrator] getUltimasNoticias error:', (e as Error).message);
      }
    }

    // Short-circuit: "quais as próximas audiências?" → chamar search_audiencias e retornar só o texto da ferramenta
    // (evita que a IA responda com RAG genérico sem chamar a ferramenta)
    if (lib.isQuestionAboutProximasOuQuaisAudiencias(lastUserMessage)) {
      try {
        const toolResult = await lib.executeTool('search_audiencias', {}, user.id, supabase, accumulatedFields || {});
        const content = toolResult.message || '';
        const payload = content + '\n\n[APP_ACTIONS:audiencias]';
        console.log('[ai-orchestrator] Short-circuit: search_audiencias for "próximas/quais audiências", length:', content.length);
        return new Response(`data: ${JSON.stringify({ choices: [{ delta: { content: payload } }] })}\n\ndata: [DONE]\n\n`, {
          headers: { ...lib.corsHeaders, 'Content-Type': 'text/event-stream' }
        });
      } catch (e) {
        console.error('[ai-orchestrator] Short-circuit search_audiencias error:', e);
        // fall through: deixa a IA tentar com a ferramenta
      }
    }

    // === Opção B: RAG no Vertex para perguntas "gerais" ===
    // Se intenção é "general" e há data store ou corpus configurado, chama generateContent com retrieval
    // e injeta o contexto grounded no system prompt antes de chamar chat/completions.
    // Exceção: perguntas sobre zoneamento/LPUOS/construir imóvel → usar search_knowledge_base (Supabase KB),
    // pois o conteúdo está na tabela knowledge_base (populate-knowledge-base) e o Vertex RAG pode não tê-lo.
    const zoneamentoKeywords = ['zoneamento', 'lpuos', 'construir', 'reformar', 'imóvel', 'imovel', 'siszon', 'legislação urbana', 'legislacao urbana', 'smul'];
    const isZoneamentoQuery = zoneamentoKeywords.some(k => lastUserMessage.toLowerCase().includes(k));
    const isCamaraFuncionamentoQuery = lib.isCamaraFuncionamentoInternoQuery(lastUserMessage);
    if (isZoneamentoQuery) {
      console.log('[ai-orchestrator] Zoneamento/LPUOS query detected → skipping Vertex RAG, will use search_knowledge_base');
    }
    if (isCamaraFuncionamentoQuery) {
      console.log('[ai-orchestrator] Câmara funcionamento/estrutura → skipping Vertex RAG (Supabase KB + prompt)');
    }

    // Pré-busca na KB do Supabase para estrutura/funcionamento (uma ida; evita RAG genérico e reduz alucinação)
    if (collectionIntent?.type === 'general' && isCamaraFuncionamentoQuery && !isZoneamentoQuery) {
      try {
        const kbText = await lib.searchKnowledgeBase(supabase, lastUserMessage);
        if (!kbText.includes('Não encontrei informações específicas')) {
          dynamicSystemPrompt = dynamicSystemPrompt
            + '\n\n[Contexto da base de conhecimento da Câmara (Supabase)]:\n'
            + kbText
            + '\n\nInstrução: Use o texto acima como base principal sobre o funcionamento e a estrutura da Câmara. Organize em linguagem simples; não contradiga esses trechos. Se faltar detalhe pontual, complemente de forma coerente com o que está escrito.';
          console.log('[ai-orchestrator] Injected Supabase KB for Câmara funcionamento, chars:', kbText.length);
        } else {
          console.log('[ai-orchestrator] Supabase KB (Câmara funcionamento) sem trechos específicos; modelo pode usar search_knowledge_base');
        }
      } catch (e) {
        console.warn('[ai-orchestrator] Pré-busca searchKnowledgeBase (Câmara) falhou:', (e as Error).message);
      }
    }

    if (
      collectionIntent?.type === 'general' &&
      (vertexRagDatastore || vertexRagCorpus) &&
      finalAiApiKey &&
      lastUserMessage.trim().length > 3 &&
      !isZoneamentoQuery &&
      !isCamaraFuncionamentoQuery &&
      !lib.isBusInformationalQuery(lastUserMessage) &&
      !lib.isQuestionAboutProximasOuQuaisAudiencias(lastUserMessage)
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
            } else {
              const excerpt = (lastUserMessage || '').trim().slice(0, 120);
              console.log('[ai-orchestrator] NÃO FOI POSSÍVEL ENCONTRAR ESTA INFORMAÇÃO NO RAG. Mensagem do usuário (trecho):', excerpt || '(vazia)');
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

    // Pergunta sobre ônibus/linhas (Olho Vivo) → hint para usar search_bus_lines, search_bus_stops, etc.
    if (lib.isBusInformationalQuery(lastUserMessage)) {
      dynamicSystemPrompt = dynamicSystemPrompt + '\n\n[CONTEXTO: Ônibus em São Paulo. Para PONTOS/PARADAS PRÓXIMOS A MIM com coordenadas: use find_nearby_services com service_type=transit_station (dados GeoSampa: pontos de ônibus, terminais). Para linhas/previsão: search_bus_lines, search_bus_stops (por nome/endereço), get_bus_line_itinerary, get_bus_arrival_forecast, get_bus_stop_forecast_all_lines.]';
      console.log('[ai-orchestrator] Bus informational query → injected Olho Vivo tool hint');
    }

    // Data de hoje: evita que o modelo "alucine" respondendo como se estivesse em outro ano (ex.: 2025)
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const currentYear = now.getFullYear();
    dynamicSystemPrompt = dynamicSystemPrompt + `\n\n[DATA E AUDIÊNCIAS] Data de hoje: ${todayStr} (ano civil ${currentYear}). Ao falar de "este ano" use sempre o ano ${currentYear}. Para audiências públicas: use APENAS o texto retornado pela ferramenta search_audiencias; não invente audiências, datas nem resuma com outro ano.`;

    // Se injetamos contexto do Vertex RAG ou da KB Supabase (Câmara), não expor search_knowledge_base para evitar segunda busca redundante
    const vertexRagInjected = dynamicSystemPrompt.includes('[Contexto da base de conhecimento da Câmara (Vertex RAG)]');
    const supabaseCamaraKbInjected = dynamicSystemPrompt.includes('[Contexto da base de conhecimento da Câmara (Supabase)]');
    const suppressSearchKnowledgeBase = vertexRagInjected || supabaseCamaraKbInjected;
    const effectiveTools = suppressSearchKnowledgeBase
      ? (lib.tools as Array<{ type?: string; function?: { name?: string } }>).filter(
          t => t?.function?.name !== 'search_knowledge_base'
        )
      : lib.tools;
    if (vertexRagInjected) {
      console.log('[ai-orchestrator] Vertex RAG context injected → search_knowledge_base excluded from tools (prefer RAG)');
    }
    if (supabaseCamaraKbInjected) {
      console.log('[ai-orchestrator] Supabase KB (Câmara) injected → search_knowledge_base excluded from tools');
    }

    // Call AI API with streaming enabled and timeout
    const controller = new AbortController();
    const apiTimeoutId = setTimeout(() => {
      console.warn('[ai-orchestrator] API timeout (60s), aborting request');
      controller.abort();
    }, 60000); // Increased to 60s to prevent premature timeouts

    // Vertex exige OAuth2 token; não enviar API key para Vertex (evita 401 ACCESS_TOKEN_TYPE_UNSUPPORTED)
    const isVertex = !!(vertexTokenUrl || finalAiBaseUrl.includes('aiplatform'));
    if (isVertex && !vertexTokenObtained) {
      console.error('[ai-orchestrator] Vertex URL configurada mas token não obtido. Verifique VERTEX_TOKEN_URL, VERTEX_TOKEN_SECRET e se o serviço vertex-token retorna { "token": "<oauth2_access_token>" }.');
      const errorMsg = 'O assistente de IA está temporariamente indisponível. O serviço de token do Vertex não retornou um token válido. Tente novamente em alguns instantes ou avise o administrador.';
      return new Response(`data: ${JSON.stringify({ choices: [{ delta: { content: errorMsg } }] })}\n\ndata: [DONE]\n\n`, {
        headers: { ...lib.corsHeaders, 'Content-Type': 'text/event-stream' }
      });
    }

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
      const effectiveModel = isVertex && !aiChatModel.startsWith('google/')
        ? `google/${aiChatModel}`
        : aiChatModel;
      console.log('[ai-orchestrator] Calling AI API:', apiUrl, 'model:', effectiveModel);
      
      // Build request body with tools for vLLM (requires --enable-auto-tool-choice and --tool-call-parser llama3_json)
      const requestBody: Record<string, unknown> = {
        model: effectiveModel,
        messages: [
          { role: 'system', content: dynamicSystemPrompt },
          ...chatMessages.slice(-10) // Last 10 messages for context
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
    } catch (fetchError: unknown) {
      clearTimeout(apiTimeoutId);
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
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
      type StreamToolCallInfo = { name: string; id?: string };
      let toolCallData: StreamToolCallInfo | null = null;
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
            for (const tc of delta.tool_calls as Array<Record<string, unknown>>) {
              const fn = tc.function as Record<string, unknown> | undefined;
              const fnName = fn?.name;
              if (typeof fnName === 'string' && fnName.length > 0) {
                const idRaw = tc.id;
                toolCallData = {
                  name: fnName,
                  id: idRaw != null ? String(idRaw) : undefined,
                };
              }
              const fnArgs = fn?.arguments;
              if (typeof fnArgs === 'string') {
                toolCallArguments += fnArgs;
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
          if (toolCallData.name === 'create_urban_report' && attachmentUrls.length > 0) {
            toolArgs.photos = attachmentUrls;
          }
          if (toolCallData.name === 'create_transport_report' && attachmentUrls.length > 0) {
            toolArgs.photos = attachmentUrls;
          }

          // Intercept create_transport_report: obrigar preview + pergunta de fotos antes de registrar
          if (toolCallData.name === 'create_transport_report') {
            const alreadyAskedPhotos = /deseja\s+anexar\s+imagens\s+quanto\s+ao\s+problema\s+de\s+transporte|anexar\s+imagens\s+quanto\s+ao\s+problema\s+de\s+transporte/i.test(lastAssistantLower || '');
            const alreadyShowedPreview = /resumo\s+do\s+relato\s+de\s+transporte|se\s+estiver\s+tudo\s+certo.*registrar/i.test(lastAssistantLower || '');
            const alreadyShowedSimilarTransportIntercept =
              /\[SIMILAR_TRANSPORT_REPORTS_B64:/i.test(lastAssistantLower || '');
            if (!alreadyAskedPhotos && !alreadyShowedPreview) {
              const merged = {
                ...accumulatedFields,
                description: toolArgs.description ?? accumulatedFields.description,
                report_type: toolArgs.report_type ?? accumulatedFields.report_type,
                sub_category: toolArgs.sub_category ?? accumulatedFields.sub_category,
                line_code: toolArgs.line_code ?? accumulatedFields.line_code,
                line_id: toolArgs.line_id ?? accumulatedFields.line_id,
                occurrence_date: toolArgs.occurrence_date ?? accumulatedFields.occurrence_date,
                occurrence_time: toolArgs.occurrence_time ?? accumulatedFields.occurrence_time,
                direction: toolArgs.direction ?? accumulatedFields.direction,
                recurrence_frequency: toolArgs.recurrence_frequency ?? accumulatedFields.recurrence_frequency,
                stop_name: toolArgs.stop_name ?? accumulatedFields.stop_name,
                location: toolArgs.location ?? accumulatedFields.location,
                stop_location: toolArgs.stop_location ?? accumulatedFields.stop_location,
                accessibility_details:
                  toolArgs.accessibility_details ?? accumulatedFields.accessibility_details,
                severity: toolArgs.severity ?? accumulatedFields.severity,
                subcategory_label: toolArgs.subcategory_label ?? accumulatedFields.subcategory_label,
                personal_impact: toolArgs.personal_impact ?? accumulatedFields.personal_impact,
                impact_description: toolArgs.impact_description ?? accumulatedFields.impact_description,
              };
              const interceptBaseReady =
                Boolean(merged.occurrence_time) &&
                Boolean(merged.direction) &&
                merged.personal_impact != null &&
                merged.personal_impact !== "";
              const interceptReportType = String(merged.report_type || "outro").toLowerCase();
              const interceptSubRaw = merged.sub_category;
              const interceptSubTrimmed =
                interceptSubRaw != null && String(interceptSubRaw).trim() !== ""
                  ? String(interceptSubRaw).trim()
                  : "";
              const interceptSubOk =
                interceptSubTrimmed.length > 0 &&
                lib.isValidTransportSubcategory(interceptReportType, interceptSubTrimmed);

              if (interceptBaseReady && !interceptSubOk) {
                const askSubcategoryMsg =
                  `[COLLECTION_PROGRESS:transport_report:${JSON.stringify(merged)}][FIELD_REQUEST:sub_category]Qual detalhe descreve melhor esse problema?[SUBCATEGORY_PICKER:${interceptReportType}]`;
                const sseSub = JSON.stringify({ choices: [{ delta: { content: askSubcategoryMsg } }] });
                console.log(
                  "[ai-orchestrator] Transport report: intercept (stream) – missing/invalid sub_category, picker before preview",
                );
                return new Response(`data: ${sseSub}\n\ndata: [DONE]\n\n`, {
                  headers: { ...lib.corsHeaders, "Content-Type": "text/event-stream" },
                });
              }

              if (interceptBaseReady && interceptSubOk) {
                if (!merged.stop_name) {
                  const askStopNameMsg =
                    `[COLLECTION_PROGRESS:transport_report:${JSON.stringify(merged)}][FIELD_REQUEST:stop_name]Qual foi a **parada, ponto, terminal ou estação** específicos onde isso aconteceu?`;
                  const sseStopName = JSON.stringify({ choices: [{ delta: { content: askStopNameMsg } }] });
                  return new Response(`data: ${sseStopName}\n\ndata: [DONE]\n\n`, {
                    headers: { ...lib.corsHeaders, "Content-Type": "text/event-stream" },
                  });
                }
                if (!merged.stop_location) {
                  const askStopLocationMsg =
                    `[COLLECTION_PROGRESS:transport_report:${JSON.stringify(merged)}][FIELD_REQUEST:stop_location]Qual o **endereço, cruzamento ou referência** desse ponto? Se preferir, você também pode informar coordenadas \`lat,lng\`.`;
                  const sseStopLocation = JSON.stringify({ choices: [{ delta: { content: askStopLocationMsg } }] });
                  return new Response(`data: ${sseStopLocation}\n\ndata: [DONE]\n\n`, {
                    headers: { ...lib.corsHeaders, "Content-Type": "text/event-stream" },
                  });
                }
                if (
                  interceptReportType === "acessibilidade" &&
                  !hasTransportAccessibilityDetails(merged.accessibility_details)
                ) {
                  const askAccessibilityChecklistMsg =
                    `[COLLECTION_PROGRESS:transport_report:${JSON.stringify(merged)}][FIELD_REQUEST:accessibility_details]Para detalhar a ocorrência, marque o **checklist de acessibilidade** abaixo (rampa, elevador, piso tátil, apoio para embarque) e complemente se necessário.[ACCESSIBILITY_CHECKLIST]`;
                  const sseAccessibility = JSON.stringify({
                    choices: [{ delta: { content: askAccessibilityChecklistMsg } }],
                  });
                  return new Response(`data: ${sseAccessibility}\n\ndata: [DONE]\n\n`, {
                    headers: { ...lib.corsHeaders, "Content-Type": "text/event-stream" },
                  });
                }
                if (!alreadyShowedSimilarTransportIntercept) {
                  try {
                    const similarStream = await lib.fetchSimilarTransportReportsForSupport(
                      supabase,
                      merged as Record<string, unknown>,
                      user.id,
                      10,
                    );
                    if (similarStream.length > 0) {
                      const payload = { reports: similarStream };
                      const json = JSON.stringify(payload);
                      const b64 = btoa(unescape(encodeURIComponent(json)));
                      const intro =
                        `Encontramos **relatos recentes na mesma linha e tipo de problema** (até ${similarStream.length} registros). Você pode **apoiar** um relato existente ou **registrar um novo**.`;
                      const similarMsg =
                        `[COLLECTION_PROGRESS:transport_report:${JSON.stringify(merged)}]${intro}\n\n[SIMILAR_TRANSPORT_REPORTS_B64:${b64}]\n\nToque em **Registrar novo relato** para seguir com o seu pedido (fotos e confirmação).[QUICK_REPLY:novo_relato]`;
                      const sseSimilar = JSON.stringify({ choices: [{ delta: { content: similarMsg } }] });
                      console.log('[ai-orchestrator] Transport report: intercept – similar reports first, count:', similarStream.length);
                      return new Response(`data: ${sseSimilar}\n\ndata: [DONE]\n\n`, {
                        headers: { ...lib.corsHeaders, 'Content-Type': 'text/event-stream' },
                      });
                    }
                  } catch (e) {
                    console.warn('[ai-orchestrator] Transport intercept (stream) similar lookup failed:', e);
                  }
                }
                const recurrenceLabelMap: Record<string, string> = {
                  primeira_vez: 'Primeira vez',
                  algumas_vezes_mes: 'Algumas vezes/mês',
                  toda_semana: 'Toda semana',
                  todos_os_dias: 'Todos os dias',
                };
                const stopNameRaw = (merged as Record<string, unknown>).stop_name;
                const stopNameLabel =
                  stopNameRaw === "__skip__"
                    ? "Não lembro"
                    : (typeof stopNameRaw === "string" && stopNameRaw.trim() ? stopNameRaw : "Não informado");
                const previewAndPhoto = `[COLLECTION_PROGRESS:transport_report:${JSON.stringify(merged)}]**Resumo do relato de transporte**

• **Problema:** ${((merged.description as string) || '').toString().slice(0, 150)}${((merged.description as string) || '').toString().length > 150 ? '...' : ''}
• **Tipo:** ${lib.formatTransportPreviewTypeLine(merged as Record<string, unknown>)}
• **Linha:** ${merged.line_code || 'Não informada'}
• **Ponto de embarque/parada:** ${stopNameLabel}
• **Quando:** ${merged.occurrence_date || ''}${merged.occurrence_time ? ` às ${merged.occurrence_time}` : ''}
• **Sentido:** ${merged.direction || 'Não informado'}
• **Frequência:** ${recurrenceLabelMap[String(merged.recurrence_frequency || '')] || merged.recurrence_frequency || 'Não informada'}
• **Impacto na rotina:** ${transportImpactSummaryLine(merged.personal_impact)}${buildTransportPreviewOptionalLines(merged)}

Se estiver tudo certo, você pode **anexar fotos** (botões Câmera ou Galeria abaixo) ou registrar direto. **Deseja anexar imagens** quanto ao problema de transporte?${transportPreviewJsonMarker(merged)}[QUICK_REPLY:sim,não]`;
                const ssePayload = JSON.stringify({ choices: [{ delta: { content: previewAndPhoto } }] });
                console.log('[ai-orchestrator] Transport report: intercept – showing preview + photo choice before creating');
                return new Response(`data: ${ssePayload}\n\ndata: [DONE]\n\n`, {
                  headers: { ...lib.corsHeaders, 'Content-Type': 'text/event-stream' }
                });
              }
            }
          }

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
            ...(toolArgs.sub_category && { sub_category: toolArgs.sub_category }),
            ...(toolArgs.line_code && { line_code: toolArgs.line_code }),
            ...(toolArgs.occurrence_date && { occurrence_date: toolArgs.occurrence_date }),
            ...(toolArgs.occurrence_time && { occurrence_time: toolArgs.occurrence_time }),
            ...(toolArgs.direction && { direction: toolArgs.direction }),
            ...(toolArgs.recurrence_frequency && { recurrence_frequency: toolArgs.recurrence_frequency }),
            ...(toolArgs.stop_name && { stop_name: toolArgs.stop_name }),
            ...(toolArgs.severity && { severity: toolArgs.severity }),
            ...(toolArgs.personal_impact != null && toolArgs.personal_impact !== "" && { personal_impact: toolArgs.personal_impact }),
            ...(toolArgs.impact_description && { impact_description: toolArgs.impact_description }),
            ...(toolArgs.stop_location && { stop_location: toolArgs.stop_location }),
            ...(toolArgs.accessibility_details != null &&
            typeof toolArgs.accessibility_details === "object" &&
            !Array.isArray(toolArgs.accessibility_details)
              ? { accessibility_details: toolArgs.accessibility_details }
              : {}),
            // Service rating fields
            ...(toolArgs.service_type && { service_type: toolArgs.service_type }),
            ...(toolArgs.rating_stars && { rating_stars: toolArgs.rating_stars }),
            ...(toolArgs.rating_dimensions && { rating_dimensions: toolArgs.rating_dimensions }),
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
          let hintsEmpty = '';
          if (
            collectionIntent.type === 'service_rating' &&
            nextFieldInfo.field === 'rating_dimensions' &&
            accumulatedFields?.service_type
          ) {
            try {
              hintsEmpty = await lib.fetchServiceTypeRatingQuestionHints(
                supabase,
                String(accumulatedFields.service_type),
              );
            } catch {
              /* ignore */
            }
          }
          responseContent =
            `${progressMarker}${fieldMarker}${nextFieldInfo.prompt}${hintsEmpty}${pickerMarker ? '\n\n' + pickerMarker : ''}`;
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
      // RAG sobre audiências: oferecer ver no app (chat + módulo)
      if (collectionIntent?.type === 'general' && (lib.isInformationalQuestionAboutBuscarAudiencia(lastUserMsg) || lib.isInformationalQuestionAboutAudience(lastUserMsg))) {
        responseContent += '\n\n[APP_ACTIONS:audiencias]';
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
    type NonStreamChatCompletion = {
      choices?: Array<{
        message?: {
          content?: string;
          tool_calls?: Array<{ function: { name: string; arguments: string } }>;
        };
      }>;
    };
    const data = (await response.json()) as NonStreamChatCompletion;
    const choice = data.choices?.[0];
    
    if (!choice) {
      throw new Error('No response from AI');
    }
    
    // Handle tool calls in non-streaming mode
    if (choice.message?.tool_calls?.length) {
      const toolCall = choice.message.tool_calls[0];
      const toolName = toolCall.function.name;
      const toolArgs = JSON.parse(toolCall.function.arguments);
      if (toolName === 'create_urban_report' && attachmentUrls.length > 0) {
        toolArgs.photos = attachmentUrls;
      }
      if (toolName === 'create_transport_report' && attachmentUrls.length > 0) {
        toolArgs.photos = attachmentUrls;
      }

      // Intercept create_transport_report (non-stream): relatos similares → preview + pergunta de fotos antes de criar
      if (toolName === 'create_transport_report') {
        const alreadyAskedPhotos = /deseja\s+anexar\s+imagens\s+quanto\s+ao\s+problema\s+de\s+transporte|anexar\s+imagens\s+quanto\s+ao\s+problema\s+de\s+transporte/i.test(lastAssistantLower || '');
        const alreadyShowedPreview = /resumo\s+do\s+relato\s+de\s+transporte|se\s+estiver\s+tudo\s+certo.*registrar/i.test(lastAssistantLower || '');
        const alreadyShowedSimilarNs =
          /\[SIMILAR_TRANSPORT_REPORTS_B64:/i.test(lastAssistantLower || '');
        if (!alreadyAskedPhotos && !alreadyShowedPreview) {
          const merged = {
            ...accumulatedFields,
            description: toolArgs.description ?? accumulatedFields.description,
            report_type: toolArgs.report_type ?? accumulatedFields.report_type,
            sub_category: toolArgs.sub_category ?? accumulatedFields.sub_category,
            line_code: toolArgs.line_code ?? accumulatedFields.line_code,
            line_id: toolArgs.line_id ?? accumulatedFields.line_id,
            occurrence_date: toolArgs.occurrence_date ?? accumulatedFields.occurrence_date,
            occurrence_time: toolArgs.occurrence_time ?? accumulatedFields.occurrence_time,
            direction: toolArgs.direction ?? accumulatedFields.direction,
            recurrence_frequency: toolArgs.recurrence_frequency ?? accumulatedFields.recurrence_frequency,
            stop_name: toolArgs.stop_name ?? accumulatedFields.stop_name,
            location: toolArgs.location ?? accumulatedFields.location,
            stop_location: toolArgs.stop_location ?? accumulatedFields.stop_location,
            accessibility_details:
              toolArgs.accessibility_details ?? accumulatedFields.accessibility_details,
            severity: toolArgs.severity ?? accumulatedFields.severity,
            subcategory_label: toolArgs.subcategory_label ?? accumulatedFields.subcategory_label,
            personal_impact: toolArgs.personal_impact ?? accumulatedFields.personal_impact,
            impact_description: toolArgs.impact_description ?? accumulatedFields.impact_description,
          };
          const interceptBaseReadyNs =
            Boolean(merged.occurrence_time) &&
            Boolean(merged.direction) &&
            merged.personal_impact != null &&
            merged.personal_impact !== "";
          const interceptReportTypeNs = String(merged.report_type || "outro").toLowerCase();
          const interceptSubRawNs = merged.sub_category;
          const interceptSubTrimmedNs =
            interceptSubRawNs != null && String(interceptSubRawNs).trim() !== ""
              ? String(interceptSubRawNs).trim()
              : "";
          const interceptSubOkNs =
            interceptSubTrimmedNs.length > 0 &&
            lib.isValidTransportSubcategory(interceptReportTypeNs, interceptSubTrimmedNs);

          if (interceptBaseReadyNs && !interceptSubOkNs) {
            const askSubcategoryMsgNs =
              `[COLLECTION_PROGRESS:transport_report:${JSON.stringify(merged)}][FIELD_REQUEST:sub_category]Qual detalhe descreve melhor esse problema?[SUBCATEGORY_PICKER:${interceptReportTypeNs}]`;
            const sseSubNs = JSON.stringify({ choices: [{ delta: { content: askSubcategoryMsgNs } }] });
            console.log(
              "[ai-orchestrator] Transport report (non-stream): intercept – missing/invalid sub_category, picker before preview",
            );
            return new Response(`data: ${sseSubNs}\n\ndata: [DONE]\n\n`, {
              headers: { ...lib.corsHeaders, "Content-Type": "text/event-stream" },
            });
          }
          if (interceptBaseReadyNs && interceptSubOkNs) {
            if (!merged.stop_name) {
              const askStopNameMsgNs =
                `[COLLECTION_PROGRESS:transport_report:${JSON.stringify(merged)}][FIELD_REQUEST:stop_name]Qual foi a **parada, ponto, terminal ou estação** específicos onde isso aconteceu?`;
              const sseStopNameNs = JSON.stringify({ choices: [{ delta: { content: askStopNameMsgNs } }] });
              return new Response(`data: ${sseStopNameNs}\n\ndata: [DONE]\n\n`, {
                headers: { ...lib.corsHeaders, "Content-Type": "text/event-stream" },
              });
            }
            if (!merged.stop_location) {
              const askStopLocationMsgNs =
                `[COLLECTION_PROGRESS:transport_report:${JSON.stringify(merged)}][FIELD_REQUEST:stop_location]Qual o **endereço, cruzamento ou referência** desse ponto? Se preferir, você também pode informar coordenadas \`lat,lng\`.`;
              const sseStopLocationNs = JSON.stringify({ choices: [{ delta: { content: askStopLocationMsgNs } }] });
              return new Response(`data: ${sseStopLocationNs}\n\ndata: [DONE]\n\n`, {
                headers: { ...lib.corsHeaders, "Content-Type": "text/event-stream" },
              });
            }
            if (
              interceptReportTypeNs === "acessibilidade" &&
              !hasTransportAccessibilityDetails(merged.accessibility_details)
            ) {
              const askAccessibilityChecklistMsgNs =
                `[COLLECTION_PROGRESS:transport_report:${JSON.stringify(merged)}][FIELD_REQUEST:accessibility_details]Para detalhar a ocorrência, marque o **checklist de acessibilidade** abaixo (rampa, elevador, piso tátil, apoio para embarque) e complemente se necessário.[ACCESSIBILITY_CHECKLIST]`;
              const sseAccessibilityNs = JSON.stringify({
                choices: [{ delta: { content: askAccessibilityChecklistMsgNs } }],
              });
              return new Response(`data: ${sseAccessibilityNs}\n\ndata: [DONE]\n\n`, {
                headers: { ...lib.corsHeaders, "Content-Type": "text/event-stream" },
              });
            }
            if (!alreadyShowedSimilarNs) {
              try {
                const similarNs = await lib.fetchSimilarTransportReportsForSupport(
                  supabase,
                  merged as Record<string, unknown>,
                  user.id,
                  10,
                );
                if (similarNs.length > 0) {
                  const payload = { reports: similarNs };
                  const json = JSON.stringify(payload);
                  const b64 = btoa(unescape(encodeURIComponent(json)));
                  const intro =
                    `Encontramos **relatos recentes na mesma linha e tipo de problema** (até ${similarNs.length} registros). Você pode **apoiar** um relato existente ou **registrar um novo**.`;
                  const similarMsg =
                    `[COLLECTION_PROGRESS:transport_report:${JSON.stringify(merged)}]${intro}\n\n[SIMILAR_TRANSPORT_REPORTS_B64:${b64}]\n\nToque em **Registrar novo relato** para seguir com o seu pedido (fotos e confirmação).[QUICK_REPLY:novo_relato]`;
                  const sseSimilarNs = JSON.stringify({ choices: [{ delta: { content: similarMsg } }] });
                  console.log('[ai-orchestrator] Transport report (non-stream): intercept – similar first, count:', similarNs.length);
                  return new Response(`data: ${sseSimilarNs}\n\ndata: [DONE]\n\n`, {
                    headers: { ...lib.corsHeaders, 'Content-Type': 'text/event-stream' },
                  });
                }
              } catch (e) {
                console.warn('[ai-orchestrator] Transport intercept (non-stream) similar lookup failed:', e);
              }
            }
            const recurrenceLabelMap: Record<string, string> = {
              primeira_vez: 'Primeira vez',
              algumas_vezes_mes: 'Algumas vezes/mês',
              toda_semana: 'Toda semana',
              todos_os_dias: 'Todos os dias',
            };
            const stopNameRaw = (merged as Record<string, unknown>).stop_name;
            const stopNameLabel =
              stopNameRaw === "__skip__"
                ? "Não lembro"
                : (typeof stopNameRaw === "string" && stopNameRaw.trim() ? stopNameRaw : "Não informado");
            const previewAndPhoto = `[COLLECTION_PROGRESS:transport_report:${JSON.stringify(merged)}]**Resumo do relato de transporte**

• **Problema:** ${((merged.description as string) || '').toString().slice(0, 150)}${((merged.description as string) || '').toString().length > 150 ? '...' : ''}
• **Tipo:** ${lib.formatTransportPreviewTypeLine(merged as Record<string, unknown>)}
• **Linha:** ${merged.line_code || 'Não informada'}
• **Ponto de embarque/parada:** ${stopNameLabel}
• **Quando:** ${merged.occurrence_date || ''}${merged.occurrence_time ? ` às ${merged.occurrence_time}` : ''}
• **Sentido:** ${merged.direction || 'Não informado'}
• **Frequência:** ${recurrenceLabelMap[String(merged.recurrence_frequency || '')] || merged.recurrence_frequency || 'Não informada'}
• **Impacto na rotina:** ${transportImpactSummaryLine(merged.personal_impact)}${buildTransportPreviewOptionalLines(merged)}

Se estiver tudo certo, você pode **anexar fotos** (botões Câmera ou Galeria abaixo) ou registrar direto. **Deseja anexar imagens** quanto ao problema de transporte?${transportPreviewJsonMarker(merged)}[QUICK_REPLY:sim,não]`;
            const ssePayload = JSON.stringify({ choices: [{ delta: { content: previewAndPhoto } }] });
            console.log('[ai-orchestrator] Transport report (non-stream): intercept – preview + photo choice');
            return new Response(`data: ${ssePayload}\n\ndata: [DONE]\n\n`, {
              headers: { ...lib.corsHeaders, 'Content-Type': 'text/event-stream' }
            });
          }
        }
      }

      console.log('[ai-orchestrator] Tool call (non-stream):', toolName);
      
      const result = await lib.executeTool(toolName, toolArgs, user.id, supabase, accumulatedFields);
      
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
        ...(toolArgs.sub_category && { sub_category: toolArgs.sub_category }),
        ...(toolArgs.occurrence_time && { occurrence_time: toolArgs.occurrence_time }),
        ...(toolArgs.direction && { direction: toolArgs.direction }),
        ...(toolArgs.service_type && { service_type: toolArgs.service_type }),
        ...(toolArgs.rating_stars && { rating_stars: toolArgs.rating_stars }),
        ...(toolArgs.rating_dimensions && { rating_dimensions: toolArgs.rating_dimensions }),
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
  } catch (loadOrHandlerError) {
    const err = loadOrHandlerError instanceof Error ? loadOrHandlerError : new Error(String(loadOrHandlerError));
    console.error('[ai-orchestrator] Load or handler error:', err.message);
    console.error('[ai-orchestrator] Stack:', err.stack);
    return new Response(
      JSON.stringify({ error: 'Internal server error', detail: err.message }),
      { status: 500, headers: { ...PREFLIGHT_CORS, 'Content-Type': 'application/json' } }
    );
  }
});
