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
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onMarkInProgress}
            className="border-blue-500/20 hover:bg-blue-500/10"
          >
            <Clock className="h-4 w-4 mr-1" />
            Em Andamento
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onMarkResolved}
            className="border-green-500/20 hover:bg-green-500/10"
          >
            <CheckCircle className="h-4 w-4 mr-1" />
            Resolver
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onMarkRejected}
            className="border-border hover:bg-muted"
          >
            <XCircle className="h-4 w-4 mr-1" />
            Rejeitar
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Excluir
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
          >
            <X className="h-4 w-4 mr-1" />
            Limpar
          </Button>
        </div>
      </div>
    </Card>
  );
};
