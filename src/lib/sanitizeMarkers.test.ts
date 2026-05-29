import { describe, expect, it } from "vitest";
import { URBAN_QUICK_REPORT_CHIP_MESSAGE } from "@/lib/urbanQuickReport";
import { sanitizeMessageContent } from "@/lib/sanitizeMarkers";

describe("sanitizeMessageContent", () => {
  it("remove PHOTO_ATTACH_STEP da mensagem visível", () => {
    const raw =
      "[PHOTO_ATTACH_STEP][FIELD_REQUEST:photos]Pode anexar até 3 fotos usando os botões **Câmera** ou **Galeria** abaixo.";
    expect(sanitizeMessageContent(raw)).toBe(
      "Pode anexar até 3 fotos usando os botões **Câmera** ou **Galeria** abaixo.",
    );
  });

  it("remove URBAN_QUICK_REPORT do chip de relato rápido", () => {
    expect(sanitizeMessageContent(URBAN_QUICK_REPORT_CHIP_MESSAGE)).toBe("Quero um relato rápido");
  });

  it("remove OPEN_MANUAL_REPORT do chip de formulário manual", () => {
    expect(sanitizeMessageContent("[OPEN_MANUAL_REPORT]")).toBe("");
  });
});
