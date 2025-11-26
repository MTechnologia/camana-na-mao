import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X, FileText, Calendar, Users, BookOpen, GraduationCap, Newspaper } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SearchResult {
  id: string;
  title: string;
  excerpt: string;
  category: string;
  route: string;
  icon: any;
}

interface GlobalSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const mockResults: SearchResult[] = [
  {
    id: "1",
    title: "Agenda da Câmara Municipal - Dezembro 2024",
    excerpt: "Confira todas as sessões plenárias e reuniões das comissões...",
    category: "Agenda",
    route: "/institucional/agenda",
    icon: Calendar,
  },
  {
    id: "2",
    title: "Vereador Ricardo Silva",
    excerpt: "Representante da zona leste, atuando na Comissão de Transporte...",
    category: "Vereadores",
    route: "/institucional/vereadores",
    icon: Users,
  },
  {
    id: "3",
    title: "História da Câmara Municipal de São Paulo",
    excerpt: "Fundada em 1560, a Câmara Municipal é uma das instituições...",
    category: "Conheça a Câmara",
    route: "/institucional/conheca-camara",
    icon: BookOpen,
  },
  {
    id: "4",
    title: "Como funciona o processo legislativo?",
    excerpt: "Entenda o caminho de uma proposta até virar lei na cidade...",
    category: "Câmara Explica",
    route: "/institucional/camara-explica",
    icon: FileText,
  },
  {
    id: "5",
    title: "Curso: Participação Cidadã",
    excerpt: "Aprenda como participar ativamente das decisões municipais...",
    category: "Escola do Parlamento",
    route: "/institucional/escola-parlamento",
    icon: GraduationCap,
  },
  {
    id: "6",
    title: "Aprovado projeto de mobilidade urbana",
    excerpt: "Câmara aprova expansão das ciclovias na região oeste...",
    category: "Notícias",
    route: "/institucional/noticias",
    icon: Newspaper,
  },
];

const categoryColors: Record<string, string> = {
  "Agenda": "bg-blue-500/10 text-blue-600",
  "Vereadores": "bg-purple-500/10 text-purple-600",
  "Conheça a Câmara": "bg-green-500/10 text-green-600",
  "Câmara Explica": "bg-orange-500/10 text-orange-600",
  "Escola do Parlamento": "bg-pink-500/10 text-pink-600",
  "Notícias": "bg-red-500/10 text-red-600",
};

const GlobalSearch = ({ open, onOpenChange }: GlobalSearchProps) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const filteredResults = mockResults.filter(
    (result) =>
      result.title.toLowerCase().includes(query.toLowerCase()) ||
      result.excerpt.toLowerCase().includes(query.toLowerCase()) ||
      result.category.toLowerCase().includes(query.toLowerCase())
  );

  const handleResultClick = (route: string) => {
    navigate(route);
    onOpenChange(false);
    setQuery("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] p-0">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className="text-xl">Buscar conteúdo</DialogTitle>
        </DialogHeader>

        {/* Search Input */}
        <div className="px-6 pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Digite para buscar..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10 pr-10"
              autoFocus
            />
            {query && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => setQuery("")}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Results */}
        <ScrollArea className="max-h-[50vh] px-6 pb-6">
          {query === "" ? (
            <div className="text-center py-8 text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Digite algo para buscar</p>
            </div>
          ) : filteredResults.length > 0 ? (
            <div className="space-y-2">
              {filteredResults.map((result) => {
                const Icon = result.icon;
                return (
                  <button
                    key={result.id}
                    onClick={() => handleResultClick(result.route)}
                    className="w-full text-left p-4 rounded-lg hover:bg-muted/50 transition-colors border border-transparent hover:border-border"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-muted rounded-lg shrink-0">
                        <Icon className="h-4 w-4 text-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h4 className="font-medium text-foreground line-clamp-1">
                            {result.title}
                          </h4>
                          <Badge
                            variant="outline"
                            className={`shrink-0 text-xs ${categoryColors[result.category] || ""}`}
                          >
                            {result.category}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {result.excerpt}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Nenhum resultado encontrado</p>
              <p className="text-sm mt-1">Tente buscar com outras palavras</p>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default GlobalSearch;
