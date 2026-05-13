import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

export type ServiceSubscriptionWithService = Database["public"]["Tables"]["service_subscriptions"]["Row"] & {
  public_services: {
    id: string;
    name: string;
    service_type: Database["public"]["Enums"]["service_type"];
    address: string;
    district: string;
  } | null;
};

export function useServiceSubscriptions() {
  const { user } = useAuth();
  const [subscriptions, setSubscriptions] = useState<ServiceSubscriptionWithService[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSubscriptions = useCallback(async () => {
    if (!user?.id) {
      setSubscriptions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from("service_subscriptions")
      .select(`
        *,
        public_services (
          id,
          name,
          service_type,
          address,
          district
        )
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[useServiceSubscriptions] Error fetching:", error);
      toast.error("Não foi possível carregar suas inscrições em serviços.");
    } else {
      setSubscriptions((data || []) as ServiceSubscriptionWithService[]);
    }
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]);

  const toggleSubscription = async (serviceId: string, active: boolean) => {
    if (!user?.id) return;

    if (active) {
      // Create subscription
      const { error } = await supabase
        .from("service_subscriptions")
        .upsert(
          { user_id: user.id, service_id: serviceId },
          { onConflict: 'user_id,service_id' }
        );

      if (error) {
        console.error("[useServiceSubscriptions] Error subscribing:", error);
        toast.error("Erro ao ativar inscrição.");
        return;
      }
      toast.success("Inscrição ativada.");
    } else {
      // Delete subscription
      const { error } = await supabase
        .from("service_subscriptions")
        .delete()
        .eq("user_id", user.id)
        .eq("service_id", serviceId);

      if (error) {
        console.error("[useServiceSubscriptions] Error unsubscribing:", error);
        toast.error("Erro ao desativar inscrição.");
        return;
      }
      toast.success("Inscrição desativada.");
    }
    await fetchSubscriptions();
  };

  return { subscriptions, loading, toggleSubscription, refresh: fetchSubscriptions };
}
