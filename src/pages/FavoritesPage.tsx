import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Heart } from "lucide-react";
import { useFavorites } from "@/contexts/FavoritesContext";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import FavoriteCard from "@/components/favorites/FavoriteCard";
import FloatingNavbar from "@/components/FloatingNavbar";

const FavoritesPage = () => {
  const navigate = useNavigate();
  const { favorites, removeFavorite } = useFavorites();
  const [filterType, setFilterType] = useState<string>("all");

  const filteredFavorites = filterType === "all" 
    ? favorites 
    : favorites.filter(f => f.type === filterType);

  const filterOptions = [
    { value: "all", label: "Todos" },
    { value: "audiencia", label: "Audiências" },
    { value: "vereador", label: "Vereadores" },
    { value: "noticia", label: "Notícias" },
    { value: "agenda", label: "Agenda" },
    { value: "curso", label: "Cursos" }
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center gap-3 p-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-accent rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground">Meus Favoritos</h1>
            <p className="text-sm text-muted-foreground">
              {favorites.length} {favorites.length === 1 ? "item" : "itens"} favorito{favorites.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {/* Filters */}
        {favorites.length > 0 && (
          <div className="px-4 pb-3">
            <Tabs value={filterType} onValueChange={setFilterType}>
              <TabsList className="w-full justify-start overflow-x-auto">
                {filterOptions.map((option) => (
                  <TabsTrigger key={option.value} value={option.value}>
                    {option.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        )}
      </header>

      {/* Content */}
      <div className="p-4">
        {filteredFavorites.length > 0 ? (
          <div className="space-y-3">
            {filteredFavorites.map((favorite) => (
              <FavoriteCard
                key={favorite.id}
                favorite={favorite}
                onRemove={removeFavorite}
              />
            ))}
          </div>
        ) : favorites.length === 0 ? (
          // Empty state - nenhum favorito
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
              <Heart className="w-10 h-10 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Nenhum favorito ainda
            </h2>
            <p className="text-muted-foreground mb-6 max-w-sm">
              Explore o app e favorite conteúdos do seu interesse para acessá-los rapidamente
            </p>
            <Button onClick={() => navigate("/home")} variant="default">
              Explorar Conteúdos
            </Button>
          </div>
        ) : (
          // Empty state - filtro sem resultados
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
              <Heart className="w-10 h-10 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Nenhum item deste tipo
            </h2>
            <p className="text-muted-foreground max-w-sm">
              Você ainda não favoritou nenhum item desta categoria
            </p>
          </div>
        )}
      </div>

      <FloatingNavbar />
    </div>
  );
};

export default FavoritesPage;
