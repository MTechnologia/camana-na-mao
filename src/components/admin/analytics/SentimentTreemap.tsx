import { ResponsiveContainer, Treemap } from "recharts";
import type { SentimentTreemapCell } from "@/types/analyticsDrill";

/**
 * Treemap de sentimento por território: tamanho = volume real de relatos,
 * cor = sentimento médio real (verde/neutro/vermelho); cinza quando não há
 * amostra real de sentimento. Clicar drila para o próximo nível (volume real).
 */

type SentimentTreemapProps = {
  cells: SentimentTreemapCell[];
  selectedId?: string;
  onSelect?: (cell: SentimentTreemapCell) => void;
};

type CellStyle = { fill: string; darkText: boolean; tone: string };

function styleForScore(score: number | null): CellStyle {
  if (score == null) return { fill: "hsl(215 16% 60%)", darkText: false, tone: "Sem amostra" };
  if (score >= 55) return { fill: "hsl(var(--chart-1))", darkText: false, tone: "Positivo" };
  if (score <= 45) return { fill: "hsl(var(--chart-5))", darkText: false, tone: "Negativo" };
  return { fill: "hsl(var(--chart-3))", darkText: true, tone: "Neutro" };
}

/**
 * O recharts espalha os dados do nó diretamente nas props do `content`
 * (ver Treemap.renderNode). Lemos `sentimentScore`/`label`/`volume` daqui — e
 * NÃO via `cells[index]` — porque `index` é a posição no layout squarificado,
 * que muda entre o render inicial (largura 0) e o redimensionado, fazendo a cor
 * "piscar" e voltar para cinza ao apontar para a célula errada.
 */
type TreemapNodeProps = Partial<SentimentTreemapCell> & {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  depth?: number;
  index?: number;
  selectedId?: string;
  onSelect?: (cell: SentimentTreemapCell) => void;
};

/** Trunca o rótulo ao que cabe na largura da caixa (≈ 6.8px/char em 12px/600). */
function fitLabel(label: string, width: number): string {
  const max = Math.max(0, Math.floor((width - 16) / 6.8));
  if (label.length <= max) return label;
  if (max <= 1) return "";
  return `${label.slice(0, max - 1)}…`;
}

function TreemapCell({
  x = 0,
  y = 0,
  width = 0,
  height = 0,
  depth = 1,
  index = 0,
  id,
  label,
  volume = 0,
  sentimentScore = null,
  filterKey,
  filterValue,
  selectedId,
  onSelect,
}: TreemapNodeProps) {
  if (depth === 0 || id == null) return <g />; // nó raiz cobre toda a área — não pintamos

  const cell: SentimentTreemapCell = {
    id,
    label: label ?? "",
    volume,
    sentimentScore,
    filterKey: filterKey ?? "region",
    filterValue: filterValue ?? id,
  };

  const { fill, darkText } = styleForScore(sentimentScore);
  const textColor = darkText ? "hsl(var(--foreground))" : "#ffffff";
  const selected = selectedId === id;
  const showLabel = width > 64 && height > 38;
  const clipId = `tm-clip-${index}-${Math.round(x)}-${Math.round(y)}`;

  return (
    <g style={{ cursor: onSelect ? "pointer" : "default" }} onClick={() => onSelect?.(cell)}>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={6}
        style={{
          fill,
          stroke: selected ? "hsl(var(--primary))" : "hsl(var(--card))",
          strokeWidth: selected ? 3 : 2,
        }}
      />
      {showLabel ? (
        <>
          <clipPath id={clipId}>
            <rect x={x} y={y} width={width} height={height} rx={6} />
          </clipPath>
          <text
            x={x + 8}
            y={y + 20}
            fill={textColor}
            fontSize={12}
            fontWeight={600}
            clipPath={`url(#${clipId})`}
            className="select-none"
          >
            {fitLabel(cell.label, width)}
          </text>
          <text
            x={x + 8}
            y={y + 36}
            fill={textColor}
            fontSize={11}
            clipPath={`url(#${clipId})`}
            className="select-none"
          >
            {volume} relato{volume === 1 ? "" : "s"}
          </text>
        </>
      ) : null}
    </g>
  );
}

const LEGEND: { label: string; fill: string }[] = [
  { label: "Positivo", fill: "hsl(var(--chart-1))" },
  { label: "Neutro", fill: "hsl(var(--chart-3))" },
  { label: "Negativo", fill: "hsl(var(--chart-5))" },
  { label: "Sem amostra", fill: "hsl(215 16% 60%)" },
];

export function SentimentTreemap({ cells, selectedId, onSelect }: SentimentTreemapProps) {
  if (cells.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground">
        Sem volume de relatos neste recorte.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <Treemap
            data={cells}
            dataKey="volume"
            isAnimationActive={false}
            stroke="hsl(var(--card))"
            content={<TreemapCell selectedId={selectedId} onSelect={onSelect} />}
          />
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        {LEGEND.map((l) => (
          <span key={l.label} className="inline-flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: l.fill }}
            />
            {l.label}
          </span>
        ))}
        <span className="text-muted-foreground/70">· tamanho = volume · clique para detalhar</span>
      </div>
    </div>
  );
}
