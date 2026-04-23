import { createSseResponse } from "./lib-index-sse.ts";
import {
  buildChatCompletionsModel,
  hasUsableVertexCredentials,
  isVertexAiProvider,
} from "../_shared/ai-provider.ts";

type AiApiArgs = {
  aiChatModel: string;
  chatMessages: Array<Record<string, unknown>>;
  corsHeaders: Record<string, string>;
  dynamicSystemPrompt: string;
  effectiveTools: unknown;
  finalAiApiKey: string;
  finalAiBaseUrl: string;
  requestStartTime: number;
  vertexTokenObtained: boolean;
  vertexTokenUrl?: string;
};

type AiApiResult = {
  response?: Response;
  errorResponse?: Response;
};

export async function callAiChatCompletion(
  args: AiApiArgs,
): Promise<AiApiResult> {
  const {
    aiChatModel,
    chatMessages,
    corsHeaders,
    dynamicSystemPrompt,
    effectiveTools,
    finalAiApiKey,
    finalAiBaseUrl,
    requestStartTime,
    vertexTokenObtained,
    vertexTokenUrl,
  } = args;

  const isVertex = isVertexAiProvider(finalAiBaseUrl, vertexTokenUrl);
  if (!hasUsableVertexCredentials({ finalAiApiKey, isVertex, vertexTokenObtained, vertexTokenUrl })) {
    console.error(
      '[ai-orchestrator] Vertex URL configurada mas token não obtido. Verifique VERTEX_TOKEN_URL, VERTEX_TOKEN_SECRET e se o serviço vertex-token retorna { "token": "<oauth2_access_token>" }.',
    );
    return {
      errorResponse: createSseResponse(
        "O assistente de IA está temporariamente indisponível. O serviço de token do Vertex não retornou um token válido. Tente novamente em alguns instantes ou avise o administrador.",
        corsHeaders,
      ),
    };
  }

  const controller = new AbortController();
  const apiTimeoutId = setTimeout(() => {
    console.warn("[ai-orchestrator] API timeout (60s), aborting request");
    controller.abort();
  }, 60000);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (finalAiApiKey) {
    headers["Authorization"] = `Bearer ${finalAiApiKey}`;
  }

  let response: Response;
  try {
    const apiUrl = `${finalAiBaseUrl.replace(/\/$/, "")}/chat/completions`;
    const effectiveModel = buildChatCompletionsModel(aiChatModel, isVertex);
    console.log("[ai-orchestrator] Calling AI API:", apiUrl, "model:", effectiveModel);

    const requestBody: Record<string, unknown> = {
      model: effectiveModel,
      messages: [
        { role: "system", content: dynamicSystemPrompt },
        ...chatMessages.slice(-10),
      ],
      temperature: 0.75,
      stream: true,
      tools: effectiveTools,
      tool_choice: "auto",
    };

    console.log("[ai-orchestrator] Request body has tools?", !!requestBody.tools);
    console.log(
      "[ai-orchestrator] Tools count:",
      Array.isArray(requestBody.tools) ? (requestBody.tools as unknown[]).length : 0,
    );

    const requestBodyJson = JSON.stringify(requestBody);
    console.log("[ai-orchestrator] Request body JSON length:", requestBodyJson.length);
    console.log(
      '[ai-orchestrator] Request body JSON contains "tool_choice":',
      requestBodyJson.includes("tool_choice"),
    );
    console.log(
      '[ai-orchestrator] Request body JSON contains "tools":',
      requestBodyJson.includes('"tools"'),
    );
    console.log("[ai-orchestrator] Request body JSON (first 1000 chars):", requestBodyJson.substring(0, 1000));
    console.log(
      "[ai-orchestrator] Request body JSON (last 200 chars):",
      requestBodyJson.substring(Math.max(0, requestBodyJson.length - 200)),
    );

    response = await fetch(apiUrl, {
      method: "POST",
      headers,
      body: requestBodyJson,
      signal: controller.signal,
    });
    clearTimeout(apiTimeoutId);
  } catch (fetchError: unknown) {
    clearTimeout(apiTimeoutId);
    if (fetchError instanceof Error && fetchError.name === "AbortError") {
      console.error("[ai-orchestrator] API call timeout after 60s");
      console.log("[ai-orchestrator] Request completed in", Date.now() - requestStartTime, "ms (timeout)");
      return {
        errorResponse: createSseResponse(
          "[TIMEOUT]O serviço está demorando mais que o normal. Isso pode acontecer quando há muitos usuários simultâneos ou quando o servidor está reiniciando. Tentando novamente automaticamente...",
          corsHeaders,
        ),
      };
    }
    throw fetchError;
  }

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[ai-orchestrator] API error:", response.status, errorText);

    if (response.status === 401) {
      console.error(
        "[ai-orchestrator] 401 Unauthorized da API de IA. Se estiver usando Vertex: confira VERTEX_TOKEN_URL, VERTEX_TOKEN_SECRET e se a Cloud Function vertex-token retorna token válido; confira também a conta de serviço do GCP (Vertex AI User).",
      );
      console.log("[ai-orchestrator] Request completed in", Date.now() - requestStartTime, "ms (401)");
      return {
        errorResponse: createSseResponse(
          "Desculpe, o serviço de IA não autorizou a requisição. Tente novamente em alguns instantes; se o problema continuar, o administrador precisa verificar a configuração do Vertex (token e permissões).",
          corsHeaders,
        ),
      };
    }

    if (response.status === 400) {
      const oneLine = (errorText || "").replace(/\s+/g, " ").trim();
      console.error("[ai-orchestrator] Bad Request (400) body:", oneLine);
      if (/thought[_\s-]?signature|stateful reasoning/i.test(errorText)) {
        console.error(
          "[ai-orchestrator] Gemini 3/Vertex indicou incompatibilidade de thought signatures. Revise o fluxo multi-turn/tool calling antes de promover esta configuração.",
        );
      }
      if (/tool|function.call|tool_choice/i.test(errorText)) {
        console.error(
          "[ai-orchestrator] Dica: se o vLLM não tiver tool calling ativo, suba o container com --enable-auto-tool-choice e --tool-call-parser llama3_json (ver docs/VM_LLM_CHAT_GPU_L4_INFO.md).",
        );
      }
      console.log("[ai-orchestrator] Request completed in", Date.now() - requestStartTime, "ms (400 error)");
      return {
        errorResponse: createSseResponse(
          /thought[_\s-]?signature|stateful reasoning/i.test(errorText)
            ? "Desculpe, o modelo configurado exige suporte adicional de estado de conversa no Vertex. Tente novamente mais tarde ou avise o administrador para revisar a migração do Gemini 3."
            : "Desculpe, houve um erro ao processar sua solicitação. Por favor, tente novamente.",
          corsHeaders,
        ),
      };
    }

    if (response.status === 429) {
      console.log("[ai-orchestrator] Request completed in", Date.now() - requestStartTime, "ms (rate limit)");
      return {
        errorResponse: createSseResponse(
          "Desculpe, estamos com muitas solicitações no momento. Tente novamente em alguns segundos.",
          corsHeaders,
        ),
      };
    }

    if (response.status === 402) {
      console.log("[ai-orchestrator] Request completed in", Date.now() - requestStartTime, "ms (payment)");
      return {
        errorResponse: createSseResponse(
          "Desculpe, o serviço de IA está temporariamente indisponível. Tente novamente mais tarde.",
          corsHeaders,
        ),
      };
    }

    throw new Error(`AI API error: ${response.status}`);
  }

  return { response };
}
