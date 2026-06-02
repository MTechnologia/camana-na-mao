import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  bairroParaZona,
  ZONA_DESCONHECIDA,
  ZONAS_FILTRO,
  type ZonaVolumeOuDesconhecida,
} from "@/lib/regionMapping";

/**
 * HU-3.1 — Drill-down territorial Zona → Bairro → Rua.
 *
 * Hook que recebe a posição atual no drill-down (zona / bairro / rua) e
 * retorna:
 *   - Métricas do recorte: total, breakdown por tipo, taxa de resolução,
 *     score de criticidade (compatível com HU-1.3) e top 5 categorias.
 *   - Lista de itens do PRÓXIMO nível com suas contagens, para o usuário
 *     clicar e descer.
 *
 * Estrutura hierárquica:
 *   sem zona  → mostra zonas (5 de SP + "Não informada")
 *   com zona  → mostra bairros dentro da zona
 *   com bairro→ mostra ruas dentro do bairro
 *   com rua   → mostra apenas as métricas (folha)
 */

export type DrillLevel = "zona" | "bairro" | "rua";

export interface DrillPosition {
  zona?: ZonaVolumeOuDesconhecida | null;
  bairro?: string | null;
  rua?: string | null;
}

export interface DrillNextItem {
  /** Identificador exibido (nome da zona, bairro ou rua). */
  label: string;
  count: number;
  resolutionPct: number;
}

export interface DrillCategoryItem {
  category: string;
  count: number;
}

export interface TerritorialDrillStats {
  /** Nível em que estamos (o que está mostrando). */
  currentLevel: DrillLevel;
  /** Próximo nível possível, ou null se já estamos na folha (rua). */
  nextLevel: DrillLevel | null;
  /** KPIs do recorte atual. */
  total: number;
  urbano: number;
  transporte: number;
  avaliacao: number;
  resolved: number;
  resolutionPct: number;
  /** Score de criticidade 0-100 (igual ao HU-1.3). */
  criticidadeScore: number;
  /** Componentes do score: % negativo, % crítico, # padrões agrupados. */
  scoreBreakdown: {
    negativePct: number;
    criticalPct: number;
    patternProxy: number;
  };
  /** Lista do próximo nível para o usuário clicar (ordenada por count desc). */
  nextItems: DrillNextItem[];
  /** Top 5 categorias do recorte atual. */
  topCategories: DrillCategoryItem[];
}

const EMPTY_STATS: TerritorialDrillStats = {
  currentLevel: "zona",
  nextLevel: "zona",
  total: 0,
  urbano: 0,
  transporte: 0,
  avaliacao: 0,
  resolved: 0,
  resolutionPct: 0,
  criticidadeScore: 0,
  scoreBreakdown: { negativePct: 0, criticalPct: 0, patternProxy: 0 },
  nextItems: [],
  topCategories: [],
};

interface RawReport {
  source: "urbano" | "transporte" | "avaliacao";
  category: string;
  zone: ZonaVolumeOuDesconhecida;
  neighborhood: string;
  street: string;
  isResolved: boolean;
  isNegative: boolean;
  isCritical: boolean;
}

const PAGE_SIZE = 1000;
const MAX_PAGES = 5;

function safe(value: unknown, fallback = "Não informado"): string {
  const text = (value as string | null | undefined)?.toString().trim();
  return text && text.length > 0 ? text : fallback;
}

function isNegativeSentiment(value: unknown): boolean {
  const s = (value as string | null | undefined)?.toString().toLowerCase();
  return !!s && s.includes("negativ");
}

function isCriticalSeverity(value: unknown): boolean {
  const s = (value as string | null | undefined)?.toString().toLowerCase();
  if (!s) return false;
  return s.includes("crit") || s.includes("crít") || s.includes("alto") || s === "alta";
}

function isResolvedStatus(value: unknown): boolean {
  return (value as string | null | undefined)?.toString().toLowerCase() === "resolved";
}

async function fetchUrban(): Promise<RawReport[]> {
  const out: RawReport[] = [];
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const { data, error } = await supabase
      .from("urban_reports")
      .select(
        "category, neighborhood, street, status, severity, ai_classification, latitude, longitude",
      )
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    if (error) throw error;
    const rows = (data ?? []) as Array<{
      category: string | null;
      neighborhood: string | null;
      street: string | null;
      status: string | null;
      severity: string | null;
      ai_classification: { sentiment?: string } | null;
      latitude: number | null;
      longitude: number | null;
    }>;
    rows.forEach((r) => {
      const region = safe(r.neighborhood, "Não informada");
      out.push({
        source: "urbano",
        category: safe(r.category, "Sem categoria"),
        // Zona priorizada por lat/lng (mais preciso); cai em keywords se coords ausentes.
        zone: bairroParaZona(region === "Não informada" ? "" : region, r.latitude, r.longitude),
        neighborhood: region,
        street: safe(r.street, "Não informada"),
        isResolved: isResolvedStatus(r.status),
        isNegative: isNegativeSentiment(r.ai_classification?.sentiment),
        isCritical: isCriticalSeverity(r.severity),
      });
    });
    if (rows.length < PAGE_SIZE) break;
  }
  return out;
}

