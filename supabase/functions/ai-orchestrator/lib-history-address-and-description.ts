import {
  getHistoryMessageText,
  type HistoryMessageLike,
} from "./lib-history-utils.ts";

type StructuredJourneyType = "urban_report" | "transport_report" | "service_rating";

export function applySelectedAddressFieldsFromHistory(
  messages: HistoryMessageLike[],
  accumulated: Record<string, unknown>,
): void {
  for (const msg of messages) {
    if (msg.role !== "user") continue;
    const content = getHistoryMessageText(msg);
    if (!content.toLowerCase().includes("endereço selecionado:")) continue;

    const streetMatch = content.match(/Endereço selecionado:\s*([^-\n]+)/i);
    if (streetMatch?.[1]?.trim() && !accumulated.street) {
      accumulated.street = streetMatch[1].trim();
    }

    const neighborhoodMatch = content.match(/-\s*([^,\n]+?)(?:,|\s+-\s+CEP)/i);
    if (neighborhoodMatch?.[1]?.trim() && !accumulated.neighborhood) {
      accumulated.neighborhood = neighborhoodMatch[1].trim();
    }

    const cepMatch = content.match(/CEP:\s*(\d{5}-?\d{3})/i);
    if (cepMatch?.[1] && !accumulated.cep) {
      accumulated.cep = cepMatch[1].replace("-", "");
    }

    if (!accumulated.city) {
      const cityComma = content.match(/,\s*([^-\n]+?)\s*-\s*CEP/i);
      if (cityComma?.[1]?.trim()) {
        accumulated.city = cityComma[1].trim();
      } else {
        const cityBeforeCep = content.match(/\s+-\s+([^-\n]+?)\s*-\s*CEP\s*:?/i);
        if (cityBeforeCep?.[1]?.trim()) {
          accumulated.city = cityBeforeCep[1].trim();
        }
      }
    }

    if (accumulated.street && !accumulated.street_number) {
      const streetWithNumber = String(accumulated.street).match(/^(.+),\s*(\d+[A-Za-z]?)\s*$/);
      if (streetWithNumber) {
        accumulated.street = streetWithNumber[1].trim();
        accumulated.street_number = streetWithNumber[2].trim();
      }
    }
  }
}

export function detectLatestDomainDescriptionFromHistory(
  messages: HistoryMessageLike[],
  collectionType: StructuredJourneyType,
  deps: {
    isGenericIntentText: (text: string) => boolean;
    isValidDomainDescription: (text: string, domain: string) => boolean;
    isBareUrbanReportNatureReply: (text: string) => boolean;
  },
): string | null {
  const domain =
    collectionType === "transport_report"
      ? "transport"
      : collectionType === "service_rating"
        ? "service"
        : "urban";

  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.role !== "user") continue;

    const content = getHistoryMessageText(msg).trim();
    const contentLower = content.toLowerCase();

    const isStructured =
      contentLower.includes("endereço selecionado:") ||
      contentLower.includes("localização gps:") ||
      contentLower.includes("localizacao gps:") ||
      /^usar endereço cadastrado$/i.test(content) ||
      /^usar endereco cadastrado$/i.test(content) ||
      /^digitar cep ou endereço$/i.test(content) ||
      /^digitar cep ou endereco$/i.test(content) ||
      contentLower.includes("linha selecionada:") ||
      /\[LINE_SELECTED:/i.test(content) ||
      contentLower.includes("nota:") ||
      contentLower.includes("data:") ||
      /^\d+$/.test(content);

    const isGeneric = deps.isGenericIntentText(content);
    const bareNature = collectionType === "urban_report" && deps.isBareUrbanReportNatureReply(content);

    if (!isStructured && !isGeneric && !bareNature && deps.isValidDomainDescription(content, domain)) {
      return content;
    }
  }

  return null;
}
