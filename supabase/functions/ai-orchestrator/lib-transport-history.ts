import { TRANSPORT_SUBCATEGORIES, normalizeTransportSubcategory } from "./lib-transport-subcategories.ts";
import { parseFlexibleOccurrenceTime, normalizeTransportRecurrenceFrequency } from "./lib-transport-parsing.ts";

type HistoryMessage = { role: string; content: string };

type TransportHistoryDeps = {
  getMsgText: (msg: { role: string; content: string | unknown }) => string;
  parseFieldResponse: (fieldType: string, userResponse: string) => Record<string, unknown>;
  extractTransportFields: (context: string) => Record<string, unknown>;
  hasTransportKeywords: (text: string) => boolean;
  isGenericIntentText: (text: string) => boolean;
  parseAccessibilityDetailsMarker: (content: string) => Record<string, unknown> | null;
  isTransportLinePickerPayload: (value: string) => boolean;
};

export function applyTransportHistoryParsing(
  messages: HistoryMessage[],
  accumulated: Record<string, unknown>,
  deps: TransportHistoryDeps,
): void {
  if (typeof accumulated.description === "string" && deps.isTransportLinePickerPayload(accumulated.description)) {
    delete accumulated.description;
    console.log("[accumulateFields] transport: removed line-picker text wrongly stored as description");
  }

  for (const msg of messages) {
    if (msg.role !== "user") continue;
    const contentLower = deps.getMsgText(msg).toLowerCase();
    const contextFields = deps.extractTransportFields(contentLower);
    for (const [key, value] of Object.entries(contextFields)) {
      if (!accumulated[key]) {
        accumulated[key] = value;
        console.log(`[accumulateFields] Extracted ${key} from transport natural language:`, value);
      }
    }
  }

  const shouldDetectDescription =
    !accumulated.description ||
    deps.isGenericIntentText(String(accumulated.description)) ||
    deps.isTransportLinePickerPayload(String(accumulated.description));

  const descForLog = String(accumulated.description ?? "");
  console.log("[accumulateFields] Transport description check:", {
    currentDescription: descForLog.substring(0, 40),
    isCurrentGeneric: descForLog ? deps.isGenericIntentText(descForLog) : "N/A",
    shouldDetectDescription,
  });

  if (shouldDetectDescription) {
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (msg.role !== "user") continue;

      const text = deps.getMsgText(msg);
      const contentLower = text.toLowerCase();
      const hasKeyword = deps.hasTransportKeywords(text);

      const isStructured =
        contentLower.includes("linha selecionada:") ||
        /\[LINE_SELECTED:/i.test(text) ||
        /^subcategoria:/im.test(text) ||
        /\[SUBCATEGORY_SELECTED:/i.test(text) ||
        contentLower.includes("data:") ||
        contentLower.includes("horário:") ||
        contentLower.includes("horario:");

      const isGeneric = deps.isGenericIntentText(text);
      const isValidDescription = !isGeneric && !isStructured && ((text.length >= 5 && hasKeyword) || text.length >= 15);

      if (isValidDescription) {
        accumulated.description = text.trim();
        console.log("[accumulateFields] Auto-detected transport description:", {
          length: text.length,
          hasKeyword,
          preview: text.substring(0, 50),
        });
        break;
      }
    }
  }

  for (const msg of messages) {
    if (msg.role !== "user") continue;
    const content = deps.getMsgText(msg);
    if (!content) continue;

    const subPickSel = content.match(/\[SUBCATEGORY_SELECTED:([a-z0-9_]+)\]/i);
    if (subPickSel) {
      accumulated.sub_category = normalizeTransportSubcategory(subPickSel[1]);
      console.log("[accumulateFields] Parsed sub_category from SUBCATEGORY_SELECTED:", accumulated.sub_category);
    }

    const subPickRt = content.match(/\[SUBCATEGORY_REPORT_TYPE:([a-z_]+)\]/i);
    if (subPickRt) {
      accumulated.report_type = normalizeTransportSubcategory(subPickRt[1]);
      console.log("[accumulateFields] Parsed report_type from SUBCATEGORY_REPORT_TYPE:", accumulated.report_type);
    }

    if (!subPickSel) {
      const subLabelM = content.match(/^subcategoria:\s*(.+?)(?:\s*\[|$)/im);
      if (subLabelM) {
        const labelNorm = subLabelM[1]
          .trim()
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "");
        const rtype = String(accumulated.report_type || "outro").toLowerCase();
        const opts = TRANSPORT_SUBCATEGORIES[rtype] || TRANSPORT_SUBCATEGORIES.outro;
        const found = opts.find((option) => {
          const normalizedLabel = option.label
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");
          return normalizedLabel === labelNorm || labelNorm.includes(normalizedLabel) || normalizedLabel.includes(labelNorm);
        });
        if (found) {
          accumulated.sub_category = normalizeTransportSubcategory(found.value);
          console.log("[accumulateFields] Parsed sub_category from Subcategoria: label fallback:", found.value);
        }
      }
    }

    const lineSelectedUuid = content.match(
      /\[LINE_SELECTED:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\]/i,
    );
    if (lineSelectedUuid) {
      accumulated.line_id = lineSelectedUuid[1];
      console.log("[accumulateFields] Parsed line_id from LINE_SELECTED:", accumulated.line_id);
    }

    const lineDashPick =
      content.match(/linha:\s*(\S+)\s*[-\u2013\u2014\u2212]\s*(.+?)\s*\[LINE_SELECTED:/i) ||
      content.match(/linha:\s*(\S+)\s*-\s*(.+?)\s*\[LINE_SELECTED:/i);
    if (lineDashPick) {
      accumulated.line_code = lineDashPick[1].trim();
      console.log("[accumulateFields] Parsed line_code from Linha: … [LINE_SELECTED]:", accumulated.line_code);
    } else if (lineSelectedUuid) {
      const linhaCodeOnly = content.match(/linha:\s*(\S+)/i);
      if (linhaCodeOnly) {
        accumulated.line_code = linhaCodeOnly[1].trim();
        console.log("[accumulateFields] Parsed line_code from Linha: (fallback antes de [LINE_SELECTED]):", accumulated.line_code);
      }
    }

    const lineMatch = content.match(/linha selecionada:\s*(\S+)/i);
    if (lineMatch && !accumulated.line_code) {
      accumulated.line_code = lineMatch[1];
      console.log("[accumulateFields] Parsed line_code from picker (legacy):", accumulated.line_code);
    }

    const lineCustom =
      content.match(/linha informada\s*\(fora da lista\):\s*(.+)/i) ||
      content.match(/linha não listada:\s*(.+)/i);
    if (lineCustom && !accumulated.line_code) {
      accumulated.line_code = lineCustom[1].trim();
      console.log("[accumulateFields] Parsed line_code (custom / not listed):", accumulated.line_code);
    }

    const impactSel = content.match(/\[IMPACT_SELECTED:(\d+)\]/);
    if (impactSel && accumulated.personal_impact == null) {
      const impact = parseInt(impactSel[1], 10);
      if (impact >= 2 && impact <= 5) {
        accumulated.personal_impact = impact;
        console.log("[accumulateFields] Parsed personal_impact:", impact);
      }
    }

    const impactLabelM = content.match(/^Impacto:\s*(.+?)\s*\[IMPACT_SELECTED:/im);
    if (impactLabelM && !accumulated.impact_description) {
      accumulated.impact_description = impactLabelM[1].trim();
    }

    const accessibilityDetails = deps.parseAccessibilityDetailsMarker(content);
    if (accessibilityDetails) {
      accumulated.accessibility_details = accessibilityDetails;
      console.log("[accumulateFields] Parsed accessibility_details from ACCESSIBILITY_DETAILS marker");
    }

    const dateMatch = content.match(/data:\s*(.+)/i);
    if (dateMatch && !accumulated.occurrence_date) {
      const dateStr = dateMatch[1].trim().toLowerCase();
      if (dateStr === "hoje" || dateStr.includes("hoje")) {
        accumulated.occurrence_date = new Date().toISOString().split("T")[0];
      } else if (dateStr === "ontem" || dateStr.includes("ontem")) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        accumulated.occurrence_date = yesterday.toISOString().split("T")[0];
      } else {
        const parts = dateStr.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
        if (parts) {
          const day = parts[1].padStart(2, "0");
          const month = parts[2].padStart(2, "0");
          const year = parts[3]
            ? (parts[3].length === 2 ? `20${parts[3]}` : parts[3])
            : new Date().getFullYear().toString();
          accumulated.occurrence_date = `${year}-${month}-${day}`;
        } else {
          accumulated.occurrence_date = dateStr;
        }
      }
      accumulated.date_confirmed = true;
      console.log("[accumulateFields] Parsed occurrence_date from picker:", accumulated.occurrence_date, "(confirmed)");
    }

    const timeMatch = content.match(/hor[aá]rio:\s*([^\n]+)/i);
    if (timeMatch) {
      const parsed = parseFlexibleOccurrenceTime(timeMatch[1]);
      if (parsed) {
        accumulated.occurrence_time = parsed;
        console.log("[accumulateFields] Parsed occurrence_time from picker (override ok):", accumulated.occurrence_time);
      }
    }

    const directionMatch = content.match(/sentido:\s*([^\n]+)/i);
    if (directionMatch && !accumulated.direction) {
      const directionRaw = directionMatch[1].trim().toLowerCase();
      if (directionRaw.includes("ida")) accumulated.direction = "ida";
      else if (directionRaw.includes("volta")) accumulated.direction = "volta";
      else if (directionRaw.includes("circular")) accumulated.direction = "circular";
    }

    const recurrenceMatch = content.match(/frequ[êe]ncia:\s*([^\n]+)/i);
    if (recurrenceMatch && !accumulated.recurrence_frequency) {
      const normalized = normalizeTransportRecurrenceFrequency(recurrenceMatch[1]);
      if (normalized) accumulated.recurrence_frequency = normalized;
    }
  }

  for (const msg of messages) {
    if (msg.role !== "user") continue;
    const content = deps.getMsgText(msg);
    const contentLower = content.toLowerCase();
    const gpsM =
      content.match(/Localiza[cç][aã]o\s*GPS\s*[-:]?\s*(-?[\d.]+)\s*[,，]\s*(-?[\d.]+)/i) ||
      ((contentLower.includes("localização gps") || contentLower.includes("localizacao gps"))
        ? content.match(/(-?[\d.]+)\s*[,，]\s*(-?[\d.]+)/)
        : null);
    if (gpsM && accumulated.user_lat == null) {
      const lat = parseFloat(gpsM[1].trim());
      const lon = parseFloat(gpsM[2].trim());
      if (!Number.isNaN(lat) && !Number.isNaN(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
        accumulated.user_lat = lat;
        accumulated.user_lon = lon;
        if (!accumulated.location_method) accumulated.location_method = "gps";
      }
    }
  }

  const lastIdx = messages.length - 1;
  if (messages[lastIdx]?.role !== "user" || lastIdx <= 0) return;

  const prevA = messages[lastIdx - 1];
  if (prevA?.role !== "assistant") return;

  const rawPrev = deps.getMsgText(prevA);
  const fieldRequestMatch = rawPrev.match(/\[FIELD_REQUEST:(\w+)\]/);
  if (!fieldRequestMatch) return;

  const fieldType = fieldRequestMatch[1];
  const answer = deps.getMsgText(messages[lastIdx]).trim();
  const parsed = deps.parseFieldResponse(fieldType, answer);
  if (Object.keys(parsed).length > 0) {
    Object.assign(accumulated, parsed);
    console.log("[accumulateFields] transport: FIELD_REQUEST from last exchange:", fieldType);
  }
}
