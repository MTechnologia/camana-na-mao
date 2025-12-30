import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import PageHeader from '@/components/ui/page-header';
import { AnalysisStatusBadge } from '@/components/shared/AnalysisStatusBadge';
import { useTransportReport } from '@/hooks/useTransportReport';
import { Skeleton } from '@/components/ui/skeleton';
import { formatShortDate } from '@/lib/dateUtils';
import { transportProblems } from '@/data/transportProblems';

export default function MyReportsPage() {
  const navigate = useNavigate();
  const { getMyReports } = useTransportReport();
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReports();
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

  // Função removida - agora usa AnalysisStatusBadge

  return (
    <>
      <PageHeader title="Meus Relatos" backTo="/transporte" />
      <div className="min-h-screen bg-background pt-[60px] pb-24">
        <div className="max-w-7xl mx-auto px-6 py-6 space-y-4 animate-fade-in">
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
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-2">Nenhum relato enviado ainda</p>
            <Button onClick={() => navigate('/transporte/novo')}>Fazer primeiro relato</Button>
          </div>
        ) : (
          reports.map((report) => {
            const problem = transportProblems.find(p => p.id === report.report_type);
            
            return (
              <Card key={report.id} className="hover:shadow-md transition-shadow border-border">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex flex-col gap-1">
                      {report.protocol_code && (
                        <span className="text-xs font-mono text-primary">
                          {report.protocol_code}
                        </span>
                      )}
                      <AnalysisStatusBadge
                        status={report.status}
                        n8nProcessed={report.n8n_processed}
                        n8nPriority={report.n8n_priority}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatShortDate(report.created_at)}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <p className="text-xs text-muted-foreground">Linha</p>
                      <p className="font-medium">
                        {report.line?.line_code || report.line_code_custom}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-muted-foreground">Problema</p>
                      <div className="flex items-center gap-2">
                        {problem && <problem.icon className={`w-4 h-4 ${problem.color}`} />}
                        <p className="font-medium">{problem?.label || report.report_type}</p>
                      </div>
                    </div>

                    {report.description && (
                      <div>
                        <p className="text-xs text-muted-foreground">Descrição</p>
                        <p className="text-sm line-clamp-2">{report.description}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-4">
                    <Clock className="w-3 h-3" />
                    {report.occurrence_date && formatShortDate(report.occurrence_date)}
                    {report.occurrence_time && ` às ${report.occurrence_time}`}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
        </div>
      </div>

    </>
  );
}
