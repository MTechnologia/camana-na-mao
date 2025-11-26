import { Calendar, Clock, MapPin, Users, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface NextAudienciaBannerProps {
  audiencia?: {
    id: string;
    title: string;
    date: string;
    time: string;
    location: string;
    theme: string;
    participants: number;
  };
}

const NextAudienciaBanner = ({ audiencia }: NextAudienciaBannerProps) => {
  const navigate = useNavigate();

  if (!audiencia) return null;

  const formattedDate = format(new Date(audiencia.date), "dd 'de' MMMM", { locale: ptBR });

  return (
    <Card className="p-5 bg-gradient-to-br from-primary/10 via-primary/5 to-background border-primary/20 animate-fade-in">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-primary/20 rounded-lg">
            <Calendar className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground text-sm">Próxima Audiência</h3>
            <p className="text-xs text-muted-foreground">{formattedDate}</p>
          </div>
        </div>
        <Badge variant="secondary" className="text-xs">
          {audiencia.theme}
        </Badge>
      </div>

      <h4 className="font-medium text-foreground mb-3 line-clamp-2">
        {audiencia.title}
      </h4>

      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          <span>{audiencia.time}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <MapPin className="h-3.5 w-3.5" />
          <span className="line-clamp-1">{audiencia.location}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Users className="h-3.5 w-3.5" />
          <span>{audiencia.participants} inscritos</span>
        </div>
      </div>

      <Button 
        onClick={() => navigate(`/audiencias/${audiencia.id}`)}
        className="w-full"
        size="sm"
      >
        Participar
        <ArrowRight className="h-4 w-4 ml-2" />
      </Button>
    </Card>
  );
};

export default NextAudienciaBanner;
