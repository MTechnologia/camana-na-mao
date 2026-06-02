import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { RegionSentimentBreakdown } from "@/types/analyticsDrill";
import { SENTIMENT_COLORS, chartTooltipStyle } from "@/components/admin/analytics/chartTheme";
import { cn } from "@/lib/utils";

type SentimentPolarityPiesGridProps = {
  items: RegionSentimentBreakdown[];
  selectedId?: string;
  onItemClick?: (item: RegionSentimentBreakdown) => void;
  className?: string;
};

export function sentimentPolarityTotal(item: RegionSentimentBreakdown): number {
  return item.slices.reduce((sum, slice) => sum + slice.value, 0);
}

export function sentimentPolarityHasData(item: RegionSentimentBreakdown): boolean {
  return sentimentPolarityTotal(item) > 0;
}

const EMPTY_GRID_MESSAGE =
  "Não há dados de polaridade de sentimento para o recorte selecionado. Tente ampliar o período ou alterar os filtros.";

const EMPTY_CARD_MESSAGE = "Nenhum relato nesta zona no recorte atual.";

export function SentimentPolarityPiesGrid({
  items,
  selectedId,
  onItemClick,
  className,
}: SentimentPolarityPiesGridProps) {
  if (items.length === 0) {
    return (
      <p className="flex min-h-[168px] items-center justify-center px-4 text-center text-sm text-muted-foreground">
        {EMPTY_GRID_MESSAGE}
      </p>
    );
  }

  const withData = items.filter(sentimentPolarityHasData);

  if (withData.length === 0) {
    return (
      <p className="flex min-h-[168px] items-center justify-center px-4 text-center text-sm text-muted-foreground">
        {EMPTY_GRID_MESSAGE}
      </p>
    );
  }

  return (
    <div
      className={cn(
        "grid gap-3",
        items.length === 1
          ? "grid-cols-1 max-w-xs mx-auto"
          : "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5",
        className,
      )}
    >
      {items.map((item) => {
        const isSelected = selectedId === item.id;
        const hasData = sentimentPolarityHasData(item);
        const interactive = Boolean(onItemClick) && hasData;

        return (
          <div
            key={item.id}
            className={cn(
              "flex flex-col rounded-lg border border-border/80 bg-muted/15 p-2",
              interactive && "cursor-pointer transition-colors hover:bg-muted/30",
              isSelected && "border-primary ring-1 ring-primary/30",
              !hasData && "opacity-90",
            )}
            role={interactive ? "button" : undefined}
            tabIndex={interactive ? 0 : undefined}
            onClick={interactive ? () => onItemClick?.(item) : undefined}
            onKeyDown={
              interactive
                ? (e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onItemClick?.(item);
                    }
                  }
                : undefined
            }
          >
            <p className="mb-1 truncate text-center text-xs font-medium text-foreground">
              {item.label}
            </p>
            {hasData ? (
              <div className="h-[168px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={item.slices}
                      dataKey="value"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={62}
                      paddingAngle={2}
                    >
                      {item.slices.map((slice) => (
                        <Cell
                          key={slice.id}
                          fill={SENTIMENT_COLORS[slice.id] ?? "hsl(var(--chart-3))"}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={chartTooltipStyle}
                      formatter={(value, name) => [`${value}%`, String(name)]}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: 10 }}
                      iconSize={8}
                      layout="horizontal"
                      verticalAlign="bottom"
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div
                className="flex h-[168px] flex-col items-center justify-center gap-2 px-2 text-center"
                aria-label={`${item.label}: ${EMPTY_CARD_MESSAGE}`}
              >
                <p className="text-xs leading-snug text-muted-foreground">{EMPTY_CARD_MESSAGE}</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
