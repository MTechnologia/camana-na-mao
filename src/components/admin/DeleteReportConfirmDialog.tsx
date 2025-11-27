import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Trash2, AlertTriangle } from "lucide-react";

interface DeleteReportConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  reportCount?: number;
  reportDescription?: string;
  isLoading?: boolean;
}

export const DeleteReportConfirmDialog = ({
  open,
  onOpenChange,
  onConfirm,
  reportCount,
  reportDescription,
  isLoading = false,
}: DeleteReportConfirmDialogProps) => {
  const isBulk = reportCount !== undefined && reportCount > 1;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <AlertDialogTitle className="text-xl">
              Excluir {isBulk ? 'relatos' : 'relato'}?
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-3">
            <p className="text-base">
              {isBulk ? (
                <>
                  Você está prestes a excluir <Badge variant="destructive" className="mx-1">{reportCount}</Badge> relatos permanentemente.
                </>
              ) : (
                'Esta ação não pode ser desfeita. O relato será excluído permanentemente do sistema.'
              )}
            </p>
            
            {!isBulk && reportDescription && (
              <div className="p-3 bg-muted rounded-md border border-border">
                <p className="text-sm text-muted-foreground line-clamp-2">
                  "{reportDescription}"
                </p>
              </div>
            )}

            <div className="flex items-start gap-2 p-3 bg-destructive/5 rounded-md border border-destructive/20">
              <Trash2 className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-destructive">
                  Esta ação é irreversível
                </p>
                <p className="text-xs text-muted-foreground">
                  Todos os dados associados (likes, comentários) também serão excluídos.
                </p>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-destructive hover:bg-destructive/90"
          >
            {isLoading ? 'Excluindo...' : 'Excluir permanentemente'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
