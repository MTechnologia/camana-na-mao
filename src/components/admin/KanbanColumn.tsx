import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { UnifiedManifest } from '@/hooks/useReportsAdmin';
import { KanbanCard } from './KanbanCard';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Clock, TrendingUp, CheckCircle2, XCircle } from 'lucide-react';

const statusConfig: Record<string, { label: string; color: string; bgColor: string; icon: typeof Clock }> = {
  pending: { 
    label: 'Pendente', 
    color: 'text-yellow-600', 
    bgColor: 'bg-yellow-500/10 border-yellow-500/30',
    icon: Clock 
  },
  in_progress: { 
    label: 'Em Andamento', 
    color: 'text-blue-600', 
    bgColor: 'bg-blue-500/10 border-blue-500/30',
    icon: TrendingUp 
  },
  resolved: { 
    label: 'Resolvido', 
    color: 'text-green-600', 
    bgColor: 'bg-green-500/10 border-green-500/30',
    icon: CheckCircle2 
  },
  rejected: { 
    label: 'Rejeitado', 
    color: 'text-red-600', 
    bgColor: 'bg-red-500/10 border-red-500/30',
    icon: XCircle 
  },
};

interface KanbanColumnProps {
  status: string;
  items: UnifiedManifest[];
  loading: boolean;
  isOver: boolean;
  onViewDetails: (manifest: UnifiedManifest) => void;
  onReferral: (manifest: UnifiedManifest) => void;
  onDelete: (manifest: UnifiedManifest) => void;
}

export function KanbanColumn({ 
  status, 
  items, 
  loading, 
  isOver,
  onViewDetails,
  onReferral,
  onDelete,
}: KanbanColumnProps) {
  const { setNodeRef } = useDroppable({ 
    id: status,
    data: {
      type: 'container',
      status: status,
    }
  });
  const config = statusConfig[status] || statusConfig.pending;
  const StatusIcon = config.icon;

  return (
    <div
      ref={setNodeRef}
      className={`
        flex flex-col bg-muted/30 rounded-lg border min-h-[500px]
        ${isOver ? 'ring-2 ring-primary border-primary' : ''}
        transition-all duration-200
      `}
    >
      {/* Column Header */}
      <div className={`p-3 border-b ${config.bgColor} rounded-t-lg`}>
        <div className="flex items-center justify-between">
          <Badge variant="outline" className={`${config.color} border-current/30`}>
            <StatusIcon className="h-3.5 w-3.5 mr-1.5" />
            {config.label}
          </Badge>
          <span className={`text-sm font-medium ${config.color}`}>
            {items.length}
          </span>
        </div>
      </div>

      {/* Column Content */}
      <ScrollArea className="flex-1 p-2">
        <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full rounded-lg" />
              ))
            ) : items.length === 0 ? (
              <div className="flex items-center justify-center h-24 text-muted-foreground text-sm">
                Nenhum item
              </div>
            ) : (
              items.map((manifest) => (
                <KanbanCard
                  key={manifest.id}
                  manifest={manifest}
                  onViewDetails={() => onViewDetails(manifest)}
                  onReferral={() => onReferral(manifest)}
                  onDelete={() => onDelete(manifest)}
                />
              ))
            )}
          </div>
        </SortableContext>
      </ScrollArea>
    </div>
  );
}
