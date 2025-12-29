import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, AlertTriangle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface AnalysisStatusBadgeProps {
  status: string | null;
  n8nProcessed?: boolean | null;
  n8nPriority?: string | null;
  className?: string;
}

const priorityConfig: Record<string, { label: string; className: string; icon: typeof AlertTriangle }> = {
  high: {
    label: "Alta Prioridade",
    className: "bg-destructive/10 text-destructive border-destructive/20",
    icon: AlertTriangle,
  },
  medium: {
    label: "Média Prioridade",
    className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    icon: AlertTriangle,
  },
  low: {
    label: "Baixa Prioridade",
    className: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
    icon: CheckCircle,
  },
};

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pendente", variant: "secondary" },
  in_progress: { label: "Em Andamento", variant: "default" },
  resolved: { label: "Resolvido", variant: "outline" },
  rejected: { label: "Rejeitado", variant: "destructive" },
  forwarded: { label: "Encaminhado", variant: "outline" },
  analyzing: { label: "Analisando", variant: "default" },
};

export function AnalysisStatusBadge({
  status,
  n8nProcessed,
  n8nPriority,
  className,
}: AnalysisStatusBadgeProps) {
  // Se não foi processado pelo N8N e status é pending, mostrar "Em Análise"
  const isAnalyzing = n8nProcessed === false && (status === "pending" || status === "analyzing");

  if (isAnalyzing) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="outline"
              className={cn(
                "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 animate-pulse flex items-center gap-1.5",
                className
              )}
            >
              <Loader2 className="w-3 h-3 animate-spin" />
              Em Análise
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[200px]">
            <p className="text-xs">
              Seu relato está sendo analisado por inteligência artificial para classificação e priorização.
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Se foi processado e tem prioridade, mostrar badge de prioridade
  if (n8nProcessed && n8nPriority) {
    const priority = priorityConfig[n8nPriority] || priorityConfig.medium;
    const PriorityIcon = priority.icon;

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="outline"
              className={cn("flex items-center gap-1.5", priority.className, className)}
            >
              <PriorityIcon className="w-3 h-3" />
              {priority.label}
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[200px]">
            <p className="text-xs">
              Análise concluída. Prioridade definida com base na urgência e impacto do relato.
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Se foi processado mas sem prioridade específica
  if (n8nProcessed) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="outline"
              className={cn(
                "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20 flex items-center gap-1.5",
                className
              )}
            >
              <CheckCircle className="w-3 h-3" />
              Analisado
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p className="text-xs">Análise de IA concluída</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Fallback para status padrão do workflow
  const statusInfo = statusConfig[status || "pending"];
  const StatusIcon = status === "resolved" ? CheckCircle : Clock;

  return (
    <Badge variant={statusInfo.variant} className={cn("flex items-center gap-1", className)}>
      <StatusIcon className="w-3 h-3" />
      {statusInfo.label}
    </Badge>
  );
}

export default AnalysisStatusBadge;
