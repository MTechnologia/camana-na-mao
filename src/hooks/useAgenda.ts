import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AgendaItem {
  id: string;
  title: string;
  description: string;
  link: string;
  eventDate: string;
  eventTime: string;
  location: string;
  eventType: "sessao" | "comissao" | "audiencia" | "cerimonia" | "reuniao" | "geral";
  organizer: string;
  source: string;
  imageUrl?: string;
}

interface AgendaResponse {
  agenda: AgendaItem[];
  source: string;
  count: number;
}

/**
 * Fetch all agenda items from the Edge Function
 */
export function useAgenda() {
  return useQuery({
    queryKey: ["agenda-cmsp"],
    queryFn: async (): Promise<AgendaItem[]> => {
      const { data, error } = await supabase.functions.invoke<AgendaResponse>("fetch-agenda");

      if (error) {
        console.error("[useAgenda] Edge function error:", error);
        throw error;
      }

      if (!data?.agenda) {
        console.warn("[useAgenda] No agenda data returned");
        return [];
      }

      console.log(`[useAgenda] Loaded ${data.count} items from ${data.source}`);
      return data.agenda;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes cache
    retry: 2,
    retryDelay: 1000,
  });
}

/**
 * Filter agenda to only upcoming events (today and future)
 */
export function useUpcomingAgenda(limit?: number) {
  const { data: agenda, ...rest } = useAgenda();

  const today = new Date().toISOString().split("T")[0];
  let upcoming = agenda?.filter((item) => item.eventDate >= today) || [];

  // Sort by date ascending (soonest first)
  upcoming.sort((a, b) => a.eventDate.localeCompare(b.eventDate));

  if (limit) {
    upcoming = upcoming.slice(0, limit);
  }

  return { data: upcoming, ...rest };
}

/**
 * Filter agenda to past events
 */
export function usePastAgenda() {
  const { data: agenda, ...rest } = useAgenda();

  const today = new Date().toISOString().split("T")[0];
  const past = agenda?.filter((item) => item.eventDate < today) || [];

  // Sort by date descending (most recent first)
  past.sort((a, b) => b.eventDate.localeCompare(a.eventDate));

  return { data: past, ...rest };
}

/**
 * Get a single agenda item by ID
 */
export function useAgendaById(id: string | undefined) {
  const { data: agenda, isLoading, error } = useAgenda();

  const item = id ? agenda?.find((a) => a.id === id) : undefined;

  return { data: item, isLoading, error };
}

/**
 * Filter agenda by event type
 */
export function useAgendaByType(eventType: AgendaItem["eventType"] | "all") {
  const { data: agenda, ...rest } = useAgenda();

  if (eventType === "all") {
    return { data: agenda || [], ...rest };
  }

  const filtered = agenda?.filter((item) => item.eventType === eventType) || [];

  return { data: filtered, ...rest };
}

/**
 * Get event type label and color for UI display
 */
export function getEventTypeConfig(eventType: AgendaItem["eventType"]) {
  const config: Record<AgendaItem["eventType"], { label: string; color: string }> = {
    sessao: { label: "Sessão", color: "bg-blue-100 text-blue-800" },
    comissao: { label: "Comissão", color: "bg-purple-100 text-purple-800" },
    audiencia: { label: "Audiência", color: "bg-green-100 text-green-800" },
    cerimonia: { label: "Cerimônia", color: "bg-amber-100 text-amber-800" },
    reuniao: { label: "Reunião", color: "bg-gray-100 text-gray-800" },
    geral: { label: "Evento", color: "bg-slate-100 text-slate-800" },
  };

  return config[eventType] || config.geral;
}
