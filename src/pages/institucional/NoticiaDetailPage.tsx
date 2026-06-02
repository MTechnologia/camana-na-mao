import { useParams, useNavigate } from "react-router-dom";
import { Calendar, Clock, ExternalLink, RefreshCw, Share2 } from "lucide-react";
import InstitutionalLayout from "@/components/institucional/InstitutionalLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useNoticiaById } from "@/hooks/useNoticias";
import { getCategoryConfig } from "@/data/noticias";
import { sanitizeRichHtml } from "@/lib/sanitizeHtml";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const NoticiaDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const { noticia, isLoading, error } = useNoticiaById(id);

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: noticia?.title,
        text: noticia?.description,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Link copiado para a área de transferência");
    }
  };

  const handleOpenOriginal = () => {
    if (noticia?.link) {
      window.open(noticia.link, "_blank", "noopener,noreferrer");
    }
  };

  const formatFullDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return format(date, "d 'de' MMMM 'de' yyyy", { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  if (isLoading) {
    return (
      <InstitutionalLayout title="Notícia" category="Comunicação" backTo="/">
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <Skeleton className="w-12 h-12 rounded-full" />
            <Skeleton className="h-6 w-24" />
          </div>
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-6 w-3/4" />
          <div className="flex gap-4">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      </InstitutionalLayout>
    );
  }

  if (error || !noticia) {
    return (
      <InstitutionalLayout title="Notícia" category="Comunicação" backTo="/">
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">Notícia não encontrada</p>
          <Button onClick={() => navigate("/institucional/noticias")}>Ver todas as notícias</Button>
        </div>
      </InstitutionalLayout>
    );
  }

  const categoryStyle = getCategoryConfig(noticia.category);
  const IconComponent = categoryStyle.icon;

  const isRecent = () => {
    try {
      const date = new Date(noticia.pubDate);
      const now = new Date();
      const diffHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
      return diffHours < 24;
    } catch {
      return false;
    }
  };

  return (
    <InstitutionalLayout title="Notícia" category={categoryStyle.label} backTo="/">
      <article className="space-y-6">
        {/* Header com categoria e badge NOVO */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <IconComponent className="w-6 h-6 text-primary" />
            </div>
            <Badge variant="outline" className={`text-xs border ${categoryStyle.color}`}>
              {categoryStyle.label}
            </Badge>
          </div>

          {isRecent() && (
            <Badge variant="secondary" className="text-xs">
              NOVO
            </Badge>
          )}
        </div>

        {/* Imagem de capa (se disponível) */}
        {noticia.imageUrl && (
          <div className="rounded-lg overflow-hidden">
            <img
              src={noticia.imageUrl}
              alt={noticia.title}
              className="w-full h-48 object-cover"
              loading="lazy"
            />
          </div>
        )}

        {/* Título */}
        <h1 className="text-3xl font-bold text-foreground leading-tight">{noticia.title}</h1>

        {/* Descrição resumida */}
        <p className="text-lg text-muted-foreground">{noticia.description}</p>

        {/* Metadados */}
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground pb-4 border-b border-border">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4" />
            <span>{formatFullDate(noticia.pubDate)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            <span>{noticia.readTime} de leitura</span>
          </div>
        </div>

        {/* Fonte */}
        <div className="bg-muted/50 rounded-lg p-3 text-sm">
          <span className="text-muted-foreground">Fonte: </span>
          <span className="font-medium text-foreground">{noticia.source}</span>
        </div>

        {/* Conteúdo completo */}
        <div className="prose prose-slate max-w-none">
          <div
            className="text-foreground leading-relaxed space-y-4"
            dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(noticia.fullContent) }}
          />
        </div>

        {/* Ações */}
        <div className="flex gap-3 pt-6 border-t border-border">
          <Button variant="outline" className="flex-1" onClick={handleShare}>
            <Share2 className="w-4 h-4 mr-2" />
            Compartilhar
          </Button>
          <Button variant="outline" className="flex-1" onClick={handleOpenOriginal}>
            <ExternalLink className="w-4 h-4 mr-2" />
            Ver Original
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
