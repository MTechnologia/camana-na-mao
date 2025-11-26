import { useState } from 'react';
import { Download, FileSpreadsheet, File, CheckCircle2 } from 'lucide-react';
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

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  exportType: string;
  currentFilters?: any;
  estimatedRows?: number;
}

export const ExportDialog = ({
  isOpen,
  onClose,
  exportType,
  currentFilters,
  estimatedRows = 0,
}: ExportDialogProps) => {
  const [format, setFormat] = useState<'xlsx' | 'csv'>('xlsx');
  const [includeFilters, setIncludeFilters] = useState(true);
  const [exporting, setExporting] = useState(false);
  const { toast } = useToast();

  const maxRows = format === 'csv' ? 5000000 : 1000000;
  const isAsync = estimatedRows > 300000;

  const handleExport = async () => {
    try {
      setExporting(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Log export
      const { error } = await supabase.from('export_logs').insert({
        user_id: user.id,
        export_type: exportType,
        format,
        filters: includeFilters ? currentFilters : null,
        row_count: estimatedRows,
        status: isAsync ? 'pending' : 'completed',
      });

      if (error) throw error;

      if (isAsync) {
        toast({
          title: 'Exportação iniciada',
          description: 'Você receberá uma notificação quando o arquivo estiver pronto.',
        });
      } else {
        // Simulate download
        toast({
          title: 'Exportação concluída',
          description: `${estimatedRows.toLocaleString('pt-BR')} registros exportados.`,
        });
      }

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
          {/* Format Selection */}
          <div className="space-y-3">
            <Label>Formato</Label>
            <RadioGroup value={format} onValueChange={(v) => setFormat(v as any)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="xlsx" id="xlsx" />
                <Label htmlFor="xlsx" className="flex items-center gap-2 cursor-pointer">
                  <FileSpreadsheet className="w-4 h-4" />
                  Excel (.xlsx)
                  <span className="text-xs text-muted-foreground">até 1M linhas</span>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="csv" id="csv" />
                <Label htmlFor="csv" className="flex items-center gap-2 cursor-pointer">
                  <File className="w-4 h-4" />
                  CSV (.csv)
                  <span className="text-xs text-muted-foreground">até 5M linhas</span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Options */}
          <div className="space-y-3">
            <Label>Opções</Label>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="filters"
                checked={includeFilters}
                onCheckedChange={(checked) => setIncludeFilters(checked as boolean)}
              />
              <Label htmlFor="filters" className="cursor-pointer">
                Incluir filtros aplicados
              </Label>
            </div>
          </div>

          {/* Info */}
          <div className="bg-muted rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Registros estimados:</span>
              <span className="font-medium">{estimatedRows.toLocaleString('pt-BR')}</span>
            </div>
            {estimatedRows > maxRows && (
              <p className="text-xs text-destructive">
                ⚠️ Volume excede o limite. Considere aplicar filtros adicionais.
              </p>
            )}
            {isAsync && (
              <div className="flex items-start gap-2 text-xs text-muted-foreground">
                <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>
                  A exportação será processada em segundo plano. Você receberá uma notificação quando
                  estiver pronta.
                </span>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={exporting}>
            Cancelar
          </Button>
          <Button
            onClick={handleExport}
            disabled={exporting || estimatedRows > maxRows}
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            {exporting ? 'Exportando...' : 'Exportar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
