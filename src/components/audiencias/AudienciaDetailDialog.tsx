import { Calendar, MapPin, Users, Clock, Building2, Mail } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Audiencia } from "@/pages/Audiencias";

interface AudienciaDetailDialogProps {
  audiencia: Audiencia;
  open: boolean;
  onClose: () => void;
  onRequestInvite: () => void;
}

const themeColors: Record<string, string> = {
  "Mobilidade": "bg-blue-500/10 text-blue-600 border-blue-500/20",
  "Educação": "bg-purple-500/10 text-purple-600 border-purple-500/20",
  "Saúde": "bg-red-500/10 text-red-600 border-red-500/20",
  "Meio Ambiente": "bg-green-500/10 text-green-600 border-green-500/20",
  "Cultura": "bg-pink-500/10 text-pink-600 border-pink-500/20",
  "Segurança": "bg-orange-500/10 text-orange-600 border-orange-500/20",
};

const AudienciaDetailDialog = ({
  audiencia,
  open,
  onClose,
  onRequestInvite,
}: AudienciaDetailDialogProps) => {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4 mb-2">
            <DialogTitle className="text-xl">{audiencia.title}</DialogTitle>
            <Badge
              variant="outline"
              className={`border ${themeColors[audiencia.theme] || "bg-gray-500/10 text-gray-600 border-gray-500/20"}`}
            >
              {audiencia.theme}
            </Badge>
          </div>
          <DialogDescription className="text-base">
            {audiencia.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Informações principais */}
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Data</p>
                <p className="text-sm text-muted-foreground capitalize">
                  {formatDate(audiencia.date)}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Horário</p>
                <p className="text-sm text-muted-foreground">{audiencia.time}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <MapPin className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Local</p>
                <p className="text-sm text-muted-foreground">{audiencia.location}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Organizador</p>
                <p className="text-sm text-muted-foreground">{audiencia.organizer}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Participantes</p>
                <p className="text-sm text-muted-foreground">
                  {audiencia.participants} pessoas já se inscreveram
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Como participar */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <h4 className="font-semibold text-foreground flex items-center gap-2">
              <Mail className="h-4 w-4 text-primary" />
              Como participar
            </h4>
            <p className="text-sm text-muted-foreground">
              Solicite o convite por e-mail e receba todas as informações e o link de acesso à
              audiência pública. Você também pode registrar seus temas de interesse para receber
              notificações sobre futuras audiências relacionadas.
            </p>
          </div>

          {/* Observações legais */}
          <div className="text-xs text-muted-foreground space-y-1">
            <p>
              <strong>Fonte:</strong> Portal da Câmara Municipal de São Paulo
            </p>
            <p>
              <strong>Atualizado:</strong> Hoje às 10:30 (verificação a cada 15 minutos)
            </p>
            <p>
              <strong>Privacidade:</strong> Seus dados são protegidos conforme LGPD
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Voltar
          </Button>
          <Button onClick={onRequestInvite} className="flex-1">
            <Mail className="h-4 w-4 mr-2" />
            Receber convite por e-mail
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AudienciaDetailDialog;
