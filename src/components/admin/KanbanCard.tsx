import { forwardRef } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { UnifiedManifest, ManifestType } from "@/hooks/useReportsAdmin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  GripVertical,
  MoreVertical,
  Eye,
  Send,
  Trash2,
  Building2,
  Bus,
  Star,
  MessageSquare,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

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

interface KanbanCardProps {
  manifest: UnifiedManifest;
  onViewDetails: () => void;
  onReferral: () => void;
  onDelete: () => void;
}

export const KanbanCard = forwardRef<HTMLDivElement, KanbanCardProps>(function KanbanCard(
  { manifest, onViewDetails, onReferral, onDelete },
  ref,
) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: manifest.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Combine refs for both sortable and forwarded ref
  const combinedRef = (node: HTMLDivElement | null) => {
    setNodeRef(node);
    if (typeof ref === "function") {
      ref(node);
    } else if (ref) {
      ref.current = node;
    }
  };

  const TypeIcon = typeConfig[manifest.type].icon;

  return (
    <div
      ref={combinedRef}
      style={style}
      className={cn(
        "bg-card border rounded-lg p-3",
        isDragging ? "opacity-40 shadow-lg ring-2 ring-primary" : "hover:border-primary/50",
        "transition-all duration-200",
      )}
    >
      <div className="flex items-start gap-2">
        {/* Drag Handle */}
        <button
          {...attributes}
          {...listeners}
          className="mt-0.5 p-1 rounded hover:bg-muted cursor-grab active:cursor-grabbing touch-none"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>

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

          {/* Footer */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {format(new Date(manifest.created_at), "dd/MM", { locale: ptBR })}
            </span>

            {/* Actions Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <MoreVertical className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onViewDetails}>
                  <Eye className="h-4 w-4 mr-2" />
                  Ver detalhes
                </DropdownMenuItem>
                {(manifest.type === "urban" ||
                  manifest.type === "transport" ||
                  manifest.type === "feedback") && (
                  <DropdownMenuItem onClick={onReferral}>
                    <Send className="h-4 w-4 mr-2" />
                    Encaminhar
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onDelete} className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
  );
});
