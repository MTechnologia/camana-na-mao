import { isCamaraFuncionamentoInternoQuery } from "./lib-citizen-support.ts";
import { extractChamberFields } from "./lib-chamber-feedback.ts";
import {
  detectCollectionIntent as detectCollectionIntentHelper,
  type CollectionIntent,
} from "./lib-intent-detection.ts";
import {
  extractServiceFields,
} from "./lib-service-rating-history.ts";
import { extractTransportFields } from "./lib-transport-helpers.ts";
import { extractUrbanFields } from "./lib-urban-rules.ts";

export function detectCollectionIntent(
  userMessage: string,
  conversationHistory: Array<{ role: string; content: string }>,
  accumulateFieldsFromHistory: (
    messages: Array<{ role: string; content: string }>,
    collectionType: "urban_report" | "transport_report" | "service_rating" | "services" | "audiencias" | "general" | "history" | "occupancy" | "vereadores" | "noticias",
  ) => Record<string, unknown>,
): CollectionIntent | null {
  return detectCollectionIntentHelper(userMessage, conversationHistory, {
    extractTransportFields,
    extractUrbanFields,
    extractServiceFields,
    extractChamberFields,
    accumulateFieldsFromHistory,
    isCamaraFuncionamentoInternoQuery,
  });
}
