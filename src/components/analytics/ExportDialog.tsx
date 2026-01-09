import { useState } from 'react';
import { Download, File, FileText, CheckCircle2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { usePDFExport } from '@/hooks/usePDFExport';

interface StatusByItem {
  status: string;
  count: number;
  color: string;
}

interface CategoryItem {
  category: string;
  count: number;
}

interface AnalyticsStats {
  total: number;
  critical: number;
  pending: number;
  resolved: number;
  trend: number;
  byStatus: StatusByItem[];
  categories: CategoryItem[];
}

interface SentimentStats {
  overallScore: number;
}

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  exportType: string;
  currentFilters?: {
    dateRange?: { from?: Date; to?: Date };
    category?: string;
    status?: string;
    region?: string;
  };
  estimatedRows?: number;
  analyticsStats?: AnalyticsStats;
  sentimentStats?: SentimentStats | null;
}

export const ExportDialog = ({
  isOpen,
  onClose,
  exportType,
  currentFilters,
  estimatedRows = 0,
  analyticsStats,
  sentimentStats,
}: ExportDialogProps) => {
  const [format, setFormat] = useState<'csv' | 'pdf'>('csv');
  const [includeFilters, setIncludeFilters] = useState(true);
  const [exporting, setExporting] = useState(false);
  const { toast } = useToast();
  const { exportToPDF, exporting: pdfExporting } = usePDFExport();

  const handleExport = async () => {
    if (format === 'pdf') {
      await handlePDFExport();
      return;
    }
    await handleCSVExport();
  };

  const handlePDFExport = async () => {
    try {
      setExporting(true);

      const kpis = analyticsStats ? [
        { 
          label: 'Total de Relatos', 
          value: analyticsStats.total,
          trend: { value: Math.abs(analyticsStats.trend), direction: analyticsStats.trend >= 0 ? 'up' as const : 'down' as const }
        },
        { label: 'Críticos', value: analyticsStats.critical },
        { label: 'Pendentes', value: analyticsStats.pending },
        { label: 'Resolvidos', value: analyticsStats.resolved },
      ] : undefined;

      // Transform byStatus array to object for PDF
      const statusData = analyticsStats?.byStatus ? {
        pending: analyticsStats.byStatus.find(s => s.status === 'pending')?.count || 0,
        in_progress: analyticsStats.byStatus.find(s => s.status === 'in_progress')?.count || 0,
        resolved: analyticsStats.byStatus.find(s => s.status === 'resolved')?.count || 0,
        rejected: analyticsStats.byStatus.find(s => s.status === 'rejected')?.count || 0,
      } : undefined;

      await exportToPDF({
        title: 'Relatório de Relatos',
        subtitle: getExportTypeLabel(exportType),
        kpis,
        statusData,
        categories: analyticsStats?.categories?.slice(0, 10).map(c => ({
          name: c.category,
          count: c.count
        })),
        sentimentScore: sentimentStats?.overallScore,
        filters: includeFilters ? {
          dateRange: currentFilters?.dateRange ? {
            from: currentFilters.dateRange.from?.toISOString(),
            to: currentFilters.dateRange.to?.toISOString()
          } : undefined,
          category: currentFilters?.category,
          status: currentFilters?.status,
          region: currentFilters?.region
        } : undefined,
        filename: `relatorio_${exportType}_${new Date().toISOString().split('T')[0]}.pdf`,
      });

      // Log export
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const filtersJson = includeFilters && currentFilters ? {
          dateRange: currentFilters.dateRange ? {
            from: currentFilters.dateRange.from?.toISOString(),
            to: currentFilters.dateRange.to?.toISOString()
          } : null,
          category: currentFilters.category || null,
          status: currentFilters.status || null,
          region: currentFilters.region || null
        } : null;

        await supabase.from('export_logs').insert([{
          user_id: user.id,
          export_type: exportType,
          format: 'pdf',
          filters: filtersJson,
          row_count: analyticsStats?.total || 0,
          status: 'completed',
          completed_at: new Date().toISOString()
        }]);
      }

      toast({
        title: 'PDF exportado',
        description: 'O relatório foi baixado com sucesso.',
      });

      onClose();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao exportar PDF',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    } finally {
      setExporting(false);
    }
  };

  const handleCSVExport = async () => {
    try {
      setExporting(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Fetch real data based on export type
      let data: any[] = [];
      
      if (exportType === 'urban_reports' || exportType === 'reports') {
        const { data: urbanData } = await supabase
          .from('urban_reports')
          .select('*')
          .limit(10000);
        data = urbanData || [];
      } else if (exportType === 'transport_reports') {
        const { data: transportData } = await supabase
          .from('transport_reports')
          .select('*')
          .limit(10000);
        data = transportData || [];
      } else if (exportType === 'all') {
        const [{ data: urban }, { data: transport }] = await Promise.all([
          supabase.from('urban_reports').select('*').limit(5000),
          supabase.from('transport_reports').select('*').limit(5000)
        ]);
        data = [...(urban || []).map(r => ({ ...r, _type: 'urban' })), 
                ...(transport || []).map(r => ({ ...r, _type: 'transport' }))];
      }

      if (data.length === 0) {
        toast({
          variant: 'destructive',
          title: 'Sem dados',
          description: 'Não há dados para exportar com os filtros aplicados.',
        });
        return;
      }

      // Generate CSV
      const headers = Object.keys(data[0]);
      const csvContent = [
        headers.join(','),
        ...data.map(row => 
          headers.map(h => {
            const val = row[h];
            if (val === null || val === undefined) return '';
            if (typeof val === 'object') return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
            if (typeof val === 'string' && (val.includes(',') || val.includes('"') || val.includes('\n'))) {
              return `"${val.replace(/"/g, '""')}"`;
            }
            return val;
          }).join(',')
        )
      ].join('\n');

      // Download file
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${exportType}_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // Log export
      const filtersJson = includeFilters && currentFilters ? {
        dateRange: currentFilters.dateRange ? {
          from: currentFilters.dateRange.from?.toISOString(),
          to: currentFilters.dateRange.to?.toISOString()
        } : null,
        category: currentFilters.category || null,
        status: currentFilters.status || null,
        region: currentFilters.region || null
      } : null;

      await supabase.from('export_logs').insert([{
        user_id: user.id,
        export_type: exportType,
        format: 'csv',
        filters: filtersJson,
        row_count: data.length,
        status: 'completed',
        completed_at: new Date().toISOString()
      }]);

      toast({
        title: 'Exportação concluída',
        description: `${data.length.toLocaleString('pt-BR')} registros exportados.`,
      });

      onClose();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao exportar',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    } finally {
      setExporting(false);
    }
  };

  const getExportTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      all: 'Todos os tipos',
      urban_reports: 'Relatos Urbanos',
      transport_reports: 'Relatos de Transporte',
      reports: 'Relatos',
    };
    return labels[type] || type;
  };

  const isProcessing = exporting || pdfExporting;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Exportar dados</DialogTitle>
          <DialogDescription>
            Configure as opções de exportação dos dados filtrados.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-3">
            <Label>Formato</Label>
            <RadioGroup value={format} onValueChange={(v) => setFormat(v as 'csv' | 'pdf')}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="csv" id="csv" />
                <Label htmlFor="csv" className="flex items-center gap-2 cursor-pointer">
                  <File className="w-4 h-4" />
                  CSV (.csv)
                  <span className="text-xs text-muted-foreground">Dados brutos</span>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="pdf" id="pdf" />
                <Label htmlFor="pdf" className="flex items-center gap-2 cursor-pointer">
                  <FileText className="w-4 h-4" />
                  PDF (.pdf)
                  <span className="text-xs text-muted-foreground">Com gráficos e KPIs</span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-3">
            <Label>Opções</Label>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="filters"
                checked={includeFilters}
                onCheckedChange={(checked) => setIncludeFilters(checked as boolean)}
              />
              <Label htmlFor="filters" className="cursor-pointer">
                {format === 'pdf' ? 'Incluir filtros no rodapé' : 'Incluir filtros no log'}
              </Label>
            </div>
          </div>

          <div className="bg-muted rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {format === 'pdf' ? 'Dados incluídos:' : 'Registros estimados:'}
              </span>
              <span className="font-medium">
                {format === 'pdf' 
                  ? 'KPIs, Status, Categorias' 
                  : estimatedRows.toLocaleString('pt-BR')}
              </span>
            </div>
            <div className="flex items-start gap-2 text-xs text-muted-foreground">
              <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0 text-primary" />
              <span>O arquivo será baixado diretamente no seu navegador.</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isProcessing}>
            Cancelar
          </Button>
          <Button onClick={handleExport} disabled={isProcessing} className="gap-2">
            <Download className="w-4 h-4" />
            {isProcessing ? 'Exportando...' : 'Exportar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
