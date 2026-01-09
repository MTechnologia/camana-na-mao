import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Clock, X, Trash2 } from 'lucide-react';

interface BulkActionsBarProps {
  selectedCount: number;
  onMarkInProgress: () => void;
  onMarkResolved: () => void;
  onMarkRejected: () => void;
  onDelete: () => void;
  onClear: () => void;
}

export const BulkActionsBar = ({
  selectedCount,
  onMarkInProgress,
  onMarkResolved,
  onMarkRejected,
  onDelete,
  onClear,
}: BulkActionsBarProps) => {
  if (selectedCount === 0) return null;

  return (
    <Card className="p-4 bg-primary/5 border-primary/20">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-base font-semibold">
            {selectedCount} {selectedCount === 1 ? 'relato selecionado' : 'relatos selecionados'}
          </Badge>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onMarkInProgress}
            className="border-blue-500/20 hover:bg-blue-500/10 h-8 px-2 lg:px-3"
          >
            <Clock className="h-4 w-4 lg:mr-1" />
            <span className="hidden lg:inline">Em Andamento</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onMarkResolved}
            className="border-green-500/20 hover:bg-green-500/10 h-8 px-2 lg:px-3"
          >
            <CheckCircle className="h-4 w-4 lg:mr-1" />
            <span className="hidden lg:inline">Resolver</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onMarkRejected}
            className="border-border hover:bg-muted h-8 px-2 lg:px-3"
          >
            <XCircle className="h-4 w-4 lg:mr-1" />
            <span className="hidden lg:inline">Rejeitar</span>
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={onDelete}
            className="h-8 px-2 lg:px-3"
          >
            <Trash2 className="h-4 w-4 lg:mr-1" />
            <span className="hidden lg:inline">Excluir</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="h-8 px-2 lg:px-3"
          >
            <X className="h-4 w-4 lg:mr-1" />
            <span className="hidden lg:inline">Limpar</span>
          </Button>
        </div>
      </div>
    </Card>
  );
};
