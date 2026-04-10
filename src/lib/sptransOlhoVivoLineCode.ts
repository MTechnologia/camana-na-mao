/**
 * Resolve o código numérico Olho Vivo (`cl`) a partir da resposta de GET /Linha/Buscar.
 * A API pode devolver JSON em vários invólucros; propriedades podem ser `cl` ou `Cl`.
 */

export type LinePickContext = {
  line_code: string;
  line_name: string;
};

/** Normaliza a carga útil para um array de objetos de linha. */
export function normalizeLinhaBuscarPayload(data: unknown): Record<string, unknown>[] {
  const inner = unwrapLinhaBuscarOnce(data);
  if (!inner) return [];
  if (Array.isArray(inner)) {
    return inner.filter((x): x is Record<string, unknown> => x != null && typeof x === "object") as Record<
      string,
      unknown
    >[];
  }
  return [];
}

function unwrapLinhaBuscarOnce(data: unknown): unknown {
  if (data == null) return null;
  if (typeof data === "string") {
    const t = data.trim();
    if (!t) return null;
    try {
      return unwrapLinhaBuscarOnce(JSON.parse(t));
    } catch {
      return null;
    }
  }
  if (Array.isArray(data)) return data;
  if (typeof data === "object") {
    const o = data as Record<string, unknown>;
    for (const k of ["l", "linhas", "value", "data", "d", "result", "results", "items"]) {
      const v = o[k];
      if (Array.isArray(v)) return v;
    }
  }
  return null;
}

/** Lê `cl` num objeto de linha Olho Vivo. */
export function readClFromLinhaRow(row: Record<string, unknown>): number | null {
  const candidates = [row.cl, row.Cl, row.codigoLinha, row.CodigoLinha];
  for (const cl of candidates) {
    if (typeof cl === "number" && Number.isFinite(cl)) return cl;
    if (typeof cl === "string" && /^\d+$/.test(cl)) return parseInt(cl, 10);
  }
  return null;
}

/**
 * Escolhe o `cl` mais coerente com a linha selecionada no app (código e nome).
 * Se houver uma única linha, usa essa.
 */
export function pickClFromLinhaBuscar(data: unknown, line: LinePickContext): number | null {
  const rows = normalizeLinhaBuscarPayload(data);
  if (rows.length === 0) return null;
  if (rows.length === 1) return readClFromLinhaRow(rows[0]);

  const code = line.line_code.trim().toLowerCase();
  const codeMain = code.split("-")[0]?.trim() ?? code;

  let best: { cl: number; score: number } | null = null;
  for (const row of rows) {
    const cl = readClFromLinhaRow(row);
    if (cl == null) continue;
    const lt = String(row.lt ?? row.Lt ?? "").trim().toLowerCase();
    let score = 0;
    if (lt && lt === code) score = 100;
    else if (lt && code.startsWith(lt) && lt.length >= 2) score = 85;
    else if (lt && lt === codeMain) score = 70;
    else if (lt && codeMain.startsWith(lt)) score = 50;

    const nameHint = line.line_name.trim().toLowerCase();
    const tp = String(row.tp ?? row.Tp ?? "").toLowerCase();
    const ts = String(row.ts ?? row.Ts ?? "").toLowerCase();
    const frag = nameHint.length >= 4 ? nameHint.slice(0, 20) : "";
    if (frag && (tp.includes(frag) || ts.includes(frag))) {
      score = Math.max(score, 45);
    }

    if (!best || score > best.score) best = { cl, score };
  }

  if (best && best.score > 0) return best.cl;

  return readClFromLinhaRow(rows[0]);
}

/** @deprecated Prefer pickClFromLinhaBuscar — mantido para compatibilidade. */
export function extractFirstClFromLinhaBuscar(data: unknown): number | null {
  const rows = normalizeLinhaBuscarPayload(data);
  for (const row of rows) {
    const cl = readClFromLinhaRow(row);
    if (cl != null) return cl;
  }
  return null;
}

/** Normaliza código de linha para comparar com o campo `c` de /Posicao. */
export function normalizeLineCodeForMatch(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[\u2010-\u2015\u2212]/g, "-");
}

/**
 * GET /Posicao (agregado) devolve `l[]` com `c` (ex.: "8500-10"), `cl` e `vs`.
 * Quando Linha/Buscar não devolve resultados, dá para obter `cl` e o mesmo `vs` que Posicao/Linha.
 */
export function findLineInPosicaoAgregada(
  data: unknown,
  lineCode: string,
): { cl: number; snapshot: { hr: string; vs: unknown } } | null {
  if (!data || typeof data !== "object") return null;
  const root = data as Record<string, unknown>;
  const list = root.l;
  if (!Array.isArray(list)) return null;
  const target = normalizeLineCodeForMatch(lineCode);
  if (!target) return null;
  const hr = typeof root.hr === "string" ? root.hr : "";

  let matched: Record<string, unknown> | null = null;
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const c = normalizeLineCodeForMatch(String(row.c ?? ""));
    if (c && c === target) {
      matched = row;
      break;
    }
  }

  if (!matched) {
    matched = findUniquePrefixMatchInPosicaoL(list, lineCode);
  }

  if (!matched) return null;
  const cl = readClFromLinhaRow(matched);
  const vs = matched.vs;
  if (cl == null || vs === undefined) return null;
  return { cl, snapshot: { hr, vs } };
}

/** Se só existir uma linha com o mesmo prefixo numérico (ex.: 7000-*), usa essa. */
function findUniquePrefixMatchInPosicaoL(
  list: unknown[],
  lineCode: string,
): Record<string, unknown> | null {
  const prefix = lineCode.split("-")[0]?.trim().toLowerCase() ?? "";
  if (prefix.length < 2) return null;
  const hits: Record<string, unknown>[] = [];
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const c = normalizeLineCodeForMatch(String(row.c ?? ""));
    if (!c) continue;
    if (c === prefix || c.startsWith(`${prefix}-`)) {
      hits.push(row as Record<string, unknown>);
    }
  }
  if (hits.length === 1) return hits[0];
  return null;
}
