import type { SupabaseClient } from "@supabase/supabase-js";

export interface CitizenLearningProfile {
  preferred_neighborhood?: string;
  preferred_region?: string;
  last_known_address?: { street?: string; neighborhood?: string; cep?: string };
  common_categories: string[];
  common_keywords: string[];
  communication_style: "formal" | "informal" | "concise";
  avg_message_length: number;
  prefers_short_responses: boolean;
  frequent_services: string[];
  frequent_transport_lines: string[];
  total_reports: number;
  total_conversations: number;
}

export async function loadCitizenProfile(
  userId: string,
  supabaseClient: SupabaseClient,
): Promise<CitizenLearningProfile | null> {
  try {
    const { data, error } = await supabaseClient
      .from("citizen_learning_profile")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error || !data) return null;
    return data as CitizenLearningProfile;
  } catch (e) {
    console.error("[loadCitizenProfile] Error:", e);
    return null;
  }
}

export async function learnFromConversation(
  userId: string,
  messages: Array<{ role: string; content: string }>,
  reportData: Record<string, unknown>,
  supabaseClient: SupabaseClient,
): Promise<void> {
  try {
    const userMessages = messages.filter((m) => m.role === "user");
    if (userMessages.length === 0) return;

    const avgLength = userMessages.reduce((sum, m) => sum + m.content.length, 0) / userMessages.length;

    let style: "formal" | "informal" | "concise" = "informal";
    if (avgLength < 20) style = "concise";
    else if (avgLength > 100) style = "formal";

    let neighborhood: string | null = null;
    for (const msg of userMessages) {
      const match = msg.content.match(/(?:bairro|em|no)\s+([A-ZÀ-Ú][a-zà-ú]+(?:\s+[A-ZÀ-Ú][a-zà-ú]+)?)/i);
      if (match) {
        neighborhood = match[1];
        break;
      }
    }

    const { data: existing } = await supabaseClient
      .from("citizen_learning_profile")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (existing) {
      const updates: Record<string, unknown> = {
        avg_message_length: Math.round((existing.avg_message_length + avgLength) / 2),
        communication_style: style,
        prefers_short_responses: avgLength < 30,
        total_conversations: existing.total_conversations + 1,
        last_interaction_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (neighborhood && !existing.preferred_neighborhood) {
        updates.preferred_neighborhood = neighborhood;
      }

      if (reportData.category) {
        const categories = existing.common_categories || [];
        if (!categories.includes(reportData.category)) {
          updates.common_categories = [...categories.slice(-9), reportData.category];
        }
      }

      if (reportData.neighborhood || reportData.street) {
        updates.last_known_address = {
          street: reportData.street,
          neighborhood: reportData.neighborhood || neighborhood,
          cep: reportData.cep,
        };
      }

      if (reportData.service_type) {
        const services = existing.frequent_services || [];
        if (!services.includes(reportData.service_type)) {
          updates.frequent_services = [...services.slice(-4), reportData.service_type];
        }
      }

      if (reportData.line_code) {
        const lines = existing.frequent_transport_lines || [];
        if (!lines.includes(reportData.line_code)) {
          updates.frequent_transport_lines = [...lines.slice(-4), reportData.line_code];
        }
      }

      await supabaseClient
        .from("citizen_learning_profile")
        .update(updates)
        .eq("user_id", userId);

      console.log("[learnFromConversation] Profile updated for user:", userId);
    } else {
      await supabaseClient
        .from("citizen_learning_profile")
        .insert({
          user_id: userId,
          preferred_neighborhood: neighborhood,
          common_categories: reportData.category ? [reportData.category] : [],
          communication_style: style,
          avg_message_length: Math.round(avgLength),
          prefers_short_responses: avgLength < 30,
          total_conversations: 1,
          frequent_services: reportData.service_type ? [reportData.service_type] : [],
          frequent_transport_lines: reportData.line_code ? [reportData.line_code] : [],
          last_interaction_at: new Date().toISOString(),
        });

      console.log("[learnFromConversation] Profile created for user:", userId);
    }
  } catch (error) {
    console.error("[learnFromConversation] Error:", error);
  }
}

export function getPersonalizedPromptAdditions(profile: CitizenLearningProfile | null): string {
  if (!profile) return "";

  const additions: string[] = [];

  if (profile.communication_style === "concise") {
    additions.push("O cidadão prefere respostas CURTAS e diretas. Seja objetivo, evite explicações longas.");
  } else if (profile.communication_style === "formal") {
    additions.push("O cidadão usa linguagem formal. Mantenha tom respeitoso e completo nas respostas.");
  }

  if (profile.last_known_address?.neighborhood) {
    additions.push(`SUGESTÃO: Último endereço conhecido: ${profile.last_known_address.neighborhood}. Se o problema for no mesmo local, pergunte "É no mesmo local (${profile.last_known_address.neighborhood})?" em vez de pedir tudo novamente.`);
  }

  if (profile.common_categories?.length > 0) {
    const topCategories = profile.common_categories.slice(-3);
    additions.push(`O cidadão costuma relatar problemas de: ${topCategories.join(", ")}.`);
  }

  if (profile.frequent_transport_lines?.length > 0) {
    const lines = profile.frequent_transport_lines.slice(-3);
    additions.push(`Linhas de transporte frequentes: ${lines.join(", ")}.`);
  }

  return additions.length > 0
    ? "\n\n=== PERSONALIZAÇÃO DO CIDADÃO ===\n" + additions.join("\n")
    : "";
}
