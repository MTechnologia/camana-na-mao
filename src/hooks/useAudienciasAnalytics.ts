import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { localParaZona, type ZonaSP } from "@/lib/audienciaZonas";
import { formatLocalDate } from "@/lib/dateUtils";
import { useRealtimeRefresh } from "@/hooks/useRealtimeRefresh";

/**
 * HU-1.4 — Como gestor, quero visualizar engajamento em audiências no mesmo
 * painel para visão integrada.
 *
 * O app possui DUAS fontes de engajamento, que precisam ser somadas:
 *
 * 1. `audiencia_inscricoes` — "lembrete" simples (cidadão clicou pra ser
 *    notificado). Status pode ser "confirmada" (default no app) ou "inscrito".
 *    Não filtramos por status para incluir todas as variantes válidas.
 *
 * 2. `audiencia_participacoes` — inscrição EFETIVA via videoconferência
 *    (`tipo='videoconferencia'`) ou manifestação escrita (`tipo='escrito'`).
 *    Inserida via RPC `insert_audiencia_participacao`.
 *
 * O hook produz KPIs globais, breakdowns para gráficos e listas operacionais
 * (zero engajamento próximas, baixa ocupação, top 10).
 */

export interface AudienciasFilters {
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  /**
   * HU-5.2 — filtros adicionais. Categories não se aplicam a audiências
   * (não há "categoria de audiência" comparável a relatos urbanos). Regions
   * e zones são aplicadas ao campo `local` da audiência via mapeamento de
   * zona. Mantidos opcionais para compatibilidade com a interface comum.
   */
  categories?: string[];
  regions?: string[];
  zones?: import("@/lib/regionMapping").ZonaVolumeOuDesconhecida[];
  /** HU-14.5 — facet específico da aba Audiências. */
  facet?: import("@/lib/analyticsFilters").AudienciasFacet;
}

export interface BreakdownItem {
  label: string;
  count: number;
}

export interface TimelinePoint {
  date: string;
  inscricoes: number;
  audiencias: number;
}

export interface AudienciaRanking {
  id: string;
  titulo: string;
  ap_code: string | null;
  comissao: string | null;
  tema: string;
  data: string;
  inscricoes: number; // total combinado de engajamento
  lembretes: number;
  videoconferencias: number;
  escritas: number;
  vagas: number | null;
  ocupacaoPct: number | null;
  zona: string;
  /** Agendada com inscrições abertas e data hoje ou futura. */
  aberta: boolean;
}

export interface AudienciasStats {
  // KPIs globais
  totalInscricoes: number; // total combinado
  totalLembretes: number;
  totalVideoconferencias: number;
  totalEscritas: number;
  totalAudiencias: number;
  /** Agendadas, com inscrições abertas e data hoje ou futura (mesma regra do app cidadão). */
  audienciasAbertas: number;
  audienciasComInscricoes: number;
  pctComInscricoes: number; // 0-100
  ocupacaoMediaPct: number; // 0-100
  usuariosUnicos: number;

  // Cortes
  byComissao: BreakdownItem[];
  byTema: BreakdownItem[];
  byZona: BreakdownItem[];
  byTipoEngajamento: BreakdownItem[];
  timeline: TimelinePoint[];

  // Listas operacionais
  /** Todas as audiências do recorte (ordenadas por engajamento no aggregate). */
  allAudiencias: AudienciaRanking[];
  topAudiencias: AudienciaRanking[];
  zeroInscritosProximas: AudienciaRanking[];
  baixaOcupacaoProximas: AudienciaRanking[];
}

const EMPTY_STATS: AudienciasStats = {
  totalInscricoes: 0,
  totalLembretes: 0,
  totalVideoconferencias: 0,
  totalEscritas: 0,
  totalAudiencias: 0,
  audienciasAbertas: 0,
  audienciasComInscricoes: 0,
  pctComInscricoes: 0,
  ocupacaoMediaPct: 0,
  usuariosUnicos: 0,
  byComissao: [],
  byTema: [],
  byZona: [],
  byTipoEngajamento: [],
  timeline: [],
  allAudiencias: [],
  topAudiencias: [],
  zeroInscritosProximas: [],
  baixaOcupacaoProximas: [],
};

interface AudienciaRow {
  id: string;
  titulo: string;
  comissao: string | null;
  tema: string;
  data: string;
  local: string;
  ap_code: string | null;
  status: string;
  inscricoes_abertas: boolean | null;
  vagas_disponiveis: number | null;
}

interface InscricaoRow {
  audiencia_id: string;
  user_id: string;
}

interface ParticipacaoRow {
  audiencia_id: string;
  user_id: string;
  tipo: string;
}

