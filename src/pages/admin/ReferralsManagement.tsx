import { useState } from 'react';
import { AdminLayout } from '@/layouts/AdminLayout';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { KPICard } from '@/components/analytics/KPICard';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  Search, Users, Clock, CheckCircle2, Send, Eye, MessageSquare, 
  ChevronLeft, ChevronRight, Bus, MapPin, Star, RefreshCw, Trash2, AlertTriangle 
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useReferralsAdmin } from '@/hooks/useReferralsAdmin';

const ReferralsManagement = () => {
  const {
    referrals,
    loading,
    kpis,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    typeFilter,
    setTypeFilter,
    page,
    setPage,
    totalCount,
    totalPages,
    pageSize,
    updateReferralStatus,
    addResponse,
    deleteReferral,
    refetch,
  } = useReferralsAdmin();

  const [selectedReferral, setSelectedReferral] = useState<Record<string, unknown> | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [responseText, setResponseText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [referralToDelete, setReferralToDelete] = useState<Record<string, unknown> | null>(null);
  const [deleting, setDeleting] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      case 'sent': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'acknowledged': return 'bg-purple-500/10 text-purple-600 border-purple-500/20';
      case 'resolved': return 'bg-green-500/10 text-green-600 border-green-500/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'Pendente';
      case 'sent': return 'Enviado';
      case 'acknowledged': return 'Recebido';
      case 'resolved': return 'Resolvido';
      default: return status;
    }
  };

  const getReportType = (referral: Record<string, unknown>) => {
    if (referral.transport_report_id) return { type: 'transport', label: 'Transporte', icon: Bus };
    if (referral.urban_report_id) return { type: 'urban', label: 'Urbano', icon: MapPin };
    if (referral.service_rating_id) return { type: 'service', label: 'Serviço', icon: Star };
    return { type: 'unknown', label: 'Desconhecido', icon: MessageSquare };
  };

  const handleViewDetails = (referral: Record<string, unknown>) => {
    setSelectedReferral(referral);
    setResponseText(referral.response_text || '');
    setDetailsOpen(true);
  };

  const handleSubmitResponse = async () => {
    if (!selectedReferral || !responseText.trim()) return;
    setSubmitting(true);
    await addResponse(selectedReferral.id, responseText);
    setSubmitting(false);
    setDetailsOpen(false);
  };

  const handleDeleteReferral = async () => {
    if (!referralToDelete) return;
    setDeleting(true);
    await deleteReferral(referralToDelete.id);
    setDeleting(false);
    setDeleteDialogOpen(false);
    setReferralToDelete(null);
    if (detailsOpen) setDetailsOpen(false);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Gestão de Encaminhamentos</h1>
            <p className="text-muted-foreground">Acompanhe encaminhamentos para vereadores</p>
          </div>
          <Button variant="outline" size="sm" onClick={refetch}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Atualizar
          </Button>
        </div>

        {/* KPIs */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <KPICard title="Total" value={kpis.total} icon={Users} />
            <KPICard title="Pendentes" value={kpis.pending} icon={Clock} className="border-yellow-500/20" />
            <KPICard title="Enviados" value={kpis.sent} icon={Send} className="border-blue-500/20" />
            <KPICard title="Recebidos" value={kpis.acknowledged} icon={Eye} className="border-purple-500/20" />
            <KPICard title="Resolvidos" value={kpis.resolved} icon={CheckCircle2} className="border-green-500/20" />
          </div>
        )}

        {/* Filters */}
        <Card className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por vereador ou mensagem..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="sent">Enviado</SelectItem>
                <SelectItem value="acknowledged">Recebido</SelectItem>
                <SelectItem value="resolved">Resolvido</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo de Relato" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Tipos</SelectItem>
                <SelectItem value="transport">Transporte</SelectItem>
                <SelectItem value="urban">Urbano</SelectItem>
                <SelectItem value="service">Serviço</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>

        {/* Referrals List */}
        <div className="space-y-4">
          {loading ? (
            [...Array(5)].map((_, i) => <Skeleton key={i} className="h-32" />)
          ) : referrals.length === 0 ? (
            <Card className="p-12 text-center">
              <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium">Nenhum encaminhamento encontrado</p>
              <p className="text-sm text-muted-foreground">Tente ajustar os filtros de busca</p>
            </Card>
          ) : (
            referrals.map((referral) => {
              const reportType = getReportType(referral);
              const ReportIcon = reportType.icon;
              
              return (
                <Card key={referral.id} className="p-4 hover:border-primary/50 transition-colors">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {referral.council_member_name.split(' ').map((n: string) => n[0]).slice(0, 2).join('')}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold">{referral.council_member_name}</h3>
                        {referral.council_member_party && (
                          <Badge variant="outline">{referral.council_member_party}</Badge>
                        )}
                        <Badge className={getStatusColor(referral.status)}>
                          {getStatusLabel(referral.status)}
                        </Badge>
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <ReportIcon className="h-3 w-3" />
                          {reportType.label}
                        </Badge>
                      </div>

                      {referral.match_score !== null && (
                        <div className="flex items-center gap-2 max-w-xs">
                          <span className="text-xs text-muted-foreground">Match:</span>
                          <Progress value={referral.match_score} className="h-2 flex-1" />
                          <span className="text-xs font-medium">{referral.match_score}%</span>
                        </div>
                      )}

                      {referral.citizen_message && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          "{referral.citizen_message}"
                        </p>
                      )}

                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>{format(new Date(referral.created_at), "dd 'de' MMM, yyyy 'às' HH:mm", { locale: ptBR })}</span>
                        {referral.match_reasons && referral.match_reasons.length > 0 && (
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            {referral.match_reasons.length} motivos
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleViewDetails(referral)}>
                          <Eye className="h-4 w-4 mr-1" />
                          Detalhes
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setReferralToDelete(referral);
                            setDeleteDialogOpen(true);
                          }}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      {referral.status === 'pending' && (
                        <Select onValueChange={(value) => updateReferralStatus(referral.id, value)}>
                          <SelectTrigger className="w-32">
                            <SelectValue placeholder="Ações" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sent">Marcar Enviado</SelectItem>
                            <SelectItem value="acknowledged">Marcar Recebido</SelectItem>
                            <SelectItem value="resolved">Resolver</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <Card className="p-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-sm text-muted-foreground">
                Mostrando {page * pageSize + 1}-{Math.min((page + 1) * pageSize, totalCount)} de {totalCount}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Anterior
                </Button>
                <span className="text-sm">
                  Página {page + 1} de {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                >
                  Próxima
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Details Modal */}
        <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Detalhes do Encaminhamento</DialogTitle>
            </DialogHeader>
            
            {selectedReferral && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-14 w-14">
                    <AvatarFallback className="bg-primary/10 text-primary text-lg">
                      {selectedReferral.council_member_name.split(' ').map((n: string) => n[0]).slice(0, 2).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold text-lg">{selectedReferral.council_member_name}</h3>
                    {selectedReferral.council_member_party && (
                      <p className="text-sm text-muted-foreground">{selectedReferral.council_member_party}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Status</span>
                    <Badge className={getStatusColor(selectedReferral.status)}>
                      {getStatusLabel(selectedReferral.status)}
                    </Badge>
                  </div>
                  {selectedReferral.match_score !== null && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Match Score</span>
                      <span className="font-semibold">{selectedReferral.match_score}%</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Criado em</span>
                    <span className="text-sm">
                      {format(new Date(selectedReferral.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                </div>

                {selectedReferral.match_reasons && selectedReferral.match_reasons.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-sm font-medium">Motivos do Match</span>
                    <ul className="space-y-1">
                      {selectedReferral.match_reasons.map((reason: string, i: number) => (
                        <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                          {reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedReferral.citizen_message && (
                  <div className="space-y-2">
                    <span className="text-sm font-medium">Mensagem do Cidadão</span>
                    <p className="text-sm bg-muted p-3 rounded-lg">{selectedReferral.citizen_message}</p>
                  </div>
                )}

                <div className="space-y-2">
                  <span className="text-sm font-medium">Resposta do Vereador</span>
                  <Textarea
                    placeholder="Adicione a resposta do vereador..."
                    value={responseText}
                    onChange={(e) => setResponseText(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-2">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  setReferralToDelete(selectedReferral);
                  setDeleteDialogOpen(true);
                }}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Excluir
              </Button>
              <div className="flex-1" />
              <Button variant="outline" onClick={() => setDetailsOpen(false)}>
                Fechar
              </Button>
              <Button onClick={handleSubmitResponse} disabled={submitting || !responseText.trim()}>
                {submitting ? 'Salvando...' : 'Salvar Resposta'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
                  <AlertTriangle className="h-6 w-6 text-destructive" />
                </div>
                <AlertDialogTitle className="text-xl">
                  Excluir encaminhamento?
                </AlertDialogTitle>
              </div>
              <AlertDialogDescription className="space-y-3">
                <p>
                  Esta ação não pode ser desfeita. O encaminhamento para{' '}
                  <strong>{referralToDelete?.council_member_name}</strong> será excluído permanentemente.
                </p>
                {referralToDelete?.citizen_message && (
                  <div className="p-3 bg-muted rounded-md border">
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      "{referralToDelete.citizen_message}"
                    </p>
                  </div>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteReferral}
                disabled={deleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleting ? 'Excluindo...' : 'Excluir permanentemente'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
};

export default ReferralsManagement;
