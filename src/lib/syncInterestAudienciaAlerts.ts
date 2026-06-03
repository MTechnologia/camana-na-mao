import { supabase } from "@/integrations/supabase/client";
import { interestCategoriesToAudienciaTemas } from "@/lib/interestAudienciaMapping";

/**
 * Espelha interesses do perfil em audiencia_topic_alerts para avisos e recomendações.
 */
export async function syncInterestAudienciaAlerts(
  userId: string,
  interestCategories: string[],
): Promise<{ synced: string[]; error?: string }> {
  const temas = interestCategoriesToAudienciaTemas(interestCategories);
  if (temas.length === 0) {
    return { synced: [] };
  }

  const rows = temas.map((tema) => ({ user_id: userId, tema }));
  const { error } = await supabase
    .from("audiencia_topic_alerts")
    .upsert(rows, { onConflict: "user_id,tema", ignoreDuplicates: true });

  if (error) {
    console.error("[syncInterestAudienciaAlerts]", error);
    return { synced: [], error: error.message };
  }

  return { synced: temas };
}
