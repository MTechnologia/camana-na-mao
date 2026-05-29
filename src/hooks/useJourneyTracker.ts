import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import type { CollectionType, CollectedFields } from "@/components/ai/DataCollectionTracker";
import { getTrackerStorageKey } from "@/hooks/chat/chatJourneyConfig";
import {
  getMissingRequiredFields,
  isTrackerCollectionComplete,
} from "@/hooks/chat/trackerRequiredFields";
import type { CreatedReport } from "@/hooks/chat/types";

/** CHB-019: estado do tracker (tipo de jornada, campos coletados, relatório criado). */
export function useJourneyTracker(
  conversationId: string | null | undefined,
  initialCollectionType?: CollectionType,
) {
  const [collectionType, setCollectionType] = useState<CollectionType>(
    initialCollectionType || null,
  );
  const [collectedFields, setCollectedFields] = useState<CollectedFields>({});
  const [lightJourneyType, setLightJourneyType] = useState<string | null>(null);
  const [createdReport, setCreatedReport] = useState<CreatedReport | null>(null);
  const conversationIdRef = useRef<string | null>(conversationId || null);

  useEffect(() => {
    if (conversationId !== conversationIdRef.current) {
      conversationIdRef.current = conversationId || null;
    }
  }, [conversationId]);

  useEffect(() => {
    if (initialCollectionType) {
      setCollectionType(initialCollectionType);
    }
  }, [initialCollectionType]);

  useEffect(() => {
    const storageKey = getTrackerStorageKey(conversationId || null);
    if (storageKey) {
      try {
        const saved = sessionStorage.getItem(storageKey);
        if (saved) {
          const { type, fields } = JSON.parse(saved);
          if (type) setCollectionType(type);
          if (fields && Object.keys(fields).length > 0) setCollectedFields(fields);
          return;
        }
      } catch (e) {
        console.warn("[useJourneyTracker] Failed to restore tracker:", e);
      }
    }
    setCreatedReport(null);
    if (!initialCollectionType) {
      setCollectionType(null);
    }
    setCollectedFields({});
  }, [conversationId, initialCollectionType]);

  useEffect(() => {
    const storageKey = getTrackerStorageKey(conversationIdRef.current);
    if (storageKey && (collectionType || Object.keys(collectedFields).length > 0)) {
      sessionStorage.setItem(
        storageKey,
        JSON.stringify({ type: collectionType, fields: collectedFields }),
      );
    }
  }, [collectionType, collectedFields]);

  const clearCreatedReport = useCallback(() => {
    setCreatedReport(null);
  }, []);

  const resetTrackerForNewConversation = useCallback(
    (preserveCollectionType = false) => {
      setCreatedReport(null);
      setLightJourneyType(null);
      if (!preserveCollectionType) {
        setCollectionType(null);
        setCollectedFields({});
        const storageKey = getTrackerStorageKey(conversationIdRef.current);
        if (storageKey) sessionStorage.removeItem(storageKey);
      }
    },
    [],
  );

  const getMissing = useCallback(
    () => getMissingRequiredFields(collectionType, collectedFields),
    [collectionType, collectedFields],
  );

  const isCollectionComplete = useMemo(
    () => isTrackerCollectionComplete(collectionType, collectedFields),
    [collectionType, collectedFields],
  );

  return {
    conversationIdRef,
    collectionType,
    setCollectionType,
    collectedFields,
    setCollectedFields,
    lightJourneyType,
    setLightJourneyType,
    createdReport,
    setCreatedReport,
    clearCreatedReport,
    resetTrackerForNewConversation,
    getMissingRequiredFields: getMissing,
    isCollectionComplete,
  };
}
