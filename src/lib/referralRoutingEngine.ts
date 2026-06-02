import type { ReferralDestination } from "@/lib/referralDestinations";
import type { ReferralRoutingRules, ScoredReferralDestination } from "@/types/referralRoutingRules";

function normalize(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
}

function themeMatchesCategory(category: string, themes: string[], minTokenLength: number): boolean {
  const cat = normalize(category);
  return themes.some((theme) => {
    const t = normalize(theme);
    if (cat.includes(t) || t.includes(cat)) return true;
    const tokens = t.split(/[\s,/]+/).filter((w) => w.length >= minTokenLength);
    return tokens.some((w) => cat.includes(w));
  });
}

/** Score de afinidade 0–100 para um destino e a categoria do relato. */
export function scoreDestination(
  category: string,
  destination: ReferralDestination,
  rules: ReferralRoutingRules,
  maxLoadInList: number,
): number {
  if (!rules.enabled) return 50;

  let score = 0;

  if (rules.prioritizeThemeMatch) {
    const matched = themeMatchesCategory(category, destination.themes, rules.minThemeTokenLength);
    if (matched) score += rules.themeMatchWeight;
  }

  if (rules.considerActiveLoad && maxLoadInList > 0) {
    const ratio = destination.activeReferrals / maxLoadInList;
    const loadPoints = rules.preferLowerLoad
      ? (1 - ratio) * rules.loadWeight
      : ratio * rules.loadWeight;
    score += Math.round(loadPoints);
  }

  return Math.min(100, Math.max(0, score));
}

export function rankDestinations(
  category: string,
  destinations: ReferralDestination[],
  rules: ReferralRoutingRules,
): ScoredReferralDestination[] {
  const maxLoad = Math.max(1, ...destinations.map((d) => d.activeReferrals));

  const scored = destinations.map((d) => ({
    ...d,
    matchScore: scoreDestination(category, d, rules, maxLoad),
  }));

  if (!rules.enabled) return scored;

  return [...scored].sort((a, b) => {
    if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
    if (rules.considerActiveLoad) {
      return rules.preferLowerLoad
        ? a.activeReferrals - b.activeReferrals
        : b.activeReferrals - a.activeReferrals;
    }
    return a.name.localeCompare(b.name, "pt-BR");
  });
}

export function pairMatchScore(
  category: string,
  commission: ReferralDestination,
  councillor: ReferralDestination,
  rules: ReferralRoutingRules,
): number {
  const maxCom = Math.max(1, commission.activeReferrals);
  const maxVer = Math.max(1, councillor.activeReferrals);
  const s1 = scoreDestination(category, commission, rules, maxCom);
  const s2 = scoreDestination(category, councillor, rules, maxVer);
  return Math.round((s1 + s2) / 2);
}
