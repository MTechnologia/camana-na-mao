import { supabase } from "@/integrations/supabase/client";
import type { NearbyRecentSearchEntry } from "@/types/nearbySearchRecent";

/** Deve coincidir com o default no backend (`user_app_suggestions.context`). */
export const APP_SUGGESTIONS_CONTEXT_NEARBY = "nearby_search";

export type RemoteAppSuggestionItem = {
  stableId: string;
  kind: "text" | "place" | "equipment";
  label: string;
  payload: Record<string, unknown>;
  lastTouchedAt?: string;
};

type SyncListResponse = { ok: boolean; context: string; items: RemoteAppSuggestionItem[] };
type SyncSaveResponse = { ok: boolean; context: string; count: number };

function asNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
  return null;
}

function asString(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}

/** Converte entradas do histórico local (Perto de você) para o formato da API. */
export function recentEntriesToSyncPayload(
  entries: NearbyRecentSearchEntry[],
): RemoteAppSuggestionItem[] {
  const out: RemoteAppSuggestionItem[] = [];
  for (const e of entries) {
    const lastTouchedAt = new Date(e.createdAt).toISOString();
    if (e.kind === "text" && e.text?.trim()) {
      const text = e.text.trim();
      out.push({
        stableId: e.id,
        kind: "text",
        label: text,
        lastTouchedAt,
        payload: { text },
      });
      continue;
    }
    if (e.kind === "place" && e.place) {
      out.push({
        stableId: e.id,
        kind: "place",
        label: e.place.label,
        lastTouchedAt,
        payload: {
          latitude: e.place.latitude,
          longitude: e.place.longitude,
          label: e.place.label,
        },
      });
      continue;
    }
    if (e.kind === "equipment" && e.equipment) {
      out.push({
        stableId: e.id,
        kind: "equipment",
        label: e.equipment.label,
        lastTouchedAt,
        payload: {
          serviceId: e.equipment.serviceId,
          label: e.equipment.label,
          latitude: e.equipment.latitude,
          longitude: e.equipment.longitude,
        },
      });
    }
  }
  return out;
}

/** Converte resposta da API para o formato do hook `useNearbySearchRecent`. */
export function remoteItemsToRecentEntries(
  items: RemoteAppSuggestionItem[],
): NearbyRecentSearchEntry[] {
  const result: NearbyRecentSearchEntry[] = [];
  for (const it of items) {
    const createdAt = it.lastTouchedAt ? Date.parse(it.lastTouchedAt) : Date.now();
    const ts = Number.isFinite(createdAt) ? createdAt : Date.now();
    const p = it.payload ?? {};

    if (it.kind === "text") {
      const text = asString(p.text) ?? it.label;
      if (!text.trim()) continue;
      result.push({ id: it.stableId, kind: "text", createdAt: ts, text: text.trim() });
      continue;
    }

    if (it.kind === "place") {
      const lat = asNumber(p.latitude);
      const lng = asNumber(p.longitude);
      const label = asString(p.label) ?? it.label;
      if (lat == null || lng == null || !label.trim()) continue;
      result.push({
        id: it.stableId,
        kind: "place",
        createdAt: ts,
        place: { latitude: lat, longitude: lng, label: label.trim() },
      });
      continue;
    }

    if (it.kind === "equipment") {
      const serviceId = asString(p.serviceId);
      const label = asString(p.label) ?? it.label;
      const lat = asNumber(p.latitude);
      const lng = asNumber(p.longitude);
      if (!serviceId || !label.trim() || lat == null || lng == null) continue;
      result.push({
        id: it.stableId,
        kind: "equipment",
        createdAt: ts,
        equipment: { serviceId, label: label.trim(), latitude: lat, longitude: lng },
      });
    }
  }
  return result;
}

/** Lista sugestões salvas no servidor para o usuário autenticado. */
export async function fetchAppSuggestions(
  context: string = APP_SUGGESTIONS_CONTEXT_NEARBY,
): Promise<RemoteAppSuggestionItem[]> {
  const { data, error } = await supabase.functions.invoke<SyncListResponse>(
    "sync-app-suggestions",
    {
      body: { action: "list", context },
    },
  );
  if (error) throw new Error(error.message);
  if (!data?.ok || !Array.isArray(data.items)) throw new Error("Resposta inválida do servidor");
  return data.items;
}

/**
 * Substitui no servidor todas as sugestões daquele contexto (mesma semântica do histórico local: lista completa).
 */
export async function syncAppSuggestions(
  items: RemoteAppSuggestionItem[],
  context: string = APP_SUGGESTIONS_CONTEXT_NEARBY,
): Promise<number> {
  const { data, error } = await supabase.functions.invoke<SyncSaveResponse>(
    "sync-app-suggestions",
    {
      body: { action: "sync", context, items },
    },
  );
  if (error) throw new Error(error.message);
  if (!data?.ok) throw new Error("Falha ao sincronizar sugestões");
  return data.count ?? items.length;
}