const PAGE_SIZE = 1000;
const MAX_PAGES = 5;
const BAIXA_OCUPACAO_THRESHOLD = 0.25; // 25%
const PROXIMA_AUDIENCIA_DIAS = 7;

function toIsoDate(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return new Date(value).toISOString().slice(0, 10);
}

function safe(value: unknown, fallback: string): string {
  const text = (value as string | null | undefined)?.toString().trim();
  return text && text.length > 0 ? text : fallback;
}

async function fetchAudiencias(
  startDate: string | null,
  endDate: string | null,
): Promise<AudienciaRow[]> {
  const out: AudienciaRow[] = [];
  for (let page = 0; page < MAX_PAGES; page += 1) {
    let q = supabase
      .from("audiencias")
      .select(
        "id, titulo, comissao, tema, data, local, ap_code, status, inscricoes_abertas, vagas_disponiveis",
      )
      .order("data", { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    if (startDate) q = q.gte("data", startDate);
    if (endDate) q = q.lte("data", endDate);
    const { data, error } = await q;
    if (error) throw error;
    const rows = (data ?? []) as AudienciaRow[];
    rows.forEach((r) => out.push(r));
    if (rows.length < PAGE_SIZE) break;
  }
  return out;
}

async function fetchInscricoes(audienciaIds: string[]): Promise<InscricaoRow[]> {
  if (audienciaIds.length === 0) return [];
  const out: InscricaoRow[] = [];
  const CHUNK = 200;
  for (let i = 0; i < audienciaIds.length; i += CHUNK) {
    const slice = audienciaIds.slice(i, i + CHUNK);
    // Não filtramos por status: o app usa "confirmada" (lembrete) e
    // historicamente "inscrito" pode ter sido usado.
    const { data, error } = await supabase
      .from("audiencia_inscricoes")
      .select("audiencia_id, user_id")
      .in("audiencia_id", slice);
    if (error) throw error;
    (data ?? []).forEach((r) => out.push(r as InscricaoRow));
  }
  return out;
}

async function fetchParticipacoes(audienciaIds: string[]): Promise<ParticipacaoRow[]> {
  if (audienciaIds.length === 0) return [];
  const out: ParticipacaoRow[] = [];
  const CHUNK = 200;
  for (let i = 0; i < audienciaIds.length; i += CHUNK) {
    const slice = audienciaIds.slice(i, i + CHUNK);
    // `audiencia_participacoes` pode não estar nos types gerados — usamos
    // cast genérico via supabase.from(<string>).
    const { data, error } = await (supabase as unknown as {
      from: (table: string) => {
        select: (cols: string) => {
          in: (col: string, vals: string[]) => Promise<{ data: ParticipacaoRow[] | null; error: unknown }>;
        };
      };
    })
      .from("audiencia_participacoes")
      .select("audiencia_id, user_id, tipo")
      .in("audiencia_id", slice);
    if (error) {
      // Não bloqueamos o painel se a tabela não existir nesse ambiente —
      // só logamos e seguimos com 0 participações.
      console.warn("[useAudienciasAnalytics] audiencia_participacoes indisponível", error);
      return out;
    }
    (data ?? []).forEach((r) => out.push(r));
  }
  return out;
}

function ocupacao(inscritos: number, vagas: number | null): number | null {
  if (!vagas || vagas <= 0) return null;
  return Math.min(1, inscritos / vagas);
}

/** Alinhado a Audiencias.tsx / ChatMessageBubble — inscrições aceitas e data não passada. */
export function isAudienciaAberta(a: Pick<AudienciaRow, "data" | "status" | "inscricoes_abertas">, todayIso: string): boolean {
  const dataStr = a.data.slice(0, 10);
  if (dataStr < todayIso) return false;
  if (a.inscricoes_abertas === false) return false;
  const status = (a.status ?? "").toLowerCase().trim();
  if (/realizada|cancelada|adiada|encerrad/.test(status)) return false;
  return status === "agendada" || status === "scheduled" || status === "";
}

function isProximaDentroDe(dataISO: string, dias: number): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dataISO);
  if (Number.isNaN(target.getTime())) return false;
  const diffMs = target.getTime() - today.getTime();
  if (diffMs < 0) return false;
  return diffMs <= dias * 24 * 60 * 60 * 1000;
}

