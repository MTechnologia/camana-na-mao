import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Download, X, MapPin, Calendar, User } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { toast } from 'sonner';

interface Report {
  id: string;
  category: string;
  description: string;
  status: string;
  severity?: string;
  location_address?: string;
  created_at: string;
  user_id: string;
}

interface DrillDownDrawerProps {
  open: boolean;
  onClose: () => void;
  reports: Report[];
  title: string;
  subtitle?: string;
  filterContext: {
    type: 'status' | 'category' | 'severity' | 'region' | 'sentiment';
    value: string;
  };
}

export const DrillDownDrawer = ({
  open,
  onClose,
  reports,
  title,
  subtitle,
  filterContext,
}: DrillDownDrawerProps) => {
  const [isExporting, setIsExporting] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'resolved':
        return 'bg-chart-1 text-white';
      case 'in_progress':
        return 'bg-chart-2 text-white';
      case 'pending':
        return 'bg-chart-3 text-white';
      case 'rejected':
        return 'bg-chart-5 text-white';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'critical':
        return 'bg-chart-5 text-white';
      case 'high':
        return 'bg-chart-3 text-white';
      case 'medium':
        return 'bg-chart-2 text-white';
      case 'low':
        return 'bg-chart-1 text-white';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'Pendente',
      in_progress: 'Em Análise',
      resolved: 'Resolvido',
      rejected: 'Rejeitado',
    };
    return labels[status] || status;
  };

  const getSeverityLabel = (severity: string) => {
    const labels: Record<string, string> = {
      critical: 'Crítico',
      high: 'Alto',
      medium: 'Médio',
      low: 'Baixo',
    };
    return labels[severity] || severity;
  };

  const handleExport = async (exportFormat: 'csv' | 'excel') => {
    setIsExporting(true);
    
    try {
      // Prepare data for export
      const headers = ['ID', 'Categoria', 'Descrição', 'Status', 'Severidade', 'Localização', 'Data'];
      const rows = reports.map(report => [
        report.id,
        report.category,
        report.description || 'N/A',
        getStatusLabel(report.status),
        report.severity ? getSeverityLabel(report.severity) : 'N/A',
        report.location_address || 'N/A',
        format(new Date(report.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR }),
      ]);

      if (exportFormat === 'csv') {
        // Generate CSV
        const csvContent = [
          headers.join(','),
          ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
        ].join('\n');

        // Download CSV
        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `relatos_${filterContext.type}_${filterContext.value}_${Date.now()}.csv`;
        link.click();
        
        toast.success('Exportação concluída', {
          description: `${reports.length} relatos exportados em CSV`,
        });
      }
      
      // Excel export would require a library like xlsx
      if (exportFormat === 'excel') {
        toast.info('Funcionalidade em desenvolvimento', {
          description: 'Exportação em Excel será disponibilizada em breve',
        });
      }
    } catch (error) {
      toast.error('Erro ao exportar', {
        description: 'Não foi possível exportar os dados',
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={onClose}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="border-b">
          <div className="flex items-start justify-between">
            <div>
              <DrawerTitle className="text-2xl">{title}</DrawerTitle>
              {subtitle && (
                <DrawerDescription className="mt-1">{subtitle}</DrawerDescription>
              )}
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className="text-sm">
                  {reports.length} {reports.length === 1 ? 'relato' : 'relatos'}
                </Badge>
                <Badge className="text-sm bg-primary">
                  {filterContext.type === 'status' && 'Filtrado por Status'}
                  {filterContext.type === 'category' && 'Filtrado por Categoria'}
                  {filterContext.type === 'severity' && 'Filtrado por Severidade'}
                  {filterContext.type === 'region' && 'Filtrado por Região'}
                  {filterContext.type === 'sentiment' && 'Filtrado por Sentimento'}
                </Badge>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DrawerHeader>

        <ScrollArea className="flex-1 p-6">
          {reports.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground">Nenhum relato encontrado</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reports.map((report, index) => (
                <motion.div
                  key={report.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="font-medium">
                          {report.category}
                        </Badge>
                        <Badge className={getStatusColor(report.status)}>
                          {getStatusLabel(report.status)}
                        </Badge>
                        {report.severity && (
                          <Badge className={getSeverityColor(report.severity)}>
                            {getSeverityLabel(report.severity)}
                          </Badge>
                        )}
                      </div>

                      <p className="text-sm text-foreground line-clamp-2">
                        {report.description || 'Sem descrição'}
                      </p>

                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        {report.location_address && (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            <span className="line-clamp-1">{report.location_address}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>
                            {format(new Date(report.created_at), "dd/MM/yyyy 'às' HH:mm", {
                              locale: ptBR,
                            })}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          <span className="font-mono text-xs">
                            {report.user_id.slice(0, 8)}...
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {index < reports.length - 1 && <Separator className="mt-4" />}
                </motion.div>
              ))}
            </div>
          )}
        </ScrollArea>

        <DrawerFooter className="border-t">
          <div className="flex items-center justify-between w-full">
            <p className="text-sm text-muted-foreground">
              Total de {reports.length} {reports.length === 1 ? 'relato' : 'relatos'}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => handleExport('csv')}
                disabled={isExporting || reports.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                Exportar CSV
              </Button>
              <Button onClick={onClose}>Fechar</Button>
            </div>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};
