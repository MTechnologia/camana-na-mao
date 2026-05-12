import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { bairroParaZona, ZONA_DESCONHECIDA } from "@/lib/regionMapping";

/**
 * HU-3.2 — Drill-down hierárquico multi-dimensional.
 *
 * Suporta 4 eixos, todos com 3 níveis + lista final:
 *
 *   Categoria   : Tipo (Urbano/Transporte/Avaliação) → Categoria → Bairro → Lista de relatos
 *   Tempo       : Ano → Mês → Dia → Lista de relatos
 *   Status/SLA  : Status → Severidade → Bairro → Lista de relatos
 *   Audiência   : Audiência → Status da inscrição → Bairro do inscrito → Lista de inscritos
 *
 * Para Categoria/Tempo/Status reusamos `RawReport` (urban + transport + service).
 * Para Audiência carregamos `RawSubscription` separado (inscrições + participações)
 * com o bairro do endereço primário do usuário.
 *
 * O hook retorna `MultiDrillStats` com KPIs do recorte, lista de itens do
 * próximo nível e — quando estamos na folha — a lista detalhada de relatos
 * ou inscritos.
 */

export type DrillDimension = "categoria" | "tempo" | "status" | "audiencia";

export interface MultiDrillPosition {
  dimension: DrillDimension;
  /** Nível 1: Tipo / Ano / Status / Audiencia (id ou título). */
  level1?: string | null;
  /** Nível 2: Categoria / Mês (1-12) / Severidade / Status da inscrição. */
  level2?: string | null;
  /** Nível 3: Bairro / Dia (1-31) / Bairro / Bairro do inscrito. */
  level3?: string | null;
}

export interface MultiDrillItem {
  /** Texto exibido (label do agrupamento). */
  label: string;
  /** Identificador interno (ex: id de audiência, "2026-04" para mês). Para a maioria dos casos = label. */
  value: string;
  count: number;
  resolutionPct: number;
  criticalPct: number;
}

export interface MultiDrillReportRecord {
  kind: "report";
  id: string;
  source: "urbano" | "transporte" | "avaliacao";
  title: string;
  subtitle: string;
  status: string;
  severity: string;
  createdAt: string;
}

export interface MultiDrillSubscriptionRecord {
  kind: "subscription";
  id: string;
  audienciaTitle: string;
  inscricaoStatus: string;
  bairro: string;
  userName: string;
  userEmail: string;
  createdAt: string;
}

export type MultiDrillRecord = MultiDrillReportRecord | MultiDrillSubscriptionRecord;

export interface MultiDrillStats {
  /** Nível atual: 1, 2 ou 3 — quando >=4 estamos na folha (lista detalhada). */
  currentLevel: 1 | 2 | 3 | 4;
  /** True quando já chegamos na folha (lista de relatos/inscritos). */
  isLeaf: boolean;
  /** KPIs do recorte. */
  total: number;
  resolved: number;
  resolutionPct: number;
  critical: number;
  criticalPct: number;
  /** Lista do próximo nível para clicar e descer. Vazia quando isLeaf. */
  nextItems: MultiDrillItem[];
  /** Registros detalhados do recorte. Só populado quando isLeaf. */
  records: MultiDrillRecord[];
}

const EMPTY_STATS: MultiDrillStats = {
  currentLevel: 1,
  isLeaf: false,
  total: 0,
  resolved: 0,
  resolutionPct: 0,
  critical: 0,
  criticalPct: 0,
  nextItems: [],
  records: [],
};

interface RawReport {
  id: string;
  source: "urbano" | "transporte" | "avaliacao";
  category: string;
  type: "Urbano" | "Transporte" | "Avaliação";
  neighborhood: string;
  status: string;
  severity: string;
  createdAt: string;
  /** Para a folha de relatos. */
  title: string;
  subtitle: string;
  /** Computados a partir do status/severity. */
  isResolved: boolean;
  isCritical: boolean;
}

interface RawSubscription {
  id: string;
  audienciaId: string;
  audienciaTitle: string;
  inscricaoStatus: string;
  userId: string;
  userName: string;
  userEmail: string;
  bairro: string;
  createdAt: string;
}

const PAGE_SIZE = 1000;
const MAX_PAGES = 5;

const MES_NOMES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

function safe(value: unknown, fallback = "Não informado"): string {
  const text = (value as string | null | undefined)?.toString().trim();
  return text && text.length > 0 ? text : fallback;
}