function rank(map: Map<string, number>, limit = 10): BreakdownItem[] {
  return Array.from(map.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export function aggregate(
  audiencias: AudienciaRow[],
  inscricoes: InscricaoRow[],
  participacoes: ParticipacaoRow[],
): AudienciasStats {
  if (audiencias.length === 0 && inscricoes.length === 0 && participacoes.length === 0) {
    return EMPTY_STATS;
  }

  // Index por audiência: { lembretes, video, escrita }
  const porAudiencia = new Map<
    string,
    { lembretes: number; video: number; escrita: number; users: Set<string> }
  >();

  inscricoes.forEach((i) => {
    const slot = porAudiencia.get(i.audiencia_id) || {
      lembretes: 0,
      video: 0,
      escrita: 0,
      users: new Set<string>(),
    };
    slot.lembretes += 1;
    slot.users.add(i.user_id);
    porAudiencia.set(i.audiencia_id, slot);
  });

  participacoes.forEach((p) => {
    const slot = porAudiencia.get(p.audiencia_id) || {
      lembretes: 0,
      video: 0,
      escrita: 0,
      users: new Set<string>(),
    };
    if (p.tipo === "videoconferencia") slot.video += 1;
    else if (p.tipo === "escrito") slot.escrita += 1;
    slot.users.add(p.user_id);
    porAudiencia.set(p.audiencia_id, slot);
  });

  const usuariosUnicos = new Set<string>();
  inscricoes.forEach((i) => usuariosUnicos.add(i.user_id));
  participacoes.forEach((p) => usuariosUnicos.add(p.user_id));

  // Cortes
  const comissaoMap = new Map<string, number>();
  const temaMap = new Map<string, number>();
  const zonaMap = new Map<string, number>();
  const timelineMap = new Map<string, { inscricoes: number; audiencias: number }>();

  let totalInscricoes = 0;
  let totalLembretes = 0;
  let totalVideo = 0;
  let totalEscritas = 0;
  let audienciasComInscricoes = 0;
  let somaOcupacaoPct = 0;
  let countOcupacao = 0;

  const rankings: AudienciaRanking[] = [];
  const todayIso = formatLocalDate(new Date()) ?? new Date().toISOString().slice(0, 10);
  let audienciasAbertas = 0;

  audiencias.forEach((a) => {
    if (isAudienciaAberta(a, todayIso)) audienciasAbertas += 1;
    const slot = porAudiencia.get(a.id);
    const lembretes = slot?.lembretes ?? 0;
    const video = slot?.video ?? 0;
    const escrita = slot?.escrita ?? 0;
    const totalEng = lembretes + video + escrita;

    totalInscricoes += totalEng;
    totalLembretes += lembretes;
    totalVideo += video;
    totalEscritas += escrita;
    if (totalEng > 0) audienciasComInscricoes += 1;

    const oc = ocupacao(totalEng, a.vagas_disponiveis);
    // Percentual inteiro por audiência (o mesmo exibido em ocupacaoPct). A média
    // é feita sobre estes inteiros — evita erro de ponto flutuante ao somar
    // frações (ex.: 0.01 + 0.06 = 0.06999… faria Math.round(3.4999…) cair p/ 3).
    const ocPct = oc !== null ? Math.round(oc * 100) : null;
    if (ocPct !== null) {
      somaOcupacaoPct += ocPct;
      countOcupacao += 1;
    }

    const comissao = safe(a.comissao, "Sem comissão");
    comissaoMap.set(comissao, (comissaoMap.get(comissao) || 0) + totalEng);

    const tema = safe(a.tema, "Sem tema");
    temaMap.set(tema, (temaMap.get(tema) || 0) + totalEng);

    const zona = localParaZona(a.local) as ZonaSP;
    zonaMap.set(zona, (zonaMap.get(zona) || 0) + totalEng);

    const day = a.data.slice(0, 10);
    const ts = timelineMap.get(day) || { inscricoes: 0, audiencias: 0 };
    ts.inscricoes += totalEng;
    ts.audiencias += 1;
    timelineMap.set(day, ts);

    rankings.push({
      id: a.id,
      titulo: a.titulo,
      ap_code: a.ap_code,
      comissao: a.comissao,
      tema: a.tema,
      data: a.data,
      inscricoes: totalEng,
      lembretes,
      videoconferencias: video,
      escritas: escrita,
      vagas: a.vagas_disponiveis,
      ocupacaoPct: ocPct,
      zona,
      aberta: isAudienciaAberta(a, todayIso),
    });
  });

  const allAudiencias = [...rankings].sort((a, b) => b.data.localeCompare(a.data));

  const topAudiencias = [...rankings]
    .sort((a, b) => b.inscricoes - a.inscricoes)
    .slice(0, 10);

  const zeroInscritosProximas = rankings
    .filter((r) => r.inscricoes === 0 && isProximaDentroDe(r.data, PROXIMA_AUDIENCIA_DIAS))
    .sort((a, b) => a.data.localeCompare(b.data))
    .slice(0, 20);

  const baixaOcupacaoProximas = rankings
    .filter(
      (r) =>
        r.ocupacaoPct !== null &&
        r.ocupacaoPct < BAIXA_OCUPACAO_THRESHOLD * 100 &&
        r.inscricoes > 0 &&
        isProximaDentroDe(r.data, PROXIMA_AUDIENCIA_DIAS),
    )
    .sort((a, b) => (a.ocupacaoPct || 0) - (b.ocupacaoPct || 0))
    .slice(0, 20);

  const ocupacaoMediaPct =
    countOcupacao > 0 ? Math.round(somaOcupacaoPct / countOcupacao) : 0;

  const byTipoEngajamento: BreakdownItem[] = [
    { label: "Lembrete", count: totalLembretes },
    { label: "Videoconferência", count: totalVideo },
    { label: "Manifestação escrita", count: totalEscritas },
  ]
    .filter((i) => i.count > 0)
    .sort((a, b) => b.count - a.count);

  return {
    totalInscricoes,
    totalLembretes,
    totalVideoconferencias: totalVideo,
    totalEscritas,
    totalAudiencias: audiencias.length,
    audienciasAbertas,
    audienciasComInscricoes,
    pctComInscricoes:
      audiencias.length > 0
        ? Math.round((audienciasComInscricoes / audiencias.length) * 100)
        : 0,
    ocupacaoMediaPct,
    usuariosUnicos: usuariosUnicos.size,
    byComissao: rank(comissaoMap),
    byTema: rank(temaMap),
    byZona: rank(zonaMap),
    byTipoEngajamento,
    timeline: Array.from(timelineMap.entries())
      .map(([date, v]) => ({ date, ...v }))
      .sort((a, b) => a.date.localeCompare(b.date)),
    allAudiencias,
    topAudiencias,
    zeroInscritosProximas,
    baixaOcupacaoProximas,
  };
}

export function useAudienciasAnalytics(filters: AudienciasFilters) {
  const [stats, setStats] = useState<AudienciasStats>(EMPTY_STATS);
  // HU-5.3 — refetch silencioso (initial vs realtime).
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const periodKey = useMemo(() => {
    return `${toIsoDate(filters.startDate) || ""}|${toIsoDate(filters.endDate) || ""}`;
  }, [filters.startDate, filters.endDate]);

  const fetchData = useCallback(async () => {
    setError(null);
    setIsRefreshing(true);
    try {
      const startDate = toIsoDate(filters.startDate);
      const endDate = toIsoDate(filters.endDate);
      const audienciasRaw = await fetchAudiencias(startDate, endDate);
      // HU-14.5 — aplicar facet (comissões + status) ANTES de buscar inscrições
      // para reduzir volume de dados consultados.
      const facet = filters.facet;
      const audiencias = facet
        ? audienciasRaw.filter((a) => {
            if (facet.comissoes && facet.comissoes.length > 0) {
              const c = (a.comissao ?? "").toLowerCase().trim();
              if (!c) return false;
              const wanted = new Set(facet.comissoes.map((s) => s.toLowerCase()));
              if (!wanted.has(c)) return false;
            }
            if (facet.statuses && facet.statuses.length > 0) {
              const s = (a.status ?? "").toLowerCase().trim();
              const wanted = new Set(facet.statuses.map((x) => x.toLowerCase()));
              if (!wanted.has(s)) return false;
            }
            return true;
          })
        : audienciasRaw;
      const ids = audiencias.map((a) => a.id);
      const [inscricoes, participacoes] = await Promise.all([
        fetchInscricoes(ids),
        fetchParticipacoes(ids),
      ]);
      setStats(aggregate(audiencias, inscricoes, participacoes));
      setLastUpdate(new Date());
    } catch (err) {
      console.error("[useAudienciasAnalytics] fetch error", err);
      setError("Não foi possível carregar o engajamento em audiências. Tente novamente.");
      // HU-5.3 — não resetar stats: mantém último resultado bom visível.
    } finally {
      setIsInitialLoading(false);
      setIsRefreshing(false);
    }
    // HU-14.5 — facet serializado para estabilizar identidade do objeto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.startDate, filters.endDate, JSON.stringify(filters.facet)]);

  useEffect(() => {
    void fetchData();
  }, [fetchData, periodKey]);

  // HU-5.3 — realtime: novas audiências, inscrições e participações.
  useRealtimeRefresh(REALTIME_TABLES, fetchData);

  return {
    stats,
    isLoading: isInitialLoading,
    isInitialLoading,
    isRefreshing,
    error,
    refresh: fetchData,
    lastUpdate,
  };
}

// HU-5.3 — tabelas observadas (referência estável).
const REALTIME_TABLES = [
  "audiencias",
  "audiencia_inscricoes",
  "audiencia_participacoes",
] as const;

export const __test__ = {
  aggregate,
  ocupacao,
  isAudienciaAberta,
  isProximaDentroDe,
  rank,
};
