import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CouncilMemberCard } from './CouncilMemberCard';
import { useCouncilMemberSuggestions } from '@/hooks/useCouncilMemberSuggestions';
import { Vereador } from '@/hooks/useVereadores';
import { supabase } from '@/integrations/supabase/client';
import {
  ArrowLeft,
  ArrowRight,
  Send,
  CheckCircle2,
  MapPin,
  Calendar,
  FileText,
  AlertTriangle,
  Users,
} from 'lucide-react';
import { CitizenSeverityBadge } from '@/components/citizen/CitizenSeverityBadge';

interface ReportSummary {
  id: string;
  type: 'transport' | 'urban' | 'service';
  title: string;
  description?: string;
  category?: string;
  location?: string;
  date?: string;
  severity?: string;
  region?: string;
  report_type?: string;
}

interface ReferralWizardProps {
  report: ReportSummary;
  onComplete: () => void;
  onCancel: () => void;
}

type WizardStep = 'review' | 'commission' | 'select' | 'message' | 'success';

type LegislativeCommissionRow = {
  id: string;
  name: string;
  description: string | null;
  match_keywords: string[] | null;
};

export const ReferralWizard = ({ report, onComplete, onCancel }: ReferralWizardProps) => {
  const [step, setStep] = useState<WizardStep>('review');
  const [selectedVereador, setSelectedVereador] = useState<{
    vereador: Vereador;
    matchScore: number;
    matchReasons: string[];
  } | null>(null);
  const [selectedCommission, setSelectedCommission] = useState<LegislativeCommissionRow | null>(null);
  const [commissions, setCommissions] = useState<LegislativeCommissionRow[]>([]);
  const [commissionsLoading, setCommissionsLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { suggestions, loading, getSuggestions, submitReferral } = useCouncilMemberSuggestions();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setCommissionsLoading(true);
      const { data, error } = await supabase
        .from('legislative_commissions')
        .select('id,name,description,match_keywords')
        .eq('active', true)
        .order('sort_order', { ascending: true });
      if (cancelled) return;
      if (!error && data) {
        setCommissions(data as LegislativeCommissionRow[]);
      } else {
        setCommissions([]);
      }
      setCommissionsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const buildReportData = useCallback(() => {
    const base = {
      type: report.type,
      category: report.category,
      description: report.description,
      region: report.region,
      severity: report.severity,
      report_type: report.report_type,
      location: report.location,
    };
    if (selectedCommission) {
      return {
        ...base,
        commission_keywords: selectedCommission.match_keywords ?? [],
        commission_name: selectedCommission.name,
      };
    }
    return base;
  }, [report, selectedCommission]);

  const handleSubmit = async () => {
    if (!selectedVereador) return;

    setSubmitting(true);
    const success = await submitReferral({
      reportType: report.type,
      reportId: report.id,
      vereador: selectedVereador.vereador,
      matchScore: selectedVereador.matchScore,
      matchReasons: selectedVereador.matchReasons,
      citizenMessage: message || undefined,
      legislative_commission_id: selectedCommission?.id ?? null,
    });

    if (success) {
      setStep('success');
    }
    setSubmitting(false);
  };

  const renderStep = () => {
    switch (step) {
      case 'review':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold">Revisar Relato</h2>
              <p className="text-muted-foreground text-sm mt-1">
                Confirme os detalhes do relato antes de encaminhar
              </p>
            </div>

            <Card>
              <CardContent className="p-4 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{report.title}</h3>
                    {report.category && (
                      <Badge variant="outline" className="mt-1">{report.category}</Badge>
                    )}
                  </div>
                  {report.severity && (
                    <CitizenSeverityBadge severity={report.severity} />
                  )}
                </div>

                {report.description && (
                  <div className="flex items-start gap-2">
                    <FileText className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <p className="text-sm text-muted-foreground line-clamp-3">{report.description}</p>
                  </div>
                )}

                {report.location && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <span>{report.location}</span>
                  </div>
                )}

                {report.date && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span>{report.date}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button variant="outline" onClick={onCancel} className="flex-1">
                Cancelar
              </Button>
              <Button onClick={() => setStep('commission')} className="flex-1">
                Continuar
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        );

      case 'commission':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold">Comissão da Câmara</h2>
              <p className="text-muted-foreground text-sm mt-1">
                Opcional: escolha a comissão mais relacionada ao tema — melhoramos a sugestão de vereadores.
              </p>
            </div>

            {commissionsLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : commissions.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center text-sm text-muted-foreground">
                  Lista de comissões indisponível. Você pode seguir sem este filtro.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2 max-h-[45vh] overflow-y-auto pr-1">
                {commissions.map((c) => {
                  const selected = selectedCommission?.id === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedCommission(selected ? null : c)}
                      className={`w-full text-left rounded-lg border p-3 transition-colors ${
                        selected ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/40'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <Users className="w-4 h-4 mt-0.5 shrink-0 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-sm">{c.name}</p>
                          {c.description ? (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{c.description}</p>
                          ) : null}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
              <Button variant="outline" onClick={() => setStep('review')} className="flex-1">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
              <Button
                variant="secondary"
                className="flex-1"
                disabled={loading}
                onClick={async () => {
                  setSelectedCommission(null);
                  setSelectedVereador(null);
                  await getSuggestions({
                    type: report.type,
                    category: report.category,
                    description: report.description,
                    region: report.region,
                    severity: report.severity,
                    report_type: report.report_type,
                    location: report.location,
                  });
                  setStep('select');
                }}
              >
                Pular — sugestão automática
              </Button>
              <Button
                className="flex-1"
                disabled={loading}
                onClick={async () => {
                  setSelectedVereador(null);
                  await getSuggestions(buildReportData());
                  setStep('select');
                }}
              >
                Continuar
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        );

      case 'select':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold">Escolher Vereador</h2>
              <p className="text-muted-foreground text-sm mt-1">
                Selecione o vereador que receberá seu relato
              </p>
            </div>

            <div className="space-y-3">
              {loading ? (
                Array(3).fill(0).map((_, i) => (
                  <Skeleton key={i} className="h-32 w-full" />
                ))
              ) : suggestions.length > 0 ? (
                suggestions.map((suggestion, idx) => (
                  <CouncilMemberCard
                    key={suggestion.vereador.id}
                    vereador={suggestion.vereador}
                    matchScore={suggestion.matchScore}
                    matchReasons={suggestion.matchReasons}
                    selected={selectedVereador?.vereador.id === suggestion.vereador.id}
                    onSelect={() => setSelectedVereador(suggestion)}
                  />
                ))
              ) : (
                <Card>
                  <CardContent className="p-6 text-center">
                    <AlertTriangle className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">Nenhum vereador sugerido</p>
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep('commission')} className="flex-1">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
              <Button 
                onClick={() => setStep('message')} 
                className="flex-1"
                disabled={!selectedVereador}
              >
                Continuar
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        );

      case 'message':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold">Mensagem Pessoal</h2>
              <p className="text-muted-foreground text-sm mt-1">
                Adicione uma mensagem para o vereador (opcional)
              </p>
            </div>

            {selectedVereador && (
              <Card className="bg-muted/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-primary font-semibold text-sm">
                        {selectedVereador.vereador.initials}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium">{selectedVereador.vereador.name}</p>
                      <p className="text-xs text-muted-foreground">{selectedVereador.vereador.party}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Textarea
              placeholder="Escreva aqui sua mensagem para o vereador explicando a importância deste relato para você ou sua comunidade..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              className="resize-none"
            />

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep('select')} className="flex-1">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
              <Button 
                onClick={handleSubmit} 
                className="flex-1"
                disabled={submitting}
              >
                {submitting ? 'Enviando...' : 'Encaminhar'}
                <Send className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        );

      case 'success':
        return (
          <div className="space-y-6 text-center py-8">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            
            <div>
              <h2 className="text-xl font-semibold">Relato Encaminhado!</h2>
              <p className="text-muted-foreground mt-2">
                Seu relato foi enviado para{' '}
                <span className="font-medium text-foreground">
                  {selectedVereador?.vereador.name}
                </span>
              </p>
            </div>

            <Card className="bg-muted/50">
              <CardContent className="p-4 text-left">
                <h4 className="font-medium mb-2">O que acontece agora?</h4>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-primary">1.</span>
                    O gabinete do vereador receberá seu relato
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">2.</span>
                    Você será notificado quando houver atualizações
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">3.</span>
                    Acompanhe o status em "Meus Relatos"
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Button onClick={onComplete} className="w-full">
              Concluir
            </Button>
          </div>
        );
    }
  };

  return (
    <div className="p-6">
      {/* Progress indicator */}
      {step !== 'success' && (
        <div className="flex items-center justify-center gap-2 mb-6">
          {(['review', 'commission', 'select', 'message'] as const).map((s, idx) => {
            const order = ['review', 'commission', 'select', 'message'] as const;
            const activeIdx = order.indexOf(step === 'success' ? 'message' : step);
            return (
            <div key={s} className="flex items-center">
              <div 
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step === s 
                    ? 'bg-primary text-primary-foreground' 
                    : activeIdx > idx
                      ? 'bg-primary/20 text-primary'
                      : 'bg-muted text-muted-foreground'
                }`}
              >
                {idx + 1}
              </div>
              {idx < 3 && (
                <div className={`w-8 h-0.5 mx-0.5 sm:w-12 sm:mx-1 ${
                  activeIdx > idx 
                    ? 'bg-primary/50' 
                    : 'bg-muted'
                }`} />
              )}
            </div>
            );
          })}
        </div>
      )}

      {renderStep()}
    </div>
  );
};
