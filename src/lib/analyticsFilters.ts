/**
 * HU-14 — Catálogo de filtros analíticos.
 *
 * Define a separação entre:
 *
 *   - BaseAnalyticsFilters: dimensões transversais aplicadas em TODAS
 *     as abas (período, categoria, região, zona). Vêm do VolumeFilters
 *     global. Persistem quando o usuário muda de aba.
 *
 *   - Facets por aba: filtros específicos do contexto de cada aba.
 *     Renderizados por <CriticidadeFacetPicker>, <EficienciaFacetPicker>,
 *     <AudienciasFacetPicker>. Cada aba tem seu próprio facet state
 *     (não vaza para as outras).
 *
 * URL state: base é serializado em params planos (period, cat, region,
 * zone); facets usam prefixo por aba: `f.crit.severity=...`,
 * `f.efi.sla=...`, `f.aud.comissoes=...`. Quando o user troca de aba,
 * apenas o facet correspondente é mostrado/aplicado.
 */

import type { ZonaVolumeOuDesconhecida } from "@/lib/regionMapping";

// ===========================================================================
// 1) Filtros base (transversais)
// ===========================================================================

export interface BaseAnalyticsFilters {
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  categories: string[];
  regions: string[];
  zones: ZonaVolumeOuDesconhecida[];
}

export const EMPTY_BASE_FILTERS: BaseAnalyticsFilters = {
  startDate: null,
  endDate: null,
  categories: [],
  regions: [],
  zones: [],
};

/** Conta quantos filtros base estão ativos. Útil pra badge no UI. */
export function countActiveBaseFilters(f: BaseAnalyticsFilters): number {
  // Cada DIMENSÃO ativa conta como 1 (não cada valor selecionado), consistente
  // com os contadores de facet (countActiveCriticidadeFacet etc.) usados no badge.
  let n = 0;
  if (f.startDate || f.endDate) n += 1;
  if (f.categories.length > 0) n += 1;
  if (f.regions.length > 0) n += 1;
  if (f.zones.length > 0) n += 1;
  return n;
}

// ===========================================================================
// 2) Facets por aba
// ===========================================================================

/**
 * HU-14.3 — Facet de Criticidade/Diagnóstico.
 */
export type Severity = "low" | "medium" | "high" | "critical";

export interface CriticidadeFacet {
  /** Filtra por severidade do relato (campo `severity`). Vazio = todas. */
  severities?: Severity[];
  /** Mostra apenas relatos marcados como críticos. */
  criticalOnly?: boolean;
  /** Mostra apenas relatos com `active_consequences` (efeito em andamento). */
  hasActiveConsequences?: boolean;
}

export const EMPTY_CRITICIDADE_FACET: CriticidadeFacet = {};

export function countActiveCriticidadeFacet(f: CriticidadeFacet | undefined): number {
  if (!f) return 0;
  let n = 0;
  if (f.severities && f.severities.length > 0) n += 1;
  if (f.criticalOnly) n += 1;
  if (f.hasActiveConsequences) n += 1;
  return n;
}

/**
 * HU-14.4 — Facet de Eficiência (tempo de resposta).
 */
export type ReportStatus = "pending" | "in_progress" | "resolved" | "rejected";

export type SlaWindow = "24h" | "48h" | "7d" | "30d" | "all";

export interface EficienciaFacet {
  /** Janela de SLA: tempo máximo aceitável de resposta. */
  slaWindow?: SlaWindow;
  /** Status de relato a incluir. Vazio = todos. */
  statuses?: ReportStatus[];
  /** Filtra relatos com tempo de resposta entre [min, max] dias. */
  responseMinDays?: number;
  responseMaxDays?: number;
}

export const EMPTY_EFICIENCIA_FACET: EficienciaFacet = {};

export function countActiveEficienciaFacet(f: EficienciaFacet | undefined): number {
  if (!f) return 0;
  let n = 0;
  if (f.slaWindow && f.slaWindow !== "all") n += 1;
  if (f.statuses && f.statuses.length > 0) n += 1;
  if (f.responseMinDays != null || f.responseMaxDays != null) n += 1;
  return n;
}

