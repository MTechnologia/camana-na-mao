const DISABLE_JOURNEY_SNAPSHOT =
  String(import.meta.env.VITE_DISABLE_JOURNEY_SNAPSHOT ?? "").trim().toLowerCase() === "true" ||
  String(import.meta.env.VITE_DISABLE_JOURNEY_SNAPSHOT ?? "").trim().toLowerCase() === "1";

const LEGACY_ENABLE_JOURNEY_SNAPSHOT =
  String(import.meta.env.VITE_ENABLE_JOURNEY_SNAPSHOT ?? "").trim().toLowerCase();

/** CHB-026: snapshot ativo por padrão (opt-out via VITE_DISABLE_JOURNEY_SNAPSHOT). */
export const ENABLE_JOURNEY_SNAPSHOT =
  !DISABLE_JOURNEY_SNAPSHOT &&
  (LEGACY_ENABLE_JOURNEY_SNAPSHOT === "" ||
    LEGACY_ENABLE_JOURNEY_SNAPSHOT === "true" ||
    LEGACY_ENABLE_JOURNEY_SNAPSHOT === "1");

export function getTrackerStorageKey(convId: string | null): string | null {
  return convId ? `cmsp_tracker_${convId}` : null;
}
