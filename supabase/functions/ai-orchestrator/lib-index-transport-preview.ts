import { formatTransportPreviewTypeLine } from "./lib-transport-preview.ts";

export function transportPreviewJsonMarker(fields: Record<string, unknown>): string {
  const payload = {
    description: fields.description ?? null,
    report_type: fields.report_type ?? null,
    sub_category: fields.sub_category ?? null,
    line_code: fields.line_code ?? null,
    occurrence_date: fields.occurrence_date ?? null,
    occurrence_time: fields.occurrence_time ?? null,
    direction: fields.direction ?? null,
    recurrence_frequency: fields.recurrence_frequency ?? null,
    personal_impact: fields.personal_impact ?? null,
    location: fields.location ?? null,
    stop_name: fields.stop_name ?? null,
    stop_location: fields.stop_location ?? null,
    accessibility_details: fields.accessibility_details ?? null,
  };
  try {
    const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
    return `\n\n[TRANSPORT_PREVIEW_JSON:${b64}]`;
  } catch {
    return "";
  }
}

export function serviceRatingSubmitPreviewJsonMarker(payload: {
  rating_stars: number;
  rating_dimensions: Record<string, number> | null;
  service_name: string;
  comment_preview: string;
}): string {
  try {
    const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
    return `\n\n[RATING_SUBMIT_PREVIEW_JSON:${b64}]`;
  } catch {
    return "";
  }
}

export function transportImpactSummaryLine(pi: unknown): string {
  const n =
    typeof pi === "number" && Number.isFinite(pi)
      ? pi
      : parseInt(String(pi ?? "").trim(), 10);
  if (!Number.isFinite(n)) return "Não informado";
  if (n >= 5) return "Alto (compromisso / não embarcou)";
  if (n >= 4) return "Atraso relevante (>30 min)";
  if (n >= 3) return "Atraso moderado (<30 min)";
  return "Desconforto";
}

export function hasTransportAccessibilityDetails(value: unknown): boolean {
  return Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      Object.keys(value as Record<string, unknown>).length > 0,
  );
}

export function formatTransportAccessibilitySummary(value: unknown): string | null {
  if (!hasTransportAccessibilityDetails(value)) return null;
  const details = value as Record<string, unknown>;
  const labels: Record<string, string> = {
    rampa: "Rampa",
    elevador: "Elevador / escada rolante",
    piso_tatil: "Piso tátil",
    embarque_assistido: "Apoio para embarque",
    observacoes: "Observações",
  };
  const parts = Object.entries(details)
    .map(([key, raw]) => {
      const label = labels[key] || key.replace(/_/g, " ");
      if (raw === true) return label;
      if (raw === false) return `${label}: não`;
      const text = String(raw ?? "").trim();
      return text ? `${label}: ${text}` : null;
    })
    .filter(Boolean);
  return parts.length ? parts.join("; ") : null;
}

export function buildTransportPreviewOptionalLines(fields: Record<string, unknown>): string {
  const lines: string[] = [];
  if (fields.location) lines.push(`• **Local:** ${fields.location}`);
  if (fields.stop_name) lines.push(`• **Parada / estação:** ${fields.stop_name}`);
  if (fields.stop_location) lines.push(`• **Ponto / referência:** ${fields.stop_location}`);
  const accessibilitySummary = formatTransportAccessibilitySummary(fields.accessibility_details);
  if (accessibilitySummary) {
    lines.push(`• **Acessibilidade:** ${accessibilitySummary}`);
  }
  return lines.length ? `\n${lines.join("\n")}` : "";
}

export function transportTypeWithSubcategory(fields: Record<string, unknown>): string {
  return formatTransportPreviewTypeLine(fields);
}

export function buildTransportFinalPreviewMessage(
  accumulatedFields: Record<string, unknown>,
  extraPhotoLine: string,
  typeLine?: string,
): string {
  const recurrenceLabelMap: Record<string, string> = {
    primeira_vez: "Primeira vez",
    algumas_vezes_mes: "Algumas vezes/mês",
    toda_semana: "Toda semana",
    todos_os_dias: "Todos os dias",
  };
  const desc = (accumulatedFields.description || "").toString();
  const typeHuman = typeLine || transportTypeWithSubcategory(accumulatedFields);
  const bullets = `**Resumo do relato de transporte**
• **Problema:** ${desc.slice(0, 150)}${desc.length > 150 ? "..." : ""}
• **Tipo:** ${typeHuman}
• **Linha:** ${accumulatedFields.line_code || "Não informada"}
• **Quando:** ${accumulatedFields.occurrence_date || ""}${
    accumulatedFields.occurrence_time ? ` às ${accumulatedFields.occurrence_time}` : ""
  }${extraPhotoLine}
• **Sentido:** ${accumulatedFields.direction || "Não informado"}
• **Frequência:** ${
    recurrenceLabelMap[String(accumulatedFields.recurrence_frequency || "")] ||
    accumulatedFields.recurrence_frequency ||
    "Não informada"
  }
• **Impacto na rotina:** ${transportImpactSummaryLine(accumulatedFields.personal_impact)}${buildTransportPreviewOptionalLines(accumulatedFields)}`;

  return `${bullets}

Se estiver tudo certo, clique em **Confirmar** para registrar ou em **Corrigir** para alterar algo.${transportPreviewJsonMarker(
    accumulatedFields,
  )}[QUICK_REPLY:confirmar,corrigir]`;
}
