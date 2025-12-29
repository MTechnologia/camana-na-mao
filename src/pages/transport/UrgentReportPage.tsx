import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import PageHeader from '@/components/ui/page-header';

import { LineSearchInput } from '@/components/transport/LineSearchInput';
import { ProblemTypeSelector } from '@/components/transport/ProblemTypeSelector';
import { PatternAlert } from '@/components/transport/PatternAlert';
import { useTransportReport } from '@/hooks/useTransportReport';
import { useReportPatterns } from '@/hooks/useReportPatterns';
import { ReportSuccessCard } from '@/components/shared/ReportSuccessCard';

export default function UrgentReportPage() {
  const navigate = useNavigate();
  const { submitReport, submitting } = useTransportReport();
  const { patterns } = useReportPatterns();
  const [step, setStep] = useState(1);
  const [reportData, setReportData] = useState<any>({
    is_urgent: true, // Flag para N8N priorizar
    occurrence_date: new Date().toISOString().split('T')[0],
  });
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

  const handleSubmit = async () => {
    try {
      const result = await submitReport({
        line_id: reportData.line_id,
        line_code_custom: reportData.line_code,
        report_type: reportData.report_type,
        description: `[URGENTE] ${reportData.description}`, // Marcador para N8N identificar urgência
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
      <>
        <PageHeader title="Relato Urgente" backTo="/transporte" />
        <div className="min-h-screen bg-gray-50 pt-[60px] p-4 pb-24 flex items-center justify-center">
          <div className="max-w-md w-full">
            <ReportSuccessCard
              reportId={reportId}
              variant="transport"
              onNewReport={() => window.location.reload()}
            />
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader 
        title="Relato Urgente" 
        backTo="/transporte"
        rightElement={<AlertTriangle className="w-5 h-5 text-red-500" />}
      />
      <div className="min-h-screen bg-gray-50 pt-[60px] pb-24">
        <div className="max-w-7xl mx-auto px-6 py-6 space-y-6 animate-fade-in">
          {relatedPattern && (
            <PatternAlert pattern={relatedPattern} />
          )}
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
    </>
  );
}
