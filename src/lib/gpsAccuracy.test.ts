import { describe, expect, it } from "vitest";
import {
  MAX_GPS_ACCURACY_METERS,
  MAX_GPS_ACCURACY_NEARBY_UI_METERS,
  isGpsAccuracyAcceptable,
  maxGpsAccuracyForLocationPrompt,
} from "./gpsAccuracy";

describe("isGpsAccuracyAcceptable", () => {
  it("aceita accuracy finita menor ou igual ao limite critico", () => {
    expect(isGpsAccuracyAcceptable(MAX_GPS_ACCURACY_METERS)).toBe(true);
    expect(isGpsAccuracyAcceptable(MAX_GPS_ACCURACY_METERS - 0.1)).toBe(true);
  });

  it("rejeita accuracy ausente, infinita ou acima do limite", () => {
    expect(isGpsAccuracyAcceptable(null)).toBe(false);
    expect(isGpsAccuracyAcceptable(undefined)).toBe(false);
    expect(isGpsAccuracyAcceptable(Number.POSITIVE_INFINITY)).toBe(false);
    expect(isGpsAccuracyAcceptable(MAX_GPS_ACCURACY_METERS + 0.1)).toBe(false);
  });

  it("permite limite customizado para a UI de servicos proximos", () => {
    expect(isGpsAccuracyAcceptable(500, MAX_GPS_ACCURACY_NEARBY_UI_METERS)).toBe(true);
    expect(isGpsAccuracyAcceptable(2000, MAX_GPS_ACCURACY_NEARBY_UI_METERS)).toBe(false);
  });
});

describe("maxGpsAccuracyForLocationPrompt", () => {
  it("usa o teto permissivo na busca de servicos proximos", () => {
    expect(
      maxGpsAccuracyForLocationPrompt(
        "Como você quer informar sua localização para buscar serviços próximos?",
      ),
    ).toBe(MAX_GPS_ACCURACY_NEARBY_UI_METERS);
    // regressao do print: 43m deve ser aceito nesse fluxo
    expect(
      isGpsAccuracyAcceptable(
        43,
        maxGpsAccuracyForLocationPrompt("informar sua localização para buscar serviços próximos"),
      ),
    ).toBe(true);
  });

  it("usa o teto permissivo pelo marcador de servicos mesmo sem o texto 'para buscar' (atalho NREF)", () => {
    // Prompt do atalho (#414): carrega [COLLECTION_PROGRESS:services:...] mas o texto é
    // "Como você quer informar sua localização?" (sem "para buscar serviços próximos").
    const shortcutPrompt =
      "[COLLECTION_PROGRESS:services:{\"service_type\":\"park\"}][FIELD_REQUEST:location_method]" +
      "Vou te ajudar a encontrar parques próximas a você. Como você quer informar sua localização?\n\n[LOCATION_METHOD_PICKER]";
    expect(maxGpsAccuracyForLocationPrompt(shortcutPrompt)).toBe(MAX_GPS_ACCURACY_NEARBY_UI_METERS);
    // regressao do print: 20m deve ser aceito nesse fluxo
    expect(isGpsAccuracyAcceptable(20, maxGpsAccuracyForLocationPrompt(shortcutPrompt))).toBe(true);
  });

  it("mantem o teto estrito (RN04) no relato urbano/critico", () => {
    expect(
      maxGpsAccuracyForLocationPrompt("Como você quer informar onde fica o problema?"),
    ).toBe(MAX_GPS_ACCURACY_METERS);
    expect(
      isGpsAccuracyAcceptable(
        43,
        maxGpsAccuracyForLocationPrompt("Como você quer informar onde fica o problema?"),
      ),
    ).toBe(false);
  });
});
