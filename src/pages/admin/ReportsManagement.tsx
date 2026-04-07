import { useState } from 'react';
import { AdminLayout } from '@/layouts/AdminLayout';
import { useReportsAdmin, ManifestType, UnifiedManifest } from '@/hooks/useReportsAdmin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Search, Download, AlertTriangle, LayoutList, Columns,
  Building2, Bus, Star, MessageSquare
} from 'lucide-react';
import { UnifiedReportDrawer } from '@/components/admin/UnifiedReportDrawer';
import { ManifestCard } from '@/components/admin/ManifestCard';
import { KanbanBoard } from '@/components/admin/KanbanBoard';
import { BulkActionsBar } from '@/components/admin/BulkActionsBar';
import { DeleteReportConfirmDialog } from '@/components/admin/DeleteReportConfirmDialog';
import { ReferralDialog } from '@/components/referral/ReferralDialog';
import { FilterDatePicker } from '@/components/filters/FilterDatePicker';

// Config objects
const typeConfig: Record<ManifestType, { label: string; icon: typeof Building2; color: string }> = {
  urban: { label: 'Urbana', icon: Building2, color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  transport: { label: 'Transporte', icon: Bus, color: 'bg-purple-500/10 text-purple-600 border-purple-500/20' },
  evaluation: { label: 'Avaliação', icon: Star, color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  feedback: { label: 'Feedback', icon: MessageSquare, color: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20' },
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
    categoryFilter,
    setCategoryFilter,
    regionFilter,
    setRegionFilter,
    dateRange,
    setDateRange,
    availableCategories,
    availableRegions,
    page,
    setPage,
    pageSize,
    totalCount,
    updateManifestStatus,
    updateManifestCategory,
    deleteManifest,
    deleteBulkManifests,
    exportToCSV,
    refetch,
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
      <div className="space-y-4 sm:space-y-6">
        {/* Header - stacks on mobile */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Gestão de Relatos</h1>
            <p className="text-sm text-muted-foreground">Gerencie todos os relatos cidadãos</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="flex-1 sm:flex-none"
            >
              <LayoutList className="h-4 w-4 mr-1" />
              Lista
            </Button>
            <Button
              variant={viewMode === 'kanban' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('kanban')}
              className="flex-1 sm:flex-none"
            >
              <Columns className="h-4 w-4 mr-1" />
              Kanban
            </Button>
          </div>
        </div>

        {/* KPIs - 2x3 on mobile, 3x2 on tablet, 6x1 on desktop */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-4">
          {kpisLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-3 sm:p-4">
                  <Skeleton className="h-6 sm:h-8 w-12 sm:w-16 mb-1 sm:mb-2" />
                  <Skeleton className="h-3 sm:h-4 w-16 sm:w-24" />
                </CardContent>
              </Card>
            ))
          ) : (
            <>
              <Card>
                <CardContent className="p-3 sm:p-4">
                  <p className="text-xl sm:text-2xl font-bold">{kpis.total}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Total</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 sm:p-4">
                  <p className="text-xl sm:text-2xl font-bold text-yellow-600">{kpis.pending}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Pendentes</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 sm:p-4">
                  <p className="text-xl sm:text-2xl font-bold text-blue-600">{kpis.urban_count}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Urbanas</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 sm:p-4">
                  <p className="text-xl sm:text-2xl font-bold text-purple-600">{kpis.transport_count}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Transporte</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 sm:p-4">
                  <p className="text-xl sm:text-2xl font-bold text-amber-600">{kpis.evaluation_count}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Avaliações</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 sm:p-4">
                  <p className="text-xl sm:text-2xl font-bold text-red-600">{kpis.critical_count}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Urgentes</p>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Filters - responsive grid layout */}
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="space-y-3 sm:space-y-4">
              {/* Search - always full width */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar relatos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Filter grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
                {/* Tipo */}
                <div className="space-y-1">
                  <span className="text-[10px] sm:text-xs font-medium text-muted-foreground">Tipo</span>
                  <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as ManifestType | 'all')}>
                    <SelectTrigger className="w-full h-9">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="urban">Urbana</SelectItem>
                      <SelectItem value="transport">Transporte</SelectItem>
                      <SelectItem value="evaluation">Avaliação</SelectItem>
                      <SelectItem value="feedback">Feedback</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Categoria */}
                <div className="space-y-1">
                  <span className="text-[10px] sm:text-xs font-medium text-muted-foreground">Categoria</span>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-full h-9">
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      {availableCategories.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Status */}
                <div className="space-y-1">
                  <span className="text-[10px] sm:text-xs font-medium text-muted-foreground">Status</span>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full h-9">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="pending">Pendente</SelectItem>
                      <SelectItem value="in_progress">Em Andamento</SelectItem>
                      <SelectItem value="resolved">Resolvido</SelectItem>
                      <SelectItem value="rejected">Rejeitado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Região */}
                <div className="space-y-1">
                  <span className="text-[10px] sm:text-xs font-medium text-muted-foreground">Região</span>
                  <Select value={regionFilter} onValueChange={setRegionFilter}>
                    <SelectTrigger className="w-full h-9">
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      {availableRegions.map((region) => (
                        <SelectItem key={region} value={region}>
                          {region}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Período - spans 2 cols on mobile */}
                <div className="space-y-1 col-span-2 sm:col-span-1">
                  <span className="text-[10px] sm:text-xs font-medium text-muted-foreground">Período</span>
                  <FilterDatePicker
                    value={dateRange}
                    onChange={(range) => setDateRange(range || { from: undefined, to: undefined })}
                    placeholder="Selecionar período"
                    className="w-full"
                  />
                </div>

                {/* Export - full row on mobile */}
                <div className="flex items-end col-span-2 sm:col-span-1">
                  <Button variant="outline" onClick={exportToCSV} className="w-full h-9">
                    <Download className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Exportar</span>
                  </Button>
                </div>
              </div>
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
          <Card className="flex flex-col overflow-hidden">
            <CardHeader className="pb-2 px-3 sm:px-6">
              <div className="flex items-center gap-3 sm:gap-4">
                <Checkbox
                  checked={selectedIds.length === manifests.length && manifests.length > 0}
                  onCheckedChange={handleSelectAll}
                />
                <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
                  {totalCount} relatos encontrados
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-0 flex-1 min-h-0">
              <ScrollArea className="h-[calc(100vh-420px)] min-h-[280px] max-h-[600px]">
                {loading ? (
                  <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 border rounded-lg">
                        <Skeleton className="h-9 w-9 sm:h-10 sm:w-10 rounded-full shrink-0" />
                        <div className="flex-1 space-y-2 min-w-0">
                          <Skeleton className="h-4 w-1/3" />
                          <Skeleton className="h-3 w-1/2" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : manifests.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                    <AlertTriangle className="h-10 w-10 sm:h-12 sm:w-12 mb-3 sm:mb-4 opacity-50" />
                    <p className="text-sm sm:text-base">Nenhum relato encontrado</p>
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

            {/* Pagination - stacks on mobile */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 sm:p-4 border-t">
                <p className="text-xs sm:text-sm text-muted-foreground order-2 sm:order-1">
                  Página {page} de {totalPages}
                </p>
                <div className="flex gap-2 order-1 sm:order-2 w-full sm:w-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="flex-1 sm:flex-none"
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}
                    className="flex-1 sm:flex-none"
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
          <KanbanBoard
            manifests={manifests}
            loading={loading}
            onStatusChange={updateManifestStatus}
            onViewDetails={handleViewDetails}
            onReferral={(manifest) => {
              setSelectedManifest(manifest);
              setReferralDialogOpen(true);
            }}
            onDelete={handleDeleteClick}
          />
        )}
      </div>

      {/* Drawer */}
      <UnifiedReportDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        manifest={selectedManifest}
        onStatusChange={updateManifestStatus}
        onCategoryCorrected={async (manifest, newCategory, newSubcategory) => {
          await updateManifestCategory(manifest, newCategory, newSubcategory);
          setSelectedManifest(prev => {
            if (!prev || prev.id !== manifest.id) return prev;
            if (prev.urban_data) {
              return {
                ...prev,
                urban_data: { ...prev.urban_data, category: newCategory, subcategory: newSubcategory },
              };
            }
            if (prev.transport_data) {
              return {
                ...prev,
                transport_data: { ...prev.transport_data, report_type: newCategory },
              };
            }
            return prev;
          });
        }}
        onDelete={handleDeleteClick}
        onReferral={() => setReferralDialogOpen(true)}
        onEvaluationModerated={() => void refetch()}
      />

      {/* Delete Dialog */}
      <DeleteReportConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
        reportDescription={manifestToDelete?.description}
        variant="admin"
      />

      {/* Referral Dialog */}
      {selectedManifest && (
        <ReferralDialog
          open={referralDialogOpen}
          onOpenChange={setReferralDialogOpen}
          report={{
            id: selectedManifest.id,
            type: selectedManifest.type === 'urban' ? 'urban' : 
                  selectedManifest.type === 'transport' ? 'transport' : 'service',
            title: selectedManifest.title,
            description: selectedManifest.description,
            category: selectedManifest.urban_data?.category || selectedManifest.transport_data?.report_type,
            region: selectedManifest.urban_data?.neighborhood,
            severity: selectedManifest.severity,
          }}
        />
      )}
    </AdminLayout>
  );
}
