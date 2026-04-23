export const DEFAULT_AI_CHAT_MODEL = "meta-llama/Meta-Llama-3.1-8B-Instruct";

type EnvGet = (key: string) => string | undefined;

type ResolveAiProviderConfigArgs = {
  envGet?: EnvGet;
  fetchImpl?: typeof fetch;
  logPrefix?: string;
};

export type ResolvedAiProviderConfig = {
  aiChatModel: string;
  chatCompletionsModel: string;
  finalAiApiKey: string;
  finalAiBaseUrl: string;
  isVertex: boolean;
  vertexPublisherModelId: string;
  vertexTokenObtained: boolean;
  vertexTokenUrl?: string;
};

export function normalizeAiChatModel(aiChatModel?: string): string {
  const trimmed = (aiChatModel || "").trim();
  if (!trimmed) {
    return DEFAULT_AI_CHAT_MODEL;
  }

  return trimmed.replace(/^google\//, "");
}

export function isVertexAiProvider(finalAiBaseUrl?: string, vertexTokenUrl?: string): boolean {
  const normalizedBaseUrl = (finalAiBaseUrl || "").toLowerCase();
  return Boolean(
    vertexTokenUrl ||
      normalizedBaseUrl.includes("aiplatform.googleapis.com") ||
      normalizedBaseUrl.includes("/locations/") && normalizedBaseUrl.includes("/endpoints/openapi"),
  );
}

export function buildChatCompletionsModel(aiChatModel: string, isVertex: boolean): string {
  const normalizedModel = normalizeAiChatModel(aiChatModel);
  if (!isVertex) {
    return normalizedModel;
  }

  return normalizedModel.startsWith("google/") ? normalizedModel : `google/${normalizedModel}`;
}

export function buildVertexPublisherModelId(aiChatModel: string): string {
  return normalizeAiChatModel(aiChatModel);
}

export function hasUsableVertexCredentials(args: {
  finalAiApiKey: string;
  isVertex: boolean;
  vertexTokenObtained: boolean;
  vertexTokenUrl?: string;
}): boolean {
  const { finalAiApiKey, isVertex, vertexTokenObtained, vertexTokenUrl } = args;
  if (!isVertex) {
    return true;
  }

  if (vertexTokenUrl) {
    return vertexTokenObtained;
  }

  return Boolean(finalAiApiKey);
}

async function fetchVertexToken(
  vertexTokenUrl: string,
  vertexTokenSecret: string,
  fetchImpl: typeof fetch,
  logPrefix: string,
): Promise<{ token?: string }> {
  try {
    console.log(
      `${logPrefix} Fetching Vertex token from`,
      vertexTokenUrl.replace(/\/[^/]*$/, "/..."),
    );
    const tokenRes = await fetchImpl(vertexTokenUrl, {
      method: "GET",
      headers: { "X-Token-Secret": vertexTokenSecret },
    });
    const responseText = await tokenRes.text();
    if (!tokenRes.ok) {
      console.warn(
        `${logPrefix} Vertex token URL returned`,
        tokenRes.status,
        "| body:",
        responseText.substring(0, 300),
      );
      return {};
    }

    try {
      const data = JSON.parse(responseText) as { token?: string };
      if (typeof data?.token === "string" && data.token.length > 0) {
        console.log(`${logPrefix} Vertex token obtained successfully (length:`, data.token.length, ")");
        return { token: data.token };
      }

      console.warn(
        `${logPrefix} Vertex token URL returned OK but no token in body. Body keys:`,
        data ? Object.keys(data) : "null",
        "| body length:",
        responseText.length,
      );
    } catch (_parseErr) {
      console.warn(
        `${logPrefix} Vertex token URL returned non-JSON or invalid:`,
        responseText.substring(0, 200),
      );
    }
  } catch (error) {
    console.warn(`${logPrefix} VERTEX_TOKEN_URL fetch failed:`, (error as Error).message);
  }

  return {};
}

export async function resolveAiProviderConfig(
  args: ResolveAiProviderConfigArgs = {},
): Promise<ResolvedAiProviderConfig> {
  const {
    envGet = (key: string) => Deno.env.get(key),
    fetchImpl = fetch,
    logPrefix = "[ai-provider]",
  } = args;

  const aiChatBaseUrl = envGet("AI_CHAT_BASE_URL");
  const aiChatApiKey = envGet("AI_CHAT_API_KEY");
  const aiBaseUrl = envGet("AI_BASE_URL");
  const aiApiKey = envGet("AI_API_KEY");
  const vertexTokenUrl = envGet("VERTEX_TOKEN_URL");
  const vertexTokenSecret = envGet("VERTEX_TOKEN_SECRET");

  const aiChatModel = normalizeAiChatModel(envGet("AI_CHAT_MODEL"));
  const finalAiBaseUrl = aiChatBaseUrl || aiBaseUrl || "";
  let finalAiApiKey = aiChatApiKey || aiApiKey || "";
  let vertexTokenObtained = false;

  if (vertexTokenUrl && vertexTokenSecret) {
    const tokenData = await fetchVertexToken(vertexTokenUrl, vertexTokenSecret, fetchImpl, logPrefix);
    if (tokenData.token) {
      finalAiApiKey = tokenData.token;
      vertexTokenObtained = true;
    }
  }

  const isVertex = isVertexAiProvider(finalAiBaseUrl, vertexTokenUrl);
  if (isVertex && !vertexTokenUrl && finalAiApiKey) {
    vertexTokenObtained = true;
  }

  return {
    aiChatModel,
    chatCompletionsModel: buildChatCompletionsModel(aiChatModel, isVertex),
    finalAiApiKey,
    finalAiBaseUrl,
    isVertex,
    vertexPublisherModelId: buildVertexPublisherModelId(aiChatModel),
    vertexTokenObtained,
    vertexTokenUrl: vertexTokenUrl || undefined,
  };
}
