import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useSingleServiceFavorite } from "@/hooks/useServiceFavorites";

type Props = {
  /** ID em `public_services`; null desabilita. */
  serviceId: string | null;
  /** Quando não logado, ao tocar em favoritar. */
  onRequestLogin?: () => void;
  className?: string;
};

/**
 * Botão de favorito para a ficha do equipamento (lista larga com texto).
 */
export function ServiceFavoriteButton({ serviceId, onRequestLogin, className }: Props) {
  const { user } = useAuth();
  const effectiveId = user && serviceId ? serviceId : null;
  const { isFavorite, loading, toggleFavorite } = useSingleServiceFavorite(effectiveId);

  const handleClick = async () => {
    if (!serviceId) return;
    if (!user) {
      onRequestLogin?.();
      return;
    }
    await toggleFavorite();
  };

  if (!serviceId) {
    return (
      <Button variant="outline" className={cn("w-full", className)} size="lg" disabled>
        <Heart className="w-4 h-4 mr-2" />
        Favoritar equipamento
      </Button>
    );
  }

  const showFavoriteState = !!user;

  return (
    <Button
      type="button"
      variant={showFavoriteState && isFavorite ? "secondary" : "outline"}
      className={cn("w-full", className)}
      size="lg"
      disabled={loading && showFavoriteState}
      onClick={() => void handleClick()}
      aria-pressed={showFavoriteState ? isFavorite : undefined}
      aria-label={
        !user
          ? "Favoritar equipamento — é necessário entrar na conta"
          : isFavorite
            ? "Remover dos favoritos"
            : "Adicionar aos favoritos"
      }
    >
      <Heart
        className={cn(
          "w-4 h-4 mr-2 shrink-0 transition-colors",
          showFavoriteState && isFavorite && "fill-primary text-primary",
        )}
        aria-hidden
      />
      {!user
        ? "Favoritar equipamento"
        : loading
          ? "Carregando…"
          : isFavorite
            ? "Nos meus favoritos"
            : "Favoritar equipamento"}
    </Button>
  );
}
