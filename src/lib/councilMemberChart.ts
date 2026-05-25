import type { ReferralDestination } from '@/lib/referralDestinations';

export type CouncilMemberChartPoint = {
  id: string;
  label: string;
  fullName: string;
  value: number;
};

function truncateLabel(name: string, max = 28): string {
  const base = name.split(' (')[0];
  return base.length > max ? `${base.slice(0, max)}…` : base;
}

export function councilMemberPointsFromDestinations(
  destinations: ReferralDestination[],
): CouncilMemberChartPoint[] {
  return destinations
    .filter((d) => d.activeReferrals > 0)
    .slice(0, 12)
    .map((d) => ({
      id: d.id,
      fullName: d.name,
      label: truncateLabel(d.name),
      value: d.activeReferrals,
    }));
}
