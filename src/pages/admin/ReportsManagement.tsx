import { useState } from 'react';
import { AdminLayout } from '@/layouts/AdminLayout';
import { useReportsAdmin, ManifestType, UnifiedManifest } from '@/hooks/useReportsAdmin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Search, Download, AlertTriangle, LayoutList, Columns, Filter,
  Building2, Bus, Star, MessageSquare, Clock, TrendingUp, CheckCircle2, XCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { UnifiedReportDrawer } from '@/components/admin/UnifiedReportDrawer';
import { ManifestCard } from '@/components/admin/ManifestCard';
import { BulkActionsBar } from '@/components/admin/BulkActionsBar';
import { DeleteReportConfirmDialog } from '@/components/admin/DeleteReportConfirmDialog';
import { ReferralDialog } from '@/components/referral/ReferralDialog';

// Config objects for Kanban view
const typeConfig: Record<ManifestType, { label: string; icon: typeof Building2; color: string }> = {
  urban: { label: 'Urbana', icon: Building2, color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  transport: { label: 'Transporte', icon: Bus, color: 'bg-purple-500/10 text-purple-600 border-purple-500/20' },
  evaluation: { label: 'Avaliação', icon: Star, color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  feedback: { label: 'Feedback', icon: MessageSquare, color: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20' },
};

const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: 'Pendente', color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20', icon: Clock },
  in_progress: { label: 'Em Andamento', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20', icon: TrendingUp },
  resolved: { label: 'Resolvido', color: 'bg-green-500/10 text-green-600 border-green-500/20', icon: CheckCircle2 },
  rejected: { label: 'Rejeitado', color: 'bg-red-500/10 text-red-600 border-red-500/20', icon: XCircle },
  completed: { label: 'Concluída', color: 'bg-green-500/10 text-green-600 border-green-500/20', icon: CheckCircle2 },
};

const severityConfig: Record<string, { label: string; color: string }> = {
  critical: { label: 'Crítica', color: 'bg-red-500/10 text-red-600 border-red-500/20' },
  high: { label: 'Alta', color: 'bg-orange-500/10 text-orange-600 border-orange-500/20' },
  medium: { label: 'Média', color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' },
  low: { label: 'Baixa', color: 'bg-green-500/10 text-green-600 border-green-500/20' },
};

export default function ReportsManagement() {
  const {
    manifests,
    loading,
    kpis,
    kpisLoading,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    severityFilter,
    setSeverityFilter,
    typeFilter,
    setTypeFilter,
    page,
    setPage,
    pageSize,
    totalCount,
    updateManifestStatus,
    deleteManifest,
    deleteBulkManifests,
    exportToCSV,
  } = useReportsAdmin();

  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [selectedIds, setSelectedIds] = useState<{ id: string; type: ManifestType }[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedManifest, setSelectedManifest] = useState<UnifiedManifest | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [manifestToDelete, setManifestToDelete] = useState<UnifiedManifest | null>(null);
  const [referralDialogOpen, setReferralDialogOpen] = useState(false);

  const totalPages = Math.ceil(totalCount / pageSize);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(manifests.map(m => ({ id: m.id, type: m.type })));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (manifest: UnifiedManifest, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, { id: manifest.id, type: manifest.type }]);
    } else {
      setSelectedIds(prev => prev.filter(i => i.id !== manifest.id));
    }
  };

  const handleViewDetails = (manifest: UnifiedManifest) => {
    setSelectedManifest(manifest);
    setDrawerOpen(true);
  };

  const handleDeleteClick = (manifest: UnifiedManifest) => {
    setManifestToDelete(manifest);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (manifestToDelete) {
      await deleteManifest(manifestToDelete.id, manifestToDelete.type);
      setDeleteDialogOpen(false);
      setManifestToDelete(null);
      setDrawerOpen(false);
    }
  };

  const handleBulkAction = async (action: string) => {
    if (action === 'delete') {
      await deleteBulkManifests(selectedIds);
      setSelectedIds([]);
    } else {
      // Status update
      for (const { id, type } of selectedIds) {
        await updateManifestStatus(id, type, action);
      }
      setSelectedIds([]);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Gestão de Manifestações</h1>
            <p className="text-muted-foreground">Gerencie todas as manifestações cidadãs em um só lugar</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <LayoutList className="h-4 w-4 mr-1" />
              Lista
            </Button>
            <Button
              variant={viewMode === 'kanban' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('kanban')}
            >
              <Columns className="h-4 w-4 mr-1" />
              Kanban
            </Button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {kpisLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="h-8 w-16 mb-2" />
                  <Skeleton className="h-4 w-24" />
                </CardContent>
              </Card>
            ))
          ) : (
            <>
              <Card>
                <CardContent className="p-4">
                  <p className="text-2xl font-bold">{kpis.total}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-2xl font-bold text-yellow-600">{kpis.pending}</p>
                  <p className="text-xs text-muted-foreground">Pendentes</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-2xl font-bold text-blue-600">{kpis.urban_count}</p>
                  <p className="text-xs text-muted-foreground">Urbanas</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-2xl font-bold text-purple-600">{kpis.transport_count}</p>
                  <p className="text-xs text-muted-foreground">Transporte</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-2xl font-bold text-amber-600">{kpis.evaluation_count}</p>
                  <p className="text-xs text-muted-foreground">Avaliações</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-2xl font-bold text-red-600">{kpis.critical_count}</p>
                  <p className="text-xs text-muted-foreground">Críticas</p>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar manifestações..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>

              <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as ManifestType | 'all')}>
                <SelectTrigger className="w-[140px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  <SelectItem value="urban">Urbana</SelectItem>
                  <SelectItem value="transport">Transporte</SelectItem>
                  <SelectItem value="evaluation">Avaliação</SelectItem>
                  <SelectItem value="feedback">Feedback</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="in_progress">Em Andamento</SelectItem>
                  <SelectItem value="resolved">Resolvido</SelectItem>
                  <SelectItem value="rejected">Rejeitado</SelectItem>
                </SelectContent>
              </Select>

              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Severidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="critical">Crítica</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="medium">Média</SelectItem>
                  <SelectItem value="low">Baixa</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline" onClick={exportToCSV}>
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Bulk Actions */}
        {selectedIds.length > 0 && (
          <BulkActionsBar
            selectedCount={selectedIds.length}
            onClear={() => setSelectedIds([])}
            onMarkInProgress={() => handleBulkAction('in_progress')}
            onMarkResolved={() => handleBulkAction('resolved')}
            onMarkRejected={() => handleBulkAction('rejected')}
            onDelete={() => handleBulkAction('delete')}
          />
        )}

        {/* List View */}
        {viewMode === 'list' && (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-4">
                <Checkbox
                  checked={selectedIds.length === manifests.length && manifests.length > 0}
                  onCheckedChange={handleSelectAll}
                />
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {totalCount} manifestações encontradas
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[600px]">
                {loading ? (
                  <div className="p-4 space-y-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-1/3" />
                          <Skeleton className="h-3 w-1/2" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : manifests.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                    <AlertTriangle className="h-12 w-12 mb-4 opacity-50" />
                    <p>Nenhuma manifestação encontrada</p>
                  </div>
                ) : (
                  <div>
                    {manifests.map((manifest) => (
                      <ManifestCard
                        key={manifest.id}
                        manifest={manifest}
                        isSelected={selectedIds.some(i => i.id === manifest.id)}
                        onSelect={(checked) => handleSelectOne(manifest, checked)}
                        onStatusChange={(status) => updateManifestStatus(manifest.id, manifest.type, status)}
                        onViewDetails={() => handleViewDetails(manifest)}
                        onReferral={() => {
                          setSelectedManifest(manifest);
                          setReferralDialogOpen(true);
                        }}
                        onDelete={() => handleDeleteClick(manifest)}
                      />
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Página {page} de {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}
                  >
                    Próxima
                  </Button>
                </div>
              </div>
            )}
          </Card>
        )}

        {/* Kanban View */}
        {viewMode === 'kanban' && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {['pending', 'in_progress', 'resolved', 'rejected'].map((status) => {
              const statusItems = manifests.filter(m => m.status === status);
              const config = statusConfig[status];

              return (
                <Card key={status} className="min-h-[400px]">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className={config.color}>
                        <config.icon className="h-3 w-3 mr-1" />
                        {config.label}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{statusItems.length}</span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {loading ? (
                      Array.from({ length: 2 }).map((_, i) => (
                        <Skeleton key={i} className="h-20 w-full" />
                      ))
                    ) : (
                      statusItems.slice(0, 10).map((manifest) => {
                        const TypeIcon = typeConfig[manifest.type].icon;

                        return (
                          <Card
                            key={manifest.id}
                            className="p-3 cursor-pointer hover:border-primary transition-colors"
                            onClick={() => handleViewDetails(manifest)}
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline" className={`${typeConfig[manifest.type].color} text-xs px-1.5 py-0`}>
                                <TypeIcon className="h-3 w-3" />
                              </Badge>
                              {manifest.severity && severityConfig[manifest.severity] && (
                                <Badge variant="outline" className={`${severityConfig[manifest.severity].color} text-xs px-1.5 py-0`}>
                                  {severityConfig[manifest.severity].label}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm font-medium truncate">{manifest.title}</p>
                            <p className="text-xs text-muted-foreground truncate">{manifest.description}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {format(new Date(manifest.created_at), "dd/MM HH:mm", { locale: ptBR })}
                            </p>
                          </Card>
                        );
                      })
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Drawer */}
      <UnifiedReportDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        manifest={selectedManifest}
        onStatusChange={updateManifestStatus}
        onDelete={handleDeleteClick}
        onReferral={() => setReferralDialogOpen(true)}
      />

      {/* Delete Dialog */}
      <DeleteReportConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
        reportDescription={manifestToDelete?.description || undefined}
      />

      {/* Referral Dialog */}
      <ReferralDialog
        open={referralDialogOpen}
        onOpenChange={setReferralDialogOpen}
        report={selectedManifest ? {
          id: selectedManifest.id,
          type: selectedManifest.type === 'urban' || selectedManifest.type === 'feedback' ? 'urban' : selectedManifest.type === 'transport' ? 'transport' : 'service',
          title: selectedManifest.title,
          description: selectedManifest.description || undefined,
          severity: selectedManifest.severity,
        } : null}
      />
    </AdminLayout>
  );
}
