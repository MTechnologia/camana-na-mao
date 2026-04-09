/**
 * Resposta GET /Parada/Buscar?termosBusca=... (Olho Vivo).
 * Campos usuais: cp (código parada), np (nome), ed (endereço), py/px (coordenadas).
 */
export type OlhoVivoParadaOption = {
  cp: number;
  np: string;
  ed: string;
};

function unwrapArray(data: unknown): unknown[] {
  if (data == null) return [];
  if (typeof data === "string") {
    try {
      return unwrapArray(JSON.parse(data));
    } catch {
      return [];
    }
  }
  if (Array.isArray(data)) return data;
  if (typeof data === "object") {
    const o = data as Record<string, unknown>;
    for (const k of ["value", "data", "p", "paradas", "items", "results"]) {
      const v = o[k];
      if (Array.isArray(v)) return v;
    }
  }
  return [];
}

function readCp(row: Record<string, unknown>): number | null {
  const raw = row.cp ?? row.Cp ?? row.codigoParada ?? row.CodigoParada;
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string" && /^\d+$/.test(raw)) return parseInt(raw, 10);
  return null;
}

export function parseParadaBuscar(data: unknown): OlhoVivoParadaOption[] {
  const arr = unwrapArray(data);
  const out: OlhoVivoParadaOption[] = [];
  for (const item of arr) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const cp = readCp(row);
    if (cp == null) continue;
    const np = String(row.np ?? row.Np ?? "");
    const ed = String(row.ed ?? row.Ed ?? "");
    out.push({ cp, np, ed });
  }
  return out;
}
