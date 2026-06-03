import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  fetchAppSuggestions,
  recentEntriesToSyncPayload,
  remoteItemsToRecentEntries,
  syncAppSuggestions,
} from "@/lib/api/appSuggestionsApi";
import { withPoolRetry } from "@/lib/supabaseRetry";
import { createClientId } from "@/lib/clientId";
import type {
  NearbyRecentEquipmentPayload,
  NearbyRecentPlacePayload,
  NearbyRecentSearchEntry,
} from "@/types/nearbySearchRecent";

export type {
  NearbyRecentEquipmentPayload,
  NearbyRecentPlacePayload,
  NearbyRecentSearchEntry,
} from "@/types/nearbySearchRecent";

const STORAGE_KEY = "camana-nearby-search-recent-v1";
const MAX_ENTRIES = 12;
const CLOUD_SYNC_DEBOUNCE_MS = 900;

function mergeRecentLists(
  local: NearbyRecentSearchEntry[],
  remote: NearbyRecentSearchEntry[],
): NearbyRecentSearchEntry[] {
  const map = new Map<string, NearbyRecentSearchEntry>();
  const put = (e: NearbyRecentSearchEntry) => {
    const ex = map.get(e.id);
    if (!ex || e.createdAt >= ex.createdAt) map.set(e.id, e);
  };
  for (const e of remote) put(e);
  for (const e of local) put(e);
  return [...map.values()].sort((a, b) => b.createdAt - a.createdAt).slice(0, MAX_ENTRIES);
}

function stableEntryId(entry: Omit<NearbyRecentSearchEntry, "id" | "createdAt">): string {
  if (entry.kind === "text" && entry.text?.trim()) {
    return `text:${entry.text.trim().toLowerCase()}`;
  }
  if (entry.kind === "place" && entry.place) {
    const { latitude, longitude } = entry.place;
    return `place:${latitude.toFixed(5)},${longitude.toFixed(5)}`;
  }
  if (entry.kind === "equipment" && entry.equipment) {
    return `eq:${entry.equipment.serviceId}`;
  }
  return `misc:${createClientId("recent")}`;
}

function parseStored(raw: string | null): NearbyRecentSearchEntry[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (row): row is NearbyRecentSearchEntry =>
        row != null &&
        typeof row === "object" &&
        typeof (row as NearbyRecentSearchEntry).id === "string" &&
        typeof (row as NearbyRecentSearchEntry).kind === "string" &&
        typeof (row as NearbyRecentSearchEntry).createdAt === "number",
    );
  } catch {
    return [];
  }
}

function persist(entries: NearbyRecentSearchEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    /* quota / private mode */
  }
}

function labelForEntry(e: NearbyRecentSearchEntry): string {
  if (e.kind === "text" && e.text) return e.text;
  if (e.kind === "place" && e.place) return e.place.label;
  if (e.kind === "equipment" && e.equipment) return e.equipment.label;
  return "";
}

function entryMatchesQuery(e: NearbyRecentSearchEntry, q: string): boolean {
  if (!q) return true;
  const ql = q.toLowerCase();
  return labelForEntry(e).toLowerCase().includes(ql);
}

export function filterRecentEntriesForQuery(
  entries: NearbyRecentSearchEntry[],
  queryTrimmed: string,
  maxWhenTyping: number,
): NearbyRecentSearchEntry[] {
  const q = queryTrimmed.trim();
  if (!q) return entries;
  const matched = entries.filter((e) => entryMatchesQuery(e, q));
  return matched.slice(0, maxWhenTyping);
}

/**
 * Histórico de buscas na tela Perto de você (localStorage).
 * Com usuário autenticado: mescla com a nuvem ao carregar e reenvia alterações (debounce).
 */
export function useNearbySearchRecent() {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [entries, setEntries] = useState<NearbyRecentSearchEntry[]>(() => {
    if (typeof window === "undefined") return [];
    return parseStored(localStorage.getItem(STORAGE_KEY));
  });

  /** Após buscar na API, permite disparar sync ao nuvem sem sobrescrever com estado antigo. */
  const [cloudHydrated, setCloudHydrated] = useState(() => userId == null);

  useEffect(() => {
    persist(entries);
  }, [entries]);

  /** Hidratação / re-fetch quando o usuário muda. */
  useEffect(() => {
    if (!userId) {
      setCloudHydrated(true);
      return;
    }

    setCloudHydrated(false);
    let cancelled = false;

    (async () => {
      try {
        const remoteRaw = await withPoolRetry(() => fetchAppSuggestions(), {
          retries: 1,
          baseDelayMs: 900,
        });
        if (cancelled) return;
        const remoteEntries = remoteItemsToRecentEntries(remoteRaw);
        setEntries((prev) => mergeRecentLists(prev, remoteEntries));
      } catch (e) {
        console.warn("[useNearbySearchRecent] Falha ao carregar histórico na nuvem:", e);
      } finally {
        if (!cancelled) setCloudHydrated(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  /** Envia lista atual para o servidor (substitui o contexto no backend). */
  useEffect(() => {
    if (!userId || !cloudHydrated) return;

    const handle = window.setTimeout(() => {
      const payload = recentEntriesToSyncPayload(entries);
      void withPoolRetry(() => syncAppSuggestions(payload), {
        retries: 1,
        baseDelayMs: 900,
      }).catch((e) => console.warn("[useNearbySearchRecent] Falha ao sincronizar na nuvem:", e));
    }, CLOUD_SYNC_DEBOUNCE_MS);

    return () => window.clearTimeout(handle);
  }, [entries, userId, cloudHydrated]);

  const pushEntry = useCallback((next: Omit<NearbyRecentSearchEntry, "id" | "createdAt">) => {
    const id = stableEntryId(next);
    const row: NearbyRecentSearchEntry = {
      ...next,
      id,
      createdAt: Date.now(),
    };
    setEntries((prev) => {
      const withoutDup = prev.filter((p) => p.id !== id);
      return [row, ...withoutDup].slice(0, MAX_ENTRIES);
    });
  }, []);

  const addTextQuery = useCallback(
    (text: string) => {
      const t = text.trim();
      if (t.length < 2) return;
      pushEntry({ kind: "text", text: t });
    },
    [pushEntry],
  );

  const addPlace = useCallback(
    (place: NearbyRecentPlacePayload) => {
      pushEntry({ kind: "place", place });
    },
    [pushEntry],
  );

  const addEquipment = useCallback(
    (equipment: NearbyRecentEquipmentPayload) => {
      pushEntry({ kind: "equipment", equipment });
    },
    [pushEntry],
  );

  const removeEntry = useCallback((id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setEntries([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const sortedEntries = useMemo(
    () => [...entries].sort((a, b) => b.createdAt - a.createdAt),
    [entries],
  );

  return {
    entries: sortedEntries,
    addTextQuery,
    addPlace,
    addEquipment,
    removeEntry,
    clearAll,
    /** false só brevemente após login, enquanto busca o histórico remoto */
    cloudHydrated,
  };
}
