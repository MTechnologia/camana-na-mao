import { createClientId } from "@/lib/clientId";

/** Mensagem do chat unificado (conteúdo bruto com marcadores do orquestrador). */
export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  source?: string;
  attachmentUrls?: string[];
}

export interface CreatedReport {
  type: "urban_report" | "transport" | "rating";
  id: string;
}

export interface EvaluationContext {
  visit_id: string;
  service_id: string;
  service_name: string;
  service_type: string;
  district?: string;
}

export function messageFromSavedRow(msg: Record<string, unknown>): ChatMessage {
  const role: ChatMessage["role"] =
    msg.role === "assistant" || msg.role === "user" ? msg.role : "user";
  const id =
    typeof msg.id === "string" && msg.id.trim() ? msg.id : createClientId("chat-message");
  const content = typeof msg.content === "string" ? msg.content : "";
  const timestamp = typeof msg.timestamp === "string" ? msg.timestamp : "";
  const source = typeof msg.source === "string" ? msg.source : undefined;
  const rawUrls = msg.attachmentUrls;
  const attachmentUrls =
    Array.isArray(rawUrls) && rawUrls.every((u) => typeof u === "string")
      ? (rawUrls as string[])
      : undefined;
  return {
    id,
    role,
    content,
    timestamp,
    ...(source !== undefined ? { source } : {}),
    ...(attachmentUrls !== undefined ? { attachmentUrls } : {}),
  };
}

export function createUserChatMessage(
  content: string,
  options?: { id?: string; attachmentUrls?: string[] },
): ChatMessage {
  return {
    id: options?.id ?? createClientId("chat-message"),
    role: "user",
    content: content.trim(),
    timestamp: new Date().toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    ...(options?.attachmentUrls?.length ? { attachmentUrls: options.attachmentUrls } : {}),
  };
}

export function createAssistantChatMessage(content: string, id?: string): ChatMessage {
  return {
    id: id ?? createClientId("chat-message"),
    role: "assistant",
    content,
    timestamp: new Date().toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    source: "Assistente Câmara na Mão",
  };
}
