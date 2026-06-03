export type CommissionChartPoint = {
  id: string;
  label: string;
  fullName: string;
  value: number;
};

function truncateLabel(name: string, max = 36): string {
  return name.length > max ? `${name.slice(0, max)}…` : name;
}

export function commissionPointsFromDestinations(
  destinations: { id: string; name: string; activeReferrals: number }[],
): CommissionChartPoint[] {
  return destinations.map((d) => ({
    id: d.id,
    fullName: d.name,
    label: truncateLabel(d.name),
    value: d.activeReferrals,
  }));
}
