import { useNavigate } from 'react-router-dom';
import { Building2, ClipboardList, Send, TimerReset } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { KPICard } from '@/components/analytics/KPICard';
import { Badge } from '@/components/ui/badge';
import { VereadorLayout } from '@/layouts/VereadorLayout';
import { useGabineteVereador } from '@/hooks/useGabineteVereador';
import { useManifestsVereador } from '@/hooks/useManifestsVereador';
import { useReferralsVereador } from '@/hooks/useReferralsVereador';

export default function GabineteDashboard() {
  const navigate = useNavigate();
  const { vereador, loading: gabineteLoading } = useGabineteVereador();
  const { items, counts, loading: manifestsLoading } = useManifestsVereador();
  const { kpis, loading: referralsLoading } = useReferralsVereador();

  const loading = gabineteLoading || manifestsLoading || referralsLoading;

  return (
    <VereadorLayout>
      <div className="space-y-6">
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-background">
          <CardContent className="p-6">
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-6 w-64" />
                <Skeleton className="h-4 w-96" />
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  <h2 className="text-xl font-semibold">
                    {vereador ? `Gabinete de ${vereador.name}` : 'Gabinete vinculado'}
                  </h2>
                  {vereador?.party ? <Badge variant="outline">{vereador.party}</Badge> : null}
                </div>
                <p className="text-sm text-muted-foreground max-w-2xl">
                  Acompanhe os encaminhamentos recebidos, veja as manifestações ainda em aberto e responda o que exigir retorno do gabinete.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[...Array(3)].map((_, index) => (
              <Skeleton key={index} className="h-32" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <KPICard title="Encaminhamentos totais" value={kpis.total} icon={Send} />
            <KPICard title="Manifestações em aberto" value={counts.total} icon={ClipboardList} />
            <KPICard title="Pendentes de retorno" value={kpis.pending + kpis.sent} icon={TimerReset} />
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Links rápidos</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Button variant="outline" className="justify-start" onClick={() => navigate('/gabinete/manifestacoes')}>
                <ClipboardList className="h-4 w-4 mr-2" />
                Ver manifestações em aberto
              </Button>
              <Button variant="outline" className="justify-start" onClick={() => navigate('/gabinete/encaminhamentos')}>
                <Send className="h-4 w-4 mr-2" />
                Gerenciar encaminhamentos
              </Button>
              {vereador?.id ? (
                <Button variant="outline" className="justify-start" onClick={() => navigate(`/institucional/vereadores/${vereador.id}`)}>
                  <Building2 className="h-4 w-4 mr-2" />
                  Abrir perfil público do vereador
                </Button>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Fila mais recente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                [...Array(3)].map((_, index) => <Skeleton key={index} className="h-16" />)
              ) : items.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma manifestação em aberto no momento.</p>
              ) : (
                items.slice(0, 4).map((item) => (
                  <div key={item.referralId} className="rounded-lg border border-border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-sm">{item.title}</p>
                      <Badge variant="secondary">{item.manifestType}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {item.description || 'Sem descrição complementar.'}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </VereadorLayout>
  );
}
