import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * HU-13.2 — Hook de medição de performance.
 *
 * Marca o início no mount e o fim quando `isReady` vira true (geralmente
 * quando o hook de dados terminou de carregar). Envia a duração para
 * `performance_metrics` no Supabase, onde o script analyze-performance
 * agrega P50/P95/P99 para validar SLA 3s.
 *
 * Uso típico em um hook analítico:
 *
 *   const { data, isLoading } = useReportsAnalytics(...);
 *   usePerformanceMark("analytics_load", !isLoading && data != null);
 *
 * Envia apenas a primeira medição por mount (resets quando o componente
 * desmonta). Falha silenciosa — não bloqueia UX em caso de erro de rede.
 */

const SAMPLING_RATE = 1.0; // 100% das medições enviadas. Reduzir em prod se ficar caro.

export function usePerformanceMark(
  marker: string,
  isReady: boolean,
  options: { metadata?: Record<string, unknown> } = {},
): void {
  const startedAtRef = useRef<number | null>(null);
  const sentRef = useRef(false);

  useEffect(() => {
    if (startedAtRef.current === null) {
      startedAtRef.current = performance.now();
    }
  }, []);

  useEffect(() => {
    if (!isReady || sentRef.current || startedAtRef.current === null) return;
    if (Math.random() > SAMPLING_RATE) {
      sentRef.current = true; // pula, mas marca como enviado pra não tentar de novo
      return;
    }

    const duration = Math.round(performance.now() - startedAtRef.current);
    sentRef.current = true;

    // Best-effort: ignora erros pra não atrapalhar UX.
    void (async () => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData?.user?.id ?? null;
        const route =
          typeof window !== "undefined" ? window.location.pathname : "unknown";

        await supabase.from("performance_metrics").insert({
          route,
          marker,
          duration_ms: duration,
          user_id: userId,
          metadata: {
            viewport: typeof window !== "undefined"
              ? { w: window.innerWidth, h: window.innerHeight }
              : null,
            ua: typeof navigator !== "undefined" ? navigator.userAgent : null,
            ...(options.metadata ?? {}),
          },
        });

        // Log local pra dev acompanhar no console.
        if (import.meta.env.DEV) {
          // eslint-disable-next-line no-console
          console.debug(
            `[perf] ${marker} (${route}): ${duration}ms`,
            duration > 3000 ? "❌ SLA fail" : "✅",
          );
        }
      } catch (err) {
        // Silencioso.
        if (import.meta.env.DEV) {
          // eslint-disable-next-line no-console
          console.debug("[perf] insert failed:", err);
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, marker]);
}
