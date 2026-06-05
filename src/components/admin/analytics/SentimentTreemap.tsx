import { ResponsiveContainer, Treemap } from "recharts";
import type { SentimentTreemapCell } from "@/types/analyticsDrill";
import { fitLabel, treemapLabelMode } from "./sentimentTreemapLabels";

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

type CellStyle = { fill: string; tone: string };

function styleForScore(score: number | null): CellStyle {
  // Texto sempre branco com halo escuro (LABEL_HALO) — legível em qualquer cor.
  if (score == null) return { fill: "hsl(215 16% 60%)", tone: "Sem amostra" };
  if (score >= 55) return { fill: "hsl(var(--chart-1))", tone: "Positivo" };
  if (score <= 45) return { fill: "hsl(var(--chart-5))", tone: "Negativo" };
  return { fill: "hsl(var(--chart-3))", tone: "Neutro" };
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

/** Halo escuro atrás do texto branco: legível sobre qualquer cor (verde/laranja/
 * vermelho/cinza) e elimina o "estouro" do branco sobre o laranja claro. */
const LABEL_HALO = {
  paintOrder: "stroke" as const,
  stroke: "rgba(0,0,0,0.6)",
  strokeWidth: 3,
  strokeLinejoin: "round" as const,
};

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

  const { fill, tone } = styleForScore(sentimentScore);
  const selected = selectedId === id;
  const mode = treemapLabelMode(width, height);
  const clipId = `tm-clip-${index}-${Math.round(x)}-${Math.round(y)}`;
  const countText = `${volume} relato${volume === 1 ? "" : "s"}`;

  return (
    <g style={{ cursor: onSelect ? "pointer" : "default" }} onClick={() => onSelect?.(cell)}>
      {/* Tooltip nativo: garante o nome completo mesmo quando o rótulo é truncado. */}
      <title>{`${cell.label} — ${countText}${tone ? ` · ${tone}` : ""}`}</title>
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
      {mode === "horizontal" ? (
        <>
          <clipPath id={clipId}>
            <rect x={x} y={y} width={width} height={height} rx={6} />
          </clipPath>
          <text
            x={x + 6}
            y={y + 14}
            fill="#ffffff"
            fontSize={10}
            fontWeight={600}
            clipPath={`url(#${clipId})`}
            className="select-none"
            style={LABEL_HALO}
          >
            {fitLabel(cell.label, width, 5.7)}
          </text>
          {height > 32 ? (
            <text
              x={x + 6}
              y={y + 27}
              fill="#ffffff"
              fontSize={9}
              clipPath={`url(#${clipId})`}
              className="select-none"
              style={LABEL_HALO}
            >
              {fitLabel(countText, width, 5.1)}
            </text>
          ) : null}
        </>
      ) : mode === "vertical" ? (
        // Girado -90°: lê de baixo para cima, usando a altura da coluna fina.
        // O comprimento é limitado pela altura (fitLabel), então não vaza a célula.
        <text
          transform={`translate(${x + width / 2 + 4}, ${y + height - 6}) rotate(-90)`}
          fill="#ffffff"
          fontSize={10}
          fontWeight={600}
          className="select-none"
          style={LABEL_HALO}
        >
          {fitLabel(`${cell.label} · ${countText}`, height - 6, 5.7)}
        </text>
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
      {/* Mais alto no celular: dá área vertical às colunas finas (zonas de baixo
          volume) sem alterar as proporções; volta ao normal no desktop. */}
      <div className="h-[360px] w-full sm:h-[300px]">
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
