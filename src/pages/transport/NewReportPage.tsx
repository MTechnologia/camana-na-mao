import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { LineSearchInput } from '@/components/transport/LineSearchInput';
import { ProblemTypeSelector } from '@/components/transport/ProblemTypeSelector';
import { SeveritySlider } from '@/components/transport/SeveritySlider';
import { ReportSummaryCard } from '@/components/transport/ReportSummaryCard';
import { ReportSuccessCard } from '@/components/transport/ReportSuccessCard';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useTransportReport } from '@/hooks/useTransportReport';
import { severityLevels } from '@/data/transportProblems';

export default function NewReportPage() {
  const navigate = useNavigate();
  const { submitReport, submitting } = useTransportReport();
  const [step, setStep] = useState(1);
  const [reportData, setReportData] = useState<any>({
    severity: 1,
  });
  const [success, setSuccess] = useState(false);
  const [reportId, setReportId] = useState('');

  const totalSteps = 6;
  const progress = (step / totalSteps) * 100;

  const handleNext = () => {
    if (step < totalSteps) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async () => {
    try {
      const result = await submitReport({
        line_id: reportData.line_id,
        line_code_custom: reportData.line_code,
        report_type: reportData.report_type,
        severity: severityLevels[reportData.severity].value,
        description: reportData.description,
        occurrence_date: reportData.occurrence_date,
        occurrence_time: reportData.occurrence_time,
        location: reportData.location,
        impact_description: reportData.impact_description,
      });
      
      setReportId(result.id);
      setSuccess(true);
    } catch (err) {
      console.error('Error submitting report:', err);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <div className="max-w-md w-full">
          <ReportSuccessCard
            reportId={reportId}
            onViewPatterns={() => navigate('/transporte/padroes')}
            onNewReport={() => window.location.reload()}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="flex items-center gap-4 p-4">
          <Button variant="ghost" size="icon" onClick={handleBack} disabled={step === 1}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">Passo {step} de {totalSteps}</p>
            <Progress value={progress} className="mt-1" />
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold mb-2">Qual linha?</h2>
              <p className="text-muted-foreground">Busque a linha de ônibus ou metrô</p>
            </div>
            <LineSearchInput
              onSelectLine={(line) => {
                setReportData({ ...reportData, line_id: line.id, line_code: line.line_code, line_name: line.line_name });
                handleNext();
              }}
            />
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold mb-2">Tipo de problema</h2>
              <p className="text-muted-foreground">Selecione o que melhor descreve a situação</p>
            </div>
            <ProblemTypeSelector
              selectedType={reportData.report_type}
              onSelect={(type) => {
                setReportData({ ...reportData, report_type: type });
                setTimeout(handleNext, 300);
              }}
            />
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold mb-2">Quando aconteceu?</h2>
              <p className="text-muted-foreground">Informe data e horário aproximado</p>
            </div>
            <div className="space-y-4">
              <div>
                <Label>Data</Label>
                <Input
                  type="date"
                  value={reportData.occurrence_date || ''}
                  onChange={(e) => setReportData({ ...reportData, occurrence_date: e.target.value })}
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div>
                <Label>Horário (opcional)</Label>
                <Input
                  type="time"
                  value={reportData.occurrence_time || ''}
                  onChange={(e) => setReportData({ ...reportData, occurrence_time: e.target.value })}
                />
              </div>
              <div>
                <Label>Local específico (opcional)</Label>
                <Input
                  placeholder="Ex: Ponto Terminal Jabaquara"
                  value={reportData.location || ''}
                  onChange={(e) => setReportData({ ...reportData, location: e.target.value })}
                />
              </div>
            </div>
            <Button onClick={handleNext} disabled={!reportData.occurrence_date} className="w-full">
              Continuar
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold mb-2">Gravidade</h2>
              <p className="text-muted-foreground">Qual foi o impacto para você?</p>
            </div>
            <SeveritySlider
              value={reportData.severity}
              onChange={(value) => setReportData({ ...reportData, severity: value })}
            />
            <Button onClick={handleNext} className="w-full">
              Continuar
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold mb-2">Conte mais detalhes</h2>
              <p className="text-muted-foreground">Isso nos ajuda a entender melhor o problema</p>
            </div>
            <div>
              <Label>Descrição (opcional)</Label>
              <Textarea
                placeholder="Descreva o que aconteceu..."
                value={reportData.description || ''}
                onChange={(e) => setReportData({ ...reportData, description: e.target.value })}
                rows={4}
              />
            </div>
            <div>
              <Label>Como isso impactou sua rotina? (opcional)</Label>
              <Textarea
                placeholder="Ex: Cheguei 30 minutos atrasado no trabalho"
                value={reportData.impact_description || ''}
                onChange={(e) => setReportData({ ...reportData, impact_description: e.target.value })}
                rows={3}
              />
            </div>
            <Button onClick={handleNext} className="w-full">
              Continuar
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}

        {step === 6 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold mb-2">Confirmar envio</h2>
              <p className="text-muted-foreground">Revise as informações antes de enviar</p>
            </div>
            <ReportSummaryCard
              data={reportData}
              onEdit={() => setStep(1)}
              onConfirm={handleSubmit}
              loading={submitting}
            />
          </div>
        )}
      </div>
    </div>
  );
}
