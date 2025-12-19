import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Eye, EyeOff } from 'lucide-react';
import { formatDateTime } from '@/lib/dateUtils';

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

interface TransportResponseHistoryProps {
  responses: Response[];
  loading?: boolean;
}

export const TransportResponseHistory = ({ responses, loading }: TransportResponseHistoryProps) => {
  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      answer: 'Resposta',
      follow_up: 'Acompanhamento',
      closure: 'Encerramento',
    };
    return labels[type] || type;
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      answer: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
      follow_up: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
      closure: 'bg-green-500/10 text-green-600 border-green-500/20',
    };
    return colors[type] || 'bg-muted text-foreground';
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="h-20 bg-muted rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  if (responses.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">Nenhuma resposta registrada</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {responses.map((response) => (
        <div
          key={response.id}
          className="border rounded-lg p-4 space-y-3 bg-card"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={response.responder?.avatar_url || undefined} />
                <AvatarFallback className="text-xs">
                  {response.responder?.full_name?.slice(0, 2).toUpperCase() || 'AD'}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">
                  {response.responder?.full_name || 'Administrador'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDateTime(response.created_at)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={getTypeColor(response.response_type)}>
                {getTypeLabel(response.response_type)}
              </Badge>
              {response.is_public ? (
                <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                  <Eye className="h-3 w-3 mr-1" />
                  Pública
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-muted text-muted-foreground">
                  <EyeOff className="h-3 w-3 mr-1" />
                  Interna
                </Badge>
              )}
            </div>
          </div>
          <p className="text-sm text-foreground whitespace-pre-wrap">
            {response.response_text}
          </p>
        </div>
      ))}
    </div>
  );
};
