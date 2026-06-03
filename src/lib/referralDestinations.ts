import { supabase } from "@/integrations/supabase/client";
import { rankDestinations } from "@/lib/referralRoutingEngine";
import { DEFAULT_REFERRAL_ROUTING_RULES } from "@/lib/referralRoutingRulesDefaults";
import type { ReferralRoutingRules } from "@/types/referralRoutingRules";

/** Destino de encaminhamento — comissão ou vereador. */
export type ReferralDestination = {
  id: string;
  name: string;
  themes: string[];
  activeReferrals: number;
  matchScore?: number;
};

const ACTIVE_REFERRAL_STATUSES = ["pending", "sent", "acknowledged"] as const;

async function countActiveReferralsByCommission(): Promise<Map<string, number>> {
  const { data, error } = await supabase
    .from("council_member_referrals")
    .select("legislative_commission_id")
    .in("status", [...ACTIVE_REFERRAL_STATUSES])
    .not("legislative_commission_id", "is", null);

  if (error) {
    console.warn("[referralDestinations] commission counts", error.message);
    return new Map();
  }

  const map = new Map<string, number>();
  for (const row of data ?? []) {
    const id = row.legislative_commission_id as string;
    map.set(id, (map.get(id) ?? 0) + 1);
  }
  return map;
}

async function countActiveReferralsByCouncilMember(): Promise<Map<string, number>> {
  const { data, error } = await supabase
    .from("council_member_referrals")
    .select("council_member_id")
    .in("status", [...ACTIVE_REFERRAL_STATUSES]);

  if (error) {
    console.warn("[referralDestinations] council counts", error.message);
    return new Map();
  }

  const map = new Map<string, number>();
  for (const row of data ?? []) {
    const id = row.council_member_id as string;
    map.set(id, (map.get(id) ?? 0) + 1);
  }
  return map;
}

export async function fetchThematicCommissions(): Promise<ReferralDestination[]> {
  const [counts, { data, error }] = await Promise.all([
    countActiveReferralsByCommission(),
    supabase
      .from("legislative_commissions")
      .select("id, name, match_keywords, active")
      .eq("active", true)
      .order("sort_order", { ascending: true }),
  ]);

  if (error) {
    console.warn("[referralDestinations] commissions", error.message);
    return [];
  }

  return (data ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    themes: (c.match_keywords as string[] | null)?.filter(Boolean) ?? [],
    activeReferrals: counts.get(c.id) ?? 0,
  }));
}

export async function fetchCouncilMemberDestinations(): Promise<ReferralDestination[]> {
  const [counts, { data, error }] = await Promise.all([
    countActiveReferralsByCouncilMember(),
    supabase
      .from("council_members_cache")
      .select("id, name, party, region, is_on_leave")
      .eq("is_on_leave", false)
      .order("name", { ascending: true })
      .limit(80),
  ]);

  if (error) {
    console.warn("[referralDestinations] council members", error.message);
    return [];
  }

  return (data ?? []).map((m) => ({
    id: m.id,
    name: m.party ? `${m.name} (${m.party})` : m.name,
    themes: m.region ? [m.region] : [],
    activeReferrals: counts.get(m.id) ?? 0,
  }));
}

export function suggestDestinations(
  category: string,
  type: "commission" | "councillor",
  commissions: ReferralDestination[],
  councilMembers: ReferralDestination[],
  rules: ReferralRoutingRules = DEFAULT_REFERRAL_ROUTING_RULES,
) {
  const list = type === "commission" ? commissions : councilMembers;
  return rankDestinations(category, list, rules);
}
