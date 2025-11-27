import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { MapPin, Calendar, Heart, MessageSquare, Download } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { UrbanReportFull } from '@/hooks/useUrbanReportsAdmin';
import { toast } from 'sonner';

interface ReportDetailModalProps {
  report: UrbanReportFull | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusChange: (reportId: string, status: string) => void;
}

export const ReportDetailModal = ({ report, open, onOpenChange, onStatusChange }: ReportDetailModalProps) => {
  if (!report) return null;

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

  const downloadPhotos = async () => {
    if (!report.photos || report.photos.length === 0) {
      toast.error('Nenhuma foto disponível');
      return;
    }

    try {
      for (const [index, photoUrl] of report.photos.entries()) {
        const response = await fetch(photoUrl);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `relato-${report.id}-foto-${index + 1}.jpg`;
        link.click();
        window.URL.revokeObjectURL(url);
      }
      toast.success('Fotos baixadas com sucesso');
    } catch (error) {
      console.error('Error downloading photos:', error);
      toast.error('Erro ao baixar fotos');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalhes do Relato</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status and Actions */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={getSeverityColor(report.severity)}>
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
            <div className="flex gap-2">
              {report.status === 'pending' && (
                <>
                  <Button size="sm" variant="outline" onClick={() => onStatusChange(report.id, 'in_progress')}>
                    Em Andamento
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => onStatusChange(report.id, 'resolved')}>
                    Resolver
                  </Button>
                </>
              )}
              {report.status === 'in_progress' && (
                <Button size="sm" variant="outline" onClick={() => onStatusChange(report.id, 'resolved')}>
                  Resolver
                </Button>
              )}
            </div>
          </div>

          <Separator />

          {/* Author Info */}
          {report.author && (
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarImage src={report.author.avatar_url || undefined} />
                <AvatarFallback>
                  {report.author.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold">{report.author.full_name}</p>
                <p className="text-sm text-muted-foreground">
                  Relato criado em {format(new Date(report.created_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
              </div>
            </div>
          )}

          {/* Description */}
          <div>
            <h4 className="font-semibold mb-2">Descrição</h4>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {report.description || 'Sem descrição'}
            </p>
          </div>

          {/* Location */}
          {report.location_address && (
            <div>
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Localização
              </h4>
              <p className="text-sm text-muted-foreground mb-3">{report.location_address}</p>
              
              {report.latitude && report.longitude && (
                <div className="p-4 rounded-lg border bg-muted/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Latitude</p>
                      <p className="font-mono text-sm">{report.latitude.toFixed(6)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Longitude</p>
                      <p className="font-mono text-sm">{report.longitude.toFixed(6)}</p>
                    </div>
                    <a
                      href={`https://www.google.com/maps?q=${report.latitude},${report.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline"
                    >
                      Ver no Google Maps →
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Photos */}
          {report.photos && report.photos.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold">Fotos ({report.photos.length})</h4>
                <Button variant="ghost" size="sm" onClick={downloadPhotos}>
                  <Download className="h-4 w-4 mr-1" />
                  Baixar Fotos
                </Button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {report.photos.map((photo, idx) => (
                  <a
                    key={idx}
                    href={photo}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-lg overflow-hidden border hover:border-primary transition-colors"
                  >
                    <img
                      src={photo}
                      alt={`Foto ${idx + 1}`}
                      className="w-full h-32 object-cover"
                    />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Engagement Stats */}
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Heart className="h-4 w-4" />
              <span>{report.likes_count} {report.likes_count === 1 ? 'curtida' : 'curtidas'}</span>
            </div>
            <div className="flex items-center gap-1">
              <MessageSquare className="h-4 w-4" />
              <span>{report.comments_count} {report.comments_count === 1 ? 'comentário' : 'comentários'}</span>
            </div>
          </div>

          {/* AI Classification */}
          {report.ai_classification && (
            <div>
              <h4 className="font-semibold mb-2">Classificação por IA</h4>
              <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto">
                {JSON.stringify(report.ai_classification, null, 2)}
              </pre>
            </div>
          )}

          {/* Metadata */}
          <div className="text-xs text-muted-foreground space-y-1">
            <p className="flex items-center gap-2">
              <Calendar className="h-3 w-3" />
              Criado: {format(new Date(report.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </p>
            {report.updated_at && report.updated_at !== report.created_at && (
              <p className="flex items-center gap-2">
                <Calendar className="h-3 w-3" />
                Atualizado: {format(new Date(report.updated_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
