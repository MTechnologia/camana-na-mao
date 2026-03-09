import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface PendingRating {
  id: string;
  service_id: string;
  visited_at: string;
  expires_at: string;
  status: string;
  service: {
    id: string;
    name: string;
    service_type: string;
    address: string;
    district: string;
  };
}

const DEFAULT_PENDING_LIMIT = 3;

export const usePendingRatings = (options?: { limit?: number }) => {
  const limit = options?.limit ?? DEFAULT_PENDING_LIMIT;
  const { user } = useAuth();
  const [pendingRatings, setPendingRatings] = useState<PendingRating[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPendingRatings = useCallback(async () => {
    if (!user) {
      setPendingRatings([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from("service_visits")
        .select(`
          id,
          service_id,
          visited_at,
          expires_at,
          status,
          service:public_services (
            id,
            name,
            service_type,
            address,
            district
          )
        `)
        .eq("user_id", user.id)
        .eq("status", "pending")
        .gt("expires_at", new Date().toISOString())
        .order("visited_at", { ascending: false })
        .limit(limit);

      if (fetchError) throw fetchError;

      setPendingRatings((data as Array<Record<string, unknown>>) || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erro ao buscar avaliações pendentes";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user, limit]);

  useEffect(() => {
    fetchPendingRatings();
  }, [fetchPendingRatings]);

  const markAsSkipped = async (visitId: string) => {
    try {
      const { error: updateError } = await supabase
        .from("service_visits")
        .update({ status: "skipped" })
        .eq("id", visitId)
        .eq("user_id", user?.id);

      if (updateError) throw updateError;

      setPendingRatings(prev => prev.filter(r => r.id !== visitId));
      toast.success("Avaliação dispensada");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erro ao dispensar avaliação";
      toast.error(errorMessage);
    }
  };

  return {
    pendingRatings,
    loading,
    error,
    refetch: fetchPendingRatings,
    markAsSkipped,
  };
};
