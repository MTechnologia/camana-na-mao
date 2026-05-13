import { normalizeTransportRecurrenceFrequency, parseFlexibleOccurrenceTime } from "./lib-transport-parsing.ts";
import { normalizeTransportSubcategory } from "./lib-transport-subcategories.ts";

type AccessibilityNormalizer = (raw: unknown) => Record<string, unknown> | null;
type AccessibilityMarkerParser = (content: string) => Record<string, unknown> | null;

type TransportFieldParserDeps = {
  normalizeTransportAccessibilityDetails: AccessibilityNormalizer;
  parseAccessibilityDetailsMarker: AccessibilityMarkerParser;
};

export function parseTransportFieldResponse(
  fieldType: string,
  userResponse: string,
  deps: TransportFieldParserDeps,
): Record<string, unknown> | null {
  const response = userResponse.trim();
  const responseLower = response.toLowerCase();
  const result: Record<string, unknown> = {};

  switch (fieldType) {
    case "occurrence_time": {
      const parsed = parseFlexibleOccurrenceTime(response);
      if (parsed) {
        result.occurrence_time = parsed;
      }
      break;
    }

    case "direction": {
      if (/\bida\b/i.test(responseLower)) result.direction = "ida";
      else if (/\bvolta\b/i.test(responseLower)) result.direction = "volta";
      else if (/\bcircular\b/i.test(responseLower)) result.direction = "circular";
      break;
    }

    case "line_code": {
      const sel = response.match(/\[LINE_SELECTED:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\]/i);
      if (sel) result.line_id = sel[1];
      const dash =
        response.match(/linha:\s*(\S+)\s*[-\u2013\u2014\u2212]\s*(.+?)\s*\[LINE_SELECTED:/i) ||
        response.match(/linha:\s*(\S+)\s*-\s*(.+?)\s*\[LINE_SELECTED:/i);
      if (dash) result.line_code = dash[1].trim();
      else if (sel) {
        const linhaCodeOnly = response.match(/linha:\s*(\S+)/i);
        if (linhaCodeOnly) result.line_code = linhaCodeOnly[1].trim();
      }
      const leg = response.match(/linha selecionada:\s*(\S+)/i);
      if (leg && !result.line_code) result.line_code = leg[1];
      const cust =
        response.match(/linha informada\s*\(fora da lista\):\s*(.+)/i) ||
        response.match(/linha não listada:\s*(.+)/i);
      if (cust && !result.line_code) result.line_code = cust[1].trim();
      if (!result.line_code && response.length >= 1) {
        result.line_code = response.trim();
      }
      break;
    }

    case "report_type": {
      const reportTypeMap: Record<string, string> = {
        atraso: "atraso",
        lotacao: "lotacao",
        lotação: "lotacao",
        seguranca: "seguranca",
        segurança: "seguranca",
        acessibilidade: "acessibilidade",
        limpeza: "limpeza",
        conducao: "conducao",
        condução: "conducao",
        outro: "outro",
      };
      const normalized = normalizeTransportSubcategory(responseLower);
      if (reportTypeMap[normalized]) {
        result.report_type = reportTypeMap[normalized];
      }
      break;
    }

    case "sub_category": {
      const marker = response.match(/\[SUBCATEGORY_SELECTED:([a-z0-9_]+)\]/i);
      const reportTypeMarker = response.match(/\[SUBCATEGORY_REPORT_TYPE:([a-z_]+)\]/i);
      const reportTypeText = reportTypeMarker?.[1] || "";
      const selectedRaw = marker?.[1] || responseLower;
      const selected = normalizeTransportSubcategory(selectedRaw);
      if (selected) {
        result.sub_category = selected;
      }
      if (reportTypeText) {
        result.report_type = normalizeTransportSubcategory(reportTypeText);
      }
      break;
    }

    case "personal_impact": {
      const labelM = response.match(/^Impacto:\s*(.+?)\s*\[IMPACT_SELECTED:/i);
      if (labelM) result.impact_description = labelM[1].trim();
      const impactM = response.match(/\[IMPACT_SELECTED:(\d+)\]/);
      if (impactM) {
        const n = parseInt(impactM[1], 10);
        if (n >= 2 && n <= 5) result.personal_impact = n;
      }
      break;
    }

    case "recurrence_frequency": {
      const normalized = normalizeTransportRecurrenceFrequency(response);
      if (normalized) result.recurrence_frequency = normalized;
      break;
    }

    case "stop_name": {
      const t = response.trim();
      if (t.length >= 2 && t.length <= 200) result.stop_name = t;
      break;
    }

    case "stop_location": {
      const t = response.trim();
      if (t.length >= 2 && t.length <= 500) result.stop_location = t;
      break;
    }

    case "accessibility_details": {
      const fromMarker = deps.parseAccessibilityDetailsMarker(response);
      if (fromMarker) {
        result.accessibility_details = fromMarker;
        break;
      }
      const normalized = deps.normalizeTransportAccessibilityDetails({
        observacoes: response.trim(),
      });
      if (normalized) result.accessibility_details = normalized;
      break;
    }

    default:
      return null;
  }

  return result;
}
