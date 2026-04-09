import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Clock, Bus, Info, Hash, ThumbsUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import PageHeader from '@/components/ui/page-header';
import { useTransportReport } from '@/hooks/useTransportReport';
import { Skeleton } from '@/components/ui/skeleton';
import { formatShortDate } from '@/lib/dateUtils';
import { transportProblems } from '@/data/transportProblems';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CitizenSeverityBadge } from '@/components/citizen/CitizenSeverityBadge';
import { ReferralDialog } from '@/components/referral/ReferralDialog';
import { useUserRole } from '@/hooks/useUserRole';
import { CITIZEN_PROTOCOL_LABEL, formatCitizenProtocolForDisplay } from '@/lib/citizenProtocol';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const TRANSPORT_STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  in_progress: 'Em andamento',
  resolved: 'Resolvido',
  rejected: 'Rejeitado',
};

const RECURRENCE_LABELS: Record<string, string> = {
  primeira_vez: 'Primeira vez',
  algumas_vezes_mes: 'Algumas vezes/mês',
  toda_semana: 'Toda semana',
  todos_os_dias: 'Todos os dias',
};

const DIRECTION_LABELS: Record<string, string> = {
  ida: 'Ida',
  volta: 'Volta',
  circular: 'Circular',
};

function transportApoiosCount(report: Record<string, unknown>): number {
  const raw = report.transport_report_likes as { count?: number }[] | undefined;
  const n = raw?.[0]?.count;
  return typeof n === 'number' && Number.isFinite(n) ? n : 0;
}

function personalImpactLabel(pi: unknown): string {
  const n = typeof pi === 'number' ? pi : parseInt(String(pi ?? ''), 10);
  if (!Number.isInteger(n) || n < 2) return '—';
  if (n >= 5) return 'Alto (compromisso ou não embarque)';
  if (n >= 4) return 'Atraso > 30 min';
  if (n >= 3) return 'Atraso < 30 min';
  return 'Desconforto';
}

