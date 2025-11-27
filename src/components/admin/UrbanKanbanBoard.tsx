import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { UrbanKanbanCard } from './UrbanKanbanCard';
import { cn } from '@/lib/utils';

interface Author {
  full_name: string;
  avatar_url: string | null;
}

export interface UrbanReportForKanban {
  id: string;
  category: string;
  subcategory: string | null;
  description: string | null;
  severity: string | null;
  status: string | null;
  location_address: string | null;
  latitude: number | null;
  longitude: number | null;
  photos: string[] | null;
  created_at: string;
  updated_at: string;
  user_id: string;
  ai_classification: unknown;
  author?: Author | null;
  likes_count: number;
  comments_count: number;
}

interface UrbanKanbanBoardProps {
  reports: UrbanReportForKanban[];
  onStatusChange: (reportId: string, newStatus: string) => void;
  onViewDetails: (report: UrbanReportForKanban) => void;
  onDelete: (report: UrbanReportForKanban) => void;
}

const KANBAN_COLUMNS = [
  { id: 'pending', title: 'Pendentes', colorClass: 'bg-yellow-500' },
  { id: 'in_progress', title: 'Em Andamento', colorClass: 'bg-blue-500' },
  { id: 'resolved', title: 'Resolvidos', colorClass: 'bg-green-500' },
  { id: 'rejected', title: 'Rejeitados', colorClass: 'bg-red-500' },
];

export const UrbanKanbanBoard = ({ reports, onStatusChange, onViewDetails, onDelete }: UrbanKanbanBoardProps) => {
  const [draggedReport, setDraggedReport] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, reportId: string) => {
    setDraggedReport(reportId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(columnId);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = (e: React.DragEvent, columnStatus: string) => {
    e.preventDefault();
    if (draggedReport) {
      const report = reports.find(r => r.id === draggedReport);
      if (report && report.status !== columnStatus) {
        onStatusChange(draggedReport, columnStatus);
      }
      setDraggedReport(null);
      setDragOverColumn(null);
    }
  };

  const handleDragEnd = () => {
    setDraggedReport(null);
    setDragOverColumn(null);
  };

  const getReportsByStatus = (status: string) =>
    reports.filter(r => r.status === status);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 overflow-x-auto">
      {KANBAN_COLUMNS.map(column => {
        const columnReports = getReportsByStatus(column.id);
        const isOver = dragOverColumn === column.id;

        return (
          <div
            key={column.id}
            onDragOver={(e) => handleDragOver(e, column.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, column.id)}
            onDragEnd={handleDragEnd}
            className={cn(
              "bg-muted/50 rounded-lg p-4 min-h-[500px] transition-colors",
              isOver && "bg-primary/10 border-2 border-dashed border-primary"
            )}
          >
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <span className={cn("w-3 h-3 rounded-full", column.colorClass)} />
              {column.title}
              <Badge variant="secondary">{columnReports.length}</Badge>
            </h3>

            <div className="space-y-3">
              {columnReports.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">
                  Arraste relatos aqui
                </p>
              ) : (
                columnReports.map(report => (
                  <UrbanKanbanCard
                    key={report.id}
                    report={report}
                    onDragStart={handleDragStart}
                    onViewDetails={onViewDetails}
                    onDelete={onDelete}
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
