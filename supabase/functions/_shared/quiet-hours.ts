/**
 * RN-NOT-001: horário de silêncio (quiet_hours_start / quiet_hours_end em notification_settings).
 * Usa fuso IANA (default America/Sao_Paulo via NOTIFICATION_QUIET_HOURS_TZ).
 */

import { DateTime } from "https://esm.sh/luxon@3.4.4";

export const DEFAULT_QUIET_HOURS_TZ = "America/Sao_Paulo";

/** Converte TIME do Postgres ("HH:MM:SS" ou "HH:MM") em minutos desde meia-noite. */
export function parseTimeToMinutes(t: string | null | undefined): number | null {
  if (t == null) return null;
  const s = String(t).trim();
  if (s === "") return null;
  const parts = s.split(":");
  if (parts.length < 2) return null;
  const h = Number(parts[0]);
  const m = Number(parts[1]);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
}

/**
 * Intervalo de silêncio inclusivo em minutos locais [start, end].
 * Se start > end, cruza meia-noite (ex.: 22:00–07:00).
 */
export function isInQuietHours(params: {
  now: Date;
  tz: string;
  startStr: string | null | undefined;
  endStr: string | null | undefined;
}): boolean {
  const startM = parseTimeToMinutes(params.startStr);
  const endM = parseTimeToMinutes(params.endStr);
  if (startM === null || endM === null) return false;

  const dt = DateTime.fromJSDate(params.now, { zone: params.tz });
  if (!dt.isValid) return false;
  const currentM = dt.hour * 60 + dt.minute;

  if (startM <= endM) {
    return currentM >= startM && currentM <= endM;
  }
  return currentM >= startM || currentM <= endM;
}

/**
 * Próximo envio permitido: primeiro instante no fuso `tz` em quiet_hours_end + 1 minuto
 * do período de silêncio atual. Retorna null se não estiver em silêncio.
 */
export function computeNextSendAfterQuietHours(params: {
  now: Date;
  tz: string;
  startStr: string | null | undefined;
  endStr: string | null | undefined;
}): string | null {
  if (!isInQuietHours(params)) return null;

  const startM = parseTimeToMinutes(params.startStr);
  const endM = parseTimeToMinutes(params.endStr);
  if (startM === null || endM === null) return null;

  const dt = DateTime.fromJSDate(params.now, { zone: params.tz });
  if (!dt.isValid) return null;
  const currentM = dt.hour * 60 + dt.minute;
  const overnight = startM > endM;

  const minutesAfterMidnight = endM + 1;

  if (!overnight) {
    let slot = dt.startOf("day").plus({ minutes: minutesAfterMidnight });
    if (slot <= dt) slot = slot.plus({ days: 1 });
    return slot.toUTC().toISO();
  }

  if (currentM >= startM) {
    const slot = dt.plus({ days: 1 }).startOf("day").plus({ minutes: minutesAfterMidnight });
    return slot.toUTC().toISO();
  }

  let slot = dt.startOf("day").plus({ minutes: minutesAfterMidnight });
  if (slot <= dt) slot = slot.plus({ days: 1 });
  return slot.toUTC().toISO();
}

export function isCriticalNotification(priority: string | null | undefined): boolean {
  return (priority ?? "normal") === "critical";
}
