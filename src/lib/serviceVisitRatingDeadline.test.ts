import { describe, expect, it } from "vitest";
import {
  isPastVisitRating48hDeadline,
  isVisitRatingWindowClosed,
} from "./serviceVisitRatingDeadline";

const createdAt = "2026-05-01T10:00:00.000Z";
const createdMs = new Date(createdAt).getTime();

describe("serviceVisitRatingDeadline", () => {
  it("fecha a janela exatamente no limite de 48 horas", () => {
    expect(isPastVisitRating48hDeadline(createdAt, createdMs + 48 * 60 * 60 * 1000 - 1)).toBe(
      false,
    );
    expect(isPastVisitRating48hDeadline(createdAt, createdMs + 48 * 60 * 60 * 1000)).toBe(true);
  });

  it("trata data de criacao invalida como janela expirada", () => {
    expect(isPastVisitRating48hDeadline("nao-e-data", createdMs)).toBe(true);
  });

  it("fecha tambem quando expires_at chega antes das 48 horas", () => {
    const expiresAt = "2026-05-01T12:00:00.000Z";
    expect(isVisitRatingWindowClosed(createdAt, expiresAt, new Date(expiresAt).getTime() - 1)).toBe(
      false,
    );
    expect(isVisitRatingWindowClosed(createdAt, expiresAt, new Date(expiresAt).getTime())).toBe(
      true,
    );
  });

  it("ignora expires_at invalido enquanto o limite de 48 horas nao chegou", () => {
    expect(isVisitRatingWindowClosed(createdAt, "nao-e-data", createdMs + 1000)).toBe(false);
  });
});
