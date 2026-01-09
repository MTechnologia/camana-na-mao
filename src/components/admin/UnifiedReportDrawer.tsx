import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { 
  Building2, Bus, Star, MessageSquare, MapPin, Calendar, Clock,
  Heart, Download, Trash2, Forward, ExternalLink, Send,
  CheckCircle2, AlertCircle, Image as ImageIcon, Activity
} from 'lucide-react';
import { formatShortDate, formatLongDateTime, formatDateTime, formatCompactDateTime } from '@/lib/dateUtils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { UnifiedManifest, ManifestType } from '@/hooks/useReportsAdmin';

interface UnifiedReportDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  manifest: UnifiedManifest | null;
  onStatusChange: (id: string, type: ManifestType, status: string) => void;
  onDelete: (manifest: UnifiedManifest) => void;
  onReferral: () => void;
}

interface Response {
  id: string;
  response_text: string;
  response_type: string;
  is_public: boolean;
  created_at: string;
  responder?: { full_name: string; avatar_url: string | null } | null;
}

const typeConfig: Record<ManifestType, { label: string; icon: typeof Building2; color: string }> = {
  urban: { label: 'Urbana', icon: Building2, color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  transport: { label: 'Transporte', icon: Bus, color: 'bg-purple-500/10 text-purple-600 border-purple-500/20' },
  evaluation: { label: 'Avaliação', icon: Star, color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  feedback: { label: 'Feedback', icon: MessageSquare, color: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20' },
};

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pendente', color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' },
  in_progress: { label: 'Em Andamento', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  resolved: { label: 'Resolvido', color: 'bg-green-500/10 text-green-600 border-green-500/20' },
  rejected: { label: 'Rejeitado', color: 'bg-red-500/10 text-red-600 border-red-500/20' },
  completed: { label: 'Concluída', color: 'bg-green-500/10 text-green-600 border-green-500/20' },
};

const severityConfig: Record<string, { label: string; color: string }> = {
  critical: { label: 'Crítica', color: 'bg-red-500/10 text-red-600 border-red-500/20' },
  high: { label: 'Alta', color: 'bg-orange-500/10 text-orange-600 border-orange-500/20' },
  medium: { label: 'Média', color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' },
  low: { label: 'Baixa', color: 'bg-green-500/10 text-green-600 border-green-500/20' },
};

const riskLevelConfig: Record<string, { label: string; color: string }> = {
  critical: { label: 'Crítico', color: 'bg-red-500/10 text-red-600 border-red-500/20' },
  moderate: { label: 'Moderado', color: 'bg-orange-500/10 text-orange-600 border-orange-500/20' },
  low: { label: 'Baixo', color: 'bg-green-500/10 text-green-600 border-green-500/20' },
  none: { label: 'Nenhum', color: 'bg-gray-500/10 text-gray-600 border-gray-500/20' },
};

const affectedScopeLabels: Record<string, string> = {
  individual: 'Individual (1-5 pessoas)',
  street: 'Rua toda',
  building: 'Prédio/Vizinhança',
  block: 'Quarteirão',
  neighborhood: 'Bairro todo',
  zone: 'Zona da cidade',
  city: 'Cidade toda',
};

export const UnifiedReportDrawer = ({
  open,
  onOpenChange,
  manifest,
  onStatusChange,
  onDelete,
  onReferral,
}: UnifiedReportDrawerProps) => {
  const [responses, setResponses] = useState<Response[]>([]);
  const [loadingResponses, setLoadingResponses] = useState(false);
  const [newResponse, setNewResponse] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open && manifest && manifest.type === 'transport') {
      fetchResponses();
    }
  }, [open, manifest?.id]);

  const fetchResponses = async () => {
    if (!manifest) return;
    setLoadingResponses(true);
    try {
      const { data, error } = await supabase
        .from('transport_report_responses')
        .select('*')
        .eq('report_id', manifest.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const responderIds = [...new Set(data?.map(r => r.responder_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', responderIds);

      const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);

      setResponses((data || []).map(r => ({
        ...r,
        responder: profilesMap.get(r.responder_id) || null,
      })));
    } catch (error) {
      console.error('Error fetching responses:', error);
    } finally {
      setLoadingResponses(false);
    }
  };

  const handleSubmitResponse = async () => {
    if (!manifest || !newResponse.trim()) return;
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');

      const { error } = await supabase
        .from('transport_report_responses')
        .insert({
          report_id: manifest.id,
          responder_id: user.id,
          response_text: newResponse,
          response_type: 'answer',
          is_public: true,
        });

      if (error) throw error;

      // Update responded_at
      if (!manifest.transport_data?.responded_at) {
        await supabase
          .from('transport_reports')
          .update({ responded_at: new Date().toISOString() })
          .eq('id', manifest.id);
      }

      toast.success('Resposta enviada');
      setNewResponse('');
      fetchResponses();
    } catch (error) {
      console.error('Error submitting response:', error);
      toast.error('Erro ao enviar resposta');
    } finally {
      setSubmitting(false);
    }
  };

  const downloadPhotos = async () => {
    if (!manifest?.urban_data?.photos?.length) return;
    try {
      for (const [i, url] of manifest.urban_data.photos.entries()) {
        const response = await fetch(url);
        const blob = await response.blob();
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `foto-${i + 1}.jpg`;
        link.click();
      }
      toast.success('Fotos baixadas');
    } catch {
      toast.error('Erro ao baixar fotos');
    }
  };

  if (!manifest) return null;

  const TypeIcon = typeConfig[manifest.type].icon;
  const hasLocation = manifest.type === 'urban' && manifest.urban_data?.latitude;
  const hasPhotos = manifest.type === 'urban' && manifest.urban_data?.photos?.length;
  const hasResponses = manifest.type === 'transport';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl p-0 flex flex-col">
        {/* Header */}
        <SheetHeader className="p-4 border-b">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${typeConfig[manifest.type].color}`}>
              <TypeIcon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-left truncate">{manifest.title}</SheetTitle>
              {/* Protocol code */}
              {(manifest.urban_data?.protocol_code || manifest.transport_data?.protocol_code) && (
                <p className="text-xs font-mono text-muted-foreground mt-0.5">
                  {manifest.urban_data?.protocol_code || manifest.transport_data?.protocol_code}
                </p>
              )}
              <div className="flex flex-wrap gap-1.5 mt-1">
                <Badge variant="outline" className={typeConfig[manifest.type].color}>
                  {typeConfig[manifest.type].label}
                </Badge>
                <Badge variant="outline" className={statusConfig[manifest.status]?.color}>
                  {statusConfig[manifest.status]?.label || manifest.status}
                </Badge>
                {manifest.severity && severityConfig[manifest.severity] && (
                  <Badge variant="outline" className={severityConfig[manifest.severity].color}>
                    {severityConfig[manifest.severity].label}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </SheetHeader>

        {/* Tabs */}
        <Tabs defaultValue="details" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="mx-4 mt-4 grid grid-cols-4">
            <TabsTrigger value="details">Detalhes</TabsTrigger>
            {hasLocation && <TabsTrigger value="location">Local</TabsTrigger>}
            {hasPhotos && <TabsTrigger value="photos">Fotos</TabsTrigger>}
            {hasResponses && (
              <TabsTrigger value="responses" className="flex items-center gap-1">
                Respostas
                <Badge variant="secondary" className="text-xs px-1 h-4">
                  {responses.length}
                </Badge>
              </TabsTrigger>
            )}
            <TabsTrigger value="activity">Atividade</TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 px-4">
            {/* Details Tab */}
            <TabsContent value="details" className="mt-4 space-y-6">
              {/* Author */}
              {manifest.author && (
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={manifest.author.avatar_url || undefined} />
                    <AvatarFallback>
                      {manifest.author.full_name?.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{manifest.author.full_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatLongDateTime(manifest.created_at)}
                    </p>
                  </div>
                </div>
              )}

              {/* Description */}
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Descrição</h4>
                <p className="text-sm whitespace-pre-wrap">{manifest.description || 'Sem descrição'}</p>
              </div>

              {/* Type-specific info */}
              {manifest.type === 'urban' && manifest.urban_data && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-1">Categoria</h4>
                      <p className="text-sm">{manifest.urban_data.category}</p>
                    </div>
                    {manifest.urban_data.subcategory && (
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-1">Subcategoria</h4>
                        <p className="text-sm">{manifest.urban_data.subcategory}</p>
                      </div>
                    )}
                  </div>

                  {/* Structured Address Section */}
                  {manifest.urban_data.street && (
                    <div className="p-4 rounded-lg border bg-muted/30">
                      <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        Endereço Completo
                      </h4>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-muted-foreground text-xs">Logradouro</p>
                          <p>{manifest.urban_data.street}{manifest.urban_data.street_number ? `, ${manifest.urban_data.street_number}` : ''}</p>
                        </div>
                        {manifest.urban_data.neighborhood && (
                          <div>
                            <p className="text-muted-foreground text-xs">Bairro</p>
                            <p>{manifest.urban_data.neighborhood}</p>
                          </div>
                        )}
                        {manifest.urban_data.cep && (
                          <div>
                            <p className="text-muted-foreground text-xs">CEP</p>
                            <p className="font-mono">{manifest.urban_data.cep}</p>
                          </div>
                        )}
                        {manifest.urban_data.reference_point && (
                          <div className="col-span-2">
                            <p className="text-muted-foreground text-xs">Ponto de Referência</p>
                            <p>{manifest.urban_data.reference_point}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Impact Assessment Section */}
                  {manifest.urban_data.risk_level && (
                    <div className="p-4 rounded-lg border bg-muted/30">
                      <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        Avaliação de Impacto
                      </h4>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-muted-foreground text-xs">Nível de Risco</p>
                          <Badge variant="outline" className={riskLevelConfig[manifest.urban_data.risk_level]?.color || ''}>
                            {riskLevelConfig[manifest.urban_data.risk_level]?.label || manifest.urban_data.risk_level}
                          </Badge>
                        </div>
                        {manifest.urban_data.affected_scope && (
                          <div>
                            <p className="text-muted-foreground text-xs">Escopo Afetado</p>
                            <p>{affectedScopeLabels[manifest.urban_data.affected_scope] || manifest.urban_data.affected_scope}</p>
                          </div>
                        )}
                        {manifest.urban_data.affected_estimate && (
                          <div>
                            <p className="text-muted-foreground text-xs">Pessoas Afetadas</p>
                            <p>~{manifest.urban_data.affected_estimate}</p>
                          </div>
                        )}
                        {manifest.urban_data.urgency_reason && (
                          <div className="col-span-2">
                            <p className="text-muted-foreground text-xs">Motivo da Urgência</p>
                            <p>{manifest.urban_data.urgency_reason}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Heart className="h-4 w-4" /> {manifest.urban_data.likes_count} curtidas
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageSquare className="h-4 w-4" /> {manifest.urban_data.comments_count} comentários
                    </span>
                  </div>
                </>
              )}

              {manifest.type === 'transport' && manifest.transport_data && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-1">Tipo</h4>
                      <p className="text-sm capitalize">{manifest.transport_data.report_type}</p>
                    </div>
                    {manifest.transport_data.line_code && (
                      <div className="flex items-center gap-2">
                        <Bus className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          Linha {manifest.transport_data.line_code}
                          {manifest.transport_data.line_name && ` - ${manifest.transport_data.line_name}`}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {formatShortDate(manifest.transport_data.occurrence_date)}
                    </span>
                    {manifest.transport_data.occurrence_time && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {manifest.transport_data.occurrence_time}
                      </span>
                    )}
                  </div>
                  {manifest.transport_data.responded_at ? (
                    <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                      <CheckCircle2 className="h-3 w-3 mr-1" /> Respondido
                    </Badge>
                  ) : (
                    <Badge className="bg-orange-500/10 text-orange-600 border-orange-500/20">
                      <AlertCircle className="h-3 w-3 mr-1" /> Aguardando Resposta
                    </Badge>
                  )}
                </>
              )}

              {manifest.type === 'evaluation' && manifest.evaluation_data && (
                <>
                  <div className="p-4 rounded-lg border bg-muted/30">
                    <div className="flex items-center gap-2 mb-2">
                      <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
                      <span className="text-2xl font-bold">{manifest.evaluation_data.rating_stars}</span>
                      <span className="text-muted-foreground">/ 5 estrelas</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {manifest.evaluation_data.service_name} ({manifest.evaluation_data.service_type})
                    </p>
                  </div>
                  {manifest.evaluation_data.sentiment && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-1">Sentimento</h4>
                      <Badge variant="outline">{manifest.evaluation_data.sentiment}</Badge>
                    </div>
                  )}
                </>
              )}

              {/* Automated Processing */}
              {manifest.n8n_processed && (
                <div className="p-4 rounded-lg border bg-muted/30">
                  <h4 className="text-sm font-medium mb-2">Análise Automatizada</h4>
                  <div className="flex flex-wrap gap-2">
                    {manifest.n8n_priority && (
                      <Badge variant="outline">Prioridade: {manifest.n8n_priority}</Badge>
                    )}
                    {manifest.n8n_tags?.map((tag, i) => (
                      <Badge key={i} variant="secondary">{tag}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Location Tab */}
            {hasLocation && (
              <TabsContent value="location" className="mt-4 space-y-4">
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-1 shrink-0" />
                  <p className="text-sm">{manifest.location || 'Endereço não informado'}</p>
                </div>
                {manifest.urban_data?.latitude && manifest.urban_data?.longitude && (
                  <>
                    <div className="p-4 rounded-lg border bg-muted/30">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Latitude</p>
                          <p className="font-mono">{manifest.urban_data.latitude.toFixed(6)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Longitude</p>
                          <p className="font-mono">{manifest.urban_data.longitude.toFixed(6)}</p>
                        </div>
                      </div>
                    </div>
                    <Button variant="outline" className="w-full" asChild>
                      <a
                        href={`https://www.google.com/maps?q=${manifest.urban_data.latitude},${manifest.urban_data.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Ver no Google Maps
                      </a>
                    </Button>
                  </>
                )}
              </TabsContent>
            )}

            {/* Photos Tab */}
            {hasPhotos && (
              <TabsContent value="photos" className="mt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">
                    {manifest.urban_data?.photos?.length} foto(s)
                  </h4>
                  <Button variant="ghost" size="sm" onClick={downloadPhotos}>
                    <Download className="h-4 w-4 mr-1" />
                    Baixar
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {manifest.urban_data?.photos?.map((photo, i) => (
                    <a
                      key={i}
                      href={photo}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block rounded-lg overflow-hidden border hover:border-primary transition-colors"
                    >
                      <img
                        src={photo}
                        alt={`Foto ${i + 1}`}
                        className="w-full h-32 object-cover"
                      />
                    </a>
                  ))}
                </div>
              </TabsContent>
            )}

            {/* Responses Tab */}
            {hasResponses && (
              <TabsContent value="responses" className="mt-4 space-y-4">
                {/* Add Response */}
                <div className="space-y-2">
                  <Textarea
                    placeholder="Digite sua resposta ao cidadão..."
                    value={newResponse}
                    onChange={(e) => setNewResponse(e.target.value)}
                    className="min-h-[80px]"
                  />
                  <Button
                    onClick={handleSubmitResponse}
                    disabled={!newResponse.trim() || submitting}
                    className="w-full"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Enviar Resposta
                  </Button>
                </div>

                <Separator />

                {/* Response History */}
                {loadingResponses ? (
                  <p className="text-center text-muted-foreground py-4">Carregando...</p>
                ) : responses.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Nenhuma resposta ainda</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {responses.map((response) => (
                      <div key={response.id} className="p-3 rounded-lg border bg-muted/30">
                        <div className="flex items-center gap-2 mb-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={response.responder?.avatar_url || undefined} />
                            <AvatarFallback className="text-xs">
                              {response.responder?.full_name?.slice(0, 2).toUpperCase() || '??'}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium">{response.responder?.full_name || 'Admin'}</span>
                          <span className="text-xs text-muted-foreground">
                            {formatCompactDateTime(response.created_at)}
                          </span>
                        </div>
                        <p className="text-sm">{response.response_text}</p>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            )}

            {/* Activity Tab */}
            <TabsContent value="activity" className="mt-4">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-1.5 rounded-full bg-green-500/10">
                    <Activity className="h-3 w-3 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm">Relato criado</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(manifest.created_at)}
                    </p>
                  </div>
                </div>
                {manifest.updated_at && manifest.updated_at !== manifest.created_at && (
                  <div className="flex items-start gap-3">
                    <div className="p-1.5 rounded-full bg-blue-500/10">
                      <Activity className="h-3 w-3 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm">Última atualização</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(manifest.updated_at)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>

        {/* Footer - Simplified (main actions are inline in cards) */}
        <div className="p-4 border-t bg-background/95 backdrop-blur">
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
            <Button variant="outline" onClick={onReferral}>
              <Forward className="h-4 w-4 mr-2" />
              Encaminhar
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-destructive"
              onClick={() => onDelete(manifest)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
