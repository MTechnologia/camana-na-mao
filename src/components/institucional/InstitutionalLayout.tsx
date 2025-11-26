import { ReactNode, useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  BookOpen, 
  Type, 
  Heart, 
  Share2, 
  Search,
  WifiOff,
  AlertCircle
} from "lucide-react";
import PageHeader from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle,
  SheetDescription
} from "@/components/ui/sheet";
import { useAccessibility } from "@/hooks/useAccessibility";
import { toast } from "sonner";

interface InstitutionalLayoutProps {
  title: string;
  children: ReactNode;
  category?: string;
  onSearch?: () => void;
  showOfflineIndicator?: boolean;
}

const InstitutionalLayout = ({
  title,
  children,
  category,
  onSearch,
  showOfflineIndicator = false,
}: InstitutionalLayoutProps) => {
  const navigate = useNavigate();
  const { fontSize, setFontSize, readingMode, toggleReadingMode } = useAccessibility();
  const [showFontSheet, setShowFontSheet] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);

  const handleFavorite = () => {
    setIsFavorited(!isFavorited);
    toast.success(isFavorited ? "Removido dos favoritos" : "Adicionado aos favoritos");
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: title,
          text: `Confira: ${title}`,
          url: window.location.href,
        });
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          toast.error("Erro ao compartilhar");
        }
      }
    } else {
      // Fallback: copiar link
      navigator.clipboard.writeText(window.location.href);
      toast.success("Link copiado para a área de transferência");
    }
  };

  return (
    <div className={`min-h-screen bg-background ${readingMode ? 'reading-mode' : ''}`}>
      <PageHeader title={title} />

      {/* Toolbar */}
      <div className="fixed top-[60px] left-0 right-0 z-30 bg-background border-b border-border">
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-2">
            {category && (
              <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full">
                {category}
              </span>
            )}
            {showOfflineIndicator && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <WifiOff className="h-3 w-3" />
                <span>Offline</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1">
            {onSearch && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onSearch}
                className="h-8 w-8"
              >
                <Search className="h-4 w-4" />
              </Button>
            )}
            
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowFontSheet(true)}
              className="h-8 w-8"
            >
              <Type className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={toggleReadingMode}
              className={`h-8 w-8 ${readingMode ? 'text-primary' : ''}`}
            >
              <BookOpen className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleFavorite}
              className={`h-8 w-8 ${isFavorited ? 'text-red-500' : ''}`}
            >
              <Heart className="h-4 w-4" fill={isFavorited ? "currentColor" : "none"} />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleShare}
              className="h-8 w-8"
            >
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="pt-[120px] pb-24">
        <div className="max-w-3xl mx-auto px-6">
          {children}
        </div>
      </div>

      {/* Font Size Sheet */}
      <Sheet open={showFontSheet} onOpenChange={setShowFontSheet}>
        <SheetContent side="bottom" className="h-auto">
          <SheetHeader>
            <SheetTitle>Ajustar tamanho da fonte</SheetTitle>
            <SheetDescription>
              Escolha o tamanho que melhor se adapta à sua leitura
            </SheetDescription>
          </SheetHeader>

          <div className="py-6 space-y-4">
            <button
              onClick={() => {
                setFontSize("small");
                setShowFontSheet(false);
              }}
              className={`w-full p-4 rounded-lg border-2 text-left transition-colors ${
                fontSize === "small"
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <span className="text-sm font-medium">Pequeno</span>
              <p className="text-sm text-muted-foreground mt-1">
                Tamanho padrão de leitura
              </p>
            </button>

            <button
              onClick={() => {
                setFontSize("medium");
                setShowFontSheet(false);
              }}
              className={`w-full p-4 rounded-lg border-2 text-left transition-colors ${
                fontSize === "medium"
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <span className="text-base font-medium">Médio</span>
              <p className="text-base text-muted-foreground mt-1">
                Recomendado para conforto
              </p>
            </button>

            <button
              onClick={() => {
                setFontSize("large");
                setShowFontSheet(false);
              }}
              className={`w-full p-4 rounded-lg border-2 text-left transition-colors ${
                fontSize === "large"
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <span className="text-lg font-medium">Grande</span>
              <p className="text-lg text-muted-foreground mt-1">
                Melhor acessibilidade
              </p>
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default InstitutionalLayout;
