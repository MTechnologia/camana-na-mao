import InstitutionalLayout from "@/components/institucional/InstitutionalLayout";
import { Clock, Eye, RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useNoticias } from "@/hooks/useNoticias";
import { getCategoryConfig } from "@/data/noticias";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const Noticias = () => {
  const navigate = useNavigate();
  const { data: noticias = [], isLoading, error, refetch } = useNoticias();

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return formatDistanceToNow(date, { addSuffix: true, locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  const isRecent = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
      return diffHours < 24;
    } catch {
      return false;
    }
  };

  if (isLoading) {
    return (
      <InstitutionalLayout title="Notícias" category="Comunicação">
        <div className="space-y-6">
          <div>
            <Skeleton className="h-9 w-64 mb-2" />
            <Skeleton className="h-5 w-96" />
          </div>
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="p-5">
                <Skeleton className="h-5 w-20 mb-3" />
                <Skeleton className="h-6 w-full mb-2" />
                <Skeleton className="h-4 w-3/4 mb-3" />
                <div className="flex gap-4">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-16" />
                </div>
              </Card>
            ))}
          </div>
        </div>
      </InstitutionalLayout>
    );
  }

  if (error) {
    return (
      <InstitutionalLayout title="Notícias" category="Comunicação">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-muted-foreground mb-4">
            Não foi possível carregar as notícias.
          </p>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Tentar novamente
          </Button>
        </div>
      </InstitutionalLayout>
    );
  }

  return (
    <InstitutionalLayout title="Notícias" category="Comunicação">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Notícias da Câmara
          </h1>
          <p className="text-muted-foreground">
            Fique por dentro das últimas ações legislativas e novidades da
            Câmara Municipal
          </p>
        </div>

        {noticias.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              Nenhuma notícia disponível no momento.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {noticias.map((noticia) => {
              const config = getCategoryConfig(noticia.category);
              return (
                <Card
                  key={noticia.id}
                  onClick={() => navigate(`/institucional/noticias/${noticia.id}`)}
                  className="p-5 hover:shadow-md transition-all cursor-pointer relative active:scale-[0.99]"
                >
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={`inline-block ${config.color}`}
                      >
                        {config.label}
                      </Badge>
                      {isRecent(noticia.pubDate) && (
                        <Badge variant="secondary" className="text-xs">
                          NOVO
                        </Badge>
                      )}
                    </div>
                    
                    <h3 className="font-semibold text-foreground leading-tight mb-2">
                      {noticia.title}
                    </h3>

                    <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
                      {noticia.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                      <span>{formatDate(noticia.pubDate)}</span>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{noticia.readTime}</span>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        <div className="mt-8 p-4 bg-muted/50 rounded-lg text-sm text-muted-foreground">
          <p>
            <strong>Fonte:</strong> Portal da Câmara Municipal de São Paulo
          </p>
          <p>
            <strong>Atualização:</strong> Dados atualizados em tempo real
          </p>
        </div>
      </div>
    </InstitutionalLayout>
  );
};

export default Noticias;
