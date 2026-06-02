import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Search as SearchIcon,
  Clock,
  Trash2,
  Sparkles,
  X,
  TrendingUp,
  MapPin,
  Star,
} from "lucide-react";
import PageHeader from "@/components/ui/page-header";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useSearchHistory } from "@/hooks/useSearchHistory";
import { supabase } from "@/integrations/supabase/client";
import { useDebounce } from "@/hooks/useDebounce";
import { SearchResult, searchAll, filterCategories, typeLabels } from "@/data/searchData";
import { FILTER_CATEGORY_ICONS } from "@/components/icons";

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
  const [results, setResults] = useState<SearchResult[]>([]);
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const { history, loading, addToHistory, clearHistory } = useSearchHistory();

  const debouncedQuery = useDebounce(query, 300);

  // Fetch search results when user types
  useEffect(() => {
    if (debouncedQuery.length >= 2) {
      performSearch(debouncedQuery);
    } else {
      setResults([]);
      setSuggestions([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- performSearch runs when debouncedQuery/activeFilter change
  }, [debouncedQuery, activeFilter]);

  const performSearch = async (searchQuery: string) => {
    setLoadingSuggestions(true);
    try {
      // Buscar nos dados mockados
      const mockResults = searchAll(searchQuery);

      // Buscar em notícias do Supabase
      const { data: noticias } = await supabase
        .from("noticias")
        .select("*")
        .or(`titulo.ilike.%${searchQuery}%,conteudo.ilike.%${searchQuery}%`)
        .limit(5);

      const noticiasResults: SearchResult[] = (noticias || []).map((noticia) => ({
        id: noticia.id,
        type: "noticia" as const,
        title: noticia.titulo,
        description: noticia.resumo || noticia.conteudo.substring(0, 100),
        icon: "📰",
        category: noticia.categoria,
        path: `/noticias/${noticia.id}`,
        metadata: {
          date: noticia.data_publicacao,
          author: noticia.autor,
        },
      }));

      // Buscar em audiências do Supabase
      const { data: audiencias } = await supabase
        .from("audiencias")
        .select("*")
        .or(`titulo.ilike.%${searchQuery}%,tema.ilike.%${searchQuery}%`)
        .limit(5);

      const audienciasResults: SearchResult[] = (audiencias || []).map((audiencia) => ({
        id: audiencia.id,
        type: "audiencia" as const,
        title: audiencia.titulo,
        description: `${audiencia.tema} - ${audiencia.local}`,
        icon: "🎙️",
        category: "Audiência Pública",
        path: `/audiencias/${audiencia.id}`,
        metadata: {
          date: audiencia.data,
          status: audiencia.status,
        },
      }));

      // Combinar resultados
      const allResults = [...mockResults, ...noticiasResults, ...audienciasResults];

      // Filtrar por tipo se não for 'all'
      const filteredResults =
        activeFilter === "all" ? allResults : allResults.filter((r) => r.type === activeFilter);

      setResults(filteredResults);

      // Criar sugestões para o autocomplete (primeiros 5 resultados)
      const newSuggestions = filteredResults.slice(0, 5).map((result) => ({
        text: result.title,
        type: result.category,
        icon: result.icon,
      }));
      setSuggestions(newSuggestions);
    } catch (error) {
      console.error("Error searching:", error);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleSearch = (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    addToHistory(searchQuery);
  };

  const handleAIHelp = () => {
    navigate("/");
  };

  const handleHistoryClick = (item: string) => {
    setQuery(item);
    handleSearch(item);
  };

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    setQuery(suggestion.text);
    handleSearch(suggestion.text);
  };

  const handleResultClick = (result: SearchResult) => {
    navigate(result.path);
  };

  const handleFilterClick = (filterId: string) => {
    setActiveFilter(filterId);
  };

  // Agrupar resultados por tipo
  const groupedResults = results.reduce(
    (acc, result) => {
      if (!acc[result.type]) {
        acc[result.type] = [];
      }
      acc[result.type].push(result);
      return acc;
    },
    {} as Record<string, SearchResult[]>,
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader title="Buscar" backTo="/" />

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
                <h3 className="font-semibold text-gray-900 text-base">Agente Câmara na Mão</h3>
                <p className="text-sm text-gray-500 mt-0.5">Seu assistente virtual inteligente</p>
              </div>
            </div>
          </div>

          {/* Filter Pills */}
          {query && results.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {filterCategories.map((filter) => {
                const FilterIcon = FILTER_CATEGORY_ICONS[filter.id];
                return (
                  <button
                    key={filter.id}
                    onClick={() => handleFilterClick(filter.id)}
                    className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors inline-flex items-center ${
                      activeFilter === filter.id
                        ? "bg-primary text-white"
                        : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
                    }`}
                  >
                    {FilterIcon && (
                      <span className="mr-1.5 shrink-0" aria-hidden>
                        <FilterIcon size={16} />
                      </span>
                    )}
                    {filter.label}
                  </button>
                );
              })}
            </div>
          )}

          {/* Search Results */}
          {query && Object.keys(groupedResults).length > 0 && (
            <div className="space-y-6">
              {Object.entries(groupedResults).map(([type, items]) => (
                <div key={type} className="space-y-3">
                  <div className="flex items-center gap-2 px-1">
                    <h2 className="text-lg font-semibold text-gray-900">
                      {typeLabels[type] || type}
                    </h2>
                    <Badge variant="secondary" className="text-xs">
                      {items.length}
                    </Badge>
                  </div>
                  {items.map((result) => (
                    <Card
                      key={result.id}
                      className="p-4 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => handleResultClick(result)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="text-2xl flex-shrink-0">{result.icon}</div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 text-base">{result.title}</h3>
                          <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                            {result.description}
                          </p>
                          <div className="flex items-center gap-3 mt-2 flex-wrap">
                            <Badge variant="outline" className="text-xs">
                              {result.category}
                            </Badge>
                            {result.metadata?.district && (
                              <span className="text-xs text-gray-500 flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {result.metadata.district}
                              </span>
                            )}
                            {result.metadata?.distance && (
                              <span className="text-xs text-gray-500">
                                {result.metadata.distance}
                              </span>
                            )}
                            {result.metadata?.rating && (
                              <span className="text-xs text-gray-500 flex items-center gap-1">
                                <Star className="w-3.5 h-3.5 shrink-0" aria-hidden />
                                {result.metadata.rating}
                              </span>
                            )}
                            {result.metadata?.status && (
                              <Badge
                                variant={
                                  result.metadata.status === "operando" ? "default" : "secondary"
                                }
                                className="text-xs"
                              >
                                {result.metadata.status}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* No Results */}
          {query && results.length === 0 && !loadingSuggestions && (
            <div className="text-center py-12 space-y-4">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                <SearchIcon className="w-8 h-8 text-gray-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Nenhum resultado encontrado</h3>
                <p className="text-gray-500 mt-1">
                  Tente buscar por outros termos ou explore as categorias
                </p>
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
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Comece a explorar</h3>
              <p className="text-sm text-gray-500 max-w-sm mx-auto mb-6">
                Encontre vereadores, audiências públicas, serviços próximos e muito mais
              </p>

              {/* Buscas Populares */}
              <div className="flex flex-wrap gap-2 justify-center max-w-md mx-auto">
                <button
                  onClick={() => setQuery("UBS")}
                  className="px-4 py-2 text-sm bg-white border border-gray-200 text-gray-700 rounded-full hover:border-primary hover:text-primary transition-all"
                >
                  UBS próximas
                </button>
                <button
                  onClick={() => setQuery("Transporte")}
                  className="px-4 py-2 text-sm bg-white border border-gray-200 text-gray-700 rounded-full hover:border-primary hover:text-primary transition-all"
                >
                  Transporte
                </button>
                <button
                  onClick={() => setQuery("Buraco")}
                  className="px-4 py-2 text-sm bg-white border border-gray-200 text-gray-700 rounded-full hover:border-primary hover:text-primary transition-all"
                >
                  Relatos urbanos
                </button>
                <button
                  onClick={() => setQuery("Recomendações")}
                  className="px-4 py-2 text-sm bg-white border border-gray-200 text-gray-700 rounded-full hover:border-primary hover:text-primary transition-all"
                >
                  Recomendações
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
