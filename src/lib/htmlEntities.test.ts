import { describe, expect, it } from "vitest";
import { decodeHtmlEntities } from "@/lib/htmlEntities";

describe("decodeHtmlEntities", () => {
  it("decodifica entidade numérica (caso do cadastro: &#8211;)", () => {
    expect(decodeHtmlEntities("CEU Butantã &#8211; Professora Elizabeth")).toBe(
      "CEU Butantã – Professora Elizabeth",
    );
  });

  it("decodifica hexadecimal e nomeadas comuns", () => {
    expect(decodeHtmlEntities("R&#x2013;X")).toBe("R–X");
    expect(decodeHtmlEntities("Saúde &amp; Cidadania")).toBe("Saúde & Cidadania");
    expect(decodeHtmlEntities("Posto&nbsp;Central")).toBe("Posto Central");
    expect(decodeHtmlEntities("aspas &quot;x&quot;")).toBe('aspas "x"');
  });

  it("não altera texto sem entidades e trata vazio/nulo", () => {
    expect(decodeHtmlEntities("UBS Vila Maria")).toBe("UBS Vila Maria");
    expect(decodeHtmlEntities("")).toBe("");
    expect(decodeHtmlEntities(null)).toBe("");
    expect(decodeHtmlEntities(undefined)).toBe("");
  });
});
