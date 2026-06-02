import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { NewsCategory } from "@/data/noticias";

export interface Noticia {
  id: string;
  title: string;
  description: string;
  fullContent: string;
  link: string;
  pubDate: string;
  category: NewsCategory;
  imageUrl: string | null;
  readTime: string;
  source: string;
}

interface FetchNoticiasResponse {
  noticias: Noticia[];
  source: string;
  error?: string;
}

export function useNoticias() {
  return useQuery({
    queryKey: ["noticias"],
    queryFn: async (): Promise<Noticia[]> => {
      const { data, error } =
        await supabase.functions.invoke<FetchNoticiasResponse>("fetch-noticias");

      if (error) {
        console.error("[useNoticias] Edge function error:", error);
        throw new Error("Falha ao carregar notícias");
      }

      if (!data || data.error) {
        console.error("[useNoticias] API error:", data?.error);
        throw new Error(data?.error || "Falha ao carregar notícias");
      }

      console.log(`[useNoticias] Loaded ${data.noticias.length} news items from ${data.source}`);
      return data.noticias;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes cache
    retry: 2,
    retryDelay: 1000,
  });
}

export function useNoticiaById(id: string | undefined) {
  const { data: noticias, isLoading, error } = useNoticias();
  const noticia = id ? noticias?.find((n) => n.id === id) : undefined;
  return { noticia, isLoading, error };
}
