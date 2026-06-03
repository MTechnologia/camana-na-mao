/**
 * Utilitários para validar contrato de turno do chatbot (marcadores UI ↔ orchestrator).
 */

export interface TurnContractExpect {
  journey: "urban_report" | "transport_report" | "service_rating";
  /** Campo solicitado no turno ([FIELD_REQUEST:xxx]) */
  field_request?: string;
  /** Picker esperado (substring) */
  picker_contains?: string;
  /** Progress JSON deve conter estas chaves */
  progress_keys?: string[];
}

export function extractFieldRequests(text: string): string[] {
  const stripped = text.replace(/\[COLLECTION_PROGRESS:\w+:\{[\s\S]*?\}\]/g, "");
  return [...stripped.matchAll(/\[FIELD_REQUEST:(\w+)\]/g)].map((m) => m[1]);
}

export function extractCollectionProgressJourney(text: string): string | null {
  const m = text.match(/\[COLLECTION_PROGRESS:(\w+):/);
  return m?.[1] ?? null;
}

export function parseCollectionProgressJson(
  text: string,
  journey: string,
): Record<string, unknown> | null {
  const prefix = `[COLLECTION_PROGRESS:${journey}:`;
  const idx = text.indexOf(prefix);
  if (idx === -1) return null;
  const jsonStart = text.indexOf("{", idx);
  if (jsonStart === -1) return null;
  let depth = 0;
  for (let j = jsonStart; j < text.length; j++) {
    const ch = text[j];
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(text.slice(jsonStart, j + 1)) as Record<string, unknown>;
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

export function assertTurnContract(text: string, expect: TurnContractExpect): string[] {
  const errors: string[] = [];
  const journey = extractCollectionProgressJourney(text);
  if (!text.includes(`[COLLECTION_PROGRESS:${expect.journey}:`)) {
    errors.push(`falta [COLLECTION_PROGRESS:${expect.journey}:...]`);
  }
  if (journey && journey !== expect.journey) {
    errors.push(`jornada no progresso: ${journey}, esperado ${expect.journey}`);
  }
  if (expect.field_request) {
    const fields = extractFieldRequests(text);
    if (!fields.includes(expect.field_request)) {
      errors.push(`FIELD_REQUEST esperado: ${expect.field_request}, obtidos: ${fields.join(", ") || "(nenhum)"}`);
    }
  }
  if (expect.picker_contains && !text.includes(expect.picker_contains)) {
    errors.push(`picker ausente: ${expect.picker_contains}`);
  }
  if (expect.progress_keys?.length) {
    const progress = parseCollectionProgressJson(text, expect.journey);
    if (!progress) {
      errors.push("não foi possível parsear JSON do COLLECTION_PROGRESS");
    } else {
      for (const key of expect.progress_keys) {
        if (progress[key] === undefined || progress[key] === null || progress[key] === "") {
          errors.push(`progress.${key} ausente no JSON acumulado`);
        }
      }
    }
  }
  return errors;
}
