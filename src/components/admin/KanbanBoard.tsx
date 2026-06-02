import { useState, useCallback, useEffect } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  rectIntersection,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  CollisionDetection,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { UnifiedManifest, ManifestType } from "@/hooks/useReportsAdmin";
import { KanbanColumn } from "./KanbanColumn";
import { KanbanCardDragPreview } from "./KanbanCardDragPreview";

const STATUSES = ["pending", "in_progress", "resolved", "rejected"];

type ItemsState = Record<string, UnifiedManifest[]>;

interface KanbanBoardProps {
  manifests: UnifiedManifest[];
  loading: boolean;
  onStatusChange: (id: string, type: ManifestType, newStatus: string) => Promise<void>;
  onViewDetails: (manifest: UnifiedManifest) => void;
  onReferral: (manifest: UnifiedManifest) => void;
  onDelete: (manifest: UnifiedManifest) => void;
}

export function KanbanBoard({
  manifests,
  loading,
  onStatusChange,
  onViewDetails,
  onReferral,
  onDelete,
}: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  // Estado local para gerenciar items por coluna durante o drag
  const [itemsState, setItemsState] = useState<ItemsState>(() => ({
    pending: manifests.filter((m) => m.status === "pending"),
    in_progress: manifests.filter((m) => m.status === "in_progress"),
    resolved: manifests.filter((m) => m.status === "resolved"),
    rejected: manifests.filter((m) => m.status === "rejected"),
  }));

  // Sincronizar com props quando manifests mudam (e não estamos arrastando)
  useEffect(() => {
    if (!activeId) {
      setItemsState({
        pending: manifests.filter((m) => m.status === "pending"),
        in_progress: manifests.filter((m) => m.status === "in_progress"),
        resolved: manifests.filter((m) => m.status === "resolved"),
        rejected: manifests.filter((m) => m.status === "rejected"),
      });
    }
  }, [manifests, activeId]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // Helper para encontrar container de um item
  const findContainer = useCallback(
    (id: string): string | null => {
      // Primeiro verifica se é um status (container)
      if (STATUSES.includes(id)) return id;

      // Busca em qual container o item está
      for (const status of STATUSES) {
        if (itemsState[status]?.some((item) => item.id === id)) {
          return status;
        }
      }
      return null;
    },
    [itemsState],
  );

  const getManifestById = useCallback(
    (id: string) => {
      return manifests.find((m) => m.id === id);
    },
    [manifests],
  );

  // Collision detection customizada que prioriza containers
  const collisionDetectionStrategy: CollisionDetection = useCallback((args) => {
    // Primeiro, verificar colisões com containers usando rectIntersection
    const rectCollisions = rectIntersection(args);

    // Priorizar colisões com containers (colunas)
    const containerCollision = rectCollisions.find((collision) =>
      STATUSES.includes(collision.id as string),
    );

    if (containerCollision) {
      return [containerCollision];
    }

    // Fallback para closestCorners para items dentro de containers
    return closestCorners(args);
  }, []);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) {
      setOverId(null);
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;

    // Encontrar container de origem e destino
    const activeContainer = findContainer(activeId);
    const overContainer = STATUSES.includes(overId) ? overId : findContainer(overId);

    setOverId(overContainer);

    if (!activeContainer || !overContainer || activeContainer === overContainer) {
      return;
    }

    // Mover item visualmente para o novo container
    setItemsState((prev) => {
      const activeItems = [...(prev[activeContainer] || [])];
      const overItems = [...(prev[overContainer] || [])];

      const activeIndex = activeItems.findIndex((i) => i.id === activeId);
      if (activeIndex === -1) return prev;

      const [movedItem] = activeItems.splice(activeIndex, 1);

      // Encontrar posição de inserção
      const overIndex = overItems.findIndex((i) => i.id === overId);
      const insertIndex = overIndex >= 0 ? overIndex : overItems.length;

      overItems.splice(insertIndex, 0, movedItem);

      return {
        ...prev,
        [activeContainer]: activeItems,
        [overContainer]: overItems,
      };
    });
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    const draggedId = active.id as string;
    const originalManifest = manifests.find((m) => m.id === draggedId);

    setActiveId(null);
    setOverId(null);

    if (!over || !originalManifest) {
      // Cancelado - resetar estado
      setItemsState({
        pending: manifests.filter((m) => m.status === "pending"),
        in_progress: manifests.filter((m) => m.status === "in_progress"),
        resolved: manifests.filter((m) => m.status === "resolved"),
        rejected: manifests.filter((m) => m.status === "rejected"),
      });
      return;
    }

    // Determinar novo container baseado em onde o item está agora
    const newContainer = findContainer(draggedId);

    // Se mudou de status, persistir no backend
    if (newContainer && newContainer !== originalManifest.status) {
      try {
        await onStatusChange(originalManifest.id, originalManifest.type, newContainer);
      } catch {
        // Em caso de erro, reverter para o estado original
        setItemsState({
          pending: manifests.filter((m) => m.status === "pending"),
          in_progress: manifests.filter((m) => m.status === "in_progress"),
          resolved: manifests.filter((m) => m.status === "resolved"),
          rejected: manifests.filter((m) => m.status === "rejected"),
        });
      }
    }
  };

  const handleDragCancel = () => {
    setActiveId(null);
    setOverId(null);
    // Resetar estado para o original
    setItemsState({
      pending: manifests.filter((m) => m.status === "pending"),
      in_progress: manifests.filter((m) => m.status === "in_progress"),
      resolved: manifests.filter((m) => m.status === "resolved"),
      rejected: manifests.filter((m) => m.status === "rejected"),
    });
  };

  const activeManifest = activeId ? getManifestById(activeId) : null;

  // Custom drop animation for smoother transitions
  const dropAnimation = {
    duration: 200,
    easing: "ease-out" as const,
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetectionStrategy}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {STATUSES.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            items={itemsState[status] || []}
            loading={loading}
            isOver={overId === status}
            onViewDetails={onViewDetails}
            onReferral={onReferral}
            onDelete={onDelete}
          />
        ))}
      </div>

      {/* Drag Overlay - shows the dragged card preview */}
      <DragOverlay dropAnimation={dropAnimation}>
        {activeManifest ? <KanbanCardDragPreview manifest={activeManifest} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
