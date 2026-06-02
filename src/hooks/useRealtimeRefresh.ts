import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * HU-1.5 — Hook genérico para "vincular" um callback de refresh a mudanças
 * em uma ou mais tabelas do Supabase via Realtime channels.
 *
 * Uso:
 *   const { lastUpdate, refresh } = useRealtimeRefresh(
 *     ["urban_reports", "transport_reports"],
 *     () => myFetchFn(),
 *   );
 *
 * Retorna o timestamp da última mudança detectada e um `refresh` manual
 * (que também atualiza o lastUpdate). Faz cleanup automático em unmount.
 *
 * IMPORTANTE: o callback é executado em modo trailing-edge com debounce
 * de 600ms para evitar tempestade de refetches durante bursts de mudanças.
 */

const DEBOUNCE_MS = 600;

export interface UseRealtimeRefreshResult {
  lastUpdate: Date | null;
  refresh: () => void;
}

export function useRealtimeRefresh(
  tables: readonly string[],
  onChange: () => void,
): UseRealtimeRefreshResult {
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const onChangeRef = useRef(onChange);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Mantém a referência da função estável para o canal
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const triggerDebounced = () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      setLastUpdate(new Date());
      onChangeRef.current();
      debounceTimerRef.current = null;
    }, DEBOUNCE_MS);
  };

  useEffect(() => {
    if (tables.length === 0) return;
    const channelName = `realtime-refresh-${tables.join("-")}`;

    // Realtime é um EXTRA (atualização ao vivo). Se o backend não estiver
    // disponível (ex.: dev sem Supabase, sem rede, client mal configurado),
    // a criação/assinatura do canal pode lançar — e isso NÃO pode derrubar a
    // tela admin "viva", que ainda funciona via fetch normal. Por isso todo o
    // setup é defensivo: em falha, seguimos sem live updates.
    let channel: ReturnType<typeof supabase.channel> | null = null;
    try {
      channel = supabase.channel(channelName);
      tables.forEach((table) => {
        channel!.on(
          // Tipos do supabase-js usam string literal; widening seguro aqui.
          "postgres_changes" as never,
          { event: "*", schema: "public", table } as never,
          () => triggerDebounced(),
        );
      });
      void channel.subscribe();
    } catch (err) {
      console.warn(
        "[useRealtimeRefresh] realtime indisponível; seguindo sem atualização ao vivo",
        err,
      );
      channel = null;
    }

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      if (!channel) return;
      try {
        void supabase.removeChannel(channel);
      } catch (err) {
        console.warn("[useRealtimeRefresh] falha ao remover canal realtime", err);
      }
    };
    // tables é estável (passado como string[] literal nas chamadas), então
    // serializamos pra estabilidade da dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tables.join("|")]);

  const refresh = () => {
    setLastUpdate(new Date());
    onChangeRef.current();
  };

  return { lastUpdate, refresh };
}
