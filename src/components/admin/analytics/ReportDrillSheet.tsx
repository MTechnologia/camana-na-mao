import { X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAnalyticsDrill } from '@/contexts/AnalyticsDrillContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export function ReportDrillSheet() {
  const { throughOpen, closeDrillThrough, throughReports, selectedBar } = useAnalyticsDrill();

  if (!throughOpen || !selectedBar) return null;

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-50 bg-black/40"
        aria-label="Fechar painel de relatos"
        onClick={closeDrillThrough}
      />
      <aside
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-border bg-card shadow-xl"
        role="dialog"
        aria-labelledby="drill-through-title"
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <h2 id="drill-through-title" className="text-sm font-semibold text-foreground">
              Drill-through — relatos
            </h2>
            <p className="text-xs text-muted-foreground">Recorte: {selectedBar.label}</p>
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={closeDrillThrough} aria-label="Fechar">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <ul className="space-y-2">
            {throughReports.map((r) => (
              <li
                key={r.id}
                className="rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-mono text-xs text-muted-foreground">{r.id}</span>
                  <Badge variant="secondary" className="shrink-0 text-[10px]">
                    {r.status}
                  </Badge>
                </div>
                <p className="mt-1 font-medium text-foreground">{r.title}</p>
                <p className="text-xs text-muted-foreground">{r.createdAt}</p>
              </li>
            ))}
          </ul>
        </div>

        <div className="border-t border-border p-4">
          <Link
            to="/admin/reports"
            onClick={closeDrillThrough}
            className="inline-flex h-10 w-full items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium hover:bg-accent"
          >
            Abrir gestão de relatos
          </Link>
        </div>
      </aside>
    </>
  );
}
