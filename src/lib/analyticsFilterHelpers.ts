import { bairroParaZona, type ZonaVolumeOuDesconhecida } from "@/lib/regionMapping";

/**
 * HU-5.2 — Helpers de filtragem in-memory para reusar entre os hooks de
 * Volume / Diagnóstico / Eficiência / Audiências.
 *
 * Permite que os hooks aceitem `{ categories, regions, zones }` opcionais
 * sem duplicar a lógica de aplicação. As funções operam sobre registros já
 * normalizados (com `category`, `region` opcionais).
 */

export interface AnalyticsRecordFilter {
  /** Categorias aceitas (vazio = todas). */
  categories?: string[];
  /** Bairros/regiões aceitas (vazio = todas). Match case-insensitive parcial. */
  regions?: string[];
  /** Zonas aceitas (Centro/Norte/Sul/Leste/Oeste/Não informada). Vazio = todas. */
  zones?: ZonaVolumeOuDesconhecida[];
}

export interface FilterableRecord {
  category?: string;
  region?: string;
  /** Se já calculado, evita re-execução de bairroParaZona. */
  zone?: ZonaVolumeOuDesconhecida;
  /** Coordenadas para refino do mapeamento zona via lat/lng (opcional). */
  latitude?: number | null;
  longitude?: number | null;
}

function normalize(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
}

/**
 * Retorna true se o record passa pelos filtros. Quando um campo de filtro
 * é vazio/ausente, é considerado "passou".
 */
export function recordMatchesFilters(
  record: FilterableRecord,
  filters: AnalyticsRecordFilter,
): boolean {
  // Categoria — match exato (ignorando caso/acentos)
  if (filters.categories && filters.categories.length > 0) {
    if (!record.category) return false;
    const recCat = normalize(record.category);
    const ok = filters.categories.some((c) => normalize(c) === recCat);
    if (!ok) return false;
  }

  // Região — match parcial (contém) para tolerar variações de bairro
  if (filters.regions && filters.regions.length > 0) {
    const recRegion = record.region ? normalize(record.region) : "";
    if (!recRegion) return false;
    const ok = filters.regions.some((r) => {
      const target = normalize(r);
      return recRegion.includes(target) || target.includes(recRegion);
    });
    if (!ok) return false;
  }

  // Zona — usa zona pré-calculada se houver, senão deriva do region
  if (filters.zones && filters.zones.length > 0) {
    const recZone =
      record.zone ?? bairroParaZona(record.region ?? "", record.latitude, record.longitude);
    const ok = filters.zones.some((z) => String(z) === String(recZone));
    if (!ok) return false;
  }

  return true;
}

/**
 * Aplica os filtros a uma lista de registros e retorna apenas os que passam.
 */
export function applyAnalyticsFilters<T extends FilterableRecord>(
  records: T[],
  filters: AnalyticsRecordFilter,
): T[] {
  const hasFilter =
    (filters.categories?.length ?? 0) > 0 ||
    (filters.regions?.length ?? 0) > 0 ||
    (filters.zones?.length ?? 0) > 0;
  if (!hasFilter) return records;
  return records.filter((r) => recordMatchesFilters(r, filters));
}

export const __test__ = { normalize };
