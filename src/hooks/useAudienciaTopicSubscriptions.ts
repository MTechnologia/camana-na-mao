import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type AudienciaTopicSubscription = {
  id: string;
  user_id: string;
  tema: string;
  created_at: string;
};

export function useAudienciaTopicSubscriptions() {
  const { user } = useAuth();
  const [subscriptions, setSubscriptions] = useState<AudienciaTopicSubscription[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSubscriptions = useCallback(async () => {
    if (!user?.id) {
      setSubscriptions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from("audiencia_topic_alerts")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[useAudienciaTopicSubscriptions] Error fetching:", error);
      toast.error("Não foi possível carregar seus temas de interesse.");
    } else {
      setSubscriptions((data || []) as AudienciaTopicSubscription[]);
    }
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]);

  const toggleSubscription = async (tema: string, active: boolean) => {
    if (!user?.id) return;

    if (active) {
      const { error } = await supabase
        .from("audiencia_topic_alerts")
        .upsert(
          { user_id: user.id, tema },
          { onConflict: "user_id,tema", ignoreDuplicates: true },
        );

      if (error) {
        console.error("[useAudienciaTopicSubscriptions] Error subscribing:", error);
        toast.error("Erro ao ativar inscrição no tema.");
        return;
      }
      toast.success(`Inscrição em "${tema}" ativada.`);
    } else {
      const { error } = await supabase
        .from("audiencia_topic_alerts")
        .delete()
        .eq("user_id", user.id)
        .eq("tema", tema);

      if (error) {
        console.error("[useAudienciaTopicSubscriptions] Error unsubscribing:", error);
        toast.error("Erro ao desativar inscrição no tema.");
        return;
      }
      toast.success(`Inscrição em "${tema}" desativada.`);
    }
    await fetchSubscriptions();
  };

  return { subscriptions, loading, toggleSubscription, refresh: fetchSubscriptions };
}
