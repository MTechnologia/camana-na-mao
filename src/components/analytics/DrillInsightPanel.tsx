import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Download, 
  FileSpreadsheet, 
  MapPin, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  ExternalLink,
  Filter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { DrillInsightState, DrillReport } from '@/hooks/useDrillInsight';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useEffect, useMemo, useState } from 'react';
import { useReportDetailModal } from "@/contexts/ReportDetailContext";
import {
  DRILL_THROUGH_PAGE_SIZE,
  drillThroughTotalPages,
} from '@/lib/fetchDrillThroughReports';

interface DrillInsightPanelProps {
  state: DrillInsightState;
  onClose: () => void;
  onExportCSV?: () => void;
  onExportPDF?: () => void;
  onViewOnMap?: (reports: DrillReport[]) => void;
}

export const DrillInsightPanel = ({
  state,
  onClose,
  onExportCSV,
  onExportPDF,
  onViewOnMap,
}: DrillInsightPanelProps) => {
  const { open, context, reports, stats, insight, isLoading } = state;
  const { open: openReport } = useReportDetailModal();
  const [expandedReport, setExpandedReport] = useState<string | null>(null);
  const [listPage, setListPage] = useState(1);

  const totalPages = drillThroughTotalPages(reports.length, DRILL_THROUGH_PAGE_SIZE);
  const pageReports = useMemo(() => {
    const start = (listPage - 1) * DRILL_THROUGH_PAGE_SIZE;
    return reports.slice(start, start + DRILL_THROUGH_PAGE_SIZE);
  }, [reports, listPage]);

  useEffect(() => {
    if (open) {
      setListPage(1);
      setExpandedReport(null);
    }
  }, [open, context.label, reports.length]);

  useEffect(() => {
    if (listPage > totalPages) setListPage(Math.max(1, totalPages));
  }, [listPage, totalPages]);

  const showListPagination = reports.length > DRILL_THROUGH_PAGE_SIZE;
  const rangeStart =
    reports.length === 0 ? 0 : (listPage - 1) * DRILL_THROUGH_PAGE_SIZE + 1;
  const rangeEnd = Math.min(listPage * DRILL_THROUGH_PAGE_SIZE, reports.length);

  const getContextIcon = () => {
    switch (context.type) {
      case 'keyword':
        return '🔍';
      case 'sentiment':
        return context.value === 'positive' ? '😊' : context.value === 'negative' ? '😞' : '😐';
      case 'category':
        return '📁';
      case 'period':
        return '📅';
      case 'overview':
        return '📊';
      default:
        return '📋';
    }
  };

  const getSeverityColor = (severity: string) => {
    const s = severity?.toLowerCase();
    if (s === 'crítico' || s === 'critical') return 'destructive';
    if (s === 'alto' || s === 'high') return 'default';
    if (s === 'médio' || s === 'medium') return 'secondary';
    return 'outline';
  };

  const getStatusIcon = (status: string) => {
    const s = status?.toLowerCase();
    if (s === 'resolvido' || s === 'resolved') return <CheckCircle className="w-4 h-4 text-chart-1" />;
    if (s === 'em_andamento' || s === 'in_progress') return <Clock className="w-4 h-4 text-chart-3" />;
    return <AlertTriangle className="w-4 h-4 text-chart-5" />;
  };

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent className="w-full sm:max-w-xl md:max-w-2xl p-0 flex flex-col">
        {/* Header */}
        <SheetHeader className="p-6 pb-4 border-b border-border bg-muted/30">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{getContextIcon()}</span>
              <div>
                <SheetTitle className="text-xl font-bold">{context.label}</SheetTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {stats.total} relatos encontrados
                </p>
              </div>
            </div>
          </div>
        </SheetHeader>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : (
          <ScrollArea className="flex-1">
            <div className="p-6 space-y-6">
              {/* KPIs */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-card rounded-lg border border-border p-3 text-center"
                >
                  <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </motion.div>
                
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-card rounded-lg border border-border p-3 text-center"
                >
                  <p className="text-2xl font-bold text-chart-5">{stats.critical}</p>
                  <p className="text-xs text-muted-foreground">Críticos</p>
                </motion.div>
                
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-card rounded-lg border border-border p-3 text-center"
                >
                  <div className="flex items-center justify-center gap-1">
                    {stats.trend > 0 ? (
                      <TrendingUp className="w-4 h-4 text-chart-5" />
                    ) : stats.trend < 0 ? (
                      <TrendingDown className="w-4 h-4 text-chart-1" />
                    ) : null}
                    <p className={cn(
                      "text-2xl font-bold",
                      stats.trend > 0 ? 'text-chart-5' : stats.trend < 0 ? 'text-chart-1' : 'text-foreground'
                    )}>
                      {stats.trend > 0 ? '+' : ''}{stats.trend}%
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">Tendência</p>
                </motion.div>
                
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="bg-card rounded-lg border border-border p-3 text-center"
                >
                  <p className="text-2xl font-bold text-chart-1">
                    {stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 0}%
                  </p>
                  <p className="text-xs text-muted-foreground">Resolvidos</p>
                </motion.div>
              </div>

              {/* AI Insight */}
              {insight && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg border border-primary/20 p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-full bg-primary/20">
                      <Sparkles className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground mb-1">Insight da IA</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">{insight}</p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Distribution by Severity */}
              <div className="bg-card rounded-lg border border-border p-4">
                <h4 className="text-sm font-semibold mb-3">Distribuição por Severidade</h4>
                <div className="space-y-2">
                  {[
                    { label: 'Crítico', value: stats.critical, color: 'bg-chart-5' },
                    { label: 'Alto', value: stats.high, color: 'bg-chart-3' },
                    { label: 'Médio', value: stats.medium, color: 'bg-chart-2' },
                    { label: 'Baixo', value: stats.low, color: 'bg-chart-1' },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-16">{item.label}</span>
                      <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: stats.total > 0 ? `${(item.value / stats.total) * 100}%` : '0%' }}
                          transition={{ duration: 0.5, delay: 0.5 }}
                          className={cn('h-full rounded-full', item.color)}
                        />
                      </div>
                      <span className="text-xs font-medium w-8 text-right">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top Region */}
              {stats.topRegion && (
                <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Região principal:</span>
                  <span className="text-sm font-medium">{stats.topRegion}</span>
                </div>
              )}

              <Separator />

              {/* Reports List */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold">Relatos ({reports.length})</h4>
                  <Button variant="ghost" size="sm" className="text-xs">
                    <Filter className="w-3 h-3 mr-1" />
                    Filtrar
                  </Button>
                </div>

                <div className="space-y-2">
                  {pageReports.map((report, index) => (
                    <motion.div
                      key={report.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.05 * Math.min(index, 10) }}
                      className="bg-muted/30 rounded-lg border border-border p-3 hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => setExpandedReport(expandedReport === report.id ? null : report.id)}
                    >
                      <div className="flex items-start gap-3">
                        {getStatusIcon(report.status)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium truncate">{report.category}</span>
                            <Badge variant={getSeverityColor(report.severity)} className="text-xs">
                              {report.severity}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {report.source === 'urban'
                                ? 'Urbano'
                                : report.source === 'transport'
                                  ? 'Transporte'
                                  : 'Avaliação'}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {report.description || 'Sem descrição'}
                          </p>
                          
                          <AnimatePresence>
                            {expandedReport === report.id && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="mt-2 pt-2 border-t border-border"
                              >
                                {report.location_address && (
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <MapPin className="w-3 h-3" />
                                    {report.location_address}
                                  </div>
                                )}
                                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                                  <Clock className="w-3 h-3" />
                                  {format(new Date(report.created_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                                </div>
                                {report.source === 'urban' || report.source === 'transport' ? (
                                  <button
                                    type="button"
                                    className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openReport(report.id, report.source);
                                    }}
                                  >
                                    Abrir detalhes do relato →
                                  </button>
                                ) : null}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                        <ChevronRight className={cn(
                          "w-4 h-4 text-muted-foreground transition-transform",
                          expandedReport === report.id && "rotate-90"
                        )} />
                      </div>
                    </motion.div>
                  ))}

                  {showListPagination ? (
                    <div className="flex flex-col gap-2 border-t border-border pt-3">
                      <p className="text-center text-xs text-muted-foreground">
                        Exibindo {rangeStart}–{rangeEnd} de {reports.length}
                      </p>
                      <div className="flex items-center justify-between gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          disabled={listPage <= 1}
                          onClick={() => {
                            setListPage((p) => Math.max(1, p - 1));
                            setExpandedReport(null);
                          }}
                        >
                          <ChevronLeft className="mr-1 h-4 w-4" aria-hidden />
                          Anterior
                        </Button>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          Página {listPage} de {totalPages}
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          disabled={listPage >= totalPages}
                          onClick={() => {
                            setListPage((p) => Math.min(totalPages, p + 1));
                            setExpandedReport(null);
                          }}
                        >
                          Próxima
                          <ChevronRight className="ml-1 h-4 w-4" aria-hidden />
                        </Button>
                      </div>
                    </div>
                  ) : null}

                  {reports.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>Nenhum relato encontrado</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </ScrollArea>
        )}

        {/* Footer Actions */}
        <div className="border-t border-border p-4 bg-muted/30">
          <div className="flex flex-wrap gap-2">
            {onExportCSV && (
              <Button variant="outline" size="sm" onClick={onExportCSV}>
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Exportar CSV
              </Button>
            )}
            {onExportPDF && (
              <Button variant="outline" size="sm" onClick={onExportPDF}>
                <Download className="w-4 h-4 mr-2" />
                Exportar PDF
              </Button>
            )}
            {onViewOnMap && reports.length > 0 && (
              <Button variant="outline" size="sm" onClick={() => onViewOnMap(reports)}>
                <MapPin className="w-4 h-4 mr-2" />
                Ver no Mapa
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
