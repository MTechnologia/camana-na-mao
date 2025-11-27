import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, Trash2, CheckCircle2, AlertCircle, GripVertical } from 'lucide-react';
import { format } from 'date-fns';

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

const getSeverityColor = (severity: string) => {
  const colors: Record<string, string> = {
    low: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    medium: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
    high: 'bg-red-500/10 text-red-600 border-red-500/20',
  };
  return colors[severity] || 'bg-muted text-foreground';
};

const getSeverityLabel = (severity: string) => {
  const labels: Record<string, string> = {
    low: 'Baixa',
    medium: 'Média',
    high: 'Alta',
  };
  return labels[severity] || severity;
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
      className="p-3 cursor-grab active:cursor-grabbing hover:border-primary/50 transition-all bg-card"
    >
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
            <Badge variant="outline" className={getSeverityColor(report.severity)}>
              {getSeverityLabel(report.severity)}
            </Badge>
          </div>
          {report.responded_at ? (
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          ) : (
            <AlertCircle className="h-4 w-4 text-orange-500" />
          )}
        </div>

        <h4 className="font-medium text-sm line-clamp-1">
          {report.report_type.charAt(0).toUpperCase() + report.report_type.slice(1)}
        </h4>

        {report.transport_lines && (
          <p className="text-xs text-muted-foreground">
            {report.transport_lines.line_code} - {report.transport_lines.line_name}
          </p>
        )}

        {report.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {report.description}
          </p>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-border">
          <span className="text-xs text-muted-foreground">
            {format(new Date(report.occurrence_date), 'dd/MM/yyyy')}
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
