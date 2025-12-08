import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { GripVertical, Eye, Trash2, AlertTriangle, MapPin, Heart, MessageSquare, Zap, Tag } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { UrbanReportForKanban } from './UrbanKanbanBoard';

interface UrbanKanbanCardProps {
  report: UrbanReportForKanban;
  onDragStart: (e: React.DragEvent, reportId: string) => void;
  onViewDetails: (report: UrbanReportForKanban) => void;
  onDelete: (report: UrbanReportForKanban) => void;
}

const getSeverityColor = (severity: string | null): string => {
  switch (severity) {
    case 'critical': return 'bg-red-500/10 text-red-600 border-red-500/20';
    case 'high': return 'bg-orange-500/10 text-orange-600 border-orange-500/20';
    case 'medium': return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
    case 'low': return 'bg-green-500/10 text-green-600 border-green-500/20';
    default: return 'bg-muted text-muted-foreground';
  }
};

const getSeverityLabel = (severity: string | null): string => {
  switch (severity) {
    case 'critical': return 'Crítica';
    case 'high': return 'Alta';
    case 'medium': return 'Média';
    case 'low': return 'Baixa';
    default: return 'N/D';
  }
};

const getN8NPriorityColor = (priority: string | null): string => {
  switch (priority) {
    case 'urgente': return 'bg-red-500 text-white';
    case 'alta': return 'bg-orange-500 text-white';
    case 'media': return 'bg-yellow-500 text-white';
    case 'baixa': return 'bg-green-500 text-white';
    default: return 'bg-muted text-muted-foreground';
  }
};

export const UrbanKanbanCard = ({ report, onDragStart, onViewDetails, onDelete }: UrbanKanbanCardProps) => {
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
          {report.n8n_processed && (
            <Badge className={getN8NPriorityColor(report.n8n_priority)}>
              <Zap className="h-3 w-3 mr-1" />
              {report.n8n_priority || 'N8N'}
            </Badge>
          )}
        </div>

        <h4 className="font-medium text-sm line-clamp-1">
          {report.category}
        </h4>

        {report.subcategory && (
          <Badge variant="secondary" className="text-xs">
            {report.subcategory}
          </Badge>
        )}

        {/* N8N Tags */}
        {report.n8n_tags && report.n8n_tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {report.n8n_tags.slice(0, 3).map((tag, idx) => (
              <Badge key={idx} variant="outline" className="text-[10px] px-1 py-0">
                <Tag className="h-2 w-2 mr-0.5" />
                {tag}
              </Badge>
            ))}
          </div>
        )}

        <p className="text-xs text-muted-foreground line-clamp-2">
          {report.description || 'Sem descrição'}
        </p>

        {report.location_address && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            <span className="line-clamp-1">{report.location_address}</span>
          </p>
        )}

        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>{format(new Date(report.created_at), 'dd/MM', { locale: ptBR })}</span>
            <span className="flex items-center gap-1">
              <Heart className="h-3 w-3" />
              {report.likes_count}
            </span>
            <span className="flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              {report.comments_count}
            </span>
          </div>
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
              className="h-6 w-6 text-muted-foreground hover:text-foreground hover:bg-muted hover:scale-110 transition-all duration-200"
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
