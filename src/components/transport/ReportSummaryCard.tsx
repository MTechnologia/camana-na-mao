import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit2, Check, Sparkles } from 'lucide-react';
import { transportProblems } from '@/data/transportProblems';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ReportSummaryCardProps {
  data: {
    line_code?: string;
    line_name?: string;
    report_type: string;
    occurrence_date: string;
    occurrence_time?: string;
    location?: string;
    description?: string;
  };
  onEdit: () => void;
  onConfirm: () => void;
  loading?: boolean;
}

export const ReportSummaryCard = ({ data, onEdit, onConfirm, loading }: ReportSummaryCardProps) => {
  const problem = transportProblems.find(p => p.id === data.report_type);

  return (
    <Card className="border-2">
      <CardContent className="p-6 space-y-4">
        <h3 className="font-semibold text-lg">Resumo do Relato</h3>

        <div className="space-y-3">
          <div>
            <span className="text-sm text-muted-foreground">Linha:</span>
            <p className="font-medium">
              {data.line_code} - {data.line_name}
            </p>
          </div>

          <div>
            <span className="text-sm text-muted-foreground">Problema:</span>
            <p className="font-medium">{problem?.label}</p>
          </div>

          <div>
            <span className="text-sm text-muted-foreground">Data e horário:</span>
            <p className="font-medium">
              {format(new Date(data.occurrence_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              {data.occurrence_time && ` às ${data.occurrence_time}`}
            </p>
          </div>

          {data.location && (
            <div>
              <span className="text-sm text-muted-foreground">Local:</span>
              <p className="font-medium">{data.location}</p>
            </div>
          )}

          {data.description && (
            <div>
              <span className="text-sm text-muted-foreground">Descrição:</span>
              <p className="text-sm">{data.description}</p>
            </div>
          )}

          {/* Aviso sobre classificação por IA */}
          <div className="bg-muted/50 rounded-lg p-3 flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
            <p className="text-xs text-muted-foreground">
              A prioridade do seu relato será determinada automaticamente pela nossa IA 
              com base no tipo de problema e contexto informado.
            </p>
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <Button variant="outline" onClick={onEdit} className="flex-1">
            <Edit2 className="w-4 h-4 mr-2" />
            Editar
          </Button>
          <Button onClick={onConfirm} disabled={loading} className="flex-1">
            <Check className="w-4 h-4 mr-2" />
            {loading ? 'Enviando...' : 'Confirmar'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
