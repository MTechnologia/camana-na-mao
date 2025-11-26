import { useNavigate } from 'react-router-dom';
import { ArrowLeft, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useReportPatterns } from '@/hooks/useReportPatterns';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function PatternsPage() {
  const navigate = useNavigate();
  const { patterns, loading } = useReportPatterns();

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="flex items-center gap-4 p-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/transporte')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-bold text-lg">Padrões Detectados</h1>
            <p className="text-xs text-muted-foreground">Problemas recorrentes no transporte</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))
        ) : patterns.length === 0 ? (
          <div className="text-center py-12">
            <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhum padrão detectado ainda</p>
          </div>
        ) : (
          patterns.map((pattern) => (
            <Card key={pattern.id} className="border-2">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <Badge variant="secondary" className="text-xs">
                    {pattern.occurrence_count} {pattern.occurrence_count === 1 ? 'relato' : 'relatos'}
                  </Badge>
                  {pattern.average_severity && (
                    <Badge
                      variant="outline"
                      className={
                        pattern.average_severity === 'critical'
                          ? 'border-red-500 text-red-500'
                          : pattern.average_severity === 'high'
                          ? 'border-orange-500 text-orange-500'
                          : 'border-yellow-500 text-yellow-500'
                      }
                    >
                      {pattern.average_severity === 'critical' && 'Crítico'}
                      {pattern.average_severity === 'high' && 'Alto'}
                      {pattern.average_severity === 'medium' && 'Médio'}
                      {pattern.average_severity === 'low' && 'Baixo'}
                    </Badge>
                  )}
                </div>

                <h3 className="font-semibold mb-2">{pattern.description}</h3>

                <div className="text-xs text-muted-foreground space-y-1">
                  <p>
                    Primeiro relato:{' '}
                    {format(new Date(pattern.first_detected_at), 'dd/MM/yyyy', { locale: ptBR })}
                  </p>
                  <p>
                    Último relato:{' '}
                    {format(new Date(pattern.last_occurrence_at), 'dd/MM/yyyy', { locale: ptBR })}
                  </p>
                </div>

                {pattern.suggested_action && (
                  <div className="mt-3 p-3 bg-amber-50 rounded-lg">
                    <p className="text-xs text-amber-900">
                      <strong>Ação sugerida:</strong> {pattern.suggested_action}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
