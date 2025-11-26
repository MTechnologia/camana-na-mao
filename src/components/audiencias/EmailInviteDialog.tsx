import { useState } from "react";
import { Mail, Check, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";

interface EmailInviteDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  audienciaTitle: string;
}

const EmailInviteDialog = ({
  open,
  onClose,
  onSuccess,
  audienciaTitle,
}: EmailInviteDialogProps) => {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailAlreadyRegistered, setEmailAlreadyRegistered] = useState(false);

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateEmail(email)) {
      toast({
        title: "E-mail inválido",
        description: "Por favor, insira um e-mail válido.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    // Simulação de verificação e envio
    setTimeout(() => {
      // Simula verificação de email já cadastrado (5% de chance)
      if (Math.random() < 0.05) {
        setEmailAlreadyRegistered(true);
        setIsLoading(false);
        return;
      }

      // Simula falha de envio (2% de chance)
      if (Math.random() < 0.02) {
        toast({
          title: "Falha no envio",
          description: "Não foi possível enviar o convite. Tente novamente em alguns instantes.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // Sucesso
      toast({
        title: "Convite enviado com sucesso!",
        description: "Verifique sua caixa de entrada e spam.",
      });
      setIsLoading(false);
      onSuccess();
    }, 1500);
  };

  const handleClose = () => {
    setEmail("");
    setEmailAlreadyRegistered(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Receber convite por e-mail
          </DialogTitle>
          <DialogDescription>
            Para: <strong>{audienciaTitle}</strong>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          {emailAlreadyRegistered && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Este e-mail já está cadastrado para receber convites desta audiência.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">E-mail para receber o convite</Label>
            <Input
              id="email"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setEmailAlreadyRegistered(false);
              }}
              required
              disabled={isLoading}
              className="bg-background"
            />
          </div>

          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
              <Check className="h-4 w-4 text-primary" />
              O que você vai receber
            </h4>
            <ul className="text-sm text-muted-foreground space-y-1 ml-6 list-disc">
              <li>Link de acesso à audiência</li>
              <li>Instruções de participação</li>
              <li>Materiais de apoio (se disponível)</li>
              <li>Lembrete 1 dia antes do evento</li>
            </ul>
          </div>

          <div className="text-xs text-muted-foreground space-y-1">
            <p>
              📧 <strong>Horário de envio:</strong> E-mails são enviados apenas entre 8h e 20h
            </p>
            <p>
              🔒 <strong>Privacidade:</strong> Seus dados são protegidos conforme LGPD. Não
              compartilhamos seu e-mail com terceiros.
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="flex-1"
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={isLoading}>
              {isLoading ? "Enviando..." : "Enviar convite"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EmailInviteDialog;
