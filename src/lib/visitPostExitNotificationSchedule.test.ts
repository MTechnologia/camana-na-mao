import { describe, expect, it } from "vitest";
import { shouldSchedulePostExitRatingPush } from "./visitPostExitNotificationSchedule";

describe("shouldSchedulePostExitRatingPush", () => {
  const base = new Date("2026-04-08T12:00:00.000Z");

  it("permite quando 15 min após saída ainda está antes do fim da janela (48h)", () => {
    const createdAt = base;
    const departedAt = new Date(base.getTime() + 60 * 60 * 1000);
    const expiresAt = new Date(base.getTime() + 7 * 24 * 60 * 60 * 1000);
    expect(shouldSchedulePostExitRatingPush({ departedAt, createdAt, expiresAt })).toBe(true);
  });

  it("bloqueia quando o envio cairia depois do teto de 48h desde a visita", () => {
    const createdAt = new Date("2026-04-01T12:00:00.000Z");
    const departedAt = new Date("2026-04-03T12:00:00.000Z");
    const expiresAt = new Date("2026-04-30T12:00:00.000Z");
    expect(shouldSchedulePostExitRatingPush({ departedAt, createdAt, expiresAt })).toBe(false);
  });

  it("bloqueia quando o envio seria em ou após expires_at", () => {
    const createdAt = base;
    const departedAt = base;
    const expiresAt = new Date(base.getTime() + 10 * 60 * 1000);
    expect(shouldSchedulePostExitRatingPush({ departedAt, createdAt, expiresAt })).toBe(false);
  });
});
