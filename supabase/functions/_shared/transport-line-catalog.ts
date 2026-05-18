import type { OlhoVivoLine } from "./olho-vivo.ts";
import { mapOlhoVivoLineToCatalog } from "./olho-vivo.ts";

export type CatalogLineRow = {
  id: string | null;
  line_code: string;
  line_name: string;
  line_type: string;
  sptrans_codigo_linha: number | null;
  direction_label?: string;
};

export type DbTransportLine = {
  id: string;
  line_code: string;
  line_name: string;
  line_type: string;
  sptrans_codigo_linha: number | null;
};

/** Remove sufixo oficial SPTrans (-10, -11, -31) para obter a sigla base. */
export function stripSptransLineSuffix(code: string): string {
  return String(code ?? "").trim().replace(/-(\d{1,2})$/i, "");
}

export function isCanonicalSptransLineCode(code: string): boolean {
  return /^.+-(\d{1,2})$/i.test(String(code ?? "").trim());
}

export function dbRowToCatalog(row: DbTransportLine): CatalogLineRow {
  return {
    id: row.id,
    line_code: row.line_code,
    line_name: row.line_name,
    line_type: row.line_type,
    sptrans_codigo_linha: row.sptrans_codigo_linha ?? null,
  };
}

/** Monta cláusula .or() do PostgREST para buscar por query e siglas Olho Vivo. */
export function buildCatalogSearchOr(query: string, olhoBases: string[]): string {
  const parts: string[] = [];
  const q = query.trim();
  if (q.length >= 2) {
    const safe = q.replace(/[%_,]/g, "");
    parts.push(`line_code.ilike.%${safe}%`);
    parts.push(`line_name.ilike.%${safe}%`);
  }
  for (const base of olhoBases) {
    const safeBase = base.replace(/[%_,]/g, "");
    if (!safeBase) continue;
    parts.push(`line_code.ilike.${safeBase}%`);
  }
  return [...new Set(parts)].join(",");
}

/**
 * Prefere variantes oficiais do catálogo (775F-10) em vez da sigla Olho Vivo (775F)
 * com nome de sentido (terminal → terminal).
 */
export function mergeOlhoWithCatalog(
  olhoLines: OlhoVivoLine[],
  dbRows: DbTransportLine[],
  limit: number,
): CatalogLineRow[] {
  const byCode = new Map<string, CatalogLineRow>();

  for (const row of dbRows) {
    byCode.set(row.line_code.toUpperCase(), dbRowToCatalog(row));
  }

  const basesFromOlho = new Set<string>();
  for (const raw of olhoLines) {
    const base = stripSptransLineSuffix(String(raw.lt ?? "").trim()).toUpperCase();
    if (base) basesFromOlho.add(base);
  }

  for (const base of basesFromOlho) {
    const variants = dbRows.filter((row) => {
      const code = row.line_code.toUpperCase();
      return code === base || code.startsWith(`${base}-`);
    });

    if (variants.length > 0) {
      for (const v of variants) {
        byCode.set(v.line_code.toUpperCase(), dbRowToCatalog(v));
      }
      continue;
    }

    const olhoForBase = olhoLines.filter(
      (l) => stripSptransLineSuffix(String(l.lt ?? "").trim()).toUpperCase() === base,
    );
    if (olhoForBase.length === 0) continue;

    const mapped = mapOlhoVivoLineToCatalog(olhoForBase[0]);
    byCode.set(mapped.line_code.toUpperCase(), {
      id: null,
      line_code: mapped.line_code,
      line_name: mapped.line_name,
      line_type: mapped.line_type,
      sptrans_codigo_linha: mapped.sptrans_codigo_linha,
      direction_label: mapped.direction_label,
    });
  }

  const sorted = [...byCode.values()].sort((a, b) =>
    a.line_code.localeCompare(b.line_code, "pt-BR"),
  );

  return sorted.slice(0, limit);
}

/** Resolve código digitado/retornado pela Olho Vivo para a variante canônica no catálogo. */
export function pickCanonicalLineCode(
  requestedCode: string,
  dbRows: DbTransportLine[],
): DbTransportLine | null {
  const code = requestedCode.trim();
  if (!code) return null;

  const exact = dbRows.find(
    (r) => r.line_code.toLowerCase() === code.toLowerCase(),
  );
  if (exact) return exact;

  const base = stripSptransLineSuffix(code).toLowerCase();
  const variants = dbRows.filter((r) => {
    const c = r.line_code.toLowerCase();
    return c === base || c.startsWith(`${base}-`);
  });

  const canonical = variants.filter((r) => isCanonicalSptransLineCode(r.line_code));
  if (canonical.length === 1) return canonical[0];
  if (variants.length === 1) return variants[0];

  const prefer10 = canonical.find((r) => /-10$/i.test(r.line_code));
  if (prefer10) return prefer10;

  return canonical[0] ?? variants[0] ?? null;
}
