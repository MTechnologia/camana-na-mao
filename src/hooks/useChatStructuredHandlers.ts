import { useCallback } from "react";
import type { CollectedFields } from "@/components/ai/DataCollectionTracker";
import type { CollectionType } from "@/components/ai/DataCollectionTracker";
import {
  aggregateServiceRatingStars,
  buildServiceRatingDimensionsUserMessage,
  SERVICE_RATING_DIMENSION_KEYS,
  type ServiceRatingDimensions,
} from "@/lib/serviceRatingDimensions";
import { trackChatJourneyEvent } from "@/lib/chatAnalytics";

export interface UseChatStructuredHandlersParams {
  sendMessage: (
    content: string,
    options?: { attachmentFiles?: File[]; existingUserMessageId?: string },
  ) => Promise<void>;
  setCollectedFields: React.Dispatch<React.SetStateAction<CollectedFields>>;
  setCollectionType: React.Dispatch<React.SetStateAction<CollectionType>>;
  setLightJourneyType: React.Dispatch<React.SetStateAction<string | null>>;
  setCreatedReport: React.Dispatch<
    React.SetStateAction<{ type: "urban_report" | "transport" | "rating"; id: string } | null>
  >;
  collectionType: CollectionType | null;
  conversationIdRef: React.MutableRefObject<string | null>;
}

