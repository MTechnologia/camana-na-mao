import { useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import type { CollectionType } from "@/components/ai/DataCollectionTracker";
import type { EvaluationContext } from "@/hooks/chat/types";
import { useJourneyTracker } from "@/hooks/useJourneyTracker";
import { useChatConversation } from "@/hooks/useChatConversation";
import { useChatOrchestratorStream } from "@/hooks/useChatOrchestratorStream";
import { useChatStructuredHandlers } from "@/hooks/useChatStructuredHandlers";

export type { EvaluationContext } from "@/hooks/chat/types";

/**
 * Hook principal do chat unificado (CHB-019: composição de hooks especializados).
 * @see useJourneyTracker — tracker e persistência em sessionStorage
 * @see useChatConversation — histórico e mensagens
 * @see useChatOrchestratorStream — envio e SSE do ai-orchestrator
 * @see useChatStructuredHandlers — chips e pickers inline
 */
export const useUnifiedAIChat = (
  conversationId?: string | null,
  initialCollectionType?: CollectionType,
  evaluationContext?: EvaluationContext | null,
) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const journey = useJourneyTracker(conversationId, initialCollectionType);

  const {
    setCollectionType,
    setCollectedFields,
    setCreatedReport,
    conversationIdRef,
    ...journeyRest
  } = journey;

  const onHistoryTrackerRestore = useCallback(
    (payload: {
      collectionType: CollectionType;
      collectedFields: import("@/components/ai/DataCollectionTracker").CollectedFields;
      createdReport: import("@/hooks/chat/types").CreatedReport | null;
    }) => {
      setCollectionType(payload.collectionType);
      setCollectedFields(payload.collectedFields);
      if (payload.createdReport) {
        setCreatedReport(payload.createdReport);
      }
    },
    [setCollectionType, setCollectedFields, setCreatedReport],
  );

  const conversation = useChatConversation({
    conversationId,
    user,
    initialCollectionType,
    onHistoryTrackerRestore,
  });

  const { sendMessage } = useChatOrchestratorStream({
    messages: conversation.messages,
    setMessages: conversation.setMessages,
    isLoading,
    setIsLoading,
    user,
    conversationIdRef,
    collectionType: journeyRest.collectionType,
    setCollectionType,
    collectedFields: journeyRest.collectedFields,
    setCollectedFields,
    lightJourneyType: journeyRest.lightJourneyType,
    setLightJourneyType: journeyRest.setLightJourneyType,
    createdReport: journeyRest.createdReport,
    setCreatedReport,
    evaluationContext,
  });

  const handlers = useChatStructuredHandlers({
    sendMessage,
    setCollectedFields,
    setCollectionType,
    setLightJourneyType: journeyRest.setLightJourneyType,
    setCreatedReport,
    collectionType: journeyRest.collectionType,
    conversationIdRef,
  });

  const clearMessages = useCallback(
    (preserveCollectionType = false) => {
      conversation.setMessages([]);
      journeyRest.resetTrackerForNewConversation(preserveCollectionType);
      conversationIdRef.current = null;
    },
    [conversation, journeyRest, conversationIdRef],
  );

  const patchMessageContent = useCallback(
    (messageId: string, newContent: string) =>
      conversation.patchMessageContent(messageId, newContent, conversationIdRef.current),
    [conversation, conversationIdRef],
  );

  return {
    messages: conversation.messages,
    isLoading,
    isHistoryLoaded: conversation.isHistoryLoaded,
    sendMessage,
    clearMessages,
    addAssistantMessage: conversation.addAssistantMessage,
    addOptimisticMessage: conversation.addOptimisticMessage,
    createdReport: journeyRest.createdReport,
    clearCreatedReport: journeyRest.clearCreatedReport,
    collectionType: journeyRest.collectionType,
    collectedFields: journeyRest.collectedFields,
    getMissingRequiredFields: journeyRest.getMissingRequiredFields,
    isCollectionComplete: journeyRest.isCollectionComplete,
    ...handlers,
    patchMessageContent,
  };
};
