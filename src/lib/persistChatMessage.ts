import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { appendMessageByIdIfMissing } from "@/lib/chatJourneyState";

/** Persiste mensagem na conversa (RPC atômica com fallback RMW). CHB-014 / CHB-018 */
export async function persistChatMessage(
  conversationId: string,
  message: Record<string, unknown>,
  options?: { title?: string },
): Promise<void> {
  const title = options?.title?.trim() || undefined;

  // @ts-expect-error RPC append_ai_conversation_message — tipos gerados após migration
  const { error: rpcError } = await supabase.rpc("append_ai_conversation_message", {
    p_conversation_id: conversationId,
    p_message: message as Json,
    p_title: title ?? null,
  });

  if (!rpcError) return;

  if (rpcError.code !== "PGRST202" && !rpcError.message?.includes("append_ai_conversation_message")) {
    console.warn("[persistChatMessage] RPC failed, using fallback:", rpcError.message);
  }

  const { data: currentConv, error: fetchError } = await supabase
    .from("ai_conversations")
    .select("messages, title")
    .eq("id", conversationId)
    .single();

  if (fetchError || !currentConv) {
    console.error("[persistChatMessage] fallback fetch failed:", fetchError);
    return;
  }

  const currentMessages = (currentConv.messages as Array<Record<string, unknown>>) || [];
  const updatedMessages = appendMessageByIdIfMissing(currentMessages, message);

  await supabase
    .from("ai_conversations")
    .update({
      messages: updatedMessages as Json,
      last_message_at: new Date().toISOString(),
      ...(title ? { title } : {}),
    })
    .eq("id", conversationId);
}
