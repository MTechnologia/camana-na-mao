/**
 * Extrai marcadores (lat/lng) das respostas Olho Vivo para posição de veículos.
 * Documentação: `vs` com `py` (latitude), `px` (longitude), `p` (id do veículo), `ta` (instante);
 * ou `l[].vs` em /Posicao.
 */
export type OlhoVivoBusMarker = {
  /** Identificador estável do veículo na API (`p`) — necessário para animar entre atualizações. */
  id: string;
  lat: number;
  lng: number;
  label: string;
  /** ISO 8601 quando disponível (`ta`). */
  observedAt?: string;
};

export function parseBusPositionsFromOlhoVivo(data: unknown): OlhoVivoBusMarker[] {
  const out: OlhoVivoBusMarker[] = [];
  const seenIds = new Set<string>();

  const parseVs = (vs: unknown) => {
    if (!Array.isArray(vs)) return;
    let fallback = 0;
    for (const v of vs) {
      if (!v || typeof v !== "object") continue;
      const o = v as Record<string, unknown>;
      const px = Number(o.px);
      const py = Number(o.py);
      if (!Number.isFinite(px) || !Number.isFinite(py)) continue;
      const rawId = o.p;
      const id =
        rawId !== undefined && rawId !== null && String(rawId).length > 0
          ? String(rawId)
          : `_${fallback++}`;
      if (seenIds.has(id)) continue;
      seenIds.add(id);
      const ta = o.ta;
      const observedAt = typeof ta === "string" ? ta : undefined;
      out.push({
        id,
        lat: py,
        lng: px,
        label: `Ônibus ${id}${observedAt ? ` · ${formatTaShort(observedAt)}` : ""}`,
        observedAt,
      });
    }
  };

  if (!data || typeof data !== "object") return out;
  const root = data as Record<string, unknown>;

  if (Array.isArray(root.vs)) parseVs(root.vs);

  if (Array.isArray(root.l)) {
    for (const line of root.l) {
      if (!line || typeof line !== "object") continue;
      const lineObj = line as Record<string, unknown>;
      if (Array.isArray(lineObj.vs)) parseVs(lineObj.vs);
    }
  }

  return out;
}

function formatTaShort(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}
