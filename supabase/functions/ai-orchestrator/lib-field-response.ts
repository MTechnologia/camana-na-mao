import {
  applyCompleteRatingDimensionsToAccumulated,
  parseRatingDimensionsMarker,
} from "./lib-service-rating.ts";
import { generateLabelFromDescription } from "./lib-classification-feedback.ts";
import {
  autoClassifyCategory,
  autoInferRisk,
  normalizeReportNature,
} from "./lib-urban-rules.ts";
import {
  isTransportLinePickerPayload,
  normalizeTransportAccessibilityDetails,
  parseAccessibilityDetailsMarker,
} from "./lib-transport-helpers.ts";
import { isValidDomainDescription } from "./lib-nlp-utils.ts";
import { parseTransportFieldResponse } from "./lib-transport-field-parser.ts";
import { parseUrbanFieldResponse } from "./lib-urban-field-parser.ts";

export function parseFieldResponse(fieldType: string, userResponse: string): Record<string, unknown> {
  const response = userResponse.trim();
  const result: Record<string, unknown> = {};

  const transportParsed = parseTransportFieldResponse(fieldType, userResponse, {
    normalizeTransportAccessibilityDetails,
    parseAccessibilityDetailsMarker,
  });
  if (transportParsed) {
    return transportParsed;
  }

  const urbanParsed = parseUrbanFieldResponse(fieldType, userResponse, {
    autoClassifyCategory,
    generateLabelFromDescription,
    autoInferRisk,
    isTransportLinePickerPayload,
    isValidDomainDescription,
  });
  if (urbanParsed) {
    return urbanParsed;
  }

  switch (fieldType) {
    case "report_nature": {
      const nature = normalizeReportNature(response);
      if (nature) {
        result.report_nature = nature;
        console.log("[parseFieldResponse] report_nature:", nature);
      }
      break;
    }

    case "rating_dimensions": {
      const dims = parseRatingDimensionsMarker(response);
      if (dims) {
        applyCompleteRatingDimensionsToAccumulated(result, dims);
      }
      break;
    }
  }

  return result;
}
