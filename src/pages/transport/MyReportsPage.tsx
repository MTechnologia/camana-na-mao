import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Bus, Info, Hash } from 'lucide-react';
import { Button } from '@/components/ui/button';
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

export default function MyReportsPage() {
  const navigate = useNavigate();
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

  useEffect(() => {
    loadReports();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, []);

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

  return (
    <>
      <PageHeader title="Minhas Contribuições" backTo="/relatos" />
      <div className="min-h-screen bg-background pt-[60px] pb-24">
        <div className="max-w-7xl mx-auto px-6 py-6 space-y-4 animate-fade-in">
          
          {/* Explicação do propósito */}
          <Alert className="bg-primary/5 border-primary/20">
            <Info className="h-4 w-4 text-primary" />
            <AlertDescription className="text-sm text-muted-foreground">
              Suas contribuições sobre transporte público são analisadas em conjunto 
              com outras experiências para identificar padrões e subsidiar políticas públicas.
            </AlertDescription>
          </Alert>

          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="border-border">
                <CardContent className="p-4">
                  <Skeleton className="h-24 w-full" />
                </CardContent>
              </Card>
            ))
          ) : reports.length === 0 ? (
            <div className="text-center py-12">
              <Bus className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-2">Nenhuma contribuição registrada ainda</p>
              <Button onClick={() => navigate('/ia')}>Compartilhar experiência</Button>
            </div>
          ) : (
            reports.map((report) => {
              const problem = transportProblems.find(p => p.id === report.report_type);
              const citizenProtocol = formatCitizenProtocolForDisplay(
                report.protocol_code as string | null | undefined
              );
              
              return (
                <Card key={report.id} className="hover:shadow-md transition-shadow border-border" data-testid="report-card">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Bus className="w-4 h-4 text-primary" />
                        <span className="font-medium">
                          {report.line?.line_code || report.line_code_custom || 'Linha não informada'}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatShortDate(report.created_at)}
                      </span>
                    </div>

                    {citizenProtocol && (
                      <p className="text-xs font-mono font-medium text-primary mb-3 flex items-center gap-1.5">
                        <Hash className="w-3 h-3 shrink-0" aria-hidden />
                        {CITIZEN_PROTOCOL_LABEL}: {citizenProtocol}
                      </p>
                    )}

                    <div className="space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        {problem && <problem.icon className={`w-4 h-4 ${problem.color}`} />}
                        <p className="text-sm font-medium">{problem?.label || report.report_type}</p>
                        {report.severity && (
                          <CitizenSeverityBadge severity={report.severity as string} size="sm" />
                        )}
                      </div>

                      {report.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {report.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-4 pt-3 border-t border-border/50">
                      <Clock className="w-3 h-3" />
                      {report.occurrence_date && formatShortDate(report.occurrence_date)}
                      {report.occurrence_time && ` às ${report.occurrence_time}`}
                    </div>

                    {canReferToCouncilMember && (
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
                              id: report.id,
                              type: 'transport',
                              title,
                              description: report.description || undefined,
                              location: report.location_address || report.location || undefined,
                              date: report.created_at,
                              report_type: report.report_type || undefined,
                              severity: report.severity as string | undefined,
                            });
                            setReferralDialogOpen(true);
                          }}
                        >
                          Encaminhar para vereador
                        </Button>
                      </div>
                    )}
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
