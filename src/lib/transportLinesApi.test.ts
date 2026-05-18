import { describe, expect, it } from "vitest";

// Testa helpers espelhados na edge (_shared/olho-vivo) — lógica pura replicada para CI sem Deno.
function mapOlhoVivoLine(line: { cl: number; lt: string; tp: string; ts: string; sl: number }) {
  const lineCode = String(line.lt ?? "").trim();
  const sentido = line.sl === 1 ? `${line.tp} → ${line.ts}` : `${line.ts} → ${line.tp}`;
  const lineName = sentido.trim() || lineCode;
  const lineType = /linha\s*\d|metr[oô]/i.test(lineCode) ? "metro" : "bus";
  return {
    line_code: lineCode,
    line_name: lineName,
    line_type: lineType,
    sptrans_codigo_linha: line.cl,
  };
}

function dedupe(lines: ReturnType<typeof mapOlhoVivoLine>[]) {
  const byCode = new Map<string, ReturnType<typeof mapOlhoVivoLine>>();
  for (const mapped of lines) {
    if (!mapped.line_code) continue;
    const existing = byCode.get(mapped.line_code);
    if (!existing || mapped.line_name.length > existing.line_name.length) {
      byCode.set(mapped.line_code, mapped);
    }
  }
  return [...byCode.values()];
}

describe("transport line catalog mapping", () => {
  it("mapeia lt como line_code e monta nome com terminais", () => {
    const row = mapOlhoVivoLine({
      cl: 123,
      lt: "875A-10",
      tp: "Lapa",
      ts: "Metrô Sé",
      sl: 1,
    });
    expect(row.line_code).toBe("875A-10");
    expect(row.line_name).toBe("Lapa → Metrô Sé");
    expect(row.line_type).toBe("bus");
    expect(row.sptrans_codigo_linha).toBe(123);
  });

  it("deduplica variantes de sentido pela mesma sigla", () => {
    const rows = dedupe([
      mapOlhoVivoLine({ cl: 1, lt: "8000-10", tp: "A", ts: "B", sl: 1 }),
      mapOlhoVivoLine({ cl: 2, lt: "8000-10", tp: "C", ts: "D", sl: 0 }),
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0].line_code).toBe("8000-10");
  });
});