function isResolvedStatus(value: unknown): boolean {
  const s = (value as string | null | undefined)?.toString().toLowerCase() ?? "";
  return s === "resolved" || s === "resolvido" || s === "concluido" || s === "concluído";
}

function isCriticalSeverity(value: unknown): boolean {
  const s = (value as string | null | undefined)?.toString().toLowerCase();
  if (!s) return false;
  return s.includes("crit") || s.includes("crít") || s.includes("alto") || s === "alta";
}

function normalizeStatus(value: unknown): string {
  const s = (value as string | null | undefined)?.toString().toLowerCase().trim() ?? "";
  if (!s) return "Pendente";
  if (s === "resolved" || s === "resolvido" || s === "concluido" || s === "concluído") return "Resolvido";
  if (s === "rejected" || s === "rejeitado") return "Rejeitado";
  if (s.includes("andamento") || s === "in_progress") return "Em andamento";
  if (s === "pending" || s.includes("pendente")) return "Pendente";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function normalizeSeverity(value: unknown): string {
  const s = (value as string | null | undefined)?.toString().toLowerCase().trim() ?? "";
  if (!s) return "Sem classificação";
  if (s.includes("crit") || s.includes("crít")) return "Crítico";
  if (s.includes("alto") || s === "alta") return "Alto";
  if (s.includes("med") || s.includes("méd")) return "Médio";
  if (s.includes("bai") || s.includes("low")) return "Baixo";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function normalizeInscricaoStatus(value: unknown): string {
  const s = (value as string | null | undefined)?.toString().toLowerCase().trim() ?? "";
  if (!s || s === "confirmada" || s === "inscrito") return "Confirmada";
  if (s === "pendente") return "Pendente";
  if (s === "presente") return "Presente";
  if (s === "cancelada") return "Cancelada";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

async function fetchUrban(): Promise<RawReport[]> {
  const out: RawReport[] = [];
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const { data, error } = await supabase
      .from("urban_reports")
      .select("id, category, neighborhood, status, severity, description, created_at")
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    if (error) throw error;
    const rows = (data ?? []) as Array<{
      id: string;
      category: string | null;
      neighborhood: string | null;
      status: string | null;
      severity: string | null;
      description: string | null;
      created_at: string;
    }>;
    rows.forEach((r) => {
      out.push({
        id: r.id,
        source: "urbano",
        type: "Urbano",
        category: safe(r.category, "Sem categoria"),
        neighborhood: safe(r.neighborhood, "Não informada"),
        status: normalizeStatus(r.status),
        severity: normalizeSeverity(r.severity),
        createdAt: r.created_at,
        title: safe(r.category, "Relato urbano"),
        subtitle: safe(r.description, "").slice(0, 120),
        isResolved: isResolvedStatus(r.status),
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
      .select("id, report_type, sub_category, location, stop_location, status, severity, description, created_at")
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    if (error) throw error;
    const rows = (data ?? []) as Array<{
      id: string;
      report_type: string | null;
      sub_category: string | null;
      location: string | null;
      stop_location: string | null;
      status: string | null;
      severity: string | null;
      description: string | null;
      created_at: string;
    }>;
    rows.forEach((r) => {
      out.push({
        id: r.id,
        source: "transporte",
        type: "Transporte",
        category: safe(r.sub_category || r.report_type, "Sem categoria"),
        neighborhood: safe(r.location || r.stop_location, "Não informada"),
        status: normalizeStatus(r.status),
        severity: normalizeSeverity(r.severity),
        createdAt: r.created_at,
        title: safe(r.sub_category || r.report_type, "Relato de transporte"),
        subtitle: safe(r.description, "").slice(0, 120),
        isResolved: isResolvedStatus(r.status),
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
      .select("id, rating_text, created_at, public_services(service_type, district, name)")
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    if (error) throw error;
    const rows = (data ?? []) as Array<{
      id: string;
      rating_text: string | null;
      created_at: string;
      public_services:
        | { service_type: string | null; district: string | null; name: string | null }
        | { service_type: string | null; district: string | null; name: string | null }[]
        | null;
    }>;
    rows.forEach((r) => {
      const svc = Array.isArray(r.public_services) ? r.public_services[0] : r.public_services;
      out.push({
        id: r.id,
        source: "avaliacao",
        type: "Avaliação",
        category: safe(svc?.service_type, "Sem categoria"),
        neighborhood: safe(svc?.district, "Não informada"),
        // service_ratings não tem status/severity → tratamos como N/A
        status: "N/A",
        severity: "Sem classificação",
        createdAt: r.created_at,
        title: safe(svc?.name || svc?.service_type, "Avaliação de serviço"),
        subtitle: safe(r.rating_text, "").slice(0, 120),
        isResolved: false,
        isCritical: false,
      });
    });
    if (rows.length < PAGE_SIZE) break;
  }
  return out;
}

async function fetchSubscriptions(): Promise<RawSubscription[]> {
  // 1) Carregar audiencias (id, titulo)
  const { data: audiencias, error: audErr } = await supabase
    .from("audiencias")
    .select("id, titulo")
    .order("data", { ascending: false })
    .limit(500);
  if (audErr) throw audErr;
  const audMap = new Map<string, string>(
    (audiencias ?? []).map((a) => [a.id as string, (a.titulo as string) || "(sem título)"]),
  );
  if (audMap.size === 0) return [];

  const audienciaIds = Array.from(audMap.keys());

  // 2) Carregar inscrições e participações
  type Insc = { id: string; audiencia_id: string; user_id: string; status: string | null; created_at: string };
  const insc: Insc[] = [];

  const CHUNK = 200;
  for (let i = 0; i < audienciaIds.length; i += CHUNK) {
    const slice = audienciaIds.slice(i, i + CHUNK);
    const { data, error } = await supabase
      .from("audiencia_inscricoes")
      .select("id, audiencia_id, user_id, status, created_at")
      .in("audiencia_id", slice);
    if (error) throw error;
    (data ?? []).forEach((r) =>
      insc.push({
        id: r.id as string,
        audiencia_id: r.audiencia_id as string,
        user_id: r.user_id as string,
        status: r.status as string | null,
        created_at: r.created_at as string,
      }),
    );
  }

  // Tentar incluir participações (via cast porque pode não estar nos types)
  for (let i = 0; i < audienciaIds.length; i += CHUNK) {
    const slice = audienciaIds.slice(i, i + CHUNK);
    try {
      const { data, error } = await (supabase as unknown as {
        from: (n: string) => {
          select: (cols: string) => {
            in: (col: string, vals: string[]) => Promise<{ data: unknown[] | null; error: unknown }>;
          };
        };
      })
        .from("audiencia_participacoes")
        .select("id, audiencia_id, user_id, tipo, created_at")
        .in("audiencia_id", slice);
      if (error) continue;
      (data as Array<{ id: string; audiencia_id: string; user_id: string; tipo: string; created_at: string }> ?? []).forEach(
        (r) =>
          insc.push({
            id: r.id,
            audiencia_id: r.audiencia_id,
            user_id: r.user_id,
            // tratamos participações como "Presente" no contexto do drill (status efetivo)
            status: "presente",
            created_at: r.created_at,
          }),
      );
    } catch (e) {
      console.warn("[useMultiDrill] participações indisponíveis", e);
    }
  }

  if (insc.length === 0) return [];

  const userIds = Array.from(new Set(insc.map((i) => i.user_id)));

  // 3) Profiles
  const profileById = new Map<string, string>();
  for (let i = 0; i < userIds.length; i += CHUNK) {
    const slice = userIds.slice(i, i + CHUNK);
    const { data } = await supabase.from("profiles").select("id, full_name").in("id", slice);
    (data ?? []).forEach((p) => profileById.set(p.id as string, (p.full_name as string) || "(sem nome)"));
  }

  // 4) Endereços primários (bairro)
  const bairroByUser = new Map<string, string>();
  for (let i = 0; i < userIds.length; i += CHUNK) {
    const slice = userIds.slice(i, i + CHUNK);
    const { data } = await supabase
      .from("user_addresses")
      .select("user_id, neighborhood, is_primary")
      .in("user_id", slice);
    (data ?? []).forEach((a) => {
      const userId = a.user_id as string;
      const bairro = (a.neighborhood as string) || "Não informada";
      const isPrimary = a.is_primary as boolean;
      // Mantém o is_primary; senão sobrescreve com qualquer outro como fallback
      if (isPrimary || !bairroByUser.has(userId)) bairroByUser.set(userId, bairro);
    });
  }

  // 5) Emails via RPC admin (se permitido pelo perfil)
  const emailByUser = new Map<string, string>();
  try {
    const { data, error } = await supabase.rpc("admin_user_emails");
    if (!error && Array.isArray(data)) {
      (data as Array<{ user_id: string; email: string | null }>).forEach((r) => {
        if (r.email) emailByUser.set(r.user_id, r.email);
      });
    }
  } catch (e) {
    console.warn("[useMultiDrill] admin_user_emails indisponível", e);
  }

  return insc.map((i) => ({
    id: i.id,
    audienciaId: i.audiencia_id,
    audienciaTitle: audMap.get(i.audiencia_id) || "(audiência desconhecida)",
    inscricaoStatus: normalizeInscricaoStatus(i.status),
    userId: i.user_id,
    userName: profileById.get(i.user_id) || "(sem nome)",
    userEmail: emailByUser.get(i.user_id) || "—",
    bairro: bairroByUser.get(i.user_id) || "Não informada",
    createdAt: i.created_at,
  }));
}

// ---------- Aggregate functions per dimension ----------

function levelOf(pos: MultiDrillPosition): 1 | 2 | 3 | 4 {
  if (pos.level3) return 4;
  if (pos.level2) return 3;
  if (pos.level1) return 2;
  return 1;
}

function inScopeReport(r: RawReport, pos: MultiDrillPosition): boolean {
  switch (pos.dimension) {
    case "categoria":
      if (pos.level1 && r.type !== pos.level1) return false;
      if (pos.level2 && r.category !== pos.level2) return false;
      if (pos.level3 && r.neighborhood !== pos.level3) return false;
      return true;
    case "tempo": {
      if (!r.createdAt) return false;
      const d = new Date(r.createdAt);
      if (Number.isNaN(d.getTime())) return false;
      const ano = String(d.getFullYear());
      const mes = String(d.getMonth() + 1);
      const dia = String(d.getDate());
      if (pos.level1 && ano !== pos.level1) return false;
      if (pos.level2 && mes !== pos.level2) return false;
      if (pos.level3 && dia !== pos.level3) return false;
      return true;
    }
    case "status":
      if (pos.level1 && r.status !== pos.level1) return false;
      if (pos.level2 && r.severity !== pos.level2) return false;
      if (pos.level3 && r.neighborhood !== pos.level3) return false;
      return true;
    default:
      return false;
  }
}

function inScopeSubscription(s: RawSubscription, pos: MultiDrillPosition): boolean {
  if (pos.dimension !== "audiencia") return false;
  if (pos.level1 && s.audienciaId !== pos.level1) return false;
  if (pos.level2 && s.inscricaoStatus !== pos.level2) return false;
  if (pos.level3 && s.bairro !== pos.level3) return false;
  return true;
}

function buildReportItems(
  scoped: RawReport[],
  pos: MultiDrillPosition,
  level: 1 | 2 | 3 | 4,
): MultiDrillItem[] {
  if (level === 4) return [];
  const groupMap = new Map<string, { count: number; resolved: number; critical: number; label: string }>();
  scoped.forEach((r) => {
    let key = "";
    let label = "";
    switch (pos.dimension) {
      case "categoria":
        if (level === 1) {
          key = r.type;
          label = r.type;
        } else if (level === 2) {
          key = r.category;
          label = r.category;
        } else {
          key = r.neighborhood;
          label = r.neighborhood;
        }
        break;
      case "tempo": {
        const d = new Date(r.createdAt);
        if (Number.isNaN(d.getTime())) return;
        if (level === 1) {
          key = String(d.getFullYear());
          label = key;
        } else if (level === 2) {
          const m = d.getMonth() + 1;
          key = String(m);
          label = `${MES_NOMES[m - 1]} (${pos.level1})`;
        } else {
          key = String(d.getDate());
          label = `${pos.level3 ?? key}/${pos.level2 ?? "?"}`;
          // simplificamos: label = "DD" e o componente exibe contexto
          label = `Dia ${key}`;
        }
        break;
      }
      case "status":
        if (level === 1) {
          key = r.status;
          label = r.status;
        } else if (level === 2) {
          key = r.severity;
          label = r.severity;
        } else {
          key = r.neighborhood;
          label = r.neighborhood;
        }
        break;
    }
    const slot = groupMap.get(key) || { count: 0, resolved: 0, critical: 0, label };
    slot.count += 1;
    if (r.isResolved) slot.resolved += 1;
    if (r.isCritical) slot.critical += 1;
    groupMap.set(key, slot);
  });

  return Array.from(groupMap.entries())
    .map(([value, info]) => ({
      label: info.label,
      value,
      count: info.count,
      resolutionPct: info.count > 0 ? Math.round((info.resolved / info.count) * 100) : 0,
      criticalPct: info.count > 0 ? Math.round((info.critical / info.count) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);
}

function buildSubscriptionItems(
  scoped: RawSubscription[],
  level: 1 | 2 | 3 | 4,
): MultiDrillItem[] {
  if (level === 4) return [];
  const groupMap = new Map<string, { count: number; label: string }>();
  scoped.forEach((s) => {
    let key = "";
    let label = "";
    if (level === 1) {
      key = s.audienciaId;
      label = s.audienciaTitle;
    } else if (level === 2) {
      key = s.inscricaoStatus;
      label = s.inscricaoStatus;
    } else {
      key = s.bairro;
      label = s.bairro;
    }
    const slot = groupMap.get(key) || { count: 0, label };
    slot.count += 1;
    groupMap.set(key, slot);
  });
  return Array.from(groupMap.entries())
    .map(([value, info]) => ({
      label: info.label,
      value,
      count: info.count,
      resolutionPct: 0,
      criticalPct: 0,
    }))
    .sort((a, b) => b.count - a.count);
}

export function aggregate(
  reports: RawReport[],
  subscriptions: RawSubscription[],
  pos: MultiDrillPosition,
): MultiDrillStats {
  const currentLevel = levelOf(pos);
  const isLeaf = currentLevel === 4;

  if (pos.dimension === "audiencia") {
    const scoped = subscriptions.filter((s) => inScopeSubscription(s, pos));
    const total = scoped.length;
    const records: MultiDrillRecord[] = isLeaf
      ? scoped
          .slice(0, 200)
          .map((s) => ({
            kind: "subscription",
            id: s.id,
            audienciaTitle: s.audienciaTitle,
            inscricaoStatus: s.inscricaoStatus,
            bairro: s.bairro,
            userName: s.userName,
            userEmail: s.userEmail,
            createdAt: s.createdAt,
          }))
      : [];
    return {
      currentLevel,
      isLeaf,
      total,
      resolved: 0,
      resolutionPct: 0,
      critical: 0,
      criticalPct: 0,
      nextItems: buildSubscriptionItems(scoped, currentLevel),
      records,
    };
  }

  // categoria | tempo | status → reports
  const scoped = reports.filter((r) => inScopeReport(r, pos));
  const total = scoped.length;
  let resolved = 0;
  let critical = 0;
  scoped.forEach((r) => {
    if (r.isResolved) resolved += 1;
    if (r.isCritical) critical += 1;
  });

  const nextItems = buildReportItems(scoped, pos, currentLevel);
  const records: MultiDrillRecord[] = isLeaf
    ? scoped
        .slice(0, 200)
        .map((r) => ({
          kind: "report",
          id: r.id,
          source: r.source,
          title: r.title,
          subtitle: r.subtitle,
          status: r.status,
          severity: r.severity,
          createdAt: r.createdAt,
        }))
    : [];

  return {
    currentLevel,
    isLeaf,
    total,
    resolved,
    resolutionPct: total > 0 ? Math.round((resolved / total) * 100) : 0,
    critical,
    criticalPct: total > 0 ? Math.round((critical / total) * 100) : 0,
    nextItems,
    records,
  };
}

export function useMultiDrill(position: MultiDrillPosition) {
  const [reports, setReports] = useState<RawReport[]>([]);
  const [subscriptions, setSubscriptions] = useState<RawSubscription[]>([]);
  const [stats, setStats] = useState<MultiDrillStats>(EMPTY_STATS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [urban, transport, service, subs] = await Promise.all([
        fetchUrban(),
        fetchTransport(),
        fetchService(),
        fetchSubscriptions().catch((e) => {
          console.warn("[useMultiDrill] inscrições falharam", e);
          return [] as RawSubscription[];
        }),
      ]);
      setReports([...urban, ...transport, ...service]);
      setSubscriptions(subs);
    } catch (err) {
      console.error("[useMultiDrill] fetch error", err);
      setError("Não foi possível carregar dados. Tente novamente.");
      setReports([]);
      setSubscriptions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  const positionKey = useMemo(
    () => `${position.dimension}|${position.level1 || ""}|${position.level2 || ""}|${position.level3 || ""}`,
    [position.dimension, position.level1, position.level2, position.level3],
  );

  useEffect(() => {
    setStats(aggregate(reports, subscriptions, position));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reports, subscriptions, positionKey]);

  return { stats, isLoading, error, refresh: fetchAll };
}

export const __test__ = {
  aggregate,
  levelOf,
  inScopeReport,
  inScopeSubscription,
  normalizeStatus,
  normalizeSeverity,
  normalizeInscricaoStatus,
  ZONA_DESCONHECIDA,
  bairroParaZona,
};
