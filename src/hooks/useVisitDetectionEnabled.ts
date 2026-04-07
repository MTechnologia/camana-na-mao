import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { visitDetectionAllowedFromPreference } from "@/lib/visitDetectionPreference";

/**
 * Lê `visit_detection_enabled` em tempo quase real (fetch + Realtime) para o hook de visitas na web.
 */
export function useVisitDetectionEnabled(userId: string | undefined): boolean {
  const [allowed, setAllowed] = useState(true);

  const refetch = useCallback(async () => {
    if (!userId) {
      setAllowed(true);
      return;
    }
    const { data, error } = await supabase
      .from("user_preferences")
      .select("visit_detection_enabled")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.error("[useVisitDetectionEnabled]", error);
      return;
    }
    setAllowed(visitDetectionAllowedFromPreference(data?.visit_detection_enabled));
  }, [userId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`user_preferences_visit_detection_${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_preferences",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          void refetch();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, refetch]);

  return allowed;
}
