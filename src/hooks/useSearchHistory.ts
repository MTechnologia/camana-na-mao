import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface SearchHistoryItem {
  id: string;
  search_query: string;
  search_type: string;
  created_at: string;
}

export const useSearchHistory = () => {
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchHistory = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("search_history")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      setHistory(data || []);
    } catch (error) {
      console.error("Error fetching search history:", error);
    } finally {
      setLoading(false);
    }
  };

  const addToHistory = async (query: string, type: string = "general") => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from("search_history").insert({
        user_id: user.id,
        search_query: query,
        search_type: type,
        result_count: 0,
      });

      if (error) throw error;
      await fetchHistory();
    } catch (error) {
      console.error("Error adding to history:", error);
    }
  };

  const clearHistory = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from("search_history").delete().eq("user_id", user.id);

      if (error) throw error;
      setHistory([]);
      toast({
        title: "Histórico limpo",
        description: "Seu histórico de buscas foi removido.",
      });
    } catch (error) {
      console.error("Error clearing history:", error);
      toast({
        title: "Erro",
        description: "Não foi possível limpar o histórico.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  return {
    history,
    loading,
    addToHistory,
    clearHistory,
    refreshHistory: fetchHistory,
  };
};
