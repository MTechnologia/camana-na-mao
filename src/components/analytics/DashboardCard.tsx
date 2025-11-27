import { Eye, User, Calendar, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DashboardCardProps {
  dashboard: {
    id: string;
    title: string;
    description: string | null;
    created_at: string;
    profiles?: {
      full_name: string;
    };
  };
  onView: (id: string) => void;
}

export const DashboardCard = ({ dashboard, onView }: DashboardCardProps) => {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg line-clamp-2">{dashboard.title}</CardTitle>
          <Badge variant="secondary">Público</Badge>
        </div>
      </CardHeader>
      
      <CardContent>
        <p className="text-sm text-muted-foreground line-clamp-3">
          {dashboard.description || 'Sem descrição disponível'}
        </p>
        
        <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <User className="w-3 h-3" />
            <span>{dashboard.profiles?.full_name || 'Usuário'}</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            <span>
              {format(new Date(dashboard.created_at), "dd 'de' MMM", { locale: ptBR })}
            </span>
          </div>
        </div>
      </CardContent>
      
      <CardFooter>
        <Button
          variant="outline"
          className="w-full"
          onClick={() => onView(dashboard.id)}
        >
          <Eye className="w-4 h-4 mr-2" />
          Visualizar Painel
        </Button>
      </CardFooter>
    </Card>
  );
};
