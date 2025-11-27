import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Bus, MapPin, Calendar, Clock, User, Trash2, 
  MessageSquare, AlertCircle, CheckCircle2
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { TransportResponseHistory } from './TransportResponseHistory';
import { AddTransportResponseForm } from './AddTransportResponseForm';

interface TransportReportDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  report: any;
  onStatusChange: (reportId: string, status: string) => void;
  onDelete: (reportId: string) => void;
}

interface Response {
  id: string;
  response_text: string;
  response_type: string;
  is_public: boolean;
  created_at: string;
  responder?: {
    full_name: string;
    avatar_url: string | null;
  } | null;
}

export const TransportReportDetailModal = ({
  open,
  onOpenChange,
  report,
  onStatusChange,
  onDelete,
}: TransportReportDetailModalProps) => {
  const [responses, setResponses] = useState<Response[]>([]);
  const [loadingResponses, setLoadingResponses] = useState(false);

  const fetchResponses = async () => {
    if (!report?.id) return;

    setLoadingResponses(true);
    try {
      const { data, error } = await supabase
        .from('transport_report_responses')
        .select('*')
        .eq('report_id', report.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch responder profiles
      const responderIds = [...new Set(data?.map(r => r.responder_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', responderIds);

      const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);

      const responsesWithProfiles = (data || []).map(response => ({
        ...response,
        responder: profilesMap.get(response.responder_id) || null,
      }));

      setResponses(responsesWithProfiles);
    } catch (error) {
      console.error('Error fetching responses:', error);
    } finally {
      setLoadingResponses(false);
    }
  };

  useEffect(() => {
    if (open && report?.id) {
      fetchResponses();
    }
  }, [open, report?.id]);

  const handleAddResponse = async (responseText: string, responseType: string, isPublic: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Você precisa estar logado');
        return;
      }

      const { error } = await supabase
        .from('transport_report_responses')
        .insert({
          report_id: report.id,
          responder_id: user.id,
          response_text: responseText,
          response_type: responseType,
          is_public: isPublic,
        });

      if (error) throw error;

      // Update responded_at if first response
      if (!report.responded_at) {
        await supabase
          .from('transport_reports')
          .update({ responded_at: new Date().toISOString() })
          .eq('id', report.id);
      }

      toast.success('Resposta adicionada com sucesso');
      fetchResponses();
    } catch (error) {
      console.error('Error adding response:', error);
      toast.error('Erro ao adicionar resposta');
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
      in_progress: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
      resolved: 'bg-green-500/10 text-green-600 border-green-500/20',
      rejected: 'bg-red-500/10 text-red-600 border-red-500/20',
    };
    return colors[status] || 'bg-muted text-foreground';
  };

  const getSeverityColor = (severity: string) => {
    const colors: Record<string, string> = {
      low: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
      medium: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
      high: 'bg-red-500/10 text-red-600 border-red-500/20',
    };
    return colors[severity] || 'bg-muted text-foreground';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'Pendente',
      in_progress: 'Em Andamento',
      resolved: 'Resolvido',
      rejected: 'Rejeitado',
    };
    return labels[status] || status;
  };

  const getSeverityLabel = (severity: string) => {
    const labels: Record<string, string> = {
      low: 'Baixa',
      medium: 'Média',
      high: 'Alta',
    };
    return labels[severity] || severity;
  };

  if (!report) return null;

  const hasResponse = responses.length > 0 || report.responded_at;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bus className="h-5 w-5" />
            Detalhes do Relato de Transporte
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] pr-4">
          <Tabs defaultValue="details" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="details">Detalhes</TabsTrigger>
              <TabsTrigger value="responses" className="flex items-center gap-2">
                Respostas
                {hasResponse ? (
                  <Badge className="bg-green-500/10 text-green-600 text-xs px-1">
                    {responses.length}
                  </Badge>
                ) : (
                  <Badge className="bg-orange-500/10 text-orange-600 text-xs px-1">
                    0
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-6 mt-4">
              {/* Badges */}
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className={getSeverityColor(report.severity)}>
                  {getSeverityLabel(report.severity)}
                </Badge>
                <Badge variant="outline" className={getStatusColor(report.status)}>
                  {getStatusLabel(report.status)}
                </Badge>
                {hasResponse ? (
                  <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Respondido
                  </Badge>
                ) : (
                  <Badge className="bg-orange-500/10 text-orange-600 border-orange-500/20">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Aguardando Resposta
                  </Badge>
                )}
              </div>

              {/* Info */}
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Tipo</h4>
                  <p className="text-lg font-semibold capitalize">{report.report_type}</p>
                </div>

                {report.transport_lines && (
                  <div className="flex items-center gap-2 text-sm">
                    <Bus className="h-4 w-4 text-muted-foreground" />
                    <span>
                      Linha {report.transport_lines.line_code} - {report.transport_lines.line_name}
                    </span>
                  </div>
                )}

                {report.description && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Descrição</h4>
                    <p className="text-sm whitespace-pre-wrap">{report.description}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {format(new Date(report.occurrence_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </span>
                  </div>
                  {report.occurrence_time && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>{report.occurrence_time}</span>
                    </div>
                  )}
                </div>

                {report.location && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{report.location}</span>
                  </div>
                )}

                {report.author && (
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={report.author.avatar_url || undefined} />
                      <AvatarFallback>
                        {report.author.full_name?.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{report.author.full_name}</p>
                      <p className="text-xs text-muted-foreground">Autor do relato</p>
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              {/* Ações */}
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Alterar Status</label>
                  <Select
                    value={report.status}
                    onValueChange={(value) => onStatusChange(report.id, value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pendente</SelectItem>
                      <SelectItem value="in_progress">Em Andamento</SelectItem>
                      <SelectItem value="resolved">Resolvido</SelectItem>
                      <SelectItem value="rejected">Rejeitado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  variant="destructive"
                  onClick={() => onDelete(report.id)}
                  className="w-full"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir Relato
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="responses" className="space-y-6 mt-4">
              <AddTransportResponseForm onSubmit={handleAddResponse} />
              
              <Separator />

              <div>
                <h4 className="font-semibold text-sm mb-4 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Histórico de Respostas
                </h4>
                <TransportResponseHistory responses={responses} loading={loadingResponses} />
              </div>
            </TabsContent>
          </Tabs>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
