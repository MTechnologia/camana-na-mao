import { useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  AlertCircle,
  Calendar,
  ChevronRight,
  GripVertical,
  Hash,
  User2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  TRIAGE_PRIORITIES,
  TRIAGE_STATUSES,
  TRIAGE_STATUS_ORDER,
  type TriageStatus,
} from "@/lib/triage";
import type { KanbanItem, UseTriageKanbanResult } from "@/hooks/useTriageKanban";
import { useReportDetailModal } from "@/contexts/ReportDetailContext";

/**
 * HU-10.3 — Kanban de triagem com drag-and-drop entre colunas.
 *
 * Cada card é draggable; cada coluna é droppable. Quando o usuário solta
 * um card em uma coluna diferente, chama `onMoveTo(item, novaColuna)`.
 * Clique simples no card abre o ReportDetailSheet.
 */

interface TriageKanbanProps {
  data: Pick<UseTriageKanbanResult, "itemsByStatus" | "totalItems">;
  onMoveTo: (item: KanbanItem, targetStatus: TriageStatus) => Promise<void>;
}

const SHOWN_STATUSES: TriageStatus[] = TRIAGE_STATUS_ORDER.filter(
  (s) => s !== "closed",
);

function cardKey(item: KanbanItem): string {
  return `${item.source}|${item.reportId}`;
}

export function TriageKanban({ data, onMoveTo }: TriageKanbanProps) {
  const [activeItem, setActiveItem] = useState<KanbanItem | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      // Pequeno delay/distância evita conflito com clique no card.
      activationConstraint: { distance: 6 },
    }),
  );

  const handleDragStart = (event: DragStartEvent) => {
    const item = event.active.data.current?.item as KanbanItem | undefined;
    if (item) setActiveItem(item);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveItem(null);
    const item = event.active.data.current?.item as KanbanItem | undefined;
    const target = event.over?.id as TriageStatus | undefined;
    if (!item || !target) return;
    if (item.triageStatus === target) return;
    try {
      await onMoveTo(item, target);
    } catch (err) {
      // toast já é exibido pelo handler externo.
      console.error("[TriageKanban] move failed", err);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveItem(null)}
    >
      <div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3"
        data-testid="triage-kanban-root"
      >
        {SHOWN_STATUSES.map((status) => {
          const items = data.itemsByStatus[status] ?? [];
          return (
            <KanbanColumn
              key={status}
              status={status}
              items={items}
              isAnyDragging={!!activeItem}
            />
          );
        })}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeItem ? (
          <div className="rotate-2 opacity-90">
            <TriageCard item={activeItem} dragging />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

interface KanbanColumnProps {
  status: TriageStatus;
  items: KanbanItem[];
  isAnyDragging: boolean;
}

function KanbanColumn({ status, items, isAnyDragging }: KanbanColumnProps) {
  const meta = TRIAGE_STATUSES[status];
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <Card
      ref={setNodeRef}
      className={cn(
        "p-3 flex flex-col min-h-[200px] transition-colors",
        meta.bgClass,
        isOver && "ring-2 ring-primary ring-offset-2",
        isAnyDragging && !isOver && "opacity-90",
      )}
    >
      <header className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-sm font-semibold">{meta.label}</h3>
          <p className="text-[10px] text-muted-foreground line-clamp-1">
            {meta.description}
          </p>
        </div>
        <Badge variant="outline" className="text-xs">
          {items.length}
        </Badge>
      </header>
      <ScrollArea className="flex-1 max-h-[calc(100vh-380px)] pr-1 -mr-1">
        <div className="space-y-2 min-h-[80px]">
          {items.length === 0 ? (
            <p className="text-[11px] text-muted-foreground italic text-center py-6">
              {isAnyDragging ? "Solte aqui" : "Nenhum relato."}
            </p>
          ) : (
            items.map((item) => (
              <DraggableTriageCard key={cardKey(item)} item={item} />
            ))
          )}
        </div>
      </ScrollArea>
    </Card>
  );
}

interface DraggableTriageCardProps {
  item: KanbanItem;
}

function DraggableTriageCard({ item }: DraggableTriageCardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: cardKey(item),
    data: { item },
  });

  return (
    <div
      ref={setNodeRef}
      style={{ opacity: isDragging ? 0 : 1 }}
      {...attributes}
    >
      <TriageCard item={item} dragHandleProps={listeners} />
    </div>
  );
}

interface TriageCardProps {
  item: KanbanItem;
  dragHandleProps?: Record<string, unknown>;
  dragging?: boolean;
}

function TriageCard({ item, dragHandleProps, dragging }: TriageCardProps) {
  const { open } = useReportDetailModal();
  const priorityMeta = item.priority ? TRIAGE_PRIORITIES[item.priority] : null;
  const stale = item.daysSinceTriageUpdate >= 7 && item.triageStatus !== "resolved";

  return (
    <Card
      className={cn(
        "p-2 bg-card hover:shadow-md transition-shadow",
        stale && "border-amber-400/60",
        dragging && "shadow-lg cursor-grabbing",
      )}
    >
      <div className="flex items-start gap-1.5">
        {/* Handle de drag */}
        {dragHandleProps && (
          <button
            type="button"
            className="flex-shrink-0 p-0.5 -ml-1 text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing"
            aria-label="Arrastar"
            {...dragHandleProps}
          >
            <GripVertical className="h-3.5 w-3.5" />
          </button>
        )}

        {/* Corpo do card — clique abre o detalhe */}
        <button
          type="button"
          className="flex-1 text-left min-w-0 cursor-pointer"
          onClick={() => open(item.reportId, item.source)}
        >
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="flex items-center gap-1 min-w-0">
              {priorityMeta ? (
                <Badge
                  className={cn(
                    "text-[9px] h-4 px-1 border-none",
                    priorityMeta.bgClass,
                    priorityMeta.colorClass,
                  )}
                >
                  {priorityMeta.code}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[9px] h-4 px-1">
                  sem
                </Badge>
              )}
              <Badge
                variant="outline"
                className="text-[9px] h-4 px-1 capitalize"
                title={item.source === "urban" ? "Urbano" : "Transporte"}
              >
                {item.source === "urban" ? "urb" : "transp"}
              </Badge>
            </div>
            {item.protocolCode && (
              <span className="text-[9px] text-muted-foreground font-mono truncate flex items-center gap-0.5">
                <Hash className="h-2.5 w-2.5" />
                {item.protocolCode}
              </span>
            )}
          </div>

          <p className="text-xs font-medium line-clamp-2 mb-1">{item.title}</p>

          <div className="flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1 truncate">
              <User2 className="h-2.5 w-2.5 shrink-0" />
              <span className="truncate">{item.assigneeName ?? "—"}</span>
            </span>
            <span
              className={cn(
                "flex items-center gap-0.5 shrink-0",
                stale && "text-amber-700 font-medium",
              )}
              title={`Última mudança: ${item.daysSinceTriageUpdate} dia(s)`}
            >
              <Calendar className="h-2.5 w-2.5" />
              {item.daysSinceTriageUpdate}d
            </span>
          </div>

          {stale && (
            <p className="text-[10px] text-amber-700 mt-1 flex items-center gap-1">
              <AlertCircle className="h-2.5 w-2.5" />
              Sem mudança há {item.daysSinceTriageUpdate} dias
            </p>
          )}
        </button>
      </div>
    </Card>
  );
}
