import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface EscolaParlamentoItem {
  id: string;
  wp_id: number;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  link: string;
  date: string;
  modified: string;
  parent: number | null;
  menu_order: number;
  imageUrl: string | null;
  category: string;
  status: string;
}

interface FetchEscolaParlamentoResponse {
  items: EscolaParlamentoItem[];
  total: number;
  source: "api" | "memory_cache" | "stale_memory_cache" | "database_cache";
  error?: string;
}

/**
 * Hook para buscar todos os itens da Escola do Parlamento
 */
export function useEscolaParlamento() {
  return useQuery({
    queryKey: ["escola-parlamento"],
    queryFn: async (): Promise<EscolaParlamentoItem[]> => {
      const { data, error } =
        await supabase.functions.invoke<FetchEscolaParlamentoResponse>("fetch-escola-parlamento");

      if (error) {
        console.error("[useEscolaParlamento] Edge function error:", error);
        throw new Error("Falha ao carregar dados da Escola do Parlamento");
      }

      if (!data || data.error) {
        console.error("[useEscolaParlamento] API error:", data?.error);
        throw new Error(data?.error || "Falha ao carregar dados da Escola do Parlamento");
      }

      console.log(`[useEscolaParlamento] Loaded ${data.total} items from ${data.source}`);
      return data.items;
    },
    staleTime: 30 * 60 * 1000, // 30 minutes (longer cache for static content)
    gcTime: 60 * 60 * 1000, // 1 hour cache
    retry: 2,
    retryDelay: 1000,
  });
}

/**
 * Hook para buscar um item específico por ID
 */
export function useEscolaParlamentoItem(id: string | undefined) {
  const { data: items, isLoading, error } = useEscolaParlamento();
  const item = id ? items?.find((i) => i.id === id || i.wp_id.toString() === id) : undefined;
  return { item, isLoading, error };
}

/**
 * Hook para buscar itens por categoria
 */
export function useEscolaParlamentoByCategory(category: string) {
  const { data: items, ...rest } = useEscolaParlamento();
  const filtered = items?.filter((item) => item.category === category) || [];
  return { items: filtered, ...rest };
}

/**
 * Hook para buscar cursos (categoria 'curso')
 */
export function useEscolaParlamentoCursos() {
  return useEscolaParlamentoByCategory("curso");
}

/**
 * Hook para buscar eventos (categoria 'evento')
 */
export function useEscolaParlamentoEventos() {
  return useEscolaParlamentoByCategory("evento");
}