export default function MyReportsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const highlightReportId = searchParams.get('reportId');
  const { user } = useAuth();
  const { toast } = useToast();
  const { getMyReports } = useTransportReport();
  const { canReferToCouncilMember } = useUserRole();
  const [reports, setReports] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [referralDialogOpen, setReferralDialogOpen] = useState(false);
  const [referralReport, setReferralReport] = useState<{
    id: string;
    type: 'transport';
    title: string;
    description?: string;
    location?: string;
    date?: string;
    report_type?: string;
    severity?: string;
  } | null>(null);

  const [otherReport, setOtherReport] = useState<Record<string, unknown> | null>(null);
  const [otherLoading, setOtherLoading] = useState(false);
  const [otherError, setOtherError] = useState(false);
  const [communityApoiado, setCommunityApoiado] = useState(false);

  useEffect(() => {
    loadReports();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, []);

  useEffect(() => {
    setCommunityApoiado(false);
    if (!highlightReportId || !user) {
      setOtherReport(null);
      setOtherError(false);
      setOtherLoading(false);
      return;
    }
    if (loading) return;

    const mine = reports.some((r) => r.id === highlightReportId);
    if (mine) {
      setOtherReport(null);
      setOtherError(false);
      setOtherLoading(false);
      return;
    }

    let cancelled = false;
    setOtherLoading(true);
    setOtherError(false);
    void (async () => {
      const { data, error } = await supabase
        .from('transport_reports')
        .select(
          `
          id,
          user_id,
          protocol_code,
          line_id,
          line_code_custom,
          report_type,
          severity,
          description,
          occurrence_date,
          occurrence_time,
          direction,
          recurrence_frequency,
          personal_impact,
          location,
          status,
          created_at,
          photos,
          line:transport_lines(line_code, line_name, line_type),
          transport_report_likes(count)
        `,
        )
        .eq('id', highlightReportId)
        .maybeSingle();

      if (cancelled) return;
      setOtherLoading(false);
      if (error || !data) {
        setOtherError(true);
        setOtherReport(null);
        return;
      }
      if (data.user_id === user.id) {
        setOtherReport(null);
        return;
      }
      setOtherReport(data as Record<string, unknown>);
    })();

    return () => {
      cancelled = true;
    };
  }, [highlightReportId, user, loading, reports]);

  useEffect(() => {
    if (!highlightReportId || loading || otherLoading || otherReport) return;
    if (otherError) return;
    const mine = reports.some((r) => r.id === highlightReportId);
    if (!mine) return;
    const el = document.querySelector(
      `[data-transport-report-card="${CSS.escape(highlightReportId)}"]`,
    );
    if (el) {
      requestAnimationFrame(() => {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    }
  }, [highlightReportId, reports, loading, otherReport, otherLoading, otherError]);

  const loadReports = async () => {
    try {
      const data = await getMyReports();
      setReports(data);
    } catch (err) {
      console.error('Error loading reports:', err);
    } finally {
      setLoading(false);
    }
  };

  const closeCommunityView = useCallback(() => {
    setSearchParams({});
    setOtherReport(null);
    setOtherError(false);
  }, [setSearchParams]);

  const apoiarCommunityReport = useCallback(async () => {
    if (!user || !otherReport?.id) return;
    try {
      const { error } = await supabase.from('transport_report_likes').insert({
        report_id: otherReport.id as string,
        user_id: user.id,
      });
      if (error) {
        if (error.code === '23505' || error.message?.includes('duplicate')) {
          toast({ title: 'Você já apoiou este relato.' });
          setCommunityApoiado(true);
        } else {
          throw error;
        }
      } else {
        toast({ title: 'Apoio registrado', description: 'Obrigado por reforçar este relato.' });
        setCommunityApoiado(true);
        setOtherReport((prev) => {
          if (!prev) return prev;
          const cur = transportApoiosCount(prev);
          return {
            ...prev,
            transport_report_likes: [{ count: cur + 1 }],
          };
        });
      }
    } catch (e) {
      console.error(e);
      toast({
        variant: 'destructive',
        title: 'Não foi possível apoiar',
        description: 'Tente novamente em instantes.',
      });
    }
  }, [user, otherReport, toast]);

  const renderCommunityCard = () => {
    if (!otherReport) return null;
    const problem = transportProblems.find((p) => p.id === otherReport.report_type);
    const citizenProtocol = formatCitizenProtocolForDisplay(
      otherReport.protocol_code as string | null | undefined,
    );
    const statusKey = typeof otherReport.status === 'string' ? otherReport.status : 'pending';
    const statusLabel = TRANSPORT_STATUS_LABELS[statusKey] || statusKey;
    const apoios = transportApoiosCount(otherReport);
    const line = otherReport.line as { line_code?: string; line_name?: string } | null | undefined;
    const photos = Array.isArray(otherReport.photos) ? (otherReport.photos as string[]) : [];
    const recurrenceRaw = otherReport.recurrence_frequency
      ? String(otherReport.recurrence_frequency)
      : '';
    const recurrenceLabel = RECURRENCE_LABELS[recurrenceRaw] || recurrenceRaw || null;
    const dirLabel = otherReport.direction
      ? DIRECTION_LABELS[String(otherReport.direction)] || String(otherReport.direction)
      : null;

    return (
      <Card className="border-primary/40 ring-1 ring-primary/20">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <Badge className="bg-primary/15 text-primary border-primary/30 hover:bg-primary/15">
              Relato de outro cidadão
            </Badge>
            <Button type="button" variant="ghost" size="sm" onClick={closeCommunityView}>
              Fechar
            </Button>
          </div>

          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <Bus className="w-4 h-4 text-primary shrink-0" />
              <span className="font-medium">
                {line?.line_code || otherReport.line_code_custom || 'Linha não informada'}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-end">
              <Badge variant="outline" className="text-xs font-normal">
                {statusLabel}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {otherReport.created_at ? formatShortDate(otherReport.created_at as string) : ''}
              </span>
            </div>
          </div>

          {citizenProtocol ? (
            <p className="text-xs font-mono font-medium text-primary flex items-center gap-1.5">
              <Hash className="w-3 h-3 shrink-0" aria-hidden />
              {CITIZEN_PROTOCOL_LABEL}: {citizenProtocol}
            </p>
          ) : null}

          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              {problem ? (
                <problem.icon className={cn('w-4 h-4 shrink-0', problem.color)} aria-hidden />
              ) : null}
              <p className="text-sm font-medium">{problem?.label || String(otherReport.report_type)}</p>
              {otherReport.severity ? (
                <CitizenSeverityBadge severity={otherReport.severity as string} size="sm" />
              ) : null}
            </div>
            {otherReport.description ? (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{otherReport.description}</p>
            ) : null}
          </div>

          <ul className="text-xs text-muted-foreground space-y-1 border-t border-border/50 pt-3">
            <li className="flex flex-wrap gap-x-2">
              <Clock className="w-3 h-3 shrink-0 mt-0.5" aria-hidden />
              <span>
                Ocorrência:{' '}
                {otherReport.occurrence_date
                  ? formatShortDate(otherReport.occurrence_date as string)
                  : '—'}
                {otherReport.occurrence_time ? ` às ${otherReport.occurrence_time}` : ''}
              </span>
            </li>
            {dirLabel ? (
              <li>
                <span className="font-medium text-foreground/80">Sentido:</span> {dirLabel}
              </li>
            ) : null}
            {recurrenceLabel ? (
              <li>
                <span className="font-medium text-foreground/80">Frequência:</span> {recurrenceLabel}
              </li>
            ) : null}
            <li>
              <span className="font-medium text-foreground/80">Impacto na rotina:</span>{' '}
              {personalImpactLabel(otherReport.personal_impact)}
            </li>
            {otherReport.location ? (
              <li>
                <span className="font-medium text-foreground/80">Local:</span> {String(otherReport.location)}
              </li>
            ) : null}
            <li className="inline-flex items-center gap-1 text-foreground/80">
              <ThumbsUp className="w-3 h-3 shrink-0" aria-hidden />
              {apoios === 0 ? 'Nenhum apoio ainda' : `${apoios} apoio${apoios === 1 ? '' : 's'}`}
            </li>
          </ul>

          {photos.length > 0 ? (
            <div className="grid grid-cols-3 gap-2 max-w-md">
              {photos.slice(0, 3).map((url) => (
                <a
                  key={url}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block aspect-video rounded-md overflow-hidden border bg-muted"
                >
                  <img src={url} alt="" className="w-full h-full object-cover" />
                </a>
              ))}
            </div>
          ) : null}

          <Button
            type="button"
            variant={communityApoiado ? 'secondary' : 'default'}
            size="sm"
            disabled={communityApoiado}
            onClick={() => void apoiarCommunityReport()}
          >
            <ThumbsUp className="w-3.5 h-3.5 mr-1.5" aria-hidden />
            {communityApoiado ? 'Apoiado' : 'Apoiar este relato'}
          </Button>
        </CardContent>
      </Card>
    );
  };

  const showLoginHint = Boolean(highlightReportId && !user);
  const showEmptyMine = !loading && reports.length === 0 && !otherReport && !otherLoading && !showLoginHint;

  return (
    <>
      <PageHeader title="Minhas Contribuições" backTo="/relatos" />
      <div className="min-h-screen bg-background pt-[60px] pb-24">
        <div className="max-w-7xl mx-auto px-6 py-6 space-y-4 animate-fade-in">
          <Alert className="bg-primary/5 border-primary/20">
            <Info className="h-4 w-4 text-primary" />
            <AlertDescription className="text-sm text-muted-foreground">
              Suas contribuições sobre transporte público são analisadas em conjunto com outras experiências
              para identificar padrões e subsidiar políticas públicas.
            </AlertDescription>
          </Alert>

          {showLoginHint ? (
            <Alert>
              <AlertDescription className="text-sm">
                Entre na sua conta para ver o detalhe deste relato ou apoiar.
                <Button type="button" variant="link" className="px-2 h-auto" onClick={() => navigate('/login')}>
                  Fazer login
                </Button>
              </AlertDescription>
            </Alert>
          ) : null}

          {highlightReportId && user && otherLoading ? (
            <Card className="border-border">
              <CardContent className="p-4">
                <Skeleton className="h-40 w-full" />
              </CardContent>
            </Card>
          ) : null}

          {highlightReportId && user && otherError && !otherLoading ? (
            <Alert variant="destructive">
              <AlertDescription className="text-sm">
                Não foi possível carregar este relato. O link pode estar incorreto ou o relato foi removido.
                <Button type="button" variant="link" className="text-destructive px-2 h-auto" onClick={closeCommunityView}>
                  Voltar
                </Button>
              </AlertDescription>
            </Alert>
          ) : null}

          {user && otherReport && !otherLoading ? renderCommunityCard() : null}

          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="border-border">
                <CardContent className="p-4">
                  <Skeleton className="h-24 w-full" />
                </CardContent>
              </Card>
            ))
          ) : showEmptyMine ? (
            <div className="text-center py-12">
              <Bus className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-2">Nenhuma contribuição registrada ainda</p>
              <Button onClick={() => navigate('/ia')}>Compartilhar experiência</Button>
            </div>
          ) : (
            reports.map((report) => {
              const problem = transportProblems.find((p) => p.id === report.report_type);
              const citizenProtocol = formatCitizenProtocolForDisplay(
                report.protocol_code as string | null | undefined,
              );

              const statusKey = typeof report.status === 'string' ? report.status : 'pending';
              const statusLabel = TRANSPORT_STATUS_LABELS[statusKey] || statusKey;
              const apoios = transportApoiosCount(report);
              const isHighlighted = highlightReportId === report.id;

              return (
                <Card
                  key={report.id as string}
                  data-transport-report-card={report.id as string}
                  className={`hover:shadow-md transition-shadow border-border ${
                    isHighlighted ? 'ring-2 ring-primary border-primary/50' : ''
                  }`}
                  data-testid="report-card"
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3 gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <Bus className="w-4 h-4 text-primary" />
                        <span className="font-medium">
                          {report.line?.line_code || report.line_code_custom || 'Linha não informada'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap justify-end">
                        <Badge variant="outline" className="text-xs font-normal">
                          {statusLabel}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatShortDate(report.created_at as string)}
                        </span>
                      </div>
                    </div>

                    {citizenProtocol ? (
                      <p className="text-xs font-mono font-medium text-primary mb-3 flex items-center gap-1.5">
                        <Hash className="w-3 h-3 shrink-0" aria-hidden />
                        {CITIZEN_PROTOCOL_LABEL}: {citizenProtocol}
                      </p>
                    ) : null}

                    <div className="space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        {problem ? <problem.icon className={`w-4 h-4 ${problem.color}`} /> : null}
                        <p className="text-sm font-medium">{problem?.label || report.report_type}</p>
                        {report.severity ? (
                          <CitizenSeverityBadge severity={report.severity as string} size="sm" />
                        ) : null}
                      </div>

                      {report.description ? (
                        <p className="text-sm text-muted-foreground line-clamp-2">{report.description}</p>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mt-4 pt-3 border-t border-border/50">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3 h-3 shrink-0" aria-hidden />
                        {report.occurrence_date && formatShortDate(report.occurrence_date as string)}
                        {report.occurrence_time && ` às ${report.occurrence_time}`}
                      </span>
                      <span className="inline-flex items-center gap-1 text-foreground/80">
                        <ThumbsUp className="w-3 h-3 shrink-0" aria-hidden />
                        {apoios === 0 ? 'Nenhum apoio ainda' : `${apoios} apoio${apoios === 1 ? '' : 's'}`}
                      </span>
                    </div>

                    {canReferToCouncilMember ? (
                      <div className="mt-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const title =
                              report.line?.line_code ||
                              report.line_code_custom ||
                              problem?.label ||
                              'Relato de transporte';

                            setReferralReport({
                              id: report.id as string,
                              type: 'transport',
                              title,
                              description: report.description || undefined,
                              location: report.location_address || report.location || undefined,
                              date: report.created_at as string,
                              report_type: report.report_type || undefined,
                              severity: report.severity as string | undefined,
                            });
                            setReferralDialogOpen(true);
                          }}
                        >
                          Encaminhar para vereador
                        </Button>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>

      <ReferralDialog
        open={referralDialogOpen}
        onOpenChange={(open) => {
          setReferralDialogOpen(open);
          if (!open) setReferralReport(null);
        }}
        report={referralReport ? { ...referralReport } : null}
        onComplete={() => {
          setReferralDialogOpen(false);
          setReferralReport(null);
        }}
      />
    </>
  );
}