async function fetchTransport(): Promise<RawReport[]> {
  const out: RawReport[] = [];
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const { data, error } = await supabase
      .from("transport_reports")
      .select("report_type, sub_category, location, stop_location, status, severity, ai_sentiment")
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    if (error) throw error;
    const rows = (data ?? []) as Array<{
      report_type: string | null;
      sub_category: string | null;
      location: string | null;
      stop_location: string | null;
      status: string | null;
      severity: string | null;
      ai_sentiment: string | null;
    }>;
    rows.forEach((r) => {
      const region = safe(r.location || r.stop_location, "Não informada");
      out.push({
        source: "transporte",
        category: safe(r.sub_category || r.report_type, "Sem categoria"),
        zone: bairroParaZona(region === "Não informada" ? "" : region),
        neighborhood: region,
        // transport_reports não tem campo de "rua" — não duplicamos o bairro aqui
        // para evitar inflar a lista do drill rua com nomes de bairros.
        street: "Não informada",
        isResolved: isResolvedStatus(r.status),
        isNegative: isNegativeSentiment(r.ai_sentiment),
        isCritical: isCriticalSeverity(r.severity),
      });
    });
    if (rows.length < PAGE_SIZE) break;
  }
  return out;
}

async function fetchService(): Promise<RawReport[]> {
  const out: RawReport[] = [];
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const { data, error } = await supabase
      .from("service_ratings")
      .select("public_services(service_type, district, address, latitude, longitude)")
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    if (error) throw error;
    const rows = (data ?? []) as Array<{
      public_services:
        | {
            service_type: string | null;
            district: string | null;
            address: string | null;
            latitude: number | null;
            longitude: number | null;
          }
        | {
            service_type: string | null;
            district: string | null;
            address: string | null;
            latitude: number | null;
            longitude: number | null;
          }[]
        | null;
    }>;
    rows.forEach((r) => {
      const svc = Array.isArray(r.public_services) ? r.public_services[0] : r.public_services;
      const region = safe(svc?.district, "Não informada");
      out.push({
        source: "avaliacao",
        category: safe(svc?.service_type, "Sem categoria"),
        // Zona priorizada por lat/lng do equipamento público
        zone: bairroParaZona(
          region === "Não informada" ? "" : region,
          svc?.latitude,
          svc?.longitude,
        ),
        neighborhood: region,
        street: safe(svc?.address, "Não informada"),
        // service_ratings não tem status nem severity nem sentiment relevantes aqui.
        isResolved: false,
        isNegative: false,
        isCritical: false,
      });
    });
    if (rows.length < PAGE_SIZE) break;
  }
  return out;
}

function levelOf(pos: DrillPosition): DrillLevel {
  if (pos.rua) return "rua";
  if (pos.bairro) return "bairro";
  return "zona";
}

function nextLevelOf(level: DrillLevel): DrillLevel | null {
  if (level === "zona") return "bairro";
  if (level === "bairro") return "rua";
  return null;
}

function inScope(report: RawReport, pos: DrillPosition): boolean {
  if (pos.zona && report.zone !== pos.zona) return false;
  if (pos.bairro && report.neighborhood !== pos.bairro) return false;
  if (pos.rua && report.street !== pos.rua) return false;
  return true;
}

function computeCriticidadeScore(
  total: number,
  negative: number,
  critical: number,
  patternProxy: number,
): {
  score: number;
  breakdown: { negativePct: number; criticalPct: number; patternProxy: number };
} {
  const negativePct = total > 0 ? Math.round((negative / total) * 100) : 0;
  const criticalPct = total > 0 ? Math.round((critical / total) * 100) : 0;
  // Volume = 100 (vista local "satura"); padrões aproximados por # categorias distintas com muitos relatos
  const volumeScore = total > 0 ? 100 : 0;
  const score = Math.round(
    0.25 * volumeScore +
      0.25 * negativePct +
      0.25 * criticalPct +
      0.25 * Math.min(100, patternProxy),
  );
  return {
    score: Math.max(0, Math.min(100, score)),
    breakdown: { negativePct, criticalPct, patternProxy: Math.min(100, patternProxy) },
  };
}

