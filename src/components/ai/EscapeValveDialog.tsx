import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MessageSquare, Save, X, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EscapeValveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  journeyLabel: string;
  isStructured?: boolean;
  onContinue: () => void;
  onSaveAndExit: () => void;
  onDiscardAndExit: () => void;
}

const EscapeValveDialog = ({
  open,
  onOpenChange,
  journeyLabel,
  isStructured = false,
  onContinue,
  onSaveAndExit,
  onDiscardAndExit,
}: EscapeValveDialogProps) => {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Sair de "{journeyLabel}"?
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              {isStructured 
                ? "Você está no meio de uma conversa. O que deseja fazer?"
                : "Deseja encerrar esta conversa?"
              }
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex flex-col gap-2 py-2">
          <Button
            variant="outline"
            className="w-full justify-start gap-3 h-auto py-3"
            onClick={() => {
              onContinue();
              onOpenChange(false);
            }}
          >
            <MessageSquare className="h-4 w-4 text-primary" />
            <div className="text-left">
              <div className="font-medium">Continuar conversa</div>
              <div className="text-xs text-muted-foreground">
                Voltar para onde parei
              </div>
            </div>
          </Button>

          {isStructured ? (
            <>
              <Button
                variant="outline"
                className="w-full justify-start gap-3 h-auto py-3"
                onClick={() => {
                  onSaveAndExit();
                  onOpenChange(false);
                }}
              >
                <Save className="h-4 w-4 text-amber-500" />
                <div className="text-left">
                  <div className="font-medium">Salvar e sair</div>
                  <div className="text-xs text-muted-foreground">
                    Posso continuar depois pelo histórico
                  </div>
                </div>
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start gap-3 h-auto py-3 text-muted-foreground hover:text-foreground"
                onClick={() => {
                  onDiscardAndExit();
                  onOpenChange(false);
                }}
              >
                <X className="h-4 w-4" />
                <div className="text-left">
                  <div className="font-medium">Descartar e sair</div>
                  <div className="text-xs text-muted-foreground">
                    Perder esta conversa
                  </div>
                </div>
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-auto py-3 text-muted-foreground hover:text-foreground"
              onClick={() => {
                onDiscardAndExit();
                onOpenChange(false);
              }}
            >
              <LogOut className="h-4 w-4" />
              <div className="text-left">
                <div className="font-medium">Sair</div>
                <div className="text-xs text-muted-foreground">
                  Encerrar esta conversa
                </div>
              </div>
            </Button>
          )}
        </div>

        <AlertDialogFooter className="sm:justify-center">
          <AlertDialogCancel className="w-full sm:w-auto">
            Cancelar
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default EscapeValveDialog;
