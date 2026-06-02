import { forwardRef } from "react";
import { UnifiedManifest, ManifestType } from "@/hooks/useReportsAdmin";
import { Badge } from "@/components/ui/badge";
import { Building2, Bus, Star, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const typeConfig: Record<ManifestType, { label: string; icon: typeof Building2; color: string }> = {
  urban: {
    label: "Urbana",
    icon: Building2,
    color: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  },
  transport: {
    label: "Transporte",
    icon: Bus,
    color: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  },
  evaluation: {
    label: "Avaliação",
    icon: Star,
    color: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  },
  feedback: {
    label: "Feedback",
    icon: MessageSquare,
    color: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20",
  },
};

const severityConfig: Record<string, { label: string; color: string }> = {
  critical: { label: "Crítica", color: "bg-red-500/10 text-red-600 border-red-500/20" },
  high: { label: "Alta", color: "bg-orange-500/10 text-orange-600 border-orange-500/20" },
  medium: { label: "Média", color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20" },
  low: { label: "Baixa", color: "bg-green-500/10 text-green-600 border-green-500/20" },
};

interface KanbanCardDragPreviewProps {
  manifest: UnifiedManifest;
}

export const KanbanCardDragPreview = forwardRef<HTMLDivElement, KanbanCardDragPreviewProps>(
  ({ manifest }, ref) => {
    const TypeIcon = typeConfig[manifest.type].icon;

    return (
      <div
        ref={ref}
        className="bg-card border rounded-lg p-3 shadow-xl ring-2 ring-primary rotate-3 scale-105 cursor-grabbing"
        style={{ width: "280px" }}
      >
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            {/* Type & Severity Badges */}
            <div className="flex items-center gap-1.5 mb-2">
              <Badge
                variant="outline"
                className={`${typeConfig[manifest.type].color} text-xs px-1.5 py-0`}
              >
                <TypeIcon className="h-3 w-3" />
              </Badge>
              {manifest.severity && severityConfig[manifest.severity] && (
                <Badge
                  variant="outline"
                  className={`${severityConfig[manifest.severity].color} text-xs px-1.5 py-0`}
                >
                  {severityConfig[manifest.severity].label}
                </Badge>
              )}
            </div>

            {/* Title */}
            <p className="text-sm font-medium truncate mb-1">{manifest.title}</p>

            {/* Description */}
            {manifest.description && (
              <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                {manifest.description}
              </p>
            )}

            {/* Date */}
            <span className="text-xs text-muted-foreground">
              {format(new Date(manifest.created_at), "dd/MM", { locale: ptBR })}
            </span>
          </div>
        </div>
      </div>
    );
  },
);

KanbanCardDragPreview.displayName = "KanbanCardDragPreview";
