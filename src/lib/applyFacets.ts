/**
 * HU-14 — Utilitários puros para aplicar facets em arrays de dados.
 *
 * Cada hook chama o util correspondente DEPOIS de fazer o fetch + filtros
 * base (period/categories/regions/zones). Mantém a separação:
 *
 *   - Filtros base: aplicados no banco quando possível (gte/lte/in).
 *   - Facets: aplicados client-side após o fetch (cabe na maioria dos
 *     casos porque o volume já está limitado pelos filtros base).
 */

import type {
  AudienciasFacet,
  CriticidadeFacet,
  EficienciaFacet,
  Severity,
} from "./analyticsFilters";
import { slaWindowToHours } from "./analyticsFilters";

// ===========================================================================
// CRITICIDADE
// ===========================================================================

export interface CriticidadeFacetTarget {
  /** Severidade textual ("low" | "medium" | "high" | "critical" | null). */
  severity?: string | null;
  /**
   * Consequências ativas. Pode vir como:
   *   - `string[]` (formato do banco: jsonb array de strings — urban_reports)
   *   - `string` (legado / texto livre)
   *   - `null` / `undefined` (sem consequências)
   * "Tem consequências ativas" = array com algum item não-vazio OU string não-vazia.
   */
  active_consequences?: string | string[] | null;
}

/** True se há alguma consequência ativa registrada. */
function hasActiveConsequencesValue(
  value: string | string[] | null | undefined,
): boolean {
  if (value == null) return false;
  if (Array.isArray(value)) {
    return value.some((v) => typeof v === "string" && v.trim().length > 0);
  }
  if (typeof value === "string") return value.trim().length > 0;
  return false;
}

function normalizeSeverity(raw: string | null | undefined): Severity | null {
  const s = (raw ?? "").toLowerCase().trim();
  if (s === "low" || s === "baixa" || s === "baixo") return "low";
  if (s === "medium" || s === "média" || s === "media" || s === "médio") return "medium";
  if (s === "high" || s === "alta" || s === "alto") return "high";
  if (s === "critical" || s === "crítica" || s === "critica" || s === "crítico") {
    return "critical";
  }
  return null;
}

export function applyCriticidadeFacet<T extends CriticidadeFacetTarget>(
  rows: T[],
  facet: CriticidadeFacet | undefined,
): T[] {
  if (!facet) return rows;
  const wantedSeverities = facet.severities && facet.severities.length > 0
    ? new Set(facet.severities)
    : null;
  return rows.filter((r) => {
    if (wantedSeverities) {
      const sev = normalizeSeverity(r.severity);
      if (!sev || !wantedSeverities.has(sev)) return false;
    }
    if (facet.criticalOnly) {
      const sev = normalizeSeverity(r.severity);
      if (sev !== "critical") return false;
    }
    if (facet.hasActiveConsequences) {
      if (!hasActiveConsequencesValue(r.active_consequences)) return false;
    }
    return true;
  });
}

// ===========================================================================
// EFICIÊNCIA
// ===========================================================================

export interface EficienciaFacetTarget {
  status?: string | null;
  /** Em horas. Pode vir como número ou null. */
  responseHours?: number | null;
}

export function applyEficienciaFacet<T extends EficienciaFacetTarget>(
  rows: T[],
  facet: EficienciaFacet | undefined,
): T[] {
  if (!facet) return rows;
  const wantedStatuses = facet.statuses && facet.statuses.length > 0
    ? new Set(facet.statuses)
    : null;
  const slaHours = facet.slaWindow ? slaWindowToHours(facet.slaWindow) : null;
  const minMs =
    facet.responseMinDays != null ? facet.responseMinDays * 24 : null;
  const maxMs =
    facet.responseMaxDays != null ? facet.responseMaxDays * 24 : null;

  return rows.filter((r) => {
    if (wantedStatuses) {
      const s = (r.status ?? "").toLowerCase().trim();
      if (!wantedStatuses.has(s as never)) return false;
    }
    if (r.responseHours == null) {
      // Sem tempo de resposta — só inclui se nenhum filtro de SLA/range estiver ativo.
      if (slaHours != null || minMs != null || maxMs != null) return false;
      return true;
    }
    if (slaHours != null && r.responseHours > slaHours) return false;
    if (minMs != null && r.responseHours < minMs) return false;
    if (maxMs != null && r.responseHours > maxMs) return false;
    return true;
  });
}

// ===========================================================================
// AUDIÊNCIAS
// ===========================================================================

export interface AudienciasFacetTarget {
  comissao?: string | null;
  status?: string | null;
}

export function applyAudienciasFacet<T extends AudienciasFacetTarget>(
  rows: T[],
  facet: AudienciasFacet | undefined,
): T[] {
  if (!facet) return rows;
  const wantedComissoes = facet.comissoes && facet.comissoes.length > 0
    ? new Set(facet.comissoes.map((s) => s.toLowerCase()))
    : null;
  const wantedStatuses = facet.statuses && facet.statuses.length > 0
    ? new Set(facet.statuses)
    : null;
  return rows.filter((r) => {
    if (wantedComissoes) {
      const c = (r.comissao ?? "").toLowerCase().trim();
      if (!c || !wantedComissoes.has(c)) return false;
    }
    if (wantedStatuses) {
      const s = (r.status ?? "").toLowerCase().trim();
      if (!wantedStatuses.has(s as never)) return false;
    }
    return true;
  });
}
