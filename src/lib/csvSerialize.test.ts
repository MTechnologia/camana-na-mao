import { describe, it, expect } from "vitest";
import { csvEscape, serializeCsv, __csvInternals } from "./csvSerialize";

const { LINE_SEPARATOR, UTF8_BOM } = __csvInternals;

describe("csvEscape", () => {
  it("retorna vazio para null/undefined", () => {
    expect(csvEscape(null)).toBe("");
    expect(csvEscape(undefined)).toBe("");
  });

  it("não escapa texto simples", () => {
    expect(csvEscape("foo")).toBe("foo");
    expect(csvEscape("ABC123")).toBe("ABC123");
  });

  it("escapa virgulas com aspas", () => {
    expect(csvEscape("foo, bar")).toBe('"foo, bar"');
  });

  it("escapa aspas duplas duplicando", () => {
    expect(csvEscape('Diz "olá"')).toBe('"Diz ""olá"""');
  });

  it("escapa quebras de linha", () => {
    expect(csvEscape("linha1\nlinha2")).toBe('"linha1\nlinha2"');
    expect(csvEscape("linha1\r\nlinha2")).toBe('"linha1\r\nlinha2"');
  });

  it("converte número e boolean", () => {
    expect(csvEscape(42)).toBe("42");
    expect(csvEscape(0)).toBe("0");
    expect(csvEscape(true)).toBe("true");
    expect(csvEscape(false)).toBe("false");
  });

  it("converte Date para ISO", () => {
    const d = new Date("2026-05-11T12:00:00Z");
    expect(csvEscape(d)).toBe("2026-05-11T12:00:00.000Z");
  });

  it("serializa arrays com separador ; ", () => {
    expect(csvEscape(["a", "b", "c"])).toBe("a; b; c");
  });

  it("escapa arrays com virgula nos elementos", () => {
    expect(csvEscape(["a, x", "b"])).toBe('"a, x; b"');
  });

  it("serializa objetos com JSON.stringify", () => {
    expect(csvEscape({ x: 1 })).toBe('"{""x"":1}"');
  });
});

describe("serializeCsv", () => {
  const headers = [
    { key: "id", label: "ID" },
    { key: "nome", label: "Nome" },
    { key: "nota", label: "Nota" },
  ];

  it("começa com BOM UTF-8 por padrão", () => {
    const csv = serializeCsv(headers, []);
    expect(csv.startsWith(UTF8_BOM)).toBe(true);
  });

  it("omite BOM quando includeBom=false", () => {
    const csv = serializeCsv(headers, [], { includeBom: false });
    expect(csv.startsWith(UTF8_BOM)).toBe(false);
  });

  it("usa \\r\\n como separador de linha", () => {
    const csv = serializeCsv(headers, [{ id: 1, nome: "A", nota: 10 }], {
      includeBom: false,
    });
    expect(csv).toBe(`ID,Nome,Nota${LINE_SEPARATOR}1,A,10`);
  });

  it("escapa células e preserva alinhamento de colunas", () => {
    const csv = serializeCsv(headers, [
      { id: 1, nome: "Maria, José", nota: 8.5 },
      { id: 2, nome: 'Diz "oi"', nota: null },
    ], { includeBom: false });
    expect(csv).toBe(
      `ID,Nome,Nota${LINE_SEPARATOR}1,"Maria, José",8.5${LINE_SEPARATOR}2,"Diz ""oi""",`,
    );
  });

  it("ignora propriedades extras das rows que não estão nos headers", () => {
    const csv = serializeCsv(
      [{ key: "nome", label: "Nome" }],
      [{ nome: "Ana", extra: "ignorado" }],
      { includeBom: false },
    );
    expect(csv).toBe(`Nome${LINE_SEPARATOR}Ana`);
  });

  it("cabeçalho com vírgula é aspeado", () => {
    const csv = serializeCsv(
      [{ key: "x", label: "Nome, completo" }],
      [{ x: "a" }],
      { includeBom: false },
    );
    expect(csv).toBe(`"Nome, completo"${LINE_SEPARATOR}a`);
  });
});
