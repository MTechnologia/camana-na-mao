import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  getNearbyServicesCache,
  saveNearbyServicesCache,
  type CachedNearbyService,
} from "@/lib/nearbyServicesCache";
import {
  getBoundingBoxForRadiusMeters,
  mapPublicServiceRowToNearbyService,
} from "@/lib/nearbyServiceRow";
import { textMatchesSearchQuery } from "@/lib/searchTextMatch";

export interface NearbyService {
  id: string;
  name: string;
  service_type: string;
  address: string;
  district: string;
  latitude: number;
  longitude: number;
  phone: string | null;
  average_rating: number;
  total_ratings: number;
  distance?: number;
  opening_hours: { text?: string } | string | null;
  services_offered: string | null;
  operational_status: "open" | "closed" | "maintenance" | null;
  equipment_nature: EquipmentNatureValue | null;
}

export type EquipmentNatureValue = "publico" | "privado" | "misto_indefinido" | "nao_aplicavel";
export type EquipmentNatureFilterValue = "all" | "publico" | "privado";

type ServiceType = "ubs" | "school" | "ceu" | "hospital" | "library" | "sports_center" | "street_market"
  | "community_center" | "daycare" | "park" | "market" | "city_market" | "theater" | "museum"
  | "social_assistance" | "transit_station" | "bicycle" | "subprefeitura" | "police_station" | "cemetery" | "accessibility" | "recycling_point"
  | "fire_station" | "other" | "all";

/** Valores que existem em `public_services.service_type` (exclui UI `all`/`other`). */
type PublicServiceTypeRow = Exclude<ServiceType, "all" | "other">;

/**
 * Bbox grande + `ORDER BY id` no PostgREST costuma estourar tempo (500). Cursor ordenado só em bbox menor (~2 km).
 */
type BboxRowFetchMode = "ordered_cursor" | "unordered_single";

/**
 * Quando não há filtro de tipo, não usar `service_type.neq.other` no PostgREST (plano caro em bbox grande, ex. 5 km).
 * Buscamos cada tipo com `eq` e unimos no cliente.
 */
const ALL_QUERYABLE_SERVICE_TYPES: PublicServiceTypeRow[] = [
  "ubs",
  "school",
  "ceu",
  "hospital",
  "library",
  "sports_center",
  "street_market",
  "community_center",
  "daycare",
  "park",
  "market",
  "city_market",
  "theater",
  "museum",
  "social_assistance",
  "transit_station",
  "bicycle",
  "subprefeitura",
  "police_station",
  "cemetery",
  "accessibility",
  "recycling_point",
  "fire_station",
];

/** Máximo de queries `eq(service_type)` em paralelo (evita pico de 20+ requisições). */
const NEARBY_TYPE_FETCH_CONCURRENCY = 8;

/** Raio a partir do qual usamos estratégia “5 km” (duas fases + cap enxuto). */
const NEARBY_LARGE_RADIUS_THRESHOLD_M = 4500;

/**
 * Com todos os tipos e bbox largo (preset ~5 km), poucas linhas REST evitam 500 no gateway;
 * a lista na UI também fica limitada a isso.
 */
const NEARBY_MAX_LIST_ALL_TYPES_LARGE = 200;

/**
 * Vários tipos em bbox grande sem ORDER BY: `limit` alto por tipo em paralelo estoura o gateway (500).
 * Com os 5 tipos padrão e cap 900, `ceil(900/5)=180` × 5 GETs era o padrão ruim.
 */
const NEARBY_UNORDERED_PER_TYPE_MAX = 32;

/** Concorrência em raio grande quando o usuário escolhe poucos tipos (não “todos”). */
const NEARBY_LARGE_RADIUS_MULTI_TYPE_CONCURRENCY = 4;

/**
 * A RPC `search_public_services_bbox_light` pode levar >15s em bbox grande no Postgres;
 * timeout menor no cliente cortava a resposta e parecia “500”/falha intermitente.
 */
const NEARBY_BBOX_LIGHT_RPC_TIMEOUT_MS = 55_000;

