import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { TransportKanbanCard } from './TransportKanbanCard';
import { cn } from '@/lib/utils';

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

interface TransportKanbanBoardProps {
  reports: TransportReport[];
  onStatusChange: (reportId: string, newStatus: string) => void;
  onViewDetails: (report: TransportReport) => void;
  onDelete: (report: TransportReport) => void;
}

const KANBAN_COLUMNS = [
  { id: 'pending', title: 'Pendentes', colorClass: 'bg-yellow-500' },
  { id: 'in_progress', title: 'Em Andamento', colorClass: 'bg-blue-500' },
  { id: 'resolved', title: 'Resolvidos', colorClass: 'bg-green-500' },
  { id: 'rejected', title: 'Rejeitados', colorClass: 'bg-red-500' },
];

export const TransportKanbanBoard = ({
  reports,
  onStatusChange,
  onViewDetails,
  onDelete,
}: TransportKanbanBoardProps) => {
  const [draggedReport, setDraggedReport] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, reportId: string) => {
    setDraggedReport(reportId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', reportId);
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
      const report = reports.find((r) => r.id === draggedReport);
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
    reports.filter((r) => r.status === status);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 overflow-x-auto pb-4">
      {KANBAN_COLUMNS.map((column) => {
        const columnReports = getReportsByStatus(column.id);
        const isOver = dragOverColumn === column.id;

        return (
          <div
            key={column.id}
            onDragOver={(e) => handleDragOver(e, column.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, column.id)}
            className={cn(
              'bg-muted/50 rounded-lg p-4 min-h-[500px] transition-all border-2 border-dashed border-transparent',
              isOver && 'border-primary/50 bg-primary/5'
            )}
          >
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <span className={cn('w-3 h-3 rounded-full', column.colorClass)} />
              {column.title}
              <Badge variant="secondary" className="ml-auto">
                {columnReports.length}
              </Badge>
            </h3>

            <div className="space-y-3">
              {columnReports.map((report) => (
                <div
                  key={report.id}
                  onDragEnd={handleDragEnd}
                  className={cn(
                    'transition-opacity',
                    draggedReport === report.id && 'opacity-50'
                  )}
                >
                  <TransportKanbanCard
                    report={report}
                    onDragStart={handleDragStart}
                    onViewDetails={onViewDetails}
                    onDelete={onDelete}
                  />
                </div>
              ))}
              {columnReports.length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  Arraste relatos aqui
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
