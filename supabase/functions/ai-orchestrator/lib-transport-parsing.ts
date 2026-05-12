export function parseFlexibleOccurrenceTime(input: string): string | null {
  const raw = (input || "").trim().toLowerCase();
  if (!raw) return null;

  const normalized = raw
    .replace(/\s+/g, " ")
    .replace(/horas?/g, "h")
    .replace(/\bmeia noite\b/g, "00:00")
    .replace(/\bmeio dia\b/g, "12:00")
    .replace(/\bmeio-dia\b/g, "12:00");

  const compact = normalized.replace(/\s+/g, "");

  const hm = compact.match(/(?:^|[^0-9])([01]?\d|2[0-3])(?:h|:)([0-5]?\d)?(?!\d)/);
  if (hm) {
    const hour = hm[1].padStart(2, "0");
    const minute = (hm[2] || "00").padStart(2, "0");
    return `${hour}:${minute}`;
  }

  if (/^([01]\d|2[0-3])([0-5]\d)$/.test(compact)) {
    const digits = compact.match(/^([01]\d|2[0-3])([0-5]\d)$/);
    if (digits) return `${digits[1]}:${digits[2]}`;
  }

  const hourOnly = compact.match(/\b([01]?\d|2[0-3])\b/);
  if (hourOnly && /\b(h|hora)\b/.test(normalized)) {
    return `${hourOnly[1].padStart(2, "0")}:00`;
  }

  return null;
}

export function normalizeTransportRecurrenceFrequency(input: string): string | null {
  const raw = String(input || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (!raw) return null;

  if (raw.includes("primeira vez")) return "primeira_vez";
  if (raw.includes("algumas vezes") || raw.includes("vezes/mes") || raw.includes("vezes por mes")) {
    return "algumas_vezes_mes";
  }
  if (raw.includes("toda semana") || raw.includes("todas as semanas") || raw.includes("semanal")) {
    return "toda_semana";
  }
  if (raw.includes("todos os dias") || raw.includes("todo dia") || raw.includes("diario") || raw.includes("diária")) {
    return "todos_os_dias";
  }
  if (raw === "primeira_vez" || raw === "algumas_vezes_mes" || raw === "toda_semana" || raw === "todos_os_dias") {
    return raw;
  }
  return null;
}
