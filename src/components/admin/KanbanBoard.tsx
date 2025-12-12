import { useState, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { UnifiedManifest, ManifestType } from '@/hooks/useReportsAdmin';
import { KanbanColumn } from './KanbanColumn';
import { KanbanCard } from './KanbanCard';

const STATUSES = ['pending', 'in_progress', 'resolved', 'rejected'];

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
    })
  );

  const getManifestById = useCallback((id: string) => {
    return manifests.find(m => m.id === id);
  }, [manifests]);

  const getItemsByStatus = useCallback((status: string) => {
    return manifests.filter(m => m.status === status);
  }, [manifests]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    setOverId(over?.id as string || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    setActiveId(null);
    setOverId(null);

    if (!over) return;

    const activeManifest = getManifestById(active.id as string);
    if (!activeManifest) return;

    // Determine target status
    let targetStatus: string | null = null;

    // Check if dropped on a column
    if (STATUSES.includes(over.id as string)) {
      targetStatus = over.id as string;
    } else {
      // Dropped on another card - find its status
      const overManifest = getManifestById(over.id as string);
      if (overManifest) {
        targetStatus = overManifest.status;
      }
    }

    // If status changed, update it
    if (targetStatus && targetStatus !== activeManifest.status) {
      await onStatusChange(activeManifest.id, activeManifest.type, targetStatus);
    }
  };

  const handleDragCancel = () => {
    setActiveId(null);
    setOverId(null);
  };

  const activeManifest = activeId ? getManifestById(activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
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
            items={getItemsByStatus(status)}
            loading={loading}
            isOver={overId === status}
            onViewDetails={onViewDetails}
            onReferral={onReferral}
            onDelete={onDelete}
          />
        ))}
      </div>

      {/* Drag Overlay - shows the dragged card */}
      <DragOverlay>
        {activeManifest ? (
          <div className="opacity-90 rotate-3 scale-105">
            <KanbanCard
              manifest={activeManifest}
              onViewDetails={() => {}}
              onReferral={() => {}}
              onDelete={() => {}}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
