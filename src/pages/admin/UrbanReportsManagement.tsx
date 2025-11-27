import { useState } from 'react';
import { AdminLayout } from '@/layouts/AdminLayout';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MapPin, Search, AlertTriangle, Calendar as CalendarIcon, Eye, Download, RefreshCw, Heart, MessageSquare, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useUrbanReportsAdmin } from '@/hooks/useUrbanReportsAdmin';
import { ReportKPIs } from '@/components/admin/ReportKPIs';
import { BulkActionsBar } from '@/components/admin/BulkActionsBar';
import { ReportDetailModal } from '@/components/admin/ReportDetailModal';
import { cn } from '@/lib/utils';

const UrbanReportsManagement = () => {
  const {
    reports,
    loading,
    page,
    pageSize,
    totalCount,
    setPage,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    severityFilter,
    setSeverityFilter,
    categoryFilter,
    setCategoryFilter,
    dateRange,
    setDateRange,
    kpis,
    updateReportStatus,
    updateBulkStatus,
    exportToCSV,
    refetch,
  } = useUrbanReportsAdmin();

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [selectedReport, setSelectedReport] = useState<typeof reports[0] | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      case 'in_progress': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'resolved': return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'rejected': return 'bg-red-500/10 text-red-600 border-red-500/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getSeverityColor = (severity: string | null) => {
    switch (severity) {
      case 'critical': return 'bg-red-500/10 text-red-600 border-red-500/20';
      case 'high': return 'bg-orange-500/10 text-orange-600 border-orange-500/20';
      case 'medium': return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      case 'low': return 'bg-green-500/10 text-green-600 border-green-500/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusLabel = (status: string | null) => {
    switch (status) {
      case 'pending': return 'Pendente';
      case 'in_progress': return 'Em Andamento';
      case 'resolved': return 'Resolvido';
      case 'rejected': return 'Rejeitado';
      default: return 'Desconhecido';
    }
  };

  const getSeverityLabel = (severity: string | null) => {
    switch (severity) {
      case 'critical': return 'Crítica';
      case 'high': return 'Alta';
      case 'medium': return 'Média';
      case 'low': return 'Baixa';
      default: return 'Não definida';
    }
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      setSelectedIds(reports.map(r => r.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectReport = (reportId: string, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, reportId]);
    } else {
      setSelectedIds(prev => prev.filter(id => id !== reportId));
      setSelectAll(false);
    }
  };

  const handleBulkAction = async (status: string) => {
    await updateBulkStatus(selectedIds, status);
    setSelectedIds([]);
    setSelectAll(false);
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Gestão de Relatos Urbanos</h1>
            <p className="text-muted-foreground">Gerencie e acompanhe relatos da cidade</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={refetch}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Atualizar
            </Button>
            <Button variant="outline" size="sm" onClick={exportToCSV}>
              <Download className="h-4 w-4 mr-1" />
              Exportar
            </Button>
          </div>
        </div>

        {/* KPIs */}
        <ReportKPIs
          total={kpis.total}
          critical={kpis.critical}
          pending={kpis.pending}
          resolved={kpis.resolved}
          totalTrend={kpis.totalTrend}
          criticalTrend={kpis.criticalTrend}
          pendingTrend={kpis.pendingTrend}
          resolvedTrend={kpis.resolvedTrend}
        />

        {/* Filters */}
        <Card className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por descrição ou endereço..."
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
                <SelectItem value="in_progress">Em Andamento</SelectItem>
                <SelectItem value="resolved">Resolvido</SelectItem>
                <SelectItem value="rejected">Rejeitado</SelectItem>
              </SelectContent>
            </Select>

            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Severidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas Severidades</SelectItem>
                <SelectItem value="critical">Crítica</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
                <SelectItem value="medium">Média</SelectItem>
                <SelectItem value="low">Baixa</SelectItem>
              </SelectContent>
            </Select>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("justify-start text-left font-normal", !dateRange.from && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "dd/MM", { locale: ptBR })} - {format(dateRange.to, "dd/MM/yy", { locale: ptBR })}
                      </>
                    ) : (
                      format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })
                    )
                  ) : (
                    "Período"
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="range"
                  selected={{ from: dateRange.from, to: dateRange.to }}
                  onSelect={(range) => setDateRange({ from: range?.from, to: range?.to })}
                  locale={ptBR}
                  numberOfMonths={2}
                />
                {(dateRange.from || dateRange.to) && (
                  <div className="p-3 border-t">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full"
                      onClick={() => setDateRange({ from: undefined, to: undefined })}
                    >
                      Limpar Período
                    </Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>
          </div>
        </Card>

        {/* Bulk Actions */}
        <BulkActionsBar
          selectedCount={selectedIds.length}
          onMarkInProgress={() => handleBulkAction('in_progress')}
          onMarkResolved={() => handleBulkAction('resolved')}
          onMarkRejected={() => handleBulkAction('rejected')}
          onClear={() => {
            setSelectedIds([]);
            setSelectAll(false);
          }}
        />

        {/* Reports List */}
        <div className="space-y-4">
          {loading ? (
            <Card className="p-6">
              <p className="text-center text-muted-foreground">Carregando relatos...</p>
            </Card>
          ) : reports.length === 0 ? (
            <Card className="p-6">
              <p className="text-center text-muted-foreground">Nenhum relato encontrado</p>
            </Card>
          ) : (
            <>
              {/* Select All */}
              <Card className="p-4 bg-muted/50">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={selectAll}
                    onCheckedChange={handleSelectAll}
                  />
                  <span className="text-sm font-medium">Selecionar todos ({reports.length})</span>
                </div>
              </Card>

              {/* Report Cards */}
              {reports.map((report) => (
                <Card key={report.id} className="p-4 hover:border-primary/50 transition-colors">
                  <div className="flex items-start gap-4">
                    <Checkbox
                      checked={selectedIds.includes(report.id)}
                      onCheckedChange={(checked) => handleSelectReport(report.id, checked as boolean)}
                      className="mt-1"
                    />
                    
                    <div className="flex-1 space-y-3">
                      {/* Status Badges */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={getSeverityColor(report.severity)}>
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          {getSeverityLabel(report.severity)}
                        </Badge>
                        <Badge className={getStatusColor(report.status)}>
                          {getStatusLabel(report.status)}
                        </Badge>
                        <Badge variant="outline">{report.category}</Badge>
                        {report.subcategory && (
                          <Badge variant="secondary">{report.subcategory}</Badge>
                        )}
                      </div>

                      {/* Description */}
                      <p className="text-sm line-clamp-2">{report.description}</p>

                      {/* Metadata */}
                      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                        {report.author && (
                          <div className="flex items-center gap-2">
                            <Avatar className="h-5 w-5">
                              <AvatarImage src={report.author.avatar_url || undefined} />
                              <AvatarFallback className="text-[10px]">
                                {report.author.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span>{report.author.full_name}</span>
                          </div>
                        )}
                        {report.location_address && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {report.location_address}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <CalendarIcon className="h-3 w-3" />
                          {format(new Date(report.created_at), "dd 'de' MMM, yyyy", { locale: ptBR })}
                        </span>
                        <span className="flex items-center gap-1">
                          <Heart className="h-3 w-3" />
                          {report.likes_count}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          {report.comments_count}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedReport(report);
                          setDetailsOpen(true);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Ver Detalhes
                      </Button>
                      {report.status === 'pending' && (
                        <Select onValueChange={(value) => updateReportStatus(report.id, value)}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Ações" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="in_progress">Em Andamento</SelectItem>
                            <SelectItem value="resolved">Resolver</SelectItem>
                            <SelectItem value="rejected">Rejeitar</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </>
          )}
        </div>

        {/* Pagination */}
        {totalCount > pageSize && (
          <Card className="p-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-sm text-muted-foreground">
                Mostrando {page * pageSize + 1}-{Math.min((page + 1) * pageSize, totalCount)} de {totalCount} relatos
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
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = i + Math.max(0, page - 2);
                    if (pageNum >= totalPages) return null;
                    return (
                      <Button
                        key={pageNum}
                        variant={page === pageNum ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setPage(pageNum)}
                      >
                        {pageNum + 1}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                >
                  Próximo
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Detail Modal */}
        <ReportDetailModal
          report={selectedReport}
          open={detailsOpen}
          onOpenChange={setDetailsOpen}
          onStatusChange={updateReportStatus}
        />
      </div>
    </AdminLayout>
  );
};

export default UrbanReportsManagement;
