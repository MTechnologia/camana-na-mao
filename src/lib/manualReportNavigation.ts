import type { CollectionType } from "@/components/ai/DataCollectionTracker";

export const OPEN_MANUAL_REPORT_MESSAGE = "[OPEN_MANUAL_REPORT]";

export type ManualReportNavigationState = {
  returnToChatConversationId?: string | null;
};

export function resolveManualReportPath(collectionType: CollectionType | null): string {
  if (collectionType === "transport_report") return "/transporte/novo";
  return "/relato-urbano/manual";
}

export function isOpenManualReportMessage(content: string): boolean {
  return content.trim().includes(OPEN_MANUAL_REPORT_MESSAGE);
}

/** CHB-022: preserva conversa ativa ao abrir formulário manual a partir do chat. */
export function buildManualReportNavigateOptions(params: {
  returnToChatConversationId?: string | null;
}): { state: ManualReportNavigationState } {
  return {
    state: {
      returnToChatConversationId: params.returnToChatConversationId ?? null,
    },
  };
}

export function resolveReturnToChatAction(
  state: ManualReportNavigationState | null | undefined,
): { path: string; conversationId: string | null } {
  const conversationId =
    typeof state?.returnToChatConversationId === "string" &&
    state.returnToChatConversationId.trim() !== ""
      ? state.returnToChatConversationId.trim()
      : null;
  return { path: "/", conversationId };
}
