import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { DateTime } from "https://esm.sh/luxon@3.4.4";
import {
  computeNextSendAfterQuietHours,
  isCriticalNotification,
  isInQuietHours,
  parseTimeToMinutes,
} from "./quiet-hours.ts";

const TZ = "America/Sao_Paulo";

function localDateTime(
  y: number,
  mo: number,
  d: number,
  h: number,
  mi: number,
): Date {
  return DateTime.fromObject({ year: y, month: mo, day: d, hour: h, minute: mi }, { zone: TZ }).toJSDate();
}

Deno.test("parseTimeToMinutes aceita HH:MM:SS", () => {
  assertEquals(parseTimeToMinutes("22:00:00"), 22 * 60);
  assertEquals(parseTimeToMinutes("07:01"), 7 * 60 + 1);
});

Deno.test("fora do silêncio (mesmo dia)", () => {
  const now = localDateTime(2025, 6, 15, 9, 0);
  assertEquals(isInQuietHours({ now, tz: TZ, startStr: "22:00", endStr: "07:00" }), false);
  assertEquals(computeNextSendAfterQuietHours({ now, tz: TZ, startStr: "22:00", endStr: "07:00" }), null);
});

Deno.test("dentro do silêncio (pernoite 22h–07h, noite)", () => {
  const now = localDateTime(2025, 6, 15, 23, 0);
  assertEquals(isInQuietHours({ now, tz: TZ, startStr: "22:00", endStr: "07:00" }), true);
  const next = computeNextSendAfterQuietHours({ now, tz: TZ, startStr: "22:00", endStr: "07:00" });
  const nextDt = DateTime.fromISO(next!, { zone: "utc" }).setZone(TZ);
  assertEquals(nextDt.day, 16);
  assertEquals(nextDt.hour, 7);
  assertEquals(nextDt.minute, 1);
});

Deno.test("dentro do silêncio (pernoite, madrugada)", () => {
  const now = localDateTime(2025, 6, 16, 3, 30);
  assertEquals(isInQuietHours({ now, tz: TZ, startStr: "22:00", endStr: "07:00" }), true);
  const next = computeNextSendAfterQuietHours({ now, tz: TZ, startStr: "22:00", endStr: "07:00" });
  const nextDt = DateTime.fromISO(next!, { zone: "utc" }).setZone(TZ);
  assertEquals(nextDt.day, 16);
  assertEquals(nextDt.hour, 7);
  assertEquals(nextDt.minute, 1);
});

Deno.test("dentro do silêncio (mesmo dia 10h–12h)", () => {
  const now = localDateTime(2025, 6, 15, 11, 0);
  assertEquals(isInQuietHours({ now, tz: TZ, startStr: "10:00", endStr: "12:00" }), true);
  const next = computeNextSendAfterQuietHours({ now, tz: TZ, startStr: "10:00", endStr: "12:00" });
  const nextDt = DateTime.fromISO(next!, { zone: "utc" }).setZone(TZ);
  assertEquals(nextDt.day, 15);
  assertEquals(nextDt.hour, 12);
  assertEquals(nextDt.minute, 1);
});

Deno.test("isCriticalNotification só critical", () => {
  assertEquals(isCriticalNotification("critical"), true);
  assertEquals(isCriticalNotification("high"), false);
  assertEquals(isCriticalNotification(undefined), false);
});
