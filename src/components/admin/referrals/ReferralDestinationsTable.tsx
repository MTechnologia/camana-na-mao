import { Badge } from '@/components/ui/badge';
import type { ReferralDestination } from '@/lib/referralDestinations';

export function ReferralDestinationsTable({
  title,
  description,
  destinations,
  nameColumnLabel,
  onDestinationClick,
}: {
  title: string;
  description: string;
  destinations: ReferralDestination[];
  nameColumnLabel: string;
  /** Abre fila operacional (ex.: Gestão de relatos) para a comissão. */
  onDestinationClick?: (destination: ReferralDestination) => void;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="border-b border-border bg-muted/40 px-4 py-3">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
      <table className="w-full text-left text-sm">
        <thead className="border-b border-border bg-muted/30 text-xs uppercase text-muted-foreground">
          <tr>
            <th className="px-4 py-3 font-medium">{nameColumnLabel}</th>
            <th className="px-4 py-3 font-medium">Temas de afinidade</th>
            <th className="px-4 py-3 font-medium text-right">Em andamento</th>
          </tr>
        </thead>
        <tbody>
          {destinations.map((d) => (
            <tr
              key={d.id}
              className={
                onDestinationClick
                  ? 'cursor-pointer border-b border-border last:border-0 hover:bg-muted/40'
                  : 'border-b border-border last:border-0 hover:bg-muted/30'
              }
              onClick={onDestinationClick ? () => onDestinationClick(d) : undefined}
              onKeyDown={
                onDestinationClick
                  ? (e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onDestinationClick(d);
                      }
                    }
                  : undefined
              }
              tabIndex={onDestinationClick ? 0 : undefined}
              role={onDestinationClick ? 'button' : undefined}
            >
              <td className="px-4 py-3 font-medium text-foreground">{d.name}</td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1">
                  {d.themes.map((theme) => (
                    <Badge key={theme} variant="secondary" className="text-[10px] font-normal">
                      {theme}
                    </Badge>
                  ))}
                </div>
              </td>
              <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                {d.activeReferrals}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
