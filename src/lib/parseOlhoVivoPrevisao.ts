/**
 * Resposta típica GET /Previsao?codigoParada=&codigoLinha= (estrutura conforme orquestrador).
 */
export function formatPrevisaoChegada(
  data: unknown,
  lineCodeHint: string | undefined,
  codigoLinha: number,
): string {
  if (!data || typeof data !== "object") return "Resposta vazia ou inválida.";
  const root = data as Record<string, unknown>;
  const p = root.p;
  if (!p || typeof p !== "object") return "Sem dados de parada na resposta.";
  const parada = p as Record<string, unknown>;
  const nome = typeof parada.np === "string" ? parada.np : "Parada";
  const lines = parada.l;
  if (!Array.isArray(lines)) return `${nome}: sem linhas na previsão.`;

  const hint = lineCodeHint?.trim().toLowerCase() ?? "";
  let block: Record<string, unknown> | null = null;
  for (const item of lines) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const c = String(row.c ?? "").toLowerCase();
    const cl = Number(row.cl);
    if (hint && c === hint) {
      block = row;
      break;
    }
    if (Number.isFinite(cl) && cl === codigoLinha) {
      block = row;
      break;
    }
  }
  if (!block) block = lines[0] as Record<string, unknown>;

  const vs = block.vs;
  if (!Array.isArray(vs) || vs.length === 0) {
    return `${nome}: sem veículos com previsão para esta linha neste momento.`;
  }

  const parts: string[] = [`${nome}`];
  for (const v of vs) {
    if (!v || typeof v !== "object") continue;
    const o = v as Record<string, unknown>;
    const veh = o.p != null ? String(o.p) : "?";
    const t = o.t != null ? String(o.t) : "—";
    const ativo = o.a === true ? " (ativo)" : "";
    parts.push(`· Veículo ${veh}: previsão ${t}${ativo}`);
  }
  return parts.join("\n");
}
