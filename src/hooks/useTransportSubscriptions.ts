import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type TransportSubscriptionWithLine = {
  id: string;
  user_id: string;
  line_id: string | null;
  pattern_id: string | null;
  subscription_type: string;
  created_at: string;
  transport_lines: {
    id: string;
    line_code: string;
    line_name: string;
    line_type: string;
  } | null;
};

export function useTransportSubscriptions() {
  const { user } = useAuth();
  const [subscriptions, setSubscriptions] = useState<TransportSubscriptionWithLine[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSubscriptions = useCallback(async () => {
    if (!user?.id) {
      setSubscriptions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from("transport_subscriptions")
      .select(`
        *,
        transport_lines (
          id,
          line_code,
          line_name,
          line_type
        )
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[useTransportSubscriptions] Error fetching:", error);
      toast.error("Não foi possível carregar suas inscrições em transporte.");
    } else {
      setSubscriptions((data || []) as TransportSubscriptionWithLine[]);
    }
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]);

  const toggleSubscription = async (lineId: string, active: boolean, type: string = "alert") => {
    if (!user?.id) return;

    // Optimistic update
    const previousSubs = [...subscriptions];
    
    if (active) {
      // Find the line info from existing lines to add optimistically
      // Note: We don't have allLines here, but we can at least show a loading state 
      // or wait for the actual refresh. For now, let's keep it simple but prevent double upsert.
      
      const { error } = await supabase
        .from("transport_subscriptions")
        .upsert(
          { user_id: user.id, line_id: lineId, subscription_type: type },
          { onConflict: 'user_id,line_id,subscription_type' }
        );

      if (error) {
        console.error("[useTransportSubscriptions] Error subscribing:", error);
        toast.error("Erro ao ativar inscrição.");
        return;
      }
      toast.success("Inscrição ativada.");
    } else {
      const { error } = await supabase
        .from("transport_subscriptions")
        .delete()
        .eq("user_id", user.id)
        .eq("line_id", lineId)
        .eq("subscription_type", type);

      if (error) {
        console.error("[useTransportSubscriptions] Error unsubscribing:", error);
        toast.error("Erro ao desativar inscrição.");
        return;
      }
      toast.success("Inscrição desativada.");
    }
    await fetchSubscriptions();
  };

  return { subscriptions, loading, toggleSubscription, refresh: fetchSubscriptions };
}
