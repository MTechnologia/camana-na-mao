import { describe, expect, it } from "vitest";
import { sanitizeMessageContent } from "@/lib/sanitizeMarkers";

describe("sanitizeMessageContent", () => {
  it("remove PHOTO_ATTACH_STEP da mensagem visível", () => {
    const raw =
      "[PHOTO_ATTACH_STEP][FIELD_REQUEST:photos]Pode anexar até 3 fotos usando os botões **Câmera** ou **Galeria** abaixo.";
    expect(sanitizeMessageContent(raw)).toBe(
      "Pode anexar até 3 fotos usando os botões **Câmera** ou **Galeria** abaixo.",
    );
  });
});
