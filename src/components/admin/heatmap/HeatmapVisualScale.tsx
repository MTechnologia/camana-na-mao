import { ParameterInfoTrigger } from "@/components/admin/analytics/ParameterInfoTrigger";
import type { ParameterLegendItem } from "@/lib/analyticsParameterLegends";
import { cn } from "@/lib/utils";

export type HeatmapVisualScaleVariant = "density" | "stars" | "volume" | "wait";

const SCALE_CONFIG: Record<
  HeatmapVisualScaleVariant,
  {
    label: string;
    left: string;
    right: string;
    gradient: string;
    legend: ParameterLegendItem;
    ariaLabel: string;
  }
> = {
  density: {
    label: "Densidade",
    left: "Menor",
    right: "Maior",
    gradient: "bg-gradient-to-r from-blue-600 via-lime-400 via-45% to-red-600",
    ariaLabel: "Escala de densidade: menor concentração à esquerda, maior à direita",
    legend: {
      term: "Escala de densidade",
      description:
        "Camada de calor do Google Maps. A escala se ajusta ao maior peso do recorte atual — não é percentual fixo.",
    },
  },
  stars: {
    label: "Média de estrelas",
    left: "1★ Ruim",
    right: "5★ Excelente",
    gradient: "bg-gradient-to-r from-red-600 via-yellow-400 to-green-600",
    ariaLabel: "Escala de cor das bolhas: vermelho avaliação ruim, verde excelente",
    legend: {
      term: "Cor das bolhas",
      description:
        "Cada equipamento é uma bolha: cor pela média de estrelas (1 a 5) no período. A mancha de fundo mostra volume agregado de avaliações na região.",
      formula: "Matiz HSL de 0° (1★) a 120° (5★); tamanho da bolha ∝ log do volume de avaliações.",
    },
  },
  volume: {
    label: "Volume de relatos",
    left: "Baixa demanda",
    right: "Alta demanda",
    gradient: "bg-gradient-to-r from-green-600 via-yellow-400 to-red-600",
    ariaLabel: "Escala de demanda: verde baixo volume, vermelho alto volume",
    legend: {
      term: "Cor e tamanho das bolhas",
      description:
        "Uma bolha por zona da capital. Tamanho e cor refletem a quantidade de relatos urbanos e/ou de transporte no recorte.",
      formula:
        "Cor: volume da zona ÷ maior volume entre zonas. Tamanho: mesma proporção em metros no mapa.",
    },
  },
  wait: {
    label: "Tempo de espera",
    left: "Espera menor",
    right: "Espera maior",
    gradient: "bg-gradient-to-r from-green-600 via-yellow-400 to-red-600",
    ariaLabel: "Escala de espera: verde menor tempo, vermelho maior tempo",
    legend: {
      term: "Cor das bolhas (espera)",
      description:
        "Média do campo informado pelo cidadão nas avaliações (wait_time_score, 1–5). Verde = faixas de espera menores; vermelho = faixas maiores.",
      formula:
        "Média por zona do distrito do equipamento; cor derivada da média convertida para escala de horas equivalentes.",
    },
  },
};

type HeatmapVisualScaleProps = {
  variant: HeatmapVisualScaleVariant;
  className?: string;
};

export function HeatmapVisualScale({ variant, className }: HeatmapVisualScaleProps) {
  const cfg = SCALE_CONFIG[variant];
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-md border border-border/80 bg-muted/25 px-3 py-2",
        className,
      )}
      role="img"
      aria-label={cfg.ariaLabel}
    >
      <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {cfg.label}
      </span>
      <span className="text-xs text-muted-foreground">{cfg.left}</span>
      <div className={cn("h-2 min-w-[8rem] flex-1 rounded-full", cfg.gradient)} aria-hidden />
      <span className="text-xs text-muted-foreground">{cfg.right}</span>
      <ParameterInfoTrigger item={cfg.legend} />
    </div>
  );
}
