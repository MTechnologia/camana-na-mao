import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { KPICard } from '@/components/analytics/KPICard';
import { CheckCircle2, Clock, Eye, RefreshCw, Send, Users } from 'lucide-react';
import { VereadorLayout } from '@/layouts/VereadorLayout';
import { ReferralsVereadorItem, useReferralsVereador } from '@/hooks/useReferralsVereador';

const statusLabels: Record<string, string> = {
  pending: 'Pendente',
  sent: 'Enviado',
  acknowledged: 'Recebido',
  resolved: 'Resolvido',
};

export default function GabineteEncaminhamentos() {
  const {
    referrals,
    loading,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    kpis,
    addResponse,
    updateStatus,
    refetch,
  } = useReferralsVereador();
  const [selectedReferral, setSelectedReferral] = useState<ReferralsVereadorItem | null>(null);
  const [responseText, setResponseText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const statusColor = useMemo(
    () => ({
      pending: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20',
      sent: 'bg-blue-500/10 text-blue-700 border-blue-500/20',
      acknowledged: 'bg-purple-500/10 text-purple-700 border-purple-500/20',
      resolved: 'bg-green-500/10 text-green-700 border-green-500/20',
    }),
    [],
  );

  const openDetails = (referral: ReferralsVereadorItem) => {
    setSelectedReferral(referral);
    setResponseText(referral.response_text || '');
  };

  const submitResponse = async () => {
    if (!selectedReferral || !responseText.trim()) return;
    setSubmitting(true);
    await addResponse(selectedReferral.id, responseText.trim());
    setSubmitting(false);
    setSelectedReferral(null);
  };

  return (
    <VereadorLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold">Encaminhamentos do gabinete</h2>
            <p className="text-sm text-muted-foreground">
              Consulte os itens recebidos, responda o cidadão quando necessário e acompanhe o status do atendimento.
            </p>
          </div>
          <Button variant="outline" onClick={refetch}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[...Array(5)].map((_, index) => <Skeleton key={index} className="h-28" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <KPICard title="Total" value={kpis.total} icon={Users} />
            <KPICard title="Pendentes" value={kpis.pending} icon={Clock} />
            <KPICard title="Enviados" value={kpis.sent} icon={Send} />
            <KPICard title="Recebidos" value={kpis.acknowledged} icon={Eye} />
            <KPICard title="Resolvidos" value={kpis.resolved} icon={CheckCircle2} />
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              placeholder="Buscar por mensagem ou resposta..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="pending">Pendentes</SelectItem>
                <SelectItem value="sent">Enviados</SelectItem>
                <SelectItem value="acknowledged">Recebidos</SelectItem>
                <SelectItem value="resolved">Resolvidos</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {loading ? (
            [...Array(4)].map((_, index) => <Skeleton key={index} className="h-32" />)
          ) : referrals.length === 0 ? (
            <Card className="p-10 text-center">
              <p className="font-medium">Nenhum encaminhamento encontrado</p>
              <p className="text-sm text-muted-foreground">Ajuste os filtros ou aguarde novos itens para o gabinete.</p>
            </Card>
          ) : (
            referrals.map((referral) => (
              <Card key={referral.id}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={statusColor[referral.status as keyof typeof statusColor] || ''}>
                          Encaminhamento: {statusLabels[referral.status] || referral.status}
                        </Badge>
                        <Badge variant="secondary">{referral.manifestType}</Badge>
                        {referral.manifestProtocol ? <Badge variant="outline">Protocolo {referral.manifestProtocol}</Badge> : null}
                        {referral.manifestStatus ? (
                          <Badge variant="outline">
                            Manifestação: {statusLabels[referral.manifestStatus] || referral.manifestStatus}
                          </Badge>
                        ) : null}
                      </div>
                      <div>
                        <p className="font-medium">{referral.manifestTitle}</p>
                        <p className="text-sm text-muted-foreground">
                          {referral.manifestDescription || 'Sem descrição complementar.'}
                        </p>
                      </div>
                      {referral.citizen_message ? (
                        <p className="text-sm rounded-lg bg-muted p-3">
                          "{referral.citizen_message}"
                        </p>
                      ) : null}
                    </div>

                    <div className="flex flex-col gap-2 lg:items-end">
                      <Button variant="outline" onClick={() => openDetails(referral)}>
                        <Eye className="h-4 w-4 mr-2" />
                        Ver detalhes
                      </Button>
                      <Select onValueChange={(value) => updateStatus(referral.id, value as 'pending' | 'sent' | 'acknowledged' | 'resolved')}>
                        <SelectTrigger className="w-full lg:w-40">
                          <SelectValue placeholder="Alterar status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pendente</SelectItem>
                          <SelectItem value="sent">Enviado</SelectItem>
                          <SelectItem value="acknowledged">Recebido</SelectItem>
                          <SelectItem value="resolved">Resolvido</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <Dialog open={Boolean(selectedReferral)} onOpenChange={(open) => !open && setSelectedReferral(null)}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Detalhes do encaminhamento</DialogTitle>
            </DialogHeader>

            {selectedReferral ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge>Encaminhamento: {statusLabels[selectedReferral.status] || selectedReferral.status}</Badge>
                  <Badge variant="secondary">{selectedReferral.manifestType}</Badge>
                  {selectedReferral.manifestProtocol ? <Badge variant="outline">Protocolo {selectedReferral.manifestProtocol}</Badge> : null}
                  {selectedReferral.manifestStatus ? (
                    <Badge variant="outline">
                      Manifestação: {statusLabels[selectedReferral.manifestStatus] || selectedReferral.manifestStatus}
                    </Badge>
                  ) : null}
                </div>

                <div className="space-y-1">
                  <p className="font-medium">{selectedReferral.manifestTitle}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedReferral.manifestDescription || 'Sem descrição complementar.'}
                  </p>
                </div>

                {selectedReferral.citizen_message ? (
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-xs text-muted-foreground mb-1">Mensagem do cidadão</p>
                    <p className="text-sm">{selectedReferral.citizen_message}</p>
                  </div>
                ) : null}

                <div className="space-y-2">
                  <p className="text-sm font-medium">Resposta do gabinete</p>
                  <Textarea
                    value={responseText}
                    onChange={(event) => setResponseText(event.target.value)}
                    placeholder="Escreva a resposta ou atualização oficial do gabinete..."
                    rows={6}
                  />
                </div>
              </div>
            ) : null}

            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedReferral(null)} disabled={submitting}>
                Fechar
              </Button>
              <Button onClick={submitResponse} disabled={submitting || !responseText.trim()}>
                {submitting ? 'Salvando...' : 'Salvar resposta'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </VereadorLayout>
  );
}
