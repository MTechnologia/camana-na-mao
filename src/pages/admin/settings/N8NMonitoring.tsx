import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Activity, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  RefreshCw,
  ArrowLeft,
  TrendingUp,
  BarChart3,
  List
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LineChart,
  Line,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { useN8NMonitoring } from '@/hooks/useN8NMonitoring';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const N8NMonitoring = () => {
  const navigate = useNavigate();
  const { logs, metrics, eventTypeData, volumeData, isLoading, lastUpdated, refresh } = useN8NMonitoring();
  const [selectedLog, setSelectedLog] = useState<string | null>(null);

  const statusColors: Record<string, string> = {
    sent: 'hsl(var(--primary))',
    received: 'hsl(142, 76%, 36%)',
    error: 'hsl(0, 84%, 60%)',
    pending: 'hsl(45, 93%, 47%)'
  };

  const statusData = [
    { name: 'Processados', value: metrics.totalProcessed, color: statusColors.received },
    { name: 'Pendentes', value: metrics.pending, color: statusColors.pending },
    { name: 'Erros', value: metrics.failed, color: statusColors.error }
  ].filter(d => d.value > 0);

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'sent':
        return <Badge variant="secondary" className="bg-primary/10 text-primary">Enviado</Badge>;
      case 'received':
        return <Badge variant="secondary" className="bg-green-500/10 text-green-600">Recebido</Badge>;
      case 'error':
        return <Badge variant="destructive">Erro</Badge>;
      default:
        return <Badge variant="outline">{status || 'N/A'}</Badge>;
    }
  };

  const formatEventType = (type: string): string => {
    const labels: Record<string, string> = {
      'urban_report_created': 'Relato Urbano',
      'transport_report_created': 'Transporte',
      'service_rating_created': 'Avaliação',
      'callback_received': 'Callback'
    };
    return labels[type] || type;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="container flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/admin/settings/n8n')}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold">Monitoramento N8N</h1>
              <p className="text-xs text-muted-foreground">
                Atualizado: {format(lastUpdated, "HH:mm:ss", { locale: ptBR })}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </header>

      <main className="container px-4 py-6 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Processados</p>
                    <p className="text-2xl font-bold">{metrics.totalProcessed}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Pendentes</p>
                    <p className="text-2xl font-bold">{metrics.pending}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Taxa Sucesso</p>
                    <p className="text-2xl font-bold">{metrics.successRate}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-destructive" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Erros</p>
                    <p className="text-2xl font-bold">{metrics.failed}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Charts */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview" className="gap-2">
              <Activity className="w-4 h-4" />
              Visão Geral
            </TabsTrigger>
            <TabsTrigger value="volume" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              Volume
            </TabsTrigger>
            <TabsTrigger value="logs" className="gap-2">
              <List className="w-4 h-4" />
              Logs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid lg:grid-cols-2 gap-4">
              {/* Status Donut */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Status de Processamento</CardTitle>
                </CardHeader>
                <CardContent>
                  {statusData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={statusData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={2}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {statusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                      Nenhum dado disponível
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Event Types Bar */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Por Tipo de Evento</CardTitle>
                </CardHeader>
                <CardContent>
                  {eventTypeData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={eventTypeData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="type" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                      Nenhum dado disponível
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="volume">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Volume por Dia</CardTitle>
              </CardHeader>
              <CardContent>
                {volumeData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={volumeData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="sent" 
                        name="Enviados" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={2}
                        dot={{ r: 4 }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="received" 
                        name="Recebidos" 
                        stroke="hsl(142, 76%, 36%)" 
                        strokeWidth={2}
                        dot={{ r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    Nenhum dado disponível
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="logs">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Logs em Tempo Real</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Evento</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Erro</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs.length > 0 ? (
                        logs.map((log) => (
                          <TableRow 
                            key={log.id}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => setSelectedLog(selectedLog === log.id ? null : log.id)}
                          >
                            <TableCell className="font-medium">
                              {log.entity_type === 'urban_report' ? '🏙️' : '🚌'}
                              {' '}
                              {log.entity_type === 'urban_report' ? 'Urbano' : 'Transporte'}
                            </TableCell>
                            <TableCell>{formatEventType(log.event_type)}</TableCell>
                            <TableCell>{getStatusBadge(log.status)}</TableCell>
                            <TableCell className="text-muted-foreground">
                              {log.created_at 
                                ? format(new Date(log.created_at), "dd/MM HH:mm:ss", { locale: ptBR })
                                : 'N/A'}
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate text-destructive">
                              {log.error_message || '-'}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                            Nenhum log encontrado
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Failed Logs Alert */}
        {metrics.failed > 0 && (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2 text-destructive">
                <AlertTriangle className="w-5 h-5" />
                Integrações com Erro ({metrics.failed})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-[200px]">
                <div className="space-y-2">
                  {logs
                    .filter(log => log.status === 'error')
                    .slice(0, 5)
                    .map(log => (
                      <div 
                        key={log.id} 
                        className="p-3 bg-background rounded-lg border border-destructive/20"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-sm">
                            {formatEventType(log.event_type)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {log.created_at 
                              ? format(new Date(log.created_at), "dd/MM HH:mm", { locale: ptBR })
                              : ''}
                          </span>
                        </div>
                        <p className="text-sm text-destructive">{log.error_message}</p>
                      </div>
                    ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default N8NMonitoring;
