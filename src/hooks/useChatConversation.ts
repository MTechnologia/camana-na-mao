import { useState, useRef, useEffect, useCallback } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type { CollectionType } from "@/components/ai/DataCollectionTracker";
import { extractJourneySnapshotFromMetadata } from "@/lib/chatJourneyState";
import { ENABLE_JOURNEY_SNAPSHOT } from "@/hooks/chat/chatJourneyConfig";
import { restoreTrackerFromSavedMessages } from "@/hooks/chat/trackerFromHistory";
import {
  createAssistantChatMessage,
  createUserChatMessage,
  messageFromSavedRow,
  type ChatMessage,
  type CreatedReport,
} from "@/hooks/chat/types";
import type { CollectedFields } from "@/components/ai/DataCollectionTracker";
import { VALID_TRACKER_TYPES } from "@/hooks/useChatJourneyConstants";

export interface UseChatConversationParams {
  conversationId: string | null | undefined;
  user: User | null;
  initialCollectionType?: CollectionType;
  onHistoryTrackerRestore: (payload: {
    collectionType: CollectionType;
    collectedFields: CollectedFields;
    createdReport: CreatedReport | null;
  }) => void;
}

/** CHB-019: mensagens, histórico do Supabase e helpers de bolha. */
export function useChatConversation({
  conversationId,
  user,
  initialCollectionType,
  onHistoryTrackerRestore,
}: UseChatConversationParams) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isHistoryLoaded, setIsHistoryLoaded] = useState(false);
  const messagesRef = useRef<ChatMessage[]>([]);
  const prevConversationIdRef = useRef<string | null>(null);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    if (conversationId) {
      setIsHistoryLoaded(false);
    }
  }, [conversationId]);

  useEffect(() => {
    const loadConversationMessages = async () => {
      if (!conversationId || !user) {
        setIsHistoryLoaded(true);
        return;
      }

      try {
        setIsHistoryLoaded(false);
        const prevId = prevConversationIdRef.current;
        prevConversationIdRef.current = conversationId;
        const hadNullAndNowHasId = prevId === null && !!conversationId;
        const singleUserMessage =
          messagesRef.current.length === 1 && messagesRef.current[0]?.role === "user";
        if (!(hadNullAndNowHasId && singleUserMessage)) {
          setMessages([]);
        }

        let row: { messages: unknown; metadata?: unknown } | null = null;
        const withMetadata = await supabase
          .from("ai_conversations")
          .select("messages, metadata")
          .eq("id", conversationId)
          .single();

        if (withMetadata.error) {
          const missingMetadataColumn =
            withMetadata.error.code === "42703" ||
            withMetadata.error.message?.includes("metadata");
          if (missingMetadataColumn) {
            const messagesOnly = await supabase
              .from("ai_conversations")
              .select("messages")
              .eq("id", conversationId)
              .single();
            if (messagesOnly.error) throw messagesOnly.error;
            row = messagesOnly.data;
          } else {
            throw withMetadata.error;
          }
        } else {
          row = withMetadata.data;
        }

        const savedMessages = (row?.messages as Array<Record<string, unknown>>) || [];

        if (ENABLE_JOURNEY_SNAPSHOT && row && "metadata" in row) {
          const snapshot = extractJourneySnapshotFromMetadata(row.metadata);
          if (
            snapshot?.schema_version === "journey_snapshot.v1" &&
            snapshot.journey_type &&
            snapshot.fields &&
            VALID_TRACKER_TYPES.includes(snapshot.journey_type as CollectionType)
          ) {
            onHistoryTrackerRestore({
              collectionType: snapshot.journey_type as CollectionType,
              collectedFields: snapshot.fields as CollectedFields,
              createdReport: null,
            });
          }
        }

        if (savedMessages.length === 0) {
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (prev.length > 0 && last?.role === "user") return prev;
            return [];
          });
        } else {
          const messagesWithTimestamp: ChatMessage[] = savedMessages.map((row) =>
            messageFromSavedRow(row),
          );
          setMessages(messagesWithTimestamp);

          const restored = restoreTrackerFromSavedMessages(savedMessages);
          if (restored?.collectionType) {
            onHistoryTrackerRestore({
              collectionType: restored.collectionType,
              collectedFields: restored.collectedFields,
              createdReport: restored.createdReport,
            });
          }
        }
      } catch (error) {
        console.error("[useChatConversation] Error loading conversation:", error);
      } finally {
        setIsHistoryLoaded(true);
      }
    };

    loadConversationMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- user?.id suffices
  }, [conversationId, user?.id]);

  const addOptimisticMessage = useCallback((content: string) => {
    setMessages([createUserChatMessage(content)]);
  }, []);

  const addAssistantMessage = useCallback((content: string) => {
    setMessages((prev) => [...prev, createAssistantChatMessage(content)]);
  }, []);

  const patchMessageContent = useCallback(
    async (messageId: string, newContent: string, persistConversationId: string | null) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, content: newContent } : m)),
      );
      if (!persistConversationId || !user) return;
      try {
        const { data: currentConv } = await supabase
          .from("ai_conversations")
          .select("messages")
          .eq("id", persistConversationId)
          .single();
        const arr =
          (currentConv?.messages as Array<{ id?: string; content?: string }> | undefined) ?? [];
        if (arr.length === 0) return;
        const updated = arr.map((m) =>
          m.id === messageId ? { ...m, content: newContent } : m,
        );
        await supabase
          .from("ai_conversations")
          .update({
            messages: updated as Json,
            last_message_at: new Date().toISOString(),
          })
          .eq("id", persistConversationId);
      } catch (e) {
        console.error("[useChatConversation] patchMessageContent", e);
      }
    },
    [user],
  );

  return {
    messages,
    setMessages,
    messagesRef,
    isHistoryLoaded,
    addOptimisticMessage,
    addAssistantMessage,
    patchMessageContent,
  };
}
