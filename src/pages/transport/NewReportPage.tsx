import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { LineSearchInput } from '@/components/transport/LineSearchInput';
import { ProblemTypeSelector } from '@/components/transport/ProblemTypeSelector';
import { ReportSummaryCard } from '@/components/transport/ReportSummaryCard';
import { ReportSuccessCard } from '@/components/shared/ReportSuccessCard';
import { PatternAlert } from '@/components/transport/PatternAlert';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import PageHeader from '@/components/ui/page-header';
import { useTransportReport } from '@/hooks/useTransportReport';
import { useReportPatterns } from '@/hooks/useReportPatterns';

export default function NewReportPage() {
  const navigate = useNavigate();
  const { submitReport, submitting } = useTransportReport();
  const { patterns } = useReportPatterns();
  const [step, setStep] = useState(1);
  const [reportData, setReportData] = useState<any>({});
  const [success, setSuccess] = useState(false);
  const [reportId, setReportId] = useState('');
  const [relatedPattern, setRelatedPattern] = useState<any>(null);

  useEffect(() => {
    if (reportData.line_id && reportData.report_type) {
      const pattern = patterns.find(p => 
        p.line_id === reportData.line_id && 
        p.pattern_type === reportData.report_type
      );
      setRelatedPattern(pattern);
    }
  }, [reportData.line_id, reportData.report_type, patterns]);

  const totalSteps = 5;
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

  const handleNewReport = () => {
    setStep(1);
    setReportData({});
    setSuccess(false);
    setReportId('');
    setRelatedPattern(null);
  };

  if (success) {
    return (
      <>
        <PageHeader title="Novo Relato" backTo="/relatos" />
        <div className="min-h-screen bg-gray-50 pt-[60px] p-4 pb-6 flex items-center justify-center">
          <div className="max-w-md w-full">
            <ReportSuccessCard
              reportId={reportId}
              variant="transport"
              onViewPatterns={() => navigate('/transporte/padroes')}
              onNewReport={handleNewReport}
            />
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader 
        title={`Passo ${step} de ${totalSteps}`}
        onBack={step > 1 ? handleBack : undefined}
        backTo={step === 1 ? '/relatos' : undefined}
      />
      <div className="min-h-screen bg-gray-50 pt-[60px] pb-6">
        <div className="sticky top-[60px] z-10 bg-gray-50 border-b px-4 py-2">
          <Progress value={progress} />
        </div>

        <div className="max-w-7xl mx-auto px-6 py-6 space-y-6 animate-fade-in">
          {relatedPattern && (
            <PatternAlert pattern={relatedPattern} />
          )}
          
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

        {step === 5 && (
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
    </>
  );
}
