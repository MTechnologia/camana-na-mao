import { useState } from "react";
import InstitutionalLayout from "@/components/institucional/InstitutionalLayout";
import GlobalSearch from "@/components/institucional/GlobalSearch";
import { Clock, Eye, Heart } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useFavorites } from "@/contexts/FavoritesContext";

interface Noticia {
  id: string;
  title: string;
  excerpt: string;
  category: string;
  date: string;
  readTime: string;
  views: number;
  imageUrl?: string;
}

const mockNoticias: Noticia[] = [
  {
    id: "1",
    title: "Câmara aprova projeto de expansão de ciclovias",
    excerpt:
      "Projeto prevê a criação de 50km de novas ciclovias conectando diferentes regiões da cidade.",
    category: "Mobilidade",
    date: "2024-12-14",
    readTime: "3 min",
    views: 1247,
  },
  {
    id: "2",
    title: "Nova escola será construída na Zona Leste",
    excerpt:
      "Investimento de R$ 15 milhões garantirá educação de qualidade para mais de 800 crianças.",
    category: "Educação",
    date: "2024-12-13",
    readTime: "4 min",
    views: 892,
  },
  {
    id: "3",
    title: "Audiência pública debate saúde mental",
    excerpt:
      "Especialistas e população discutem ampliação de serviços de saúde mental nas UBS.",
    category: "Saúde",
    date: "2024-12-12",
    readTime: "5 min",
    views: 654,
  },
  {
    id: "4",
    title: "Câmara lança programa de transparência digital",
    excerpt:
      "Novo portal permitirá acompanhamento em tempo real de todas as votações e projetos.",
    category: "Transparência",
    date: "2024-12-11",
    readTime: "6 min",
    views: 1089,
  },
];

const categoryColors: Record<string, string> = {
  Mobilidade: "bg-blue-500/10 text-blue-600",
  Educação: "bg-purple-500/10 text-purple-600",
  Saúde: "bg-red-500/10 text-red-600",
  Transparência: "bg-green-500/10 text-green-600",
};

const Noticias = () => {
  const [showSearch, setShowSearch] = useState(false);
  const { toggleFavorite, isFavorited } = useFavorites();

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
    <>
      <InstitutionalLayout
        title="Notícias"
        category="Comunicação"
        onSearch={() => setShowSearch(true)}
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
            {mockNoticias.map((noticia) => (
              <Card
                key={noticia.id}
                className="p-5 hover:shadow-md transition-shadow cursor-pointer relative"
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite({
                      id: `noticia-${noticia.id}`,
                      type: 'noticia',
                      title: noticia.title,
                      subtitle: noticia.category,
                      path: `/institucional/noticias`,
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
                    className={`mb-2 inline-block ${categoryColors[noticia.category] || ""}`}
                  >
                    {noticia.category}
                  </Badge>
                  <h3 className="font-semibold text-foreground leading-tight mb-2">
                    {noticia.title}
                  </h3>

                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {noticia.excerpt}
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
            ))}
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

      <GlobalSearch open={showSearch} onOpenChange={setShowSearch} />
    </>
  );
};

export default Noticias;