/** Mínimo de caracteres para aplicar filtro textual no cliente sobre a amostra REST no bbox. */
export const NEARBY_FULLTEXT_MIN_LENGTH = 2;

function isRpcSignatureMissingError(error: { message?: string; code?: string } | null | undefined) {
  const message = error?.message?.toLowerCase() ?? "";
  return (
    error?.code === "PGRST202" ||
    message.includes("could not find the function") ||
    message.includes("schema cache") ||
    message.includes("equipment_natures")
  );
}

interface UseNearbyServicesProps {
  latitude: number | null;
  longitude: number | null;
  radiusMeters?: number;
  /** Um único tipo (legado) ou lista de tipos. Vazio/undefined = todos */
  serviceType?: ServiceType;
  /** Múltiplos tipos (multiseleção). Vazio = todos. Tem precedência sobre serviceType */
  serviceTypes?: ServiceType[];
  /** Texto >= NEARBY_FULLTEXT_MIN_LENGTH: filtro no cliente sobre amostra REST no bbox (sem RPC FTS). */
  fullTextQuery?: string;
  /** Distância mínima (Haversine) em metros no filtro cliente (faixas em anel do preset). */
  minRadiusMeters?: number;
  /** Natureza do equipamento para filtro Publico/Privado. */
  equipmentNature?: EquipmentNatureFilterValue;
  /** Evita fetch (ex.: aguardando endereço primário do usuário) sem erro de localização */
  skipFetch?: boolean;
}

// Haversine: distância em linha reta (não é a distância da rota a pé/carro). A UI exibe "(em linha reta)" para evitar confusão com o Maps.
const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371000; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

// Verificação robusta de coordenada válida
const isValidCoordinate = (value: unknown): value is number => {
  return typeof value === 'number' && !isNaN(value) && isFinite(value);
};

/** Chave de localização para deduplicar serviços no mesmo ponto (evita cards repetidos). */
const locationKey = (lat: number, lng: number, decimals = 5) =>
  `${Number(lat.toFixed(decimals))},${Number(lng.toFixed(decimals))}`;

/** Categoria genérica `other` (GeoSampa) não entra na lista — reduz ruído na UI. */
const excludeGenericOtherType = <T extends { service_type: string }>(items: T[]): T[] =>
  items.filter((s) => s.service_type !== "other");

type NearbyBoundingBox = {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
};

/** Divide o retângulo em 4 quadrantes (bbox grande + timeout no DB). */
function splitBoundingBoxInFour(box: NearbyBoundingBox): NearbyBoundingBox[] {
  const midLat = (box.minLat + box.maxLat) / 2;
  const midLng = (box.minLng + box.maxLng) / 2;
  return [
    { minLat: box.minLat, maxLat: midLat, minLng: box.minLng, maxLng: midLng },
    { minLat: box.minLat, maxLat: midLat, minLng: midLng, maxLng: box.maxLng },
    { minLat: midLat, maxLat: box.maxLat, minLng: box.minLng, maxLng: midLng },
    { minLat: midLat, maxLat: box.maxLat, minLng: midLng, maxLng: box.maxLng },
  ];
}

const getAdaptiveRestCap = (radius: number, hasTypeFilter: boolean): number => {
  if (hasTypeFilter) {
    if (radius <= 500) return 250;
    if (radius <= 1000) return 400;
    if (radius <= 2000) return 600;
    return 900;
  }
  if (radius <= 500) return 300;
  if (radius <= 1000) return 500;
  if (radius <= 2000) return 800;
  return NEARBY_MAX_LIST_ALL_TYPES_LARGE;
};

