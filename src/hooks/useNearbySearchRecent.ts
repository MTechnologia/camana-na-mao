import { useCallback, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "camana-nearby-search-recent-v1";
const MAX_ENTRIES = 12;

export type NearbyRecentPlacePayload = {
  latitude: number;
  longitude: number;
  label: string;
};

export type NearbyRecentEquipmentPayload = {
  serviceId: string;
  label: string;
  latitude: number;
  longitude: number;
};

export type NearbyRecentSearchEntry = {
  id: string;
  kind: "text" | "place" | "equipment";
  createdAt: number;
  text?: string;
  place?: NearbyRecentPlacePayload;
  equipment?: NearbyRecentEquipmentPayload;
};

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
  return `misc:${crypto.randomUUID()}`;
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
 * Histórico local (localStorage) de buscas na tela Perto de você: texto livre, lugares/CEP e equipamentos.
 */
export function useNearbySearchRecent() {
  const [entries, setEntries] = useState<NearbyRecentSearchEntry[]>(() => {
    if (typeof window === "undefined") return [];
    return parseStored(localStorage.getItem(STORAGE_KEY));
  });

  useEffect(() => {
    persist(entries);
  }, [entries]);

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
  };
}
