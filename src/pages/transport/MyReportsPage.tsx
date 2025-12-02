import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import PageHeader from '@/components/ui/page-header';

import { useTransportReport } from '@/hooks/useTransportReport';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
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

  const getStatusLabel = (status: string) => {
    const labels: Record<string, { text: string; variant: 'default' | 'secondary' | 'outline' }> = {
      pending: { text: 'Pendente', variant: 'secondary' },
      analyzing: { text: 'Analisando', variant: 'default' },
      forwarded: { text: 'Encaminhado', variant: 'outline' },
      resolved: { text: 'Resolvido', variant: 'outline' },
    };
    return labels[status] || labels.pending;
  };

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
            const statusInfo = getStatusLabel(report.status);
            
            return (
              <Card key={report.id} className="hover:shadow-md transition-shadow border-border">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <Badge variant={statusInfo.variant}>{statusInfo.text}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(report.created_at), 'dd/MM/yyyy', { locale: ptBR })}
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
                    {report.occurrence_date && format(new Date(report.occurrence_date), 'dd/MM/yyyy', { locale: ptBR })}
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
