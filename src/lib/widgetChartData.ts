import type { WidgetConfig } from '@/components/analytics/DashboardPreview';
import { bairroParaZona } from '@/lib/regionMapping';

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function weekdayLabel(isoDate: string): string {
  const day = new Date(isoDate).getDay();
  return WEEKDAYS[day] ?? '—';
}

function monthLabel(isoDate: string): string {
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
}

function territoryLabel(item: Record<string, unknown>, dimension?: string): string {
  if (dimension && item[dimension] != null && String(item[dimension]).trim()) {
    return String(item[dimension]);
  }
  const neighborhood = item.neighborhood ?? item.bairro;
  if (neighborhood) {
    return bairroParaZona(String(neighborhood)) ?? String(neighborhood);
  }
  return 'Sem território';
}

/** Transforma linhas do Supabase no formato esperado por cada tipo de widget. */
export function processWidgetChartData(
  rawData: Record<string, unknown>[],
  widget: WidgetConfig,
): Record<string, unknown>[] {
  switch (widget.type) {
    case 'kpi-card':
      return [{ value: rawData.length, label: widget.title }];

    case 'bar-chart':
    case 'pie-chart': {
      const grouped = rawData.reduce<Record<string, number>>((acc, item) => {
        const key = territoryLabel(item, widget.dimension);
        acc[key] = (acc[key] ?? 0) + 1;
        return acc;
      }, {});
      return Object.entries(grouped)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 12);
    }

    case 'line-chart': {
      const grouped = rawData.reduce<Record<string, number>>((acc, item) => {
        const created = item.created_at;
        if (!created || typeof created !== 'string') return acc;
        const key = monthLabel(created);
        acc[key] = (acc[key] ?? 0) + 1;
        return acc;
      }, {});
      return Object.entries(grouped).map(([name, value]) => ({ name, value }));
    }

    case 'heatmap': {
      const counts = new Map<string, number>();
      for (const item of rawData) {
        const created = item.created_at;
        if (!created || typeof created !== 'string') continue;
        const x = territoryLabel(item, widget.dimension);
        const y = weekdayLabel(created);
        const key = `${x}|${y}`;
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
      return Array.from(counts.entries()).map(([key, value]) => {
        const [x, y] = key.split('|');
        return { x, y, value };
      });
    }

    default:
      return rawData;
  }
}