/** CHB-019: handlers de chips/pickers que atualizam tracker e disparam sendMessage. */
export function useChatStructuredHandlers({
  sendMessage,
  setCollectedFields,
  setCollectionType,
  setLightJourneyType,
  setCreatedReport,
  collectionType,
  conversationIdRef,
}: UseChatStructuredHandlersParams) {
  const handleJourneySwitchDecision = useCallback(
    async (decision: "switch" | "continue", newJourney?: string) => {
      if (decision === "switch" && newJourney) {
        const newCollectionType = newJourney as CollectionType;
        setLightJourneyType(null);
        setCollectionType(newCollectionType);
        setCollectedFields({});
        setCreatedReport(null);

        const journeyNames: Record<string, string> = {
          urban_report: "Relato Urbano",
          transport_report: "Diagnóstico de Transporte",
          service_rating: "Avaliação de Serviço",
          services: "Busca de Serviços",
          audiencias: "Audiências Públicas",
          general: "Informações",
          history: "Meu Histórico",
        };

        trackChatJourneyEvent("chat_journey_switched", {
          conversation_id: conversationIdRef.current,
          from_journey: collectionType,
          to_journey: newJourney,
        });
        await sendMessage(
          `[JOURNEY_SWITCHED:${newJourney}] Sim, quero iniciar ${journeyNames[newJourney] || newJourney}. Estou ciente de que o progresso atual pode não ser salvo.`,
        );
      } else if (newJourney) {
        await sendMessage(`[JOURNEY_DECLINED:${newJourney}] Quero continuar o relato atual`);
      } else {
        await sendMessage("Quero continuar o relato atual");
      }
    },
    [
      sendMessage,
      setCollectedFields,
      setCollectionType,
      setLightJourneyType,
      setCreatedReport,
      collectionType,
      conversationIdRef,
    ],
  );

  const handleLineSelected = useCallback(
    (lineCode: string, lineName: string, lineId?: string) => {
      setCollectedFields((prev) => {
        const next: CollectedFields = { ...prev, line_code: lineCode };
        if (lineId) next.line_id = lineId;
        else delete next.line_id;
        return next;
      });
      if (lineId) {
        sendMessage(`Linha: ${lineCode} - ${lineName} [LINE_SELECTED:${lineId}]`);
      } else {
        sendMessage(`Linha informada (fora da lista): ${lineCode}`);
      }
    },
    [sendMessage, setCollectedFields],
  );

  const handleDateSelected = useCallback(
    (date: string, displayText: string) => {
      setCollectedFields((prev) => ({ ...prev, occurrence_date: date }));
      sendMessage(`Data: ${displayText}`);
    },
    [sendMessage, setCollectedFields],
  );

  const handleTimeSelected = useCallback(
    (time: string, displayText: string) => {
      setCollectedFields((prev) => ({ ...prev, occurrence_time: time }));
      sendMessage(`Horário: ${displayText}`);
    },
    [sendMessage, setCollectedFields],
  );

  const handleDirectionSelected = useCallback(
    (direction: string, displayText: string) => {
      setCollectedFields((prev) => ({ ...prev, direction }));
      sendMessage(`Sentido: ${displayText}`);
    },
    [sendMessage, setCollectedFields],
  );

  const handleSubcategorySelected = useCallback(
    (value: string, label: string, reportType: string) => {
      setCollectedFields((prev) => ({ ...prev, sub_category: value }));
      sendMessage(
        `Subcategoria: ${label} [SUBCATEGORY_SELECTED:${value}] [SUBCATEGORY_REPORT_TYPE:${reportType}]`,
      );
    },
    [sendMessage, setCollectedFields],
  );

  const handleRecurrenceFrequencySelected = useCallback(
    (frequency: string, displayText: string) => {
      setCollectedFields((prev) => ({ ...prev, recurrence_frequency: frequency }));
      sendMessage(`Frequência: ${displayText}`);
    },
    [sendMessage, setCollectedFields],
  );

  const handleImpactSelected = useCallback(
    (score: number, label: string) => {
      setCollectedFields((prev) => ({ ...prev, personal_impact: score }));
      sendMessage(`Impacto: ${label} [IMPACT_SELECTED:${score}]`);
    },
    [sendMessage, setCollectedFields],
  );

  const handleAccessibilityDetailsSelected = useCallback(
    (details: Record<string, unknown>) => {
      setCollectedFields((prev) => ({ ...prev, accessibility_details: details }));
      const summary = Object.entries(details)
        .filter(([, value]) => value === true)
        .map(([key]) => key.replace(/_/g, " "))
        .join(", ");
      const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(details))));
      const prefix = summary ? `Acessibilidade: ${summary}` : "Acessibilidade informada";
      sendMessage(`${prefix} [ACCESSIBILITY_DETAILS:${encoded}]`);
    },
    [sendMessage, setCollectedFields],
  );

  const handleRatingSelected = useCallback(
    (stars: number) => {
      setCollectedFields((prev) => ({ ...prev, rating_stars: stars }));
      sendMessage(`Nota: ${stars} estrelas [RATING_SELECTED:${stars}]`);
    },
    [sendMessage, setCollectedFields],
  );

  const handleWaitTimeSelected = useCallback(
    (displayLabel: string, score: number | null) => {
      setCollectedFields((prev) => ({ ...prev, wait_time_score: score }));
      const marker = score === null ? "[WAIT_TIME:null]" : `[WAIT_TIME:${score}]`;
      sendMessage(`Tempo de espera: ${displayLabel} ${marker}`);
    },
    [sendMessage, setCollectedFields],
  );

  const handleDimensionRatingSelected = useCallback(
    (dimensionKey: string, stars: number) => {
      const fieldKey = `${dimensionKey}_score`;
      setCollectedFields((prev) => ({ ...prev, [fieldKey]: stars }));
      const dimLabel = dimensionKey.charAt(0).toUpperCase() + dimensionKey.slice(1);
      sendMessage(`${dimLabel}: ${stars} estrelas [DIM_RATING:${dimensionKey}:${stars}]`);
    },
    [sendMessage, setCollectedFields],
  );

  const handleRatingDimensionWaitTimeSelected = useCallback(
    (displayLabel: string, score: number | null) => {
      const tempoForDim = score === null ? 3 : score;
      setCollectedFields((prev) => ({
        ...prev,
        wait_time_score: score,
        tempo_espera_score: tempoForDim,
      }));
      const w = score === null ? "[WAIT_TIME:null]" : `[WAIT_TIME:${score}]`;
      sendMessage(
        `Tempo de espera: ${displayLabel} [DIM_RATING:tempo_espera:${tempoForDim}] ${w}`.trim(),
      );
    },
    [sendMessage, setCollectedFields],
  );

  const handleMultiDimensionRatingComplete = useCallback(
    (dims: ServiceRatingDimensions, opts?: { waitTimeSemanticNull?: boolean }) => {
      const perDimFields = SERVICE_RATING_DIMENSION_KEYS.reduce(
        (acc, k) => {
          acc[`${k}_score`] = dims[k];
          return acc;
        },
        {} as Record<string, number>,
      );
      setCollectedFields((prev) => ({
        ...prev,
        ...perDimFields,
        rating_dimensions: dims,
        rating_stars: aggregateServiceRatingStars(dims),
        ...(opts?.waitTimeSemanticNull ? { wait_time_score: null as number | null } : {}),
      }));
      let msg = buildServiceRatingDimensionsUserMessage(dims);
      if (opts?.waitTimeSemanticNull) {
        msg += " [WAIT_TIME:null]";
      }
      sendMessage(msg);
    },
    [sendMessage, setCollectedFields],
  );

  const handleLocationMethodSelected = useCallback(
    (_method: string, messageToSend: string) => {
      sendMessage(messageToSend);
    },
    [sendMessage],
  );

  const handleServiceTypeSelected = useCallback(
    (type: string, displayName: string, otherSpec?: string) => {
      setCollectedFields((prev) => ({ ...prev, service_type: type }));
      const msg = otherSpec?.trim()
        ? `Tipo de serviço: ${displayName}. Especificação: ${otherSpec.trim()}`
        : `Tipo de serviço: ${displayName}`;
      sendMessage(msg);
    },
    [sendMessage, setCollectedFields],
  );

  const handleServiceSelected = useCallback(
    (name: string, neighborhood: string, address: string, serviceId?: string) => {
      const newFields: Record<string, unknown> = {
        service_name: name,
        service_address: address || "",
      };
      if (neighborhood) newFields.service_neighborhood = neighborhood;
      if (serviceId) newFields.service_id = serviceId;
      setCollectedFields((prev) => ({ ...prev, ...newFields }));
      const msg = `Serviço: ${name}${neighborhood ? ` - ${neighborhood}` : ""}\nEndereço: ${address || "Não informado"}${serviceId ? `\n[SERVICE_ID:${serviceId}]` : ""}`;
      sendMessage(msg);
    },
    [sendMessage, setCollectedFields],
  );

  const handleServiceAddressConfirmed = useCallback(
    (confirmed: boolean) => {
      if (confirmed) {
        setCollectedFields((prev) => ({ ...prev, service_address_confirmed: true }));
        sendMessage("Sim, o endereço está correto");
      } else {
        sendMessage("Não, preciso corrigir o endereço");
      }
    },
    [sendMessage, setCollectedFields],
  );

  const handleApplyNearbyFilters = useCallback(
    (filters: { radiusMeters: number; minRating: "all" | 4 | 3 | 2; searchQuery: string }) => {
      const radiusStr =
        filters.radiusMeters < 1000
          ? `${filters.radiusMeters}m`
          : `${filters.radiusMeters / 1000}km`;
      const ratingStr = filters.minRating === "all" ? "todas" : `${filters.minRating}+ estrelas`;
      const parts = [`Raio: ${radiusStr}`, `Avaliação mínima: ${ratingStr}`];
      if (filters.searchQuery.trim()) parts.push(`Busca: ${filters.searchQuery.trim()}`);
      sendMessage(parts.join(". "));
    },
    [sendMessage],
  );

  return {
    handleJourneySwitchDecision,
    handleLineSelected,
    handleDateSelected,
    handleTimeSelected,
    handleDirectionSelected,
    handleSubcategorySelected,
    handleRecurrenceFrequencySelected,
    handleImpactSelected,
    handleAccessibilityDetailsSelected,
    handleRatingSelected,
    handleWaitTimeSelected,
    handleDimensionRatingSelected,
    handleRatingDimensionWaitTimeSelected,
    handleMultiDimensionRatingComplete,
    handleLocationMethodSelected,
    handleServiceTypeSelected,
    handleServiceSelected,
    handleServiceAddressConfirmed,
    handleApplyNearbyFilters,
  };
}