export const useNearbyServices = ({
  latitude,
  longitude,
  radiusMeters = 5000,
  serviceType,
  serviceTypes,
  fullTextQuery = "",
  minRadiusMeters,
  equipmentNature = "all",
  skipFetch = false,
}: UseNearbyServicesProps) => {
  // useRef para manter última localização válida e evitar recálculos desnecessários (sem fallback em ponto fixo)
  const lastValidLocation = useRef<{ lat: number; lng: number } | null>(null);

  const [services, setServices] = useState<NearbyService[]>([]);
  const [loading, setLoading] = useState(false);
  /** Segunda fase da busca em raio grande (ex.: 5km após resultado rápido em ~2km). */
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Evita que uma resposta antiga sobrescreva uma busca mais recente (digitação rápida). */
  const fetchRequestIdRef = useRef(0);
  /** Compatibilidade temporária: alguns ambientes ainda têm a RPC sem `equipment_natures`. */
  const rpcSupportsEquipmentNatureRef = useRef(true);

  // Atualizar ref apenas se receber localização válida
  if (isValidCoordinate(latitude) && isValidCoordinate(longitude)) {
    lastValidLocation.current = { lat: latitude, lng: longitude };
  }

  const applyCacheWithDistance = useCallback(
    (cached: CachedNearbyService[], userLat: number, userLng: number): NearbyService[] => {
      return cached.map((s) => ({
        ...s,
        equipment_nature: s.equipment_nature ?? null,
        distance: calculateDistance(userLat, userLng, s.latitude, s.longitude),
      }));
    },
    []
  );

  const filterByEquipmentNature = useCallback(
    (list: NearbyService[]) => {
      if (equipmentNature === "all") return list;
      return list.filter((service) => service.equipment_nature === equipmentNature);
    },
    [equipmentNature],
  );

  const fetchServices = useCallback(async () => {
    if (skipFetch) {
      setServices([]);
      setLoading(false);
      setLoadingMore(false);
      setError(null);
      return;
    }

    const userLat = lastValidLocation.current?.lat;
    const userLng = lastValidLocation.current?.lng;

    if (!isValidCoordinate(userLat) || !isValidCoordinate(userLng)) {
      setServices([]);
      setError("Localização inválida para buscar serviços.");
      return;
    }

    setLoading(true);
    setLoadingMore(false);
    setError(null);

    const safeRadius = Math.max(radiusMeters, 100);

    if (!navigator.onLine) {
      try {
        const cached = await getNearbyServicesCache();
        if (cached?.services?.length) {
          const centerLat = cached.centerLat;
          const centerLng = cached.centerLng;
          const withDistance = excludeGenericOtherType(
            applyCacheWithDistance(cached.services, centerLat, centerLng),
          );
          setServices(filterByEquipmentNature(withDistance));
        } else {
          setServices([]);
        }
      } catch {
        setServices([]);
      }
      setLoading(false);
      setError("Sem conexão. Exibindo equipamentos em cache quando disponível.");
      return;
    }

      const requestId = ++fetchRequestIdRef.current;

      const withTimeout = async <T,>(promise: Promise<T>, timeoutMs: number, context: string): Promise<T> => {
        return await Promise.race([
          promise,
          new Promise<T>((_, reject) =>
            setTimeout(() => reject(new Error(`Timeout (${timeoutMs}ms) em ${context}`)), timeoutMs),
          ),
        ]);
      };

    try {
      const { minLat, maxLat, minLng, maxLng } = getBoundingBoxForRadiusMeters(
        userLat,
        userLng,
        safeRadius
      );

      const types = serviceTypes?.filter((t) => t !== "all") ?? [];
      const singleType = !serviceType || serviceType === "all" ? undefined : serviceType;
      const effectiveTypes =
        types.length > 0 ? types : singleType ? [singleType] : [];
      const isAllTypes = effectiveTypes.length === 0;
      const shouldFilterEquipmentNature = equipmentNature !== "all";
      const equipmentNatures = shouldFilterEquipmentNature ? [equipmentNature] : [];
      // A migration pode ser aplicada antes do backfill de `equipment_nature`.
      // Enquanto houver linhas antigas com coluna nula, inferimos por `source_layer`
      // e filtramos no cliente para não esconder EMEIs/UBS públicas.
      const shouldFilterEquipmentNatureOnServer = false;
      /**
       * Cap adaptativo para fallback REST:
       * evita timeout de consultas muito amplas e reduz inconsistência de amostragem.
       */
      const limit = getAdaptiveRestCap(safeRadius, !isAllTypes);
      const listMaxAllTypesLarge =
        isAllTypes && safeRadius >= NEARBY_LARGE_RADIUS_THRESHOLD_M
          ? NEARBY_MAX_LIST_ALL_TYPES_LARGE
          : undefined;

      const fetchTypeCount = isAllTypes
        ? ALL_QUERYABLE_SERVICE_TYPES.length
        : effectiveTypes.filter((t): t is PublicServiceTypeRow => t !== "all" && t !== "other")
            .length;
      const restTypeConcurrency =
        safeRadius >= NEARBY_LARGE_RADIUS_THRESHOLD_M && fetchTypeCount > 1
          ? isAllTypes
            ? 3
            : NEARBY_LARGE_RADIUS_MULTI_TYPE_CONCURRENCY
          : undefined;
      const rowFetchModeForMainFetch: BboxRowFetchMode =
        safeRadius >= NEARBY_LARGE_RADIUS_THRESHOLD_M ? "unordered_single" : "ordered_cursor";

      const ftsTrimmed = (fullTextQuery ?? "").trim();
      const hasTextSearch = ftsTrimmed.length >= NEARBY_FULLTEXT_MIN_LENGTH;

      const distMinM =
        typeof minRadiusMeters === "number" && minRadiusMeters > 0 ? minRadiusMeters : 0;

      const buildNearbyFromRawRows = (
        rawRows: unknown[],
        maxM: number,
        minM: number,
        maxResults?: number,
      ): NearbyService[] => {
        const formatted = (rawRows || [])
          .map((raw) =>
            mapPublicServiceRowToNearbyService(raw as Record<string, unknown>, userLat, userLng),
          )
          .filter((service): service is NearbyService => service !== null);

        const withoutOther = filterByEquipmentNature(excludeGenericOtherType(formatted));

        const withinRadius = withoutOther
          .filter((service) => {
            const d = service.distance ?? 0;
            return d <= maxM && d >= minM;
          })
          .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));

        const seen = new Set<string>();
        const deduped = withinRadius.filter((s) => {
          const key = locationKey(s.latitude, s.longitude);
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        if (typeof maxResults === "number" && maxResults > 0 && deduped.length > maxResults) {
          return deduped.slice(0, maxResults);
        }
        return deduped;
      };

      /**
       * REST, um tipo por requisição. `ordered_cursor`: pagina por id (bbox pequeno).
       * `unordered_single`: um GET sem ORDER BY (bbox grande — evita 500 no gateway).
       */
      const fetchBboxCursorRowsInner = async (
        box: { minLat: number; maxLat: number; minLng: number; maxLng: number },
        totalCap: number,
        batchSize: number,
        queryTimeoutMs: number,
        singleType: PublicServiceTypeRow,
        rowFetchMode: BboxRowFetchMode,
      ): Promise<{ rows: unknown[]; error: { message?: string } | null }> => {
        const baseSelect =
          "id, name, service_type, address, district, latitude, longitude, phone, average_rating, total_ratings, opening_hours, services_offered, operational_status, equipment_nature, source_layer";

        if (rowFetchMode === "unordered_single") {
          const lim = Math.max(1, Math.min(totalCap, 200));
          let query = supabase
            .from("public_services")
            .select(baseSelect)
            .gte("latitude", box.minLat)
            .lte("latitude", box.maxLat)
            .gte("longitude", box.minLng)
            .lte("longitude", box.maxLng)
            .eq("service_type", singleType)
            .is("duplicate_of", null);

          if (shouldFilterEquipmentNatureOnServer) {
            query = query.eq("equipment_nature", equipmentNature);
          }

          // Fast path: consulta REST direta por tipo com cap baixo.
          const { data: bboxData, error: bboxError } = await withTimeout(
            query.limit(lim) as unknown as Promise<{ data: unknown; error: { message?: string } | null }>,
            queryTimeoutMs,
            "public_services bbox unordered fallback",
          );
          if (!bboxError) {
            return { rows: ((bboxData ?? []) as unknown[]) || [], error: null };
          }

          // Fallback: RPC bbox light (e quadrantes) quando REST falha em bbox grande.
          const rpcBboxLight = async (b: NearbyBoundingBox, resultLimit: number) => {
            const args = {
              min_lat: b.minLat,
              max_lat: b.maxLat,
              min_lng: b.minLng,
              max_lng: b.maxLng,
              service_types: [singleType],
              result_limit: resultLimit,
              result_offset: 0,
            };
            const legacyCall = () =>
              withTimeout(
                supabase.rpc("search_public_services_bbox_light", args) as unknown as Promise<{
                  data: unknown;
                  error: { message?: string; code?: string } | null;
                }>,
                Math.max(queryTimeoutMs, NEARBY_BBOX_LIGHT_RPC_TIMEOUT_MS),
                "search_public_services_bbox_light (legacy signature)",
              );

            if (!rpcSupportsEquipmentNatureRef.current) {
              return legacyCall();
            }

            const withNature = await withTimeout(
              supabase.rpc("search_public_services_bbox_light", {
                min_lat: b.minLat,
                max_lat: b.maxLat,
                min_lng: b.minLng,
                max_lng: b.maxLng,
                service_types: [singleType],
                result_limit: resultLimit,
                result_offset: 0,
                equipment_natures: shouldFilterEquipmentNatureOnServer ? equipmentNatures : [],
              }) as unknown as Promise<{ data: unknown; error: { message?: string } | null }>,
              Math.max(queryTimeoutMs, NEARBY_BBOX_LIGHT_RPC_TIMEOUT_MS),
              "search_public_services_bbox_light",
            );
            if (!isRpcSignatureMissingError(withNature.error)) {
              return withNature;
            }
            rpcSupportsEquipmentNatureRef.current = false;
            return legacyCall();
          };

          const { data: rpcData, error: rpcError } = await rpcBboxLight(box, lim);
          if (!rpcError && Array.isArray(rpcData)) {
            return { rows: rpcData as unknown[], error: null };
          }

          const quarters = splitBoundingBoxInFour(box);
          const byId = new Map<string, unknown>();
          const perQ = Math.max(1, Math.ceil(lim / 4));
          for (let qi = 0; qi < quarters.length; qi++) {
            const { data: qData, error: qErr } = await rpcBboxLight(quarters[qi], perQ);
            if (!qErr && Array.isArray(qData)) {
              for (const row of qData) {
                const rid = (row as { id?: string }).id;
                if (typeof rid === "string") byId.set(rid, row);
              }
            }
            if (qi < quarters.length - 1) {
              await new Promise((r) => setTimeout(r, 40));
            }
          }
          if (byId.size > 0) {
            return { rows: [...byId.values()].slice(0, lim), error: null };
          }
          return { rows: [], error: rpcError ?? bboxError };
        }

        const merged: unknown[] = [];
        let lastId: string | null = null;
        const maxBatches = Math.max(1, Math.ceil(totalCap / batchSize));
        for (let i = 0; i < maxBatches; i++) {
          let query = supabase
            .from("public_services")
            .select(baseSelect)
            .gte("latitude", box.minLat)
            .lte("latitude", box.maxLat)
            .gte("longitude", box.minLng)
            .lte("longitude", box.maxLng)
            .eq("service_type", singleType)
            .is("duplicate_of", null)
            .order("id", { ascending: true })
            .limit(batchSize);

          if (shouldFilterEquipmentNatureOnServer) {
            query = query.eq("equipment_nature", equipmentNature);
          }

          if (lastId) {
            query = query.gt("id", lastId);
          }

          const { data: bboxData, error: bboxError } = await withTimeout(
            query as unknown as Promise<{ data: unknown; error: { message?: string } | null }>,
            queryTimeoutMs,
            "public_services bbox cursor",
          );

          if (bboxError) {
            return { rows: [], error: bboxError };
          }

          const rows = (bboxData ?? []) as Array<{ id?: string } & Record<string, unknown>>;
          if (rows.length === 0) {
            break;
          }

          merged.push(...rows);
          lastId = typeof rows[rows.length - 1]?.id === "string" ? rows[rows.length - 1].id : null;
          if (!lastId || rows.length < batchSize) {
            break;
          }
        }
        return { rows: merged, error: null };
      };

      const fetchBboxCursorRowsMerged = async (
        box: { minLat: number; maxLat: number; minLng: number; maxLng: number },
        totalCap: number,
        batchSize: number,
        queryTimeoutMs: number,
        typesList: ServiceType[],
        typeConcurrency: number | undefined,
        rowFetchMode: BboxRowFetchMode,
      ): Promise<{ rows: unknown[]; error: { message?: string } | null }> => {
        const types: PublicServiceTypeRow[] =
          typesList.length > 0
            ? typesList.filter((t): t is PublicServiceTypeRow => t !== "all" && t !== "other")
            : ALL_QUERYABLE_SERVICE_TYPES;
        if (typesList.length > 0 && types.length === 0) {
          return { rows: [], error: null };
        }
        const getLegacyRpcServiceTypes = () => {
          if (equipmentNature !== "publico" || types.length <= 1) return types;

          // Ambientes sem a assinatura nova da RPC ainda retornam uma amostra sem filtro de natureza.
          // A camada de escolas privadas domina essa amostra em bbox grande, então evitamos que ela
          // esconda UBS/CEU/esportes públicos enquanto a migration remota não está aplicada.
          const withoutPrivateHeavySchoolLayer = types.filter((type) => type !== "school");
          return withoutPrivateHeavySchoolLayer.length > 0 ? withoutPrivateHeavySchoolLayer : types;
        };

        // Em bbox grande, uma única RPC com todos os tipos reduz chamadas e evita 500 intermitente no REST por tipo.
        if (rowFetchMode === "unordered_single") {
          const lim = Math.max(1, Math.min(totalCap, 200));
          const rpcManyTypes = async (b: NearbyBoundingBox, resultLimit: number) => {
            const args = {
              min_lat: b.minLat,
              max_lat: b.maxLat,
              min_lng: b.minLng,
              max_lng: b.maxLng,
              service_types: types,
              result_limit: resultLimit,
              result_offset: 0,
            };
            const legacyArgs = { ...args, service_types: getLegacyRpcServiceTypes() };
            const legacyCall = () =>
              withTimeout(
                supabase.rpc("search_public_services_bbox_light", legacyArgs) as unknown as Promise<{
                  data: unknown;
                  error: { message?: string; code?: string } | null;
                }>,
                Math.max(queryTimeoutMs, NEARBY_BBOX_LIGHT_RPC_TIMEOUT_MS),
                "search_public_services_bbox_light (many types legacy signature)",
              );

            if (!rpcSupportsEquipmentNatureRef.current) {
              return legacyCall();
            }

            const withNature = await withTimeout(
              supabase.rpc("search_public_services_bbox_light", {
                min_lat: b.minLat,
                max_lat: b.maxLat,
                min_lng: b.minLng,
                max_lng: b.maxLng,
                service_types: types,
                result_limit: resultLimit,
                result_offset: 0,
                equipment_natures: shouldFilterEquipmentNatureOnServer ? equipmentNatures : [],
              }) as unknown as Promise<{ data: unknown; error: { message?: string } | null }>,
              Math.max(queryTimeoutMs, NEARBY_BBOX_LIGHT_RPC_TIMEOUT_MS),
              "search_public_services_bbox_light (many types)",
            );
            if (!isRpcSignatureMissingError(withNature.error)) {
              return withNature;
            }
            rpcSupportsEquipmentNatureRef.current = false;
            return legacyCall();
          };

          const { data: rpcData, error: rpcError } = await rpcManyTypes(box, lim);
          if (!rpcError && Array.isArray(rpcData)) {
            return { rows: rpcData as unknown[], error: null };
          }

          const quarters = splitBoundingBoxInFour(box);
          const byId = new Map<string, unknown>();
          const perQ = Math.max(1, Math.ceil(lim / 4));
          for (let qi = 0; qi < quarters.length; qi++) {
            const { data: qData, error: qErr } = await rpcManyTypes(quarters[qi], perQ);
            if (!qErr && Array.isArray(qData)) {
              for (const row of qData) {
                const rid = (row as { id?: string }).id;
                if (typeof rid === "string") byId.set(rid, row);
              }
            }
            if (qi < quarters.length - 1) {
              await new Promise((r) => setTimeout(r, 40));
            }
          }
          if (byId.size > 0) {
            return { rows: [...byId.values()].slice(0, lim), error: null };
          }
          // Se a RPC falhar também, cai para o fluxo atual (por tipo) como último recurso.
        }

        if (types.length === 1) {
          return fetchBboxCursorRowsInner(
            box,
            totalCap,
            batchSize,
            queryTimeoutMs,
            types[0],
            rowFetchMode,
          );
        }

        const perTypeRaw = Math.max(1, Math.ceil(totalCap / types.length));
        const perType =
          types.length > 1 && rowFetchMode === "unordered_single"
            ? Math.min(perTypeRaw, NEARBY_UNORDERED_PER_TYPE_MAX)
            : perTypeRaw;
        const byId = new Map<string, unknown>();
        const wave =
          typeof typeConcurrency === "number" && typeConcurrency > 0
            ? typeConcurrency
            : NEARBY_TYPE_FETCH_CONCURRENCY;

        for (let i = 0; i < types.length; i += wave) {
          const slice = types.slice(i, i + wave);
          const results = await Promise.all(
            slice.map((t) =>
              fetchBboxCursorRowsInner(
                box,
                perType,
                batchSize,
                queryTimeoutMs,
                t,
                rowFetchMode,
              ),
            ),
          );
          const errResult = results.find((r) => r.error)?.error;
          if (errResult) {
            return { rows: [], error: errResult };
          }
          for (const r of results) {
            for (const row of r.rows) {
              const rid = (row as { id?: string }).id;
              if (typeof rid === "string") byId.set(rid, row);
            }
          }
          if (
            rowFetchMode === "unordered_single" &&
            types.length > 1 &&
            i + wave < types.length
          ) {
            await new Promise((r) => setTimeout(r, 75));
          }
        }

        return { rows: [...byId.values()], error: null };
      };

      const REST_BATCH = 32;
      const REST_QUERY_MS = 12_000;

      let data: unknown[] | null = null;
      let fetchError: { message?: string } | null = null;
      let skipMainProcessing = false;

      /** Raio grande (disco 0–5 km no mapa de busca): primeiro bbox ~2 km, depois bbox completo. Só quando não há anel (distMinM === 0). */
      const PHASE1_RADIUS_M = 1500;

      const useTwoPhase =
        !hasTextSearch && isAllTypes && safeRadius >= NEARBY_LARGE_RADIUS_THRESHOLD_M && distMinM === 0;

      if (useTwoPhase) {
        try {
          const boxPhase1 = getBoundingBoxForRadiusMeters(userLat, userLng, PHASE1_RADIUS_M);
          const limitPhase1 = Math.min(getAdaptiveRestCap(PHASE1_RADIUS_M, !isAllTypes), 200);
          const r1 = await fetchBboxCursorRowsMerged(
            boxPhase1,
            limitPhase1,
            REST_BATCH,
            REST_QUERY_MS,
            effectiveTypes,
            restTypeConcurrency,
            "ordered_cursor",
          );
          if (r1.error) {
            throw r1.error;
          }
          if (requestId !== fetchRequestIdRef.current) {
            return;
          }

          const partialList = buildNearbyFromRawRows(
            r1.rows,
            safeRadius,
            distMinM,
            listMaxAllTypesLarge,
          );
          setServices(partialList);
          setLoading(false);
          setLoadingMore(true);

          try {
            const r2 = await fetchBboxCursorRowsMerged(
              { minLat, maxLat, minLng, maxLng },
              limit,
              REST_BATCH,
              REST_QUERY_MS,
              effectiveTypes,
              restTypeConcurrency,
              "unordered_single",
            );
            if (requestId !== fetchRequestIdRef.current) {
              return;
            }
            if (!r2.error) {
              const byId = new Map<string, unknown>();
              for (const row of r1.rows) {
                const rid = (row as { id?: string }).id;
                if (typeof rid === "string") byId.set(rid, row);
              }
              for (const row of r2.rows) {
                const rid = (row as { id?: string }).id;
                if (typeof rid === "string") byId.set(rid, row);
              }
              const mergedRows = [...byId.values()];
              const finalList = buildNearbyFromRawRows(
                mergedRows,
                safeRadius,
                distMinM,
                listMaxAllTypesLarge,
              );
              setServices(finalList);
              void saveNearbyServicesCache(finalList, userLat, userLng, safeRadius).catch(() => {});
            } else {
              void saveNearbyServicesCache(partialList, userLat, userLng, safeRadius).catch(() => {});
            }
            skipMainProcessing = true;
          } finally {
            setLoadingMore(false);
          }
        } catch (phaseErr) {
          if (import.meta.env.DEV) {
            console.debug("[useNearbyServices] busca em duas fases falhou", phaseErr);
          }
          setLoadingMore(false);
        }
      }

      if (!skipMainProcessing) {
        const restCap = hasTextSearch
          ? Math.min(Math.max(limit * 4, 400), 1400)
          : limit;
        const r = await fetchBboxCursorRowsMerged(
          { minLat, maxLat, minLng, maxLng },
          restCap,
          REST_BATCH,
          REST_QUERY_MS,
          effectiveTypes,
          restTypeConcurrency,
          rowFetchModeForMainFetch,
        );
        fetchError = r.error;
        data = r.rows;

        if (fetchError) {
          throw fetchError;
        }

        const formatted = (data || [])
          .map((raw) =>
            mapPublicServiceRowToNearbyService(raw as Record<string, unknown>, userLat, userLng),
          )
          .filter((service): service is NearbyService => service !== null);

        const withoutOther = filterByEquipmentNature(excludeGenericOtherType(formatted));

        const withinRadius = withoutOther
          .filter((service) => {
            const d = service.distance ?? 0;
            return d <= safeRadius && d >= distMinM;
          })
          .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));

        const seen = new Set<string>();
        let deduped = withinRadius.filter((s) => {
          const key = locationKey(s.latitude, s.longitude);
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });

        if (hasTextSearch) {
          deduped = deduped.filter((s) => {
            const haystack = [s.name, s.address, s.district, s.services_offered ?? ""].join(" ");
            return textMatchesSearchQuery(haystack, ftsTrimmed);
          });
        }

        if (
          typeof listMaxAllTypesLarge === "number" &&
          deduped.length > listMaxAllTypesLarge
        ) {
          deduped = deduped.slice(0, listMaxAllTypesLarge);
        }

        setServices(deduped);
        void saveNearbyServicesCache(deduped, userLat, userLng, safeRadius).catch(() => {});
      }
    } catch (fetchError) {
      if (import.meta.env.DEV) {
        console.debug("[useNearbyServices] erro ao buscar serviços próximos", fetchError);
      }
      if (requestId !== fetchRequestIdRef.current) {
        return;
      }
      // Em erro online, NÃO usar cache silenciosamente (evita impressão de filtros "travados").
      // Cache automático fica restrito ao modo offline (bloco navigator.onLine === false).
      if (navigator.onLine) {
        setServices([]);
        const message =
          typeof fetchError === "object" &&
          fetchError !== null &&
          "message" in fetchError &&
          typeof (fetchError as { message?: unknown }).message === "string"
            ? (fetchError as { message: string }).message
            : "Erro ao buscar serviços próximos.";
        setError(message);
        return;
      }

      const cached = await getNearbyServicesCache();
      if (cached?.services?.length) {
        const withDistance = excludeGenericOtherType(
          applyCacheWithDistance(cached.services, cached.centerLat, cached.centerLng),
        );
        setServices(filterByEquipmentNature(withDistance));
        setError("Sem conexão. Exibindo equipamentos em cache.");
      } else {
        setServices([]);
        setError("Sem conexão e sem cache disponível.");
      }
    } finally {
      if (requestId === fetchRequestIdRef.current) {
        setLoading(false);
      }
    }
  }, [radiusMeters, serviceType, serviceTypes, applyCacheWithDistance, filterByEquipmentNature, fullTextQuery, minRadiusMeters, equipmentNature, skipFetch]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices, latitude, longitude, skipFetch]);

  return {
    services,
    loading,
    loadingMore,
    error,
    refetch: fetchServices,
  };
};
