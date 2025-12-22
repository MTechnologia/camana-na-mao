import { useParams, useNavigate } from "react-router-dom";
import { Calendar, Clock, Eye, Share2, Heart } from "lucide-react";
import InstitutionalLayout from "@/components/institucional/InstitutionalLayout";
import ContentArticle from "@/components/institucional/ContentArticle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getNoticiaById, categoryConfig } from "@/data/noticias";
import { toast } from "sonner";

const NoticiaDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const noticia = id ? getNoticiaById(id) : undefined;

  if (!noticia) {
    return (
      <InstitutionalLayout title="Notícia" category="Comunicação" backTo="/">
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">Notícia não encontrada</p>
          <Button onClick={() => navigate("/institucional/noticias")}>
            Ver todas as notícias
          </Button>
        </div>
      </InstitutionalLayout>
    );
  }

  const categoryStyle = categoryConfig[noticia.category];
  const IconComponent = noticia.icon;

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: noticia.title,
        text: noticia.description,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Link copiado para a área de transferência");
    }
  };

  const handleFavorite = () => {
    toast.success("Notícia adicionada aos favoritos");
  };

  return (
    <InstitutionalLayout 
      title="Notícia" 
      category={categoryStyle.label}
      backTo="/"
    >
      <article className="space-y-6">
        {/* Header com categoria e badge NOVO */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <IconComponent className="w-6 h-6 text-primary" />
            </div>
            <Badge 
              variant="outline" 
              className={`text-xs border ${categoryStyle.color}`}
            >
              {categoryStyle.label}
            </Badge>
          </div>
          
          {noticia.isNew && (
            <Badge variant="secondary" className="text-xs">
              NOVO
            </Badge>
          )}
        </div>

        {/* Título */}
        <h1 className="text-3xl font-bold text-foreground leading-tight">
          {noticia.title}
        </h1>

        {/* Descrição resumida */}
        <p className="text-lg text-muted-foreground">
          {noticia.description}
        </p>

        {/* Metadados */}
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground pb-4 border-b border-border">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4" />
            <span>{noticia.date}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            <span>{noticia.readTime} de leitura</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Eye className="h-4 w-4" />
            <span>{noticia.views.toLocaleString('pt-BR')} visualizações</span>
          </div>
        </div>

        {/* Fonte */}
        <div className="bg-muted/50 rounded-lg p-3 text-sm">
          <span className="text-muted-foreground">Fonte: </span>
          <span className="font-medium text-foreground">{noticia.source}</span>
        </div>

        {/* Conteúdo completo */}
        <div className="prose prose-slate max-w-none">
          <div className="text-foreground leading-relaxed space-y-4">
            {noticia.fullContent.split('\n\n').map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
        </div>

        {/* Ações */}
        <div className="flex gap-3 pt-6 border-t border-border">
          <Button
            variant="outline"
            className="flex-1"
            onClick={handleFavorite}
          >
            <Heart className="w-4 h-4 mr-2" />
            Favoritar
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            onClick={handleShare}
          >
            <Share2 className="w-4 h-4 mr-2" />
            Compartilhar
          </Button>
        </div>

        {/* Navegação para mais notícias */}
        <div className="pt-6">
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => navigate("/institucional/noticias")}
          >
            Ver todas as notícias
          </Button>
        </div>
      </article>
    </InstitutionalLayout>
  );
};

export default NoticiaDetailPage;
