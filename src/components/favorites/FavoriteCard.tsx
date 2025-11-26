import { useNavigate } from "react-router-dom";
import { Heart, Megaphone, User, Newspaper, Calendar, GraduationCap, FileText } from "lucide-react";
import { Favorite } from "@/contexts/FavoritesContext";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface FavoriteCardProps {
  favorite: Favorite;
  onRemove: (id: string) => void;
}

const typeConfig = {
  audiencia: {
    icon: Megaphone,
    label: "Audiência",
    color: "text-pink-500",
    bgColor: "bg-pink-50",
    badgeVariant: "default" as const
  },
  vereador: {
    icon: User,
    label: "Vereador",
    color: "text-green-500",
    bgColor: "bg-green-50",
    badgeVariant: "secondary" as const
  },
  noticia: {
    icon: Newspaper,
    label: "Notícia",
    color: "text-blue-500",
    bgColor: "bg-blue-50",
    badgeVariant: "outline" as const
  },
  agenda: {
    icon: Calendar,
    label: "Agenda",
    color: "text-purple-500",
    bgColor: "bg-purple-50",
    badgeVariant: "secondary" as const
  },
  curso: {
    icon: GraduationCap,
    label: "Curso",
    color: "text-orange-500",
    bgColor: "bg-orange-50",
    badgeVariant: "default" as const
  }
};

const FavoriteCard = ({ favorite, onRemove }: FavoriteCardProps) => {
  const navigate = useNavigate();
  const config = typeConfig[favorite.type as keyof typeof typeConfig] || {
    icon: FileText,
    label: "Conteúdo",
    color: "text-gray-500",
    bgColor: "bg-gray-50",
    badgeVariant: "outline" as const
  };

  const Icon = config.icon;

  const handleClick = () => {
    if (favorite.path) {
      navigate(favorite.path);
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRemove(favorite.id);
  };

  return (
    <Card
      className="p-4 cursor-pointer hover:shadow-md transition-shadow relative"
      onClick={handleClick}
    >
      {/* Badge do tipo */}
      <Badge variant={config.badgeVariant} className="mb-3 text-xs">
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>

      {/* Botão remover */}
      <button
        onClick={handleRemove}
        className="absolute top-4 right-4 p-2 hover:bg-accent rounded-full transition-colors"
        aria-label="Remover dos favoritos"
      >
        <Heart className="w-5 h-5 text-red-500 fill-red-500" />
      </button>

      {/* Conteúdo do card */}
      <div className="flex gap-3">
        {favorite.image && (
          <Avatar className="w-12 h-12 rounded-lg">
            <AvatarImage src={favorite.image} alt={favorite.title} />
            <AvatarFallback className={config.bgColor}>
              <Icon className={`w-6 h-6 ${config.color}`} />
            </AvatarFallback>
          </Avatar>
        )}
        
        <div className="flex-1 min-w-0 pr-8">
          <h3 className="font-semibold text-foreground line-clamp-2 mb-1">
            {favorite.title}
          </h3>
          {favorite.subtitle && (
            <p className="text-sm text-muted-foreground line-clamp-1">
              {favorite.subtitle}
            </p>
          )}
          {favorite.metadata?.date && (
            <p className="text-xs text-muted-foreground mt-1">
              {favorite.metadata.date}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
};

export default FavoriteCard;
