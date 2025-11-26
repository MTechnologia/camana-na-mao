import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Search as SearchIcon, Clock, Trash2, Sparkles, X, TrendingUp } from "lucide-react";
import PageHeader from "@/components/ui/page-header";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSearchHistory } from "@/hooks/useSearchHistory";
import { supabase } from "@/integrations/supabase/client";
import { useDebounce } from "@/hooks/useDebounce";

interface SearchSuggestion {
  text: string;
  type: string;
  icon: string;
}

const SearchPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  
  const [query, setQuery] = useState(initialQuery);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const { history, loading, addToHistory, clearHistory } = useSearchHistory();
  
  const debouncedQuery = useDebounce(query, 300);

  // Fetch intelligent suggestions when user types
  useEffect(() => {
    if (debouncedQuery.length >= 2) {
      fetchSuggestions(debouncedQuery);
    } else {
      setSuggestions([]);
    }
  }, [debouncedQuery]);

  const fetchSuggestions = async (searchQuery: string) => {
    setLoadingSuggestions(true);
    try {
      // Buscar em diferentes tabelas para sugestões inteligentes
      const [vereadores, audiencias, servicos] = await Promise.all([
        supabase
          .from("profiles")
          .select("full_name")
          .ilike("full_name", `%${searchQuery}%`)
          .limit(3),
        supabase
          .from("audiencias")
          .select("titulo, tema")
          .or(`titulo.ilike.%${searchQuery}%,tema.ilike.%${searchQuery}%`)
          .limit(3),
        supabase
          .from("public_services")
          .select("name, service_type")
          .ilike("name", `%${searchQuery}%`)
          .limit(3)
      ]);

      const newSuggestions: SearchSuggestion[] = [];

      vereadores.data?.forEach(v => {
        newSuggestions.push({
          text: v.full_name,
          type: "Vereador",
          icon: "👤"
        });
      });

      audiencias.data?.forEach(a => {
        newSuggestions.push({
          text: a.titulo,
          type: "Audiência",
          icon: "📢"
        });
      });

      servicos.data?.forEach(s => {
        newSuggestions.push({
          text: s.name,
          type: s.service_type.toUpperCase(),
          icon: "📍"
        });
      });

      setSuggestions(newSuggestions);
    } catch (error) {
      console.error("Error fetching suggestions:", error);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleSearch = (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    addToHistory(searchQuery);
    // Aqui você pode navegar para resultados ou abrir modal de resultados
    console.log("Searching for:", searchQuery);
  };

  const handleAIHelp = () => {
    navigate("/ia");
  };

  const handleHistoryClick = (item: string) => {
    setQuery(item);
    handleSearch(item);
  };

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    setQuery(suggestion.text);
    handleSearch(suggestion.text);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader title="Buscar" backTo="/home" />
      
      <div className="pt-[60px] pb-20">
        <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
          {/* Search Input */}
          <div className="relative">
            <div className="relative">
              <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Busque vereadores, audiências, serviços..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch(query)}
                className="pl-12 pr-12 py-6 text-base rounded-2xl border-gray-200 focus:border-primary focus:ring-primary"
                autoFocus
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>

          {/* AI Help Button */}
          <div className="flex justify-center">
            <Button
              onClick={handleAIHelp}
              variant="outline"
              className="rounded-full gap-2 border-primary text-primary hover:bg-primary-hover"
            >
              <Sparkles className="h-4 w-4" />
              Precisa de ajuda da IA?
            </Button>
          </div>

          {/* Suggestions */}
          {suggestions.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="p-4 border-b border-gray-100 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-gray-700">Sugestões</span>
              </div>
              <div className="divide-y divide-gray-100">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="w-full p-4 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left"
                  >
                    <span className="text-2xl">{suggestion.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {suggestion.text}
                      </p>
                      <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium bg-secondary text-secondary-foreground rounded">
                        {suggestion.type}
                      </span>
                    </div>
                    <SearchIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Search History */}
          {!query && history.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">Buscas Recentes</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearHistory}
                  className="text-gray-500 hover:text-primary"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="divide-y divide-gray-100">
                {history.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleHistoryClick(item.search_query)}
                    className="w-full p-4 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left"
                  >
                    <Clock className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <span className="text-sm text-gray-700 flex-1 truncate">
                      {item.search_query}
                    </span>
                    <SearchIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {!query && history.length === 0 && !loading && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <SearchIcon className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Comece a buscar
              </h3>
              <p className="text-sm text-gray-500 max-w-sm mx-auto">
                Encontre vereadores, audiências públicas, serviços próximos e muito mais
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchPage;
