import InstitutionalLayout from "@/components/institucional/InstitutionalLayout";
import { Clock, Eye, Heart } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useFavorites } from "@/contexts/FavoritesContext";
import { useNavigate } from "react-router-dom";
import { noticias, categoryConfig } from "@/data/noticias";

const Noticias = () => {
  const { toggleFavorite, isFavorited } = useFavorites();
  const navigate = useNavigate();

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Hoje";
    if (diffDays === 1) return "Ontem";
    if (diffDays < 7) return `Há ${diffDays} dias`;

    return date.toLocaleDateString("pt-BR", {
      day: "numeric",
      month: "short",
    });
  };

  return (
    <InstitutionalLayout
      title="Notícias"
      category="Comunicação"
    >
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

          <div className="space-y-4">
            {noticias.map((noticia) => {
              const config = categoryConfig[noticia.category];
              return (
                <Card
                  key={noticia.id}
                  onClick={() => navigate(`/institucional/noticias/${noticia.id}`)}
                  className="p-5 hover:shadow-md transition-all cursor-pointer relative active:scale-[0.99]"
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite({
                        id: `noticia-${noticia.id}`,
                        type: 'noticia',
                        title: noticia.title,
                        subtitle: config?.label || noticia.category,
                        path: `/institucional/noticias/${noticia.id}`,
                        metadata: { date: noticia.date, views: noticia.views },
                      });
                    }}
                    className="absolute top-4 right-4 p-2 hover:bg-muted/50 rounded-full transition-colors z-10"
                    aria-label="Favoritar notícia"
                  >
                    <Heart
                      className={`h-5 w-5 ${
                        isFavorited(`noticia-${noticia.id}`)
                          ? "fill-pink-500 text-pink-500"
                          : "text-muted-foreground"
                      }`}
                    />
                  </button>
                  <div className="space-y-3">
                    <Badge
                      variant="outline"
                      className={`mb-2 inline-block ${config?.color || ""}`}
                    >
                      {config?.label || noticia.category}
                    </Badge>
                    <h3 className="font-semibold text-foreground leading-tight mb-2">
                      {noticia.title}
                    </h3>

                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {noticia.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                      <span>{formatDate(noticia.date)}</span>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{noticia.readTime}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        <span>{noticia.views} visualizações</span>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          <div className="text-center py-6">
            <button className="text-primary hover:underline font-medium">
              Carregar mais notícias
            </button>
          </div>

          <div className="mt-8 p-4 bg-muted/50 rounded-lg text-sm text-muted-foreground">
            <p>
              <strong>Fonte:</strong> Assessoria de Comunicação da Câmara
              Municipal
            </p>
            <p>
              <strong>Atualização:</strong> Novas notícias são publicadas
              diariamente
            </p>
          </div>
        </div>
      </InstitutionalLayout>
  );
};

export default Noticias;
