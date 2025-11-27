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
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Report {
  id: string;
  category: string;
  created_at: string;
  description: string | null;
}

interface DeleteReportDialogProps {
  report: Report | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

const categoryLabels: Record<string, string> = {
  iluminacao: "Iluminação",
  calcada: "Calçada",
  limpeza: "Limpeza",
  sinalizacao: "Sinalização",
  vegetacao: "Vegetação",
  outros: "Outros",
};

export function DeleteReportDialog({
  report,
  open,
  onOpenChange,
  onConfirm,
}: DeleteReportDialogProps) {
  if (!report) return null;

  const categoryLabel = categoryLabels[report.category] || report.category;
  const createdDate = format(new Date(report.created_at), "dd 'de' MMMM 'de' yyyy", {
    locale: ptBR,
  });

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir relato?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta ação não pode ser desfeita. O relato será permanentemente excluído.
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="rounded-lg border border-border bg-muted/50 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline">{categoryLabel}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Criado em {createdDate}
          </p>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