/**
 * HU-14.5 — Facet de Audiências.
 */
export type AudienciaStatus = "agendada" | "realizada" | "cancelada" | "adiada";

export interface AudienciasFacet {
  /** IDs/nomes das comissões a filtrar. Vazio = todas. */
  comissoes?: string[];
  /** Status da audiência. */
  statuses?: AudienciaStatus[];
}

export const EMPTY_AUDIENCIAS_FACET: AudienciasFacet = {};

export function countActiveAudienciasFacet(f: AudienciasFacet | undefined): number {
  if (!f) return 0;
  let n = 0;
  if (f.comissoes && f.comissoes.length > 0) n += 1;
  if (f.statuses && f.statuses.length > 0) n += 1;
  return n;
}

// ===========================================================================
// 3) Catálogos visuais (labels PT-BR para a UI)
// ===========================================================================

export const SEVERITY_LABELS: Record<Severity, string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
  critical: "Crítica",
};

export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  pending: "Pendente",
  in_progress: "Em andamento",
  resolved: "Resolvido",
  rejected: "Rejeitado",
};

export const SLA_WINDOW_LABELS: Record<SlaWindow, string> = {
  "24h": "24 horas",
  "48h": "48 horas",
  "7d": "7 dias",
  "30d": "30 dias",
  all: "Sem limite",
};

export const AUDIENCIA_STATUS_LABELS: Record<AudienciaStatus, string> = {
  agendada: "Agendada",
  realizada: "Realizada",
  cancelada: "Cancelada",
  adiada: "Adiada",
};

// ===========================================================================
// 4) Conversões SLA window → horas (para hooks que comparam tempo)
// ===========================================================================

export function slaWindowToHours(window: SlaWindow): number | null {
  switch (window) {
    case "24h":
      return 24;
    case "48h":
      return 48;
    case "7d":
      return 24 * 7;
    case "30d":
      return 24 * 30;
    case "all":
    default:
      return null;
  }
}

// ===========================================================================
// 5) URL state — serialização com prefixo por aba
// ===========================================================================

export type FacetKey = "crit" | "efi" | "aud";

/**
 * Serializa um facet em query params com prefixo (ex: `f.crit.severity=...`).
 * Retorna `URLSearchParams` para o caller mesclar com a URL existente.
 */
export function facetToParams(
  key: FacetKey,
  facet: Record<string, unknown> | undefined,
): URLSearchParams {
  const out = new URLSearchParams();
  if (!facet) return out;
  for (const [field, value] of Object.entries(facet)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      if (value.length === 0) continue;
      out.set(`f.${key}.${field}`, value.join(","));
    } else if (typeof value === "boolean") {
      if (value) out.set(`f.${key}.${field}`, "1");
    } else {
      out.set(`f.${key}.${field}`, String(value));
    }
  }
  return out;
}

/**
 * Lê os params de um facet (do prefixo `f.{key}.`) e retorna objeto.
 * Caller é responsável por cast para o tipo correto.
 */
/**
 * Campos multi-select (sempre array), mesmo com um único valor — não há vírgula
 * para distinguir `["high"]` de um escalar `"high"` na ida-volta da URL.
 */
const ARRAY_FACET_FIELDS = new Set(["severities", "statuses", "comissoes"]);

export function paramsToFacet(key: FacetKey, params: URLSearchParams): Record<string, unknown> {
  const prefix = `f.${key}.`;
  const out: Record<string, unknown> = {};
  for (const [name, value] of params.entries()) {
    if (!name.startsWith(prefix)) continue;
    const field = name.slice(prefix.length);
    if (ARRAY_FACET_FIELDS.has(field)) {
      out[field] = value.split(",").filter(Boolean);
    } else if (value === "1" || value === "0") {
      out[field] = value === "1";
    } else if (value.includes(",")) {
      out[field] = value.split(",").filter(Boolean);
    } else if (/^\d+$/.test(value)) {
      out[field] = Number(value);
    } else {
      out[field] = value;
    }
  }
  return out;
}
