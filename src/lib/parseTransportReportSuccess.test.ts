import { describe, expect, it } from "vitest";
import { parseTransportReportSuccess } from "@/lib/parseTransportReportSuccess";

describe("parseTransportReportSuccess", () => {
  it("divide corpo em linhas quando o backend envia \\n", () => {
    const raw = `[TRANSPORT_CREATED:abc]
Relato de transporte registrado!
🔖 Protocolo: TRP-1
📋 Tipo: Atraso
[FIELD_REQUEST:channel_rating]
[RATING_PICKER]`;
    const parsed = parseTransportReportSuccess(raw);
    expect(parsed?.lines).toEqual([
      "Relato de transporte registrado!",
      "🔖 Protocolo: TRP-1",
      "📋 Tipo: Atraso",
    ]);
  });

  it("quebra mensagem densa legada em linhas por emoji", () => {
    const dense =
      "[TRANSPORT_CREATED:11111111-1111-4111-8111-111111111111] ✅ Relato de transporte registrado! 🔖 Protocolo: TRP-1 📋 Tipo: Atraso 🚌 Linha: 10";
    const parsed = parseTransportReportSuccess(dense);
    expect(parsed?.lines.length).toBeGreaterThan(2);
    expect(parsed?.lines[0]).toBe("Relato de transporte registrado!");
  });
});
