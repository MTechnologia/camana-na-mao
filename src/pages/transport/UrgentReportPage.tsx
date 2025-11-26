import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { LineSearchInput } from '@/components/transport/LineSearchInput';
import { ProblemTypeSelector } from '@/components/transport/ProblemTypeSelector';
import { useTransportReport } from '@/hooks/useTransportReport';
import { ReportSuccessCard } from '@/components/transport/ReportSuccessCard';

export default function UrgentReportPage() {
  const navigate = useNavigate();
  const { submitReport, submitting } = useTransportReport();
  const [step, setStep] = useState(1);
  const [reportData, setReportData] = useState<any>({
    severity: 'critical',
    occurrence_date: new Date().toISOString().split('T')[0],
  });
  const [success, setSuccess] = useState(false);
  const [reportId, setReportId] = useState('');

  const handleSubmit = async () => {
    try {
      const result = await submitReport({
        line_id: reportData.line_id,
        line_code_custom: reportData.line_code,
        report_type: reportData.report_type,
        severity: 'critical',
        description: reportData.description,
        occurrence_date: reportData.occurrence_date,
      });
      
      setReportId(result.id);
      setSuccess(true);
    } catch (err) {
      console.error('Error submitting urgent report:', err);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <div className="max-w-md w-full">
          <ReportSuccessCard
            reportId={reportId}
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
          <Button variant="ghost" size="icon" onClick={() => navigate('/transporte')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <h1 className="font-bold text-lg">Relato Urgente</h1>
            </div>
            <p className="text-xs text-muted-foreground">Problema crítico - atendimento prioritário</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        <Card className="border-red-500/50 bg-red-50/50">
          <CardContent className="p-4">
            <p className="text-sm text-red-900">
              Use este formulário apenas para problemas <strong>críticos</strong> que exigem atenção imediata,
              como questões de segurança ou situações que impedem o uso do transporte.
            </p>
          </CardContent>
        </Card>

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-bold mb-2">Qual linha?</h2>
              <LineSearchInput
                onSelectLine={(line) => {
                  setReportData({ ...reportData, line_id: line.id, line_code: line.line_code, line_name: line.line_name });
                  setStep(2);
                }}
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-bold mb-2">Tipo de problema</h2>
              <ProblemTypeSelector
                selectedType={reportData.report_type}
                onSelect={(type) => {
                  setReportData({ ...reportData, report_type: type });
                  setTimeout(() => setStep(3), 300);
                }}
              />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-bold mb-2">Descreva o problema</h2>
              <Label>Detalhes do problema urgente</Label>
              <Textarea
                placeholder="Descreva rapidamente o que está acontecendo..."
                value={reportData.description || ''}
                onChange={(e) => setReportData({ ...reportData, description: e.target.value })}
                rows={6}
                className="mt-2"
              />
            </div>
            
            <Button 
              onClick={handleSubmit} 
              disabled={!reportData.description || submitting}
              className="w-full bg-red-500 hover:bg-red-600"
            >
              {submitting ? 'Enviando...' : 'Enviar Relato Urgente'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
