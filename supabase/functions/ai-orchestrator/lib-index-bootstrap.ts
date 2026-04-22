import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

type ChatMessage = Record<string, unknown>;

type ChatHistoryEntry = {
  role: string;
  content: string;
};

type CreateSupabaseClientFn = (
  url: string,
  key: string,
  options?: { global?: { headers?: Record<string, string> } },
) => SupabaseClient;

type BootstrapArgs = {
  corsHeaders: Record<string, string>;
  req: Request;
  createClientImpl?: CreateSupabaseClientFn;
  envGet?: (key: string) => string | undefined;
  fetchImpl?: typeof fetch;
};

export type BootstrapContext = {
  aiChatModel: string;
  attachmentUrls: string[];
  chatHistoryTyped: ChatHistoryEntry[];
  chatMessages: ChatMessage[];
  conversationId: unknown;
  evaluationContext: unknown;
  finalAiApiKey: string;
  finalAiBaseUrl: string;
  frontendCollectionType: string;
  lastAssistantContent: unknown;
  lastAssistantText: string;
  lastAssistantTextEarly: string;
  lastUserMsg: string;
  lastUserTextEarly: string;
  supabase: SupabaseClient;
  supabaseClassificationFeedbackRead: SupabaseClient | null;
  user: { id: string };
  vertexRagCorpus?: string;
  vertexRagDatastore?: string;
  vertexTokenObtained: boolean;
  vertexTokenUrl?: string;
};

type BootstrapResult = {
  context?: BootstrapContext;
  response?: Response;
};

export function getContentText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    const part = (content as Record<string, unknown>[]).find((item: Record<string, unknown>) =>
      item?.type === "text" && item?.text
    );
    return part ? String(part.text) : "";
  }
  return "";
}

