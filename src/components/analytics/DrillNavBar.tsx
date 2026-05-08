import { ArrowLeft, ChevronRight, Home, RefreshCw, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * HU-3.3 — Barra de navegação reusável para drill-down/drill-up.
 *
 * Uniformiza a experiência das abas Territorial e Drill-down com:
 *   - Botão "← Voltar" (sobe um nível)
 *   - Botão "Início" (drill to root)
 *   - Breadcrumbs clicáveis
 *   - Botão "Atualizar" (refresh dos dados)
 *
 * Integra com `useUrlSyncedState` automaticamente: quando o consumidor altera
 * a posição via clique no Voltar, a URL acompanha, e o botão Voltar do browser
 * funciona como drill-up natural.
 */

export interface DrillNavStep {
  /** Texto exibido no breadcrumb. */
  label: string;
  /** Identificador único — usado como key React. */
  key: string;
}

export interface DrillNavBarProps {
  /** Caminho atual: do root (índice 0) até o nível ativo (último). */
  steps: DrillNavStep[];
  /** Callback ao clicar em um breadcrumb específico. */
  onStepClick: (index: number) => void;
  /** Callback ao clicar em "Voltar". Se omitido, calcula automaticamente (steps[length-2]). */
  onUp?: () => void;
  /** Callback ao clicar em "Início" (drill to root). Se omitido, usa onStepClick(0). */
  onReset?: () => void;
  /** Callback do botão "Atualizar". Se omitido, esconde o botão. */
  onRefresh?: () => void;
  /** Indicador de carregamento (anima o ícone do refresh). */
  isLoading?: boolean;
  /** Classe extra para o container externo. */
  className?: string;
}

export function DrillNavBar({
  steps,
  onStepClick,
  onUp,
  onReset,
  onRefresh,
  isLoading,
  className,
}: DrillNavBarProps) {
  const canGoUp = steps.length > 1;
  const handleUp = () => {
    if (!canGoUp) return;
    if (onUp) {
      onUp();
    } else {
      onStepClick(steps.length - 2);
    }
  };
  const handleReset = () => {
    if (onReset) onReset();
    else onStepClick(0);
  };

  return (
    <div className={cn("flex flex-wrap items-center gap-2 text-sm", className)}>
      {/* Botão Voltar — sempre visível mas desabilitado quando não há nível anterior */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleUp}
        disabled={!canGoUp}
        className="shrink-0"
        aria-label="Voltar um nível"
      >
        <ArrowLeft className="h-3.5 w-3.5 mr-1" />
        Voltar
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={handleReset}
        disabled={!canGoUp}
        className="shrink-0"
        aria-label="Voltar ao início"
      >
        <Home className="h-3.5 w-3.5 mr-1" />
        Início
      </Button>

      {/* Breadcrumbs */}
      <nav className="flex flex-wrap items-center gap-1 min-w-0" aria-label="Breadcrumb">
        {steps.map((step, idx) => {
          const isLast = idx === steps.length - 1;
          return (
            <span key={step.key} className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onStepClick(idx)}
                disabled={isLast}
                className={cn(
                  "rounded px-1.5 py-0.5 transition-colors max-w-[200px] truncate",
                  isLast
                    ? "font-semibold text-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer",
                )}
                title={step.label}
              >
                {step.label}
              </button>
              {!isLast && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
            </span>
          );
        })}
      </nav>

      <div className="ml-auto flex items-center gap-1 shrink-0">
        {canGoUp && onReset === undefined && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            aria-label="Reiniciar drill-down"
            title="Reiniciar"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        )}
        {onRefresh && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            disabled={isLoading}
            aria-label="Atualizar dados"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
            <span className="ml-1 hidden sm:inline">Atualizar</span>
          </Button>
        )}
      </div>
    </div>
  );
}
