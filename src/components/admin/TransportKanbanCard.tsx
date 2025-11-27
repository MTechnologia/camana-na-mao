import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, Trash2, AlertTriangle, GripVertical, Bus, MapPin, CheckCircle2, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TransportLine {
  line_code: string;
  line_name: string;
}

interface Author {
  full_name: string;
}

interface TransportReport {
  id: string;
  report_type: string;
  description: string | null;
  severity: string;
  status: string;
  occurrence_date: string;
  location: string | null;
  responded_at: string | null;
  transport_lines: TransportLine | null;
  author: Author | null;
}

interface TransportKanbanCardProps {
  report: TransportReport;
  onDragStart: (e: React.DragEvent, reportId: string) => void;
  onViewDetails: (report: TransportReport) => void;
  onDelete: (report: TransportReport) => void;
}

const getSeverityColor = (severity: string): string => {
  switch (severity) {
    case 'high': return 'bg-red-500/10 text-red-600 border-red-500/20';
    case 'medium': return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
    case 'low': return 'bg-green-500/10 text-green-600 border-green-500/20';
    default: return 'bg-muted text-muted-foreground';
  }
};

const getSeverityLabel = (severity: string): string => {
  switch (severity) {
    case 'high': return 'Alta';
    case 'medium': return 'Média';
    case 'low': return 'Baixa';
    default: return 'N/D';
  }
};

export const TransportKanbanCard = ({
  report,
  onDragStart,
  onViewDetails,
  onDelete,
}: TransportKanbanCardProps) => {
  return (
    <Card
      draggable
      onDragStart={(e) => onDragStart(e, report.id)}
      className="p-3 cursor-grab active:cursor-grabbing hover:border-primary/50 transition-colors bg-card"
    >
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
            <Badge className={getSeverityColor(report.severity)}>
              <AlertTriangle className="h-3 w-3 mr-1" />
              {getSeverityLabel(report.severity)}
            </Badge>
          </div>
          {report.responded_at ? (
            <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Respondido
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/20">
              <Clock className="h-3 w-3 mr-1" />
              Aguardando
            </Badge>
          )}
        </div>

        <h4 className="font-medium text-sm line-clamp-1">
          {report.report_type.charAt(0).toUpperCase() + report.report_type.slice(1)}
        </h4>

        {report.transport_lines && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Bus className="h-3 w-3" />
            {report.transport_lines.line_code} - {report.transport_lines.line_name}
          </p>
        )}

        {report.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {report.description}
          </p>
        )}

        {report.location && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            <span className="line-clamp-1">{report.location}</span>
          </p>
        )}

        <div className="flex items-center justify-between pt-2 border-t">
          <span className="text-xs text-muted-foreground">
            {format(new Date(report.occurrence_date), 'dd/MM', { locale: ptBR })}
          </span>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={(e) => {
                e.stopPropagation();
                onViewDetails(report);
              }}
            >
              <Eye className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-destructive hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(report);
              }}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};
