import type { CollectedFields } from "@/components/ai/DataCollectionTracker";
import { parseRatingDimensionsFromMessage } from "@/lib/serviceRatingDimensions";
import { parseOccurrenceTime } from "@/hooks/chat/parseOccurrenceTime";
import type { ChatMessage } from "@/hooks/chat/types";
import type { ApplyFieldHeuristicsParams } from "@/hooks/chat/fieldHeuristics";

/**
 * CHB-001: heurísticas reduzidas quando journey_snapshot + COLLECTION_PROGRESS são a fonte principal.
 * Mantém apenas parsing de marcadores estruturados e endereço/CEP.
 */
export function applyMinimalOutgoingFieldHeuristics({
  content,
  messages,
  collectionType,
  collectedFields,
  setCollectedFields,
}: ApplyFieldHeuristicsParams): void {
  const raw = content.trim();
  if (!raw) return;

  if (collectionType === "urban_report") {
    const cepMatch = raw.match(/\b(\d{5})-?(\d{3})\b/);
    if (cepMatch && !collectedFields.cep) {
      setCollectedFields((prev) => ({ ...prev, cep: cepMatch[1] + cepMatch[2] }));
    }
    if (raw.toLowerCase().includes("endereço selecionado:")) {
      const streetMatch = raw.match(/Endereço selecionado:\s*([^-\n]+)/i);
      const neighborhoodMatch = raw.match(/-\s*([^,\n]+?)(?:,|\s+-\s+CEP)/i);
      const pickerCep = raw.match(/CEP:\s*(\d{5}-?\d{3})/i);
      setCollectedFields((prev) => ({
        ...prev,
        ...(streetMatch?.[1]?.trim() ? { street: streetMatch[1].trim() } : {}),
        ...(neighborhoodMatch?.[1]?.trim() ? { neighborhood: neighborhoodMatch[1].trim() } : {}),
        ...(pickerCep?.[1] ? { cep: pickerCep[1].replace("-", "") } : {}),
      }));
    }
    return;
  }

  if (collectionType === "transport_report") {
    const lineSelUuid = raw.match(
      /\[LINE_SELECTED:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\]/i,
    );
    if (lineSelUuid) {
      setCollectedFields((prev) => ({ ...prev, line_id: lineSelUuid[1] }));
    }
    const impactTag = raw.match(/\[IMPACT_SELECTED:([2-5])\]/);
    if (impactTag) {
      setCollectedFields((prev) => ({ ...prev, personal_impact: parseInt(impactTag[1], 10) }));
    }
    const parsedTime = parseOccurrenceTime(raw);
    if (parsedTime && !collectedFields.occurrence_time) {
      setCollectedFields((prev) => ({ ...prev, occurrence_time: parsedTime }));
    }
    return;
  }

  if (collectionType === "service_rating") {
    const parsedDims = parseRatingDimensionsFromMessage(raw);
    if (parsedDims) {
      setCollectedFields((prev) => ({
        ...prev,
        rating_dimensions: parsedDims,
      }));
    }
    const dimMatch = raw.match(/\[DIM_RATING:(\w+):(\d)\]/i);
    if (dimMatch) {
      const dimKey = dimMatch[1].toLowerCase();
      const dimScore = parseInt(dimMatch[2], 10);
      setCollectedFields((prev) => ({ ...prev, [`${dimKey}_score`]: dimScore }));
    }
    const ratingTag = raw.match(/\[RATING_SELECTED:([1-5])\]/);
    if (ratingTag) {
      setCollectedFields((prev) => ({ ...prev, rating_stars: parseInt(ratingTag[1], 10) }));
    }
    void messages;
  }
}
