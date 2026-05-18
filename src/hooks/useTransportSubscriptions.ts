import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { resolveTransportLine } from "@/lib/transportLinesApi";
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

  const toggleSubscription = async (
    lineId: string,
    active: boolean,
    type: string = "alert",
  ) => {
    if (!user?.id) return;
    if (!lineId?.trim()) {
      toast.error("Não foi possível identificar a linha para acompanhar.");
      return;
    }

    if (active) {
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

  /** Resolve linha na Olho Vivo / transport_lines e inscreve (NREF005). */
  const subscribeToLine = async (
    line: {
      id?: string | null;
      line_code: string;
      line_name: string;
      line_type?: string;
      sptrans_codigo_linha?: number | null;
    },
    type: string = "alert",
  ) => {
    if (!user?.id) return;

    try {
      let lineId = line.id?.trim() || "";
      if (!lineId) {
        const resolved = await resolveTransportLine({
          line_code: line.line_code,
          line_name: line.line_name,
          sptrans_codigo_linha: line.sptrans_codigo_linha,
          line_type: line.line_type,
        });
        lineId = resolved.id;
      }
      await toggleSubscription(lineId, true, type);
    } catch (err) {
      console.error("[useTransportSubscriptions] subscribeToLine", err);
      toast.error("Não foi possível seguir esta linha. Tente novamente.");
    }
  };

  return {
    subscriptions,
    loading,
    toggleSubscription,
    subscribeToLine,
    refresh: fetchSubscriptions,
  };
}
