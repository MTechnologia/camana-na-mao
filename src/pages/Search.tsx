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
              <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-primary transition-colors" />
              <Input
                type="text"
                placeholder="O que você está procurando?"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch(query)}
                className="pl-12 pr-12 py-6 text-base rounded-xl border-gray-200 bg-white shadow-sm focus:border-primary focus:ring-primary transition-all"
                autoFocus
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>

          {/* Card do Agente da Câmara de SP */}
          <div 
            onClick={handleAIHelp}
            className="bg-gradient-to-br from-white to-gray-50 rounded-xl p-5 shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-all duration-300"
          >
            <div className="flex items-start gap-4">
              <div className="relative flex-shrink-0">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
                  <Sparkles className="h-7 w-7 text-white" />
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 rounded-full border-2 border-white animate-pulse" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 text-base">Agente da Câmara de SP</h3>
                <p className="text-sm text-gray-500 mt-0.5">Seu assistente virtual inteligente</p>
              </div>
            </div>
          </div>

          {/* Suggestions */}
          {suggestions.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
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
                      <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded-full">
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
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
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
              <div className="w-20 h-20 bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl flex items-center justify-center mx-auto mb-4">
                <SearchIcon className="h-10 w-10 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Comece a explorar
              </h3>
              <p className="text-sm text-gray-500 max-w-sm mx-auto mb-6">
                Encontre vereadores, audiências públicas, serviços próximos e muito mais
              </p>
              
              {/* Buscas Populares */}
              <div className="flex flex-wrap gap-2 justify-center max-w-md mx-auto">
                <button
                  onClick={() => setQuery("Vereadores")}
                  className="px-4 py-2 text-sm bg-white border border-gray-200 text-gray-700 rounded-full hover:border-primary hover:text-primary transition-all"
                >
                  Vereadores
                </button>
                <button
                  onClick={() => setQuery("Audiências")}
                  className="px-4 py-2 text-sm bg-white border border-gray-200 text-gray-700 rounded-full hover:border-primary hover:text-primary transition-all"
                >
                  Audiências
                </button>
                <button
                  onClick={() => setQuery("Serviços de saúde")}
                  className="px-4 py-2 text-sm bg-white border border-gray-200 text-gray-700 rounded-full hover:border-primary hover:text-primary transition-all"
                >
                  Serviços de saúde
                </button>
                <button
                  onClick={() => setQuery("Transporte")}
                  className="px-4 py-2 text-sm bg-white border border-gray-200 text-gray-700 rounded-full hover:border-primary hover:text-primary transition-all"
                >
                  Transporte
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchPage;
