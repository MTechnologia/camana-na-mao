/**
 * Cache offline de equipamentos (public_services) para a tela "Perto de você".
 * Persiste no IndexedDB a última lista carregada; sem rede o mapa ainda exibe esses dados.
 */

const DB_NAME = "camana-na-mao-cache";
const STORE_NAME = "nearby-services";
const CACHE_KEY = "last-view";
/**
 * Cache persistente ("eterno") para equipamentos próximos.
 * A invalidação ocorre quando um novo fetch bem-sucedido sobrescreve a entrada.
 */
/** Limite de equipamentos guardados para não estourar armazenamento. */
const MAX_CACHED_SERVICES = 3000;

export interface CachedNearbyService {
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
  opening_hours: { text?: string } | string | null;
  services_offered: string | null;
  operational_status: "open" | "closed" | "maintenance" | null;
  equipment_nature: "publico" | "privado" | "misto_indefinido" | "nao_aplicavel" | null;
}

export interface NearbyServicesCacheEntry {
  services: CachedNearbyService[];
  centerLat: number;
  centerLng: number;
  radiusMeters: number;
  savedAt: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "key" });
      }
    };
  });
}

/**
 * Salva a lista de equipamentos no cache (última visualização).
 * Limita a MAX_CACHED_SERVICES itens.
 */
export async function saveNearbyServicesCache(
  services: CachedNearbyService[],
  centerLat: number,
  centerLng: number,
  radiusMeters: number
): Promise<void> {
  if (services.length === 0) return;
  try {
    const db = await openDB();
    const toStore = services.slice(0, MAX_CACHED_SERVICES).map((s) => ({
      id: s.id,
      name: s.name,
      service_type: s.service_type,
      address: s.address,
      district: s.district,
      latitude: s.latitude,
      longitude: s.longitude,
      phone: s.phone,
      average_rating: s.average_rating,
      total_ratings: s.total_ratings,
      opening_hours: s.opening_hours,
      services_offered: s.services_offered,
      operational_status: s.operational_status ?? null,
      equipment_nature: s.equipment_nature ?? null,
    }));
    const entry: NearbyServicesCacheEntry = {
      services: toStore,
      centerLat,
      centerLng,
      radiusMeters,
      savedAt: Date.now(),
    };
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.put({ key: CACHE_KEY, ...entry });
    db.close();
  } catch (e) {
    console.warn("[nearbyServicesCache] save failed:", e);
  }
}

/**
 * Lê o cache da última visualização. Retorna null se não houver cache.
 */
export async function getNearbyServicesCache(): Promise<NearbyServicesCacheEntry | null> {
  try {
    const db = await openDB();
    const entry = await new Promise<{ key: string } & NearbyServicesCacheEntry | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(CACHE_KEY);
      req.onerror = () => reject(req.error);
      req.onsuccess = () => resolve(req.result);
    });
    db.close();
    if (!entry?.services?.length) return null;
    return {
      services: entry.services,
      centerLat: entry.centerLat,
      centerLng: entry.centerLng,
      radiusMeters: entry.radiusMeters,
      savedAt: entry.savedAt,
    };
  } catch (e) {
    console.warn("[nearbyServicesCache] get failed:", e);
    return null;
  }
}
