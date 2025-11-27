import { useState } from 'react';
import { AdminLayout } from '@/layouts/AdminLayout';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Bus, Search, Download, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useTransportReportsAdmin } from '@/hooks/useTransportReportsAdmin';
import { KPICard } from '@/components/analytics/KPICard';
import { BulkActionsBar } from '@/components/admin/BulkActionsBar';
import { ReportDetailModal } from '@/components/admin/ReportDetailModal';
import { DeleteReportConfirmDialog } from '@/components/admin/DeleteReportConfirmDialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Pagination } from '@/components/ui/pagination';

const TransportReportsManagement = () => {
  const {
    reports,
    loading,
    kpis,
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
    totalPages,
    updateReportStatus,
    updateBulkStatus,
    deleteReport,
    deleteBulkReports,
    exportToCSV,
  } = useTransportReportsAdmin();

  const [selectedReports, setSelectedReports] = useState<string[]>([]);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteType, setDeleteType] = useState<'single' | 'bulk'>('single');

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedReports(reports.map(r => r.id));
    } else {
      setSelectedReports([]);
    }
  };

  const handleSelectReport = (reportId: string, checked: boolean) => {
    if (checked) {
      setSelectedReports([...selectedReports, reportId]);
    } else {
      setSelectedReports(selectedReports.filter(id => id !== reportId));
    }
  };

  const handleBulkAction = (action: string) => {
    if (selectedReports.length === 0) return;

    if (action === 'delete') {
      setDeleteType('bulk');
      setDeleteDialogOpen(true);
    } else {
      updateBulkStatus(selectedReports, action);
      setSelectedReports([]);
    }
  };

  const handleDeleteConfirm = async () => {
    if (deleteType === 'single' && selectedReport) {
      await deleteReport(selectedReport.id);
      setDetailModalOpen(false);
    } else if (deleteType === 'bulk') {
      await deleteBulkReports(selectedReports);
      setSelectedReports([]);
    }
    setDeleteDialogOpen(false);
  };

  const getStatusColor = (status: string) => {
    const colors = {
      pending: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
      in_progress: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
      resolved: 'bg-green-500/10 text-green-600 border-green-500/20',
      rejected: 'bg-red-500/10 text-red-600 border-red-500/20',
    };
    return colors[status as keyof typeof colors] || 'bg-muted text-foreground';
  };

  const getSeverityColor = (severity: string) => {
    const colors = {
      low: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
      medium: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
      high: 'bg-red-500/10 text-red-600 border-red-500/20',
    };
    return colors[severity as keyof typeof colors] || 'bg-muted text-foreground';
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      pending: 'Pendente',
      in_progress: 'Em Andamento',
      resolved: 'Resolvido',
      rejected: 'Rejeitado',
    };
    return labels[status as keyof typeof labels] || status;
  };

  const getSeverityLabel = (severity: string) => {
    const labels = {
      low: 'Baixa',
      medium: 'Média',
      high: 'Alta',
    };
    return labels[severity as keyof typeof labels] || severity;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Gestão de Relatos de Transporte</h1>
            <p className="text-muted-foreground">
              Gerencie e monitore relatos sobre transporte público
            </p>
          </div>
          <Button onClick={exportToCSV} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
        </div>

        {/* KPIs */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <KPICard
              title="Total"
              value={kpis.total}
              icon={Bus}
              trend={{ value: Math.abs(kpis.totalTrend), direction: kpis.totalTrend >= 0 ? 'up' : 'down' }}
            />
            <KPICard
              title="Pendentes"
              value={kpis.pending}
              icon={Bus}
              trend={{ value: Math.abs(kpis.pendingTrend), direction: kpis.pendingTrend >= 0 ? 'up' : 'down' }}
              className="border-yellow-500/20"
            />
            <KPICard
              title="Em Andamento"
              value={kpis.inProgress}
              icon={Bus}
              className="border-blue-500/20"
            />
            <KPICard
              title="Resolvidos"
              value={kpis.resolved}
              icon={Bus}
              className="border-green-500/20"
            />
            <KPICard
              title="Rejeitados"
              value={kpis.rejected}
              icon={Bus}
              className="border-red-500/20"
            />
          </div>
        )}

        {/* Filtros */}
        <Card className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar relatos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="pending">Pendentes</SelectItem>
                <SelectItem value="in_progress">Em Andamento</SelectItem>
                <SelectItem value="resolved">Resolvidos</SelectItem>
                <SelectItem value="rejected">Rejeitados</SelectItem>
              </SelectContent>
            </Select>
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Severidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Severidades</SelectItem>
                <SelectItem value="low">Baixa</SelectItem>
                <SelectItem value="medium">Média</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Tipos</SelectItem>
                <SelectItem value="atraso">Atraso</SelectItem>
                <SelectItem value="lotacao">Lotação</SelectItem>
                <SelectItem value="manutencao">Manutenção</SelectItem>
                <SelectItem value="seguranca">Segurança</SelectItem>
                <SelectItem value="outro">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>

        {/* Barra de ações em lote */}
        {selectedReports.length > 0 && (
          <BulkActionsBar
            selectedCount={selectedReports.length}
            onMarkInProgress={() => handleBulkAction('in_progress')}
            onMarkResolved={() => handleBulkAction('resolved')}
            onMarkRejected={() => handleBulkAction('rejected')}
            onDelete={() => handleBulkAction('delete')}
            onClear={() => setSelectedReports([])}
          />
        )}

        {/* Lista de Relatórios */}
        <div className="space-y-4">
          {loading ? (
            [...Array(5)].map((_, i) => <Skeleton key={i} className="h-32" />)
          ) : reports.length === 0 ? (
            <Card className="p-12 text-center">
              <Bus className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium">Nenhum relatório encontrado</p>
              <p className="text-sm text-muted-foreground">
                Tente ajustar os filtros de busca
              </p>
            </Card>
          ) : (
            reports.map((report) => (
              <Card
                key={report.id}
                className="p-6 hover:shadow-md transition-all cursor-pointer"
                onClick={() => {
                  setSelectedReport(report);
                  setDetailModalOpen(true);
                }}
              >
                <div className="flex items-start gap-4">
                  <Checkbox
                    checked={selectedReports.includes(report.id)}
                    onCheckedChange={(checked) =>
                      handleSelectReport(report.id, checked as boolean)
                    }
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-lg">
                            {report.report_type.charAt(0).toUpperCase() + report.report_type.slice(1)}
                          </h3>
                          <Badge variant="outline" className={getSeverityColor(report.severity)}>
                            {getSeverityLabel(report.severity)}
                          </Badge>
                          <Badge variant="outline" className={getStatusColor(report.status)}>
                            {getStatusLabel(report.status)}
                          </Badge>
                        </div>
                        {report.transport_lines && (
                          <p className="text-sm text-muted-foreground">
                            Linha: {report.transport_lines.line_code} - {report.transport_lines.line_name}
                          </p>
                        )}
                      </div>
                    </div>
                    {report.description && (
                      <p className="text-sm text-foreground line-clamp-2">{report.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>
                        {format(new Date(report.occurrence_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      </span>
                      {report.location && <span>• {report.location}</span>}
                      {report.author && <span>• Por: {report.author.full_name}</span>}
                    </div>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="flex justify-center">
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>

      {/* Modal de Detalhes */}
      {selectedReport && (
        <ReportDetailModal
          open={detailModalOpen}
          onClose={() => {
            setDetailModalOpen(false);
            setSelectedReport(null);
          }}
          report={selectedReport}
          onStatusChange={updateReportStatus}
          onDelete={() => {
            setDeleteType('single');
            setDeleteDialogOpen(true);
          }}
        />
      )}

      {/* Dialog de Confirmação de Exclusão */}
      <DeleteReportConfirmDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDeleteConfirm}
        reportCount={deleteType === 'bulk' ? selectedReports.length : 1}
      />
    </AdminLayout>
  );
};

export default TransportReportsManagement;
