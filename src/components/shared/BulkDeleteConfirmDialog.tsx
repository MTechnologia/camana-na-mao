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

export type BulkDeleteConfirmCopy = {
  titleAll: string;
  titleSelected: (count: number) => string;
  descriptionAll: string;
  descriptionSelected: string;
  confirmAll: string;
  confirmSelected: string;
};

type BulkDeleteConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  count: number;
  mode: "selected" | "all";
  copy: BulkDeleteConfirmCopy;
  onConfirm: () => void;
};

export default function BulkDeleteConfirmDialog({
  open,
  onOpenChange,
  count,
  mode,
  copy,
  onConfirm,
}: BulkDeleteConfirmDialogProps) {
  const isAll = mode === "all";

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isAll ? copy.titleAll : copy.titleSelected(count)}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isAll ? copy.descriptionAll : copy.descriptionSelected}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isAll ? copy.confirmAll : copy.confirmSelected}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export const CONVERSATION_BULK_DELETE_COPY: BulkDeleteConfirmCopy = {
  titleAll: "Limpar todas as conversas?",
  titleSelected: (count) => `Excluir ${count} conversa${count === 1 ? "" : "s"}?`,
  descriptionAll:
    "Todas as conversas do assistente serão removidas permanentemente. Esta ação não pode ser desfeita.",
  descriptionSelected:
    "As conversas selecionadas serão removidas permanentemente. Esta ação não pode ser desfeita.",
  confirmAll: "Limpar todas",
  confirmSelected: "Excluir selecionadas",
};

export const VISIT_BULK_DELETE_COPY: BulkDeleteConfirmCopy = {
  titleAll: "Limpar todo o histórico de visitas?",
  titleSelected: (count) => `Excluir ${count} visita${count === 1 ? "" : "s"}?`,
  descriptionAll:
    "Todas as visitas detectadas serão removidas do seu histórico. Avaliações vinculadas também serão excluídas. Esta ação não pode ser desfeita.",
  descriptionSelected:
    "As visitas selecionadas serão removidas do seu histórico. Avaliações vinculadas também serão excluídas. Esta ação não pode ser desfeita.",
  confirmAll: "Limpar todas",
  confirmSelected: "Excluir selecionadas",
};
