import { describe, it, expect } from "vitest";
import {
  AUDIT_COLUMN_LABELS,
  AUDIT_CSV_COLUMNS,
  csvEscape,
  rowsToCsv,
  type AuditCsvRow,
} from "./auditCsv";

/**
 * HU-12.2 — Testes do util de serialização CSV.
 */

describe("csvEscape", () => {
  it("retorna string vazia para null/undefined", () => {
    expect(csvEscape(null)).toBe("");
    expect(csvEscape(undefined)).toBe("");
  });

  it("retorna o valor literal quando não tem caracteres especiais", () => {
    expect(csvEscape("hello")).toBe("hello");
    expect(csvEscape(42)).toBe("42");
    expect(csvEscape(true)).toBe("true");
  });

  it("envolve em aspas quando contém vírgula", () => {
    expect(csvEscape("a,b")).toBe('"a,b"');
  });

  it("envolve em aspas quando contém aspas e duplica o caractere", () => {
    expect(csvEscape('say "hi"')).toBe('"say ""hi"""');
  });

  it("envolve em aspas quando contém ponto e vírgula", () => {
    expect(csvEscape("a;b")).toBe('"a;b"');
  });

  it("envolve em aspas quando contém quebra de linha", () => {
    expect(csvEscape("linha1\nlinha2")).toBe('"linha1\nlinha2"');
    expect(csvEscape("linha1\r\nlinha2")).toBe('"linha1\r\nlinha2"');
  });

  it("serializa objetos como JSON", () => {
    expect(csvEscape({ a: 1 })).toBe('"{""a"":1}"');
  });

  it("serializa arrays como JSON", () => {
    expect(csvEscape([1, 2, 3])).toBe('"[1,2,3]"');
  });
});

describe("AUDIT_CSV_COLUMNS", () => {
  it("tem 11 colunas na ordem esperada", () => {
    expect(AUDIT_CSV_COLUMNS).toEqual([
      "data_hora",
      "user_id",
      "usuario",
      "email",
      "acao",
      "entidade",
      "entidade_id",
      "ip",
      "user_agent",
      "old_values",
      "new_values",
    ]);
  });
});

describe("rowsToCsv", () => {
  const sampleRow: AuditCsvRow = {
    data_hora: "12/05/2026 14:30:00",
    user_id: "abc-123",
    usuario: "Maria Silva",
    email: "maria@example.com",
    acao: "role_changed",
    entidade: "user_roles",
    entidade_id: "xyz-456",
    ip: "192.168.0.1",
    user_agent: "Mozilla/5.0",
    old_values: { role: "cidadao" },
    new_values: { role: "gestor" },
  };

  it("inicia com BOM UTF-8", () => {
    const csv = rowsToCsv([sampleRow]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
  });

  it("inclui o header como primeira linha (após BOM)", () => {
    const csv = rowsToCsv([sampleRow]);
    const firstLine = csv.slice(1).split("\n")[0];
    expect(firstLine).toBe(AUDIT_CSV_COLUMNS.map((col) => AUDIT_COLUMN_LABELS[col]).join(","));
  });

  it("uma linha de dados é serializada corretamente", () => {
    const csv = rowsToCsv([sampleRow]);
    const lines = csv.slice(1).split("\n");
    expect(lines).toHaveLength(2);
    expect(lines[1]).toContain("Maria Silva");
    expect(lines[1]).toContain("role_changed");
    expect(lines[1]).toContain('"{""role"":""cidadao""}"');
  });

  it("preserva múltiplas linhas separadas por \\n", () => {
    const csv = rowsToCsv([sampleRow, sampleRow, sampleRow]);
    const lines = csv.slice(1).split("\n");
    expect(lines).toHaveLength(4); // 1 header + 3 dados
  });

  it("lida com array vazio (apenas header)", () => {
    const csv = rowsToCsv([]);
    const body = csv.slice(1);
    expect(body).toBe(AUDIT_CSV_COLUMNS.map((col) => AUDIT_COLUMN_LABELS[col]).join(",") + "\n");
  });

  it("não quebra com valores vazios/null", () => {
    const empty: AuditCsvRow = {
      data_hora: "",
      user_id: "",
      usuario: "",
      email: "",
      acao: "",
      entidade: "",
      entidade_id: "",
      ip: "",
      user_agent: "",
      old_values: null,
      new_values: null,
    };
    const csv = rowsToCsv([empty]);
    const lines = csv.slice(1).split("\n");
    expect(lines[1]).toBe(",,,,,,,,,,");
  });
});
