import { useEffect } from "react";
import {
  useOptionalAnalyticsLive,
  type AnalyticsLiveSource,
} from "@/contexts/AnalyticsLiveContext";

/** Registra fonte de atualização ao vivo (ex.: lista de relatos na gestão). */
export function useRegisterAnalyticsLive(
  id: string,
  source: AnalyticsLiveSource,
  enabled = true,
): void {
  const live = useOptionalAnalyticsLive();
  const { lastUpdate, refresh } = source;

  useEffect(() => {
    if (!live || !enabled) return;
    return live.register(id, { lastUpdate, refresh });
  }, [live, id, lastUpdate, refresh, enabled]);
}
