import { describe, expect, it } from "vitest";

// Espelha supabase/functions/_shared/transport-line-catalog.ts
function stripSptransLineSuffix(code: string): string {
  return String(code ?? "")
    .trim()
    .replace(/-(\d{1,2})$/i, "");
}

function isCanonicalSptransLineCode(code: string): boolean {
  return /^.+-(\d{1,2})$/i.test(String(code ?? "").trim());
}

type DbRow = {
  id: string;
  line_code: string;
  line_name: string;
  line_type: string;
  sptrans_codigo_linha: number | null;
};

function mergeOlhoWithCatalog(olhoBases: string[], dbRows: DbRow[], limit: number) {
  const byCode = new Map<string, DbRow>();
  for (const base of olhoBases) {
    const variants = dbRows.filter((row) => {
      const code = row.line_code.toUpperCase();
      return code === base.toUpperCase() || code.startsWith(`${base.toUpperCase()}-`);
    });
    for (const v of variants) {
      byCode.set(v.line_code.toUpperCase(), v);
    }
  }
  return [...byCode.values()]
    .sort((a, b) => a.line_code.localeCompare(b.line_code))
    .slice(0, limit);
}

function pickCanonicalLineCode(requestedCode: string, dbRows: DbRow[]): DbRow | null {
  const code = requestedCode.trim();
  const exact = dbRows.find((r) => r.line_code.toLowerCase() === code.toLowerCase());
  if (exact) return exact;
  const base = stripSptransLineSuffix(code).toLowerCase();
  const variants = dbRows.filter((r) => {
    const c = r.line_code.toLowerCase();
    return c === base || c.startsWith(`${base}-`);
  });
  const canonical = variants.filter((r) => isCanonicalSptransLineCode(r.line_code));
  if (canonical.length === 1) return canonical[0];
  const prefer10 = canonical.find((r) => /-10$/i.test(r.line_code));
  if (prefer10) return prefer10;
  return canonical[0] ?? variants[0] ?? null;
}

describe("transportLineCatalog", () => {
  const gtfsRows: DbRow[] = [
    {
      id: "1",
      line_code: "775F-10",
      line_name: "Jd. Das Palmas - Hosp. Das Clínicas",
      line_type: "bus",
      sptrans_codigo_linha: null,
    },
    {
      id: "2",
      line_code: "775F-31",
      line_name: "Jd. Das Palmas - Pq. Do Povo",
      line_type: "bus",
      sptrans_codigo_linha: null,
    },
    {
      id: "3",
      line_code: "N833-11",
      line_name: "Term. Pinheiros - Ceasa",
      line_type: "bus",
      sptrans_codigo_linha: null,
    },
  ];

  it("expande sigla Olho Vivo 775F para variantes GTFS", () => {
    const merged = mergeOlhoWithCatalog(["775F"], gtfsRows, 10);
    expect(merged.map((r) => r.line_code)).toEqual(["775F-10", "775F-31"]);
    expect(merged[0].line_name).toContain("Clínicas");
  });

  it("resolve N833 para N833-11", () => {
    const picked = pickCanonicalLineCode("N833", gtfsRows);
    expect(picked?.line_code).toBe("N833-11");
    expect(picked?.line_name).toBe("Term. Pinheiros - Ceasa");
  });

  it("resolve 775F-10 exato", () => {
    const picked = pickCanonicalLineCode("775F-10", gtfsRows);
    expect(picked?.line_code).toBe("775F-10");
  });
});