export function aggregate(records: RawReport[], pos: DrillPosition): TerritorialDrillStats {
  const currentLevel = levelOf(pos);
  const nextLevel = nextLevelOf(currentLevel);

  const scoped = records.filter((r) => inScope(r, pos));

  // KPIs
  let urbano = 0;
  let transporte = 0;
  let avaliacao = 0;
  let resolved = 0;
  let negative = 0;
  let critical = 0;
  const categoryCounts = new Map<string, number>();
  scoped.forEach((r) => {
    if (r.source === "urbano") urbano += 1;
    else if (r.source === "transporte") transporte += 1;
    else avaliacao += 1;
    if (r.isResolved) resolved += 1;
    if (r.isNegative) negative += 1;
    if (r.isCritical) critical += 1;
    categoryCounts.set(r.category, (categoryCounts.get(r.category) || 0) + 1);
  });
  const total = scoped.length;

  // Top 5 categorias
  const topCategories: DrillCategoryItem[] = Array.from(categoryCounts.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // patternProxy: número de categorias distintas com > 5 relatos no recorte (sinal de recorrência)
  const patternProxy = Array.from(categoryCounts.values()).filter((c) => c > 5).length * 20;
  const { score, breakdown } = computeCriticidadeScore(total, negative, critical, patternProxy);

  // Próximo nível
  const nextItems: DrillNextItem[] = [];
  // Quando estamos na raiz (zona nem selecionada), o próximo passo
  // é "selecionar uma zona" — semanticamente "zona", não "bairro".
  // Isso ajusta o label exibido e o handleNextClick no componente.
  let effectiveNextLevel: DrillLevel | null =
    currentLevel === "zona" && !pos.zona ? "zona" : nextLevel;

  if (nextLevel) {
    const groupMap = new Map<string, { count: number; resolved: number }>();
    scoped.forEach((r) => {
      const key =
        nextLevel === "bairro" ? r.neighborhood : nextLevel === "rua" ? r.street : String(r.zone);
      const slot = groupMap.get(key) || { count: 0, resolved: 0 };
      slot.count += 1;
      if (r.isResolved) slot.resolved += 1;
      groupMap.set(key, slot);
    });

    if (currentLevel === "zona" && !pos.zona) {
      // Quando ainda não há zona selecionada, mostrar TODAS as zonas (mesmo as com 0)
      // para o usuário ver o panorama completo.
      const totalZoneMap = new Map<string, { count: number; resolved: number }>();
      records.forEach((r) => {
        const key = String(r.zone);
        const slot = totalZoneMap.get(key) || { count: 0, resolved: 0 };
        slot.count += 1;
        if (r.isResolved) slot.resolved += 1;
        totalZoneMap.set(key, slot);
      });
      ZONAS_FILTRO.forEach((z) => {
        const slot = totalZoneMap.get(String(z)) || { count: 0, resolved: 0 };
        nextItems.push({
          label: String(z),
          count: slot.count,
          resolutionPct: slot.count > 0 ? Math.round((slot.resolved / slot.count) * 100) : 0,
        });
      });
    } else {
      Array.from(groupMap.entries()).forEach(([label, info]) => {
        if (label === "Não informada" && info.count === 0) return;
        // No nível de RUA, "Não informada" significa "sem street preenchido"
        // — não é uma rua real, então não exibimos como opção clicável.
        if (nextLevel === "rua" && label === "Não informada") return;
        nextItems.push({
          label,
          count: info.count,
          resolutionPct: info.count > 0 ? Math.round((info.resolved / info.count) * 100) : 0,
        });
      });
    }

    nextItems.sort((a, b) => b.count - a.count);

    // Se estávamos descendo para rua mas não há ruas válidas, o bairro vira a folha:
    // o componente passa a mostrar "Sem detalhamento de rua disponível".
    if (nextLevel === "rua" && nextItems.length === 0) {
      effectiveNextLevel = null;
    }
  }

  return {
    currentLevel,
    nextLevel: effectiveNextLevel,
    total,
    urbano,
    transporte,
    avaliacao,
    resolved,
    resolutionPct: total > 0 ? Math.round((resolved / total) * 100) : 0,
    criticidadeScore: score,
    scoreBreakdown: breakdown,
    nextItems,
    topCategories,
  };
}

export function useTerritorialDrill(position: DrillPosition) {
  const [records, setRecords] = useState<RawReport[]>([]);
  const [stats, setStats] = useState<TerritorialDrillStats>(EMPTY_STATS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [urban, transport, service] = await Promise.all([
        fetchUrban(),
        fetchTransport(),
        fetchService(),
      ]);
      setRecords([...urban, ...transport, ...service]);
    } catch (err) {
      console.error("[useTerritorialDrill] fetch error", err);
      setError("Não foi possível carregar dados territoriais. Tente novamente.");
      setRecords([]);
      setRecords([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  const positionKey = useMemo(
    () => `${position.zona || ""}|${position.bairro || ""}|${position.rua || ""}`,
    [position.zona, position.bairro, position.rua],
  );

  useEffect(() => {
    setStats(aggregate(records, position));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [records, positionKey]);

  return { stats, isLoading, error, refresh: fetchAll };
}

export const __test__ = {
  aggregate,
  levelOf,
  nextLevelOf,
  inScope,
  computeCriticidadeScore,
  ZONA_DESCONHECIDA,
};
