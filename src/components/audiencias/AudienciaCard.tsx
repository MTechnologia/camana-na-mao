import { MapPin, Clock, Calendar } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AgendaItem, getEventTypeConfig } from "@/hooks/useAgenda";
import { format, parseISO } from "date-fns";

interface AudienciaCardProps {
  audiencia: AgendaItem;
  onClick: () => void;
}

const AudienciaCard = ({ audiencia, onClick }: AudienciaCardProps) => {
  const formatDate = (dateStr: string) => {
    try {
      const date = parseISO(dateStr);
      return {
        day: format(date, "dd"),
        month: format(date, "MMM").toUpperCase(),
      };
    } catch {
      return { day: "--", month: "---" };
    }
  };

  const dateInfo = formatDate(audiencia.eventDate);
  const typeConfig = getEventTypeConfig(audiencia.eventType);

  return (
    <Card
      className="p-4 bg-card border-border cursor-pointer hover:shadow-md hover:border-primary/20 transition-all relative"
      onClick={onClick}
    >
      <div className="flex gap-4">
        {/* Date Badge */}
        <div className="flex-shrink-0">
          <div className="w-16 h-16 bg-primary/10 rounded-xl flex flex-col items-center justify-center">
            <span className="text-xs font-medium text-primary uppercase">{dateInfo.month}</span>
            <span className="text-2xl font-bold text-primary">{dateInfo.day}</span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <Badge
            variant="outline"
            className={`text-xs border mb-2 inline-block ${typeConfig.color}`}
          >
            {typeConfig.label}
          </Badge>
          <h3 className="font-semibold text-foreground line-clamp-2 mb-2">{audiencia.title}</h3>

          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{audiencia.description}</p>

          <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
            {audiencia.eventTime && (
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{audiencia.eventTime}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              <span className="line-clamp-1">{audiencia.location.split("-")[0].trim()}</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default AudienciaCard;
