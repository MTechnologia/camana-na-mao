import { Calendar, MapPin, Users, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Audiencia } from "@/pages/Audiencias";

interface AudienciaCardProps {
  audiencia: Audiencia;
  onClick: () => void;
}

const themeColors: Record<string, string> = {
  "Mobilidade": "bg-blue-500/10 text-blue-600 border-blue-500/20",
  "Educação": "bg-purple-500/10 text-purple-600 border-purple-500/20",
  "Saúde": "bg-red-500/10 text-red-600 border-red-500/20",
  "Meio Ambiente": "bg-green-500/10 text-green-600 border-green-500/20",
  "Cultura": "bg-pink-500/10 text-pink-600 border-pink-500/20",
  "Segurança": "bg-orange-500/10 text-orange-600 border-orange-500/20",
};

const AudienciaCard = ({ audiencia, onClick }: AudienciaCardProps) => {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  };

  return (
    <Card
      className="p-4 bg-card border-border cursor-pointer hover:shadow-md hover:border-primary/20 transition-all"
      onClick={onClick}
    >
      <div className="flex gap-4">
        {/* Date Badge */}
        <div className="flex-shrink-0">
          <div className="w-16 h-16 bg-primary/10 rounded-xl flex flex-col items-center justify-center">
            <span className="text-xs font-medium text-primary uppercase">
              {formatDate(audiencia.date).split(" ")[1]}
            </span>
            <span className="text-2xl font-bold text-primary">
              {formatDate(audiencia.date).split(" ")[0]}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="font-semibold text-foreground line-clamp-2">
              {audiencia.title}
            </h3>
            <Badge
              variant="outline"
              className={`text-xs border flex-shrink-0 ${themeColors[audiencia.theme] || "bg-gray-500/10 text-gray-600 border-gray-500/20"}`}
            >
              {audiencia.theme}
            </Badge>
          </div>

          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {audiencia.description}
          </p>

          <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{audiencia.time}</span>
            </div>
            <div className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              <span className="line-clamp-1">{audiencia.location.split("-")[0].trim()}</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              <span>{audiencia.participants} inscritos</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default AudienciaCard;
