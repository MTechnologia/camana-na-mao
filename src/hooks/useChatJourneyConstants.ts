import type { CollectionType } from "@/components/ai/DataCollectionTracker";

/** CHB-019: constantes compartilhadas do hook de chat (extraídas de useUnifiedAIChat). */
export const STRUCTURED_JOURNEY_TYPES: CollectionType[] = [
  "urban_report",
  "transport_report",
  "service_rating",
];

export const LIGHT_JOURNEY_TYPES = [
  "services",
  "occupancy",
  "audiencias",
  "history",
  "general",
  "vereadores",
  "noticias",
] as const;

export const VALID_TRACKER_TYPES: CollectionType[] = [
  "urban_report",
  "transport_report",
  "service_rating",
];
