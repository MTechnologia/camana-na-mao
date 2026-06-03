import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { renderTransportSuccessLine } from "@/lib/transportSuccessFormatting";

describe("renderTransportSuccessLine", () => {
  it("coloca negrito no título com ✅", () => {
    const html = renderToStaticMarkup(
      <>{renderTransportSuccessLine("Relato de transporte registrado!")}</>,
    );
    expect(html).toContain("✅");
    expect(html).toContain("<strong>Relato de transporte registrado!</strong>");
  });

  it("coloca negrito em Protocolo e valor ao lado", () => {
    const html = renderToStaticMarkup(
      <>{renderTransportSuccessLine("🔖 Protocolo: TRP-2026-000001")}</>,
    );
    expect(html).toContain("<strong>Protocolo:</strong>");
    expect(html).toContain("TRP-2026-000001");
  });

  it("usa dois pontos em Próximos passos", () => {
    const html = renderToStaticMarkup(
      <>{renderTransportSuccessLine("📚 Próximos passos: texto de triagem")}</>,
    );
    expect(html).toContain("<strong>Próximos passos:</strong>");
  });

  it("coloca negrito em Gravidade com emoji de alerta", () => {
    const html = renderToStaticMarkup(<>{renderTransportSuccessLine("⚠️ Gravidade: Crítica")}</>);
    expect(html).toContain("<strong>Gravidade:</strong>");
    expect(html).toContain("Crítica");
  });

  it("coloca Meus relatos em negrito no link", () => {
    const html = renderToStaticMarkup(
      <>
        {renderTransportSuccessLine("🔗 [Meus relatos] para acompanhar.", {
          onMeusRelatos: () => {},
        })}
      </>,
    );
    expect(html).toContain("font-bold");
    expect(html).toContain("Meus relatos");
  });
});