function buildJsonErrorResponse(
  body: Record<string, unknown>,
  status: number,
  corsHeaders: Record<string, string>,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function buildMissingEnvSseResponse(corsHeaders: Record<string, string>): Response {
  const errorMsg = `⚠️ Assistente IA indisponível neste ambiente.\n\n` +
    `Faltam configurações na Edge Function: **AI_CHAT_BASE_URL** (ou AI_BASE_URL) e **SUPABASE_URL**.\n\n` +
    `Configure os secrets do Supabase e tente novamente.`;
  const ssePayload = JSON.stringify({
    choices: [{ delta: { content: errorMsg } }],
  });
  return new Response(`data: ${ssePayload}\n\ndata: [DONE]\n\n`, {
    headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
  });
}

export async function initializeRequestBootstrap(
  args: BootstrapArgs,
): Promise<BootstrapResult> {
  const {
    corsHeaders,
    req,
    createClientImpl,
    envGet = (key: string) => Deno.env.get(key),
    fetchImpl = fetch,
  } = args;

  const clientFactory = createClientImpl ?? ((url, key, options) => createClient(url, key, options));

  console.log("[ai-orchestrator] Loading environment variables...");
  const aiChatBaseUrl = envGet("AI_CHAT_BASE_URL");
  const aiChatApiKey = envGet("AI_CHAT_API_KEY");
  const aiBaseUrl = envGet("AI_BASE_URL");
  const aiApiKey = envGet("AI_API_KEY");
  const aiChatModel = envGet("AI_CHAT_MODEL") || "meta-llama/Meta-Llama-3.1-8B-Instruct";

  const supabaseUrl = envGet("SUPABASE_URL");
  const supabaseAnonKey = envGet("SUPABASE_ANON_KEY");
  const supabaseServiceRoleKey = envGet("SUPABASE_SERVICE_ROLE_KEY");

  console.log("[ai-orchestrator] Environment check:", {
    hasAiChatBaseUrl: !!aiChatBaseUrl,
    hasAiBaseUrl: !!aiBaseUrl,
    hasSupabaseUrl: !!supabaseUrl,
    hasSupabaseAnonKey: !!supabaseAnonKey,
    hasSupabaseServiceRoleKey: !!supabaseServiceRoleKey,
    aiChatModel,
    supabaseUrl: supabaseUrl ? supabaseUrl.substring(0, 50) + "..." : "missing",
    supabaseAnonKeyLength: supabaseAnonKey?.length || 0,
  });

  const finalAiBaseUrl = aiChatBaseUrl || aiBaseUrl;
  let finalAiApiKey = aiChatApiKey || aiApiKey || "";
  let vertexTokenObtained = false;

  const vertexTokenUrl = envGet("VERTEX_TOKEN_URL");
  const vertexTokenSecret = envGet("VERTEX_TOKEN_SECRET");
  const vertexRagDatastore = envGet("VERTEX_RAG_DATASTORE");
  const vertexRagCorpus = envGet("VERTEX_RAG_CORPUS");

  if (vertexTokenUrl && vertexTokenSecret) {
    try {
      console.log(
        "[ai-orchestrator] Fetching Vertex token from",
        vertexTokenUrl.replace(/\/[^/]*$/, "/..."),
      );
      const tokenRes = await fetchImpl(vertexTokenUrl, {
        method: "GET",
        headers: { "X-Token-Secret": vertexTokenSecret },
      });
      const responseText = await tokenRes.text();
      if (tokenRes.ok) {
        try {
          const data = JSON.parse(responseText) as { token?: string };
          if (data?.token && typeof data.token === "string" && data.token.length > 0) {
            finalAiApiKey = data.token;
            vertexTokenObtained = true;
            console.log(
              "[ai-orchestrator] Vertex token obtained successfully (length:",
              data.token.length,
              ")",
            );
          } else {
            console.warn(
              "[ai-orchestrator] Vertex token URL returned OK but no token in body. Body keys:",
              data ? Object.keys(data) : "null",
              "| body length:",
              responseText.length,
            );
          }
        } catch (_parseErr) {
          console.warn(
            "[ai-orchestrator] Vertex token URL returned non-JSON or invalid:",
            responseText.substring(0, 200),
          );
        }
      } else {
        console.warn(
          "[ai-orchestrator] Vertex token URL returned",
          tokenRes.status,
          "| body:",
          responseText.substring(0, 300),
        );
      }
    } catch (error) {
      console.warn("[ai-orchestrator] VERTEX_TOKEN_URL fetch failed:", (error as Error).message);
    }
  }

  if (!finalAiBaseUrl || !supabaseUrl || !supabaseAnonKey) {
    console.error("[ai-orchestrator] Missing required environment variables");
    console.error("[ai-orchestrator] Missing:", {
      aiChatBaseUrl: !aiChatBaseUrl,
      aiBaseUrl: !aiBaseUrl,
      supabaseUrl: !supabaseUrl,
      supabaseAnonKey: !supabaseAnonKey,
    });
    return { response: buildMissingEnvSseResponse(corsHeaders) };
  }

  console.log("[ai-orchestrator] Using AI provider:", finalAiBaseUrl);

  console.log("[ai-orchestrator] Validating authentication...");
  const authHeader = req.headers.get("Authorization");
  console.log("[ai-orchestrator] Authorization header present:", !!authHeader);
  console.log("[ai-orchestrator] Authorization header length:", authHeader?.length || 0);
  console.log(
    "[ai-orchestrator] Authorization header starts with Bearer:",
    authHeader?.startsWith("Bearer ") || false,
  );

  if (!authHeader) {
    console.error("[ai-orchestrator] Missing authorization header");
    return {
      response: buildJsonErrorResponse(
        { error: "Missing authorization header. Please log in again." },
        401,
        corsHeaders,
      ),
    };
  }

  if (!authHeader.startsWith("Bearer ")) {
    console.error("[ai-orchestrator] Authorization header does not start with Bearer");
    return {
      response: buildJsonErrorResponse(
        { error: "Invalid authorization header format. Please log in again." },
        401,
        corsHeaders,
      ),
    };
  }

  const tokenPreview = authHeader.substring(7, 27);
  console.log("[ai-orchestrator] Token preview:", tokenPreview + "...");
  console.log("[ai-orchestrator] Full auth header length:", authHeader.length);
  console.log("[ai-orchestrator] Token length (without Bearer):", authHeader.length - 7);

  try {
    const token = authHeader.substring(7);
    const parts = token.split(".");
    console.log("[ai-orchestrator] JWT parts count:", parts.length);
    if (parts.length === 3) {
      const payload = JSON.parse(atob(parts[1]));
      console.log("[ai-orchestrator] Token payload (safe):", {
        exp: payload.exp,
        iat: payload.iat,
        iss: payload.iss,
        sub: payload.sub,
        aud: payload.aud,
        now: Math.floor(Date.now() / 1000),
        isExpired: payload.exp ? payload.exp < Math.floor(Date.now() / 1000) : "unknown",
      });
    }
  } catch (decodeError) {
    console.warn("[ai-orchestrator] Could not decode token:", decodeError);
  }

  const supabase = clientFactory(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const supabaseClassificationFeedbackRead = supabaseServiceRoleKey && supabaseServiceRoleKey.length > 0
    ? clientFactory(supabaseUrl, supabaseServiceRoleKey)
    : null;

  if (!supabaseClassificationFeedbackRead) {
    console.warn(
      "[ai-orchestrator] SUPABASE_SERVICE_ROLE_KEY ausente: getClassificationFromFeedback usa JWT do usuário (RLS pode bloquear).",
    );
  }

  console.log("[ai-orchestrator] Verifying user authentication...");
  console.log("[ai-orchestrator] Using Supabase URL:", supabaseUrl);
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError) {
    console.error("[ai-orchestrator] Auth error:", {
      message: authError.message,
      status: authError.status,
      name: authError.name,
    });
    return {
      response: buildJsonErrorResponse(
        {
          code: 401,
          message: authError.message || "Authentication failed. Please log in again.",
        },
        401,
        corsHeaders,
      ),
    };
  }

  if (!user?.id) {
    console.error("[ai-orchestrator] No user found after authentication");
    return {
      response: buildJsonErrorResponse(
        {
          code: 401,
          message: "User not found. Please log in again.",
        },
        401,
        corsHeaders,
      ),
    };
  }

  console.log("[ai-orchestrator] User authenticated:", user.id);

  console.log("[ai-orchestrator] Parsing request body...");
  let requestBodyData: Record<string, unknown>;
  try {
    requestBodyData = (await req.json()) as Record<string, unknown>;
    console.log("[ai-orchestrator] Request parsed successfully");
  } catch (parseError) {
    console.error("[ai-orchestrator] Failed to parse request body:", parseError);
    console.error("[ai-orchestrator] Request body might be empty or invalid JSON");
    return {
      response: buildJsonErrorResponse(
        { error: "Invalid request body. Expected JSON." },
        400,
        corsHeaders,
      ),
    };
  }

  const {
    messages,
    conversationId,
    collectionType: collectionTypeRaw,
    evaluationContext,
  } = requestBodyData;
  const frontendCollectionType = typeof collectionTypeRaw === "string" ? collectionTypeRaw : "";
  const chatMessages: ChatMessage[] = Array.isArray(messages) ? (messages as ChatMessage[]) : [];
  const userMessages = chatMessages.filter((message: ChatMessage) => message.role === "user");
  const lastWithAttachments = [...userMessages].reverse().find((message: ChatMessage) =>
    Array.isArray(message.attachmentUrls) && message.attachmentUrls.length > 0
  );
  const attachmentUrls = (lastWithAttachments?.attachmentUrls as string[] | undefined) ?? [];

  console.log("[ai-orchestrator] Request parsed successfully. Messages count:", chatMessages.length);
  if (frontendCollectionType) {
    console.log("[ai-orchestrator] Frontend collectionType received:", frontendCollectionType);
  }

  const chatHistoryTyped: ChatHistoryEntry[] = chatMessages.map((message) => ({
    role: typeof message.role === "string" ? message.role : String(message.role ?? ""),
    content: getContentText(message.content),
  }));
  const lastUserContent = chatMessages.filter((message: ChatMessage) => message.role === "user").pop()?.content;
  const lastAssistantContent = chatMessages.filter((message: ChatMessage) => message.role === "assistant")
    .pop()?.content;
  const lastUserMsg = getContentText(lastUserContent);
  const lastUserTextEarly = lastUserMsg.trim();
  const lastAssistantText = getContentText(lastAssistantContent);
  const lastAssistantTextEarly = lastAssistantText.toLowerCase();

  return {
    context: {
      aiChatModel,
      attachmentUrls,
      chatHistoryTyped,
      chatMessages,
      conversationId,
      evaluationContext,
      finalAiApiKey,
      finalAiBaseUrl,
      frontendCollectionType,
      lastAssistantContent,
      lastAssistantText,
      lastAssistantTextEarly,
      lastUserMsg,
      lastUserTextEarly,
      supabase,
      supabaseClassificationFeedbackRead,
      user: { id: user.id },
      vertexRagCorpus: vertexRagCorpus || undefined,
      vertexRagDatastore: vertexRagDatastore || undefined,
      vertexTokenObtained,
      vertexTokenUrl: vertexTokenUrl || undefined,
    },
  };
}
