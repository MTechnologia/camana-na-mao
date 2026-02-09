import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Filter, Calendar, Users, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import PageHeader from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import AudienciaFilters from "@/components/audiencias/AudienciaFilters";
import { format, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type AudienciaRow = {
  id: string;
  titulo: string;
  descricao: string | null;
  data: string;
  hora: string;
  local: string;
  tema: string;
  status: string;
  vagas_disponiveis: number | null;
  inscricoes_abertas: boolean | null;
};

const Audiencias = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    themes: [] as string[],
    status: "all",
    period: "all",
    year: "all",
  });

  const { data: audienciasData = [], isLoading, error, refetch } = useQuery({
    queryKey: ["audiencias"],
    queryFn: async (): Promise<AudienciaRow[]> => {
      const { data, error } = await supabase
        .from("audiencias")
        .select("id, titulo, descricao, data, hora, local, tema, status, vagas_disponiveis, inscricoes_abertas")
        .order("data", { ascending: false });

      if (error) throw error;
      return (data || []) as AudienciaRow[];
    },
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });

  const formatDate = (dateStr: string) => {
    try {
      const date = parseISO(dateStr);
      return format(date, "dd/MM/yyyy");
    } catch {
      return dateStr;
    }
  };

  const formatLongDate = (dateStr: string) => {
    try {
      const date = parseISO(dateStr);
      return format(date, "EEEE, d 'de' MMMM", { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  const filteredAudiencias = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];

    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const nextMonthStart = startOfMonth(addMonths(now, 1));
    const nextMonthEnd = endOfMonth(addMonths(now, 1));

    return audienciasData.filter((a) => {
      const title = (a.titulo || "").toLowerCase();
      const desc = (a.descricao || "").toLowerCase();
      const tema = (a.tema || "").toLowerCase();
      const status = (a.status || "").toLowerCase();
      const q = searchQuery.toLowerCase().trim();

      // Search filter
      const matchesSearch =
        !q || title.includes(q) || desc.includes(q) || tema.includes(q) || status.includes(q);

      // Theme filter: match when selected theme appears in tema, título or descrição (case insensitive)
      const matchesTheme =
        filters.themes.length === 0 ||
        filters.themes.some(
          (selected) =>
            tema.includes(selected.toLowerCase()) ||
            title.includes(selected.toLowerCase()) ||
            desc.includes(selected.toLowerCase())
        );

      // Status filter (heuristic + date fallback)
      const isFinished = a.data < todayStr || status.includes("encerr") || status.includes("final");
      const isOngoing = status.includes("andamento") || status.includes("em andamento");
      const isUpcoming = !isFinished && !isOngoing && a.data >= todayStr;

      const matchesStatus =
        filters.status === "all" ||
        (filters.status === "finished" && isFinished) ||
        (filters.status === "ongoing" && isOngoing) ||
        (filters.status === "upcoming" && isUpcoming);

      // Period filter
      const dateObj = new Date(a.data);
      const matchesPeriod =
        filters.period === "all" ||
        (filters.period === "week" && dateObj >= weekStart && dateObj <= weekEnd) ||
        (filters.period === "month" && dateObj >= monthStart && dateObj <= monthEnd) ||
        (filters.period === "next-month" && dateObj >= nextMonthStart && dateObj <= nextMonthEnd);

      // Year filter
      const itemYear = a.data ? String(a.data).slice(0, 4) : "";
      const matchesYear =
        filters.year === "all" || itemYear === filters.year;

      return matchesSearch && matchesTheme && matchesStatus && matchesPeriod && matchesYear;
    });
  }, [audienciasData, searchQuery, filters]);

  const handleCardClick = (item: AudienciaRow) => {
    navigate(`/audiencias/${item.id}`);
  };

  const activeFiltersCount =
    filters.themes.length +
    (filters.status !== "all" ? 1 : 0) +
    (filters.period !== "all" ? 1 : 0) +
    (filters.year !== "all" ? 1 : 0);

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader title="Audiências Públicas" backTo="/" />
      
      <div className="pt-[60px]">
        <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
          {/* Search and Filter Bar */}
          <div className="flex gap-3 animate-fade-in">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Buscar por tema, título..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-muted/50 border-border"
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowFilters(true)}
              className="relative"
            >
              <Filter className="h-4 w-4" />
              {activeFiltersCount > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
                >
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in" style={{ animationDelay: "50ms" }}>
            <Card className="p-4 bg-card border-border">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {isLoading ? "-" : filteredAudiencias.length}
                  </p>
                  <p className="text-xs text-muted-foreground">Próximos</p>
                </div>
              </div>
            </Card>
            <Card className="p-4 bg-card border-border">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {isLoading ? "-" : audienciasData.length}
                  </p>
                  <p className="text-xs text-muted-foreground">Audiências</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="p-4">
                  <Skeleton className="h-5 w-20 mb-3" />
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-full mb-4" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-1/3" />
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Error State */}
          {error && !isLoading && (
            <Card className="p-12 text-center border-border">
              <div className="flex flex-col items-center gap-4">
                <div className="p-4 bg-muted rounded-full">
                  <Calendar className="h-8 w-8 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">
                    Não foi possível carregar a agenda
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Tente novamente em alguns instantes
                  </p>
                </div>
                <Button variant="outline" onClick={() => refetch()}>
                  <Loader2 className="h-4 w-4 mr-2" />
                  Tentar novamente
                </Button>
              </div>
            </Card>
          )}

          {/* Audiências List */}
          {!isLoading && !error && (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredAudiencias.length > 0 ? (
                filteredAudiencias.map((item, index) => {
                  return (
                    <div
                      key={item.id}
                      className="animate-fade-in"
                      style={{ animationDelay: `${100 + index * 50}ms` }}
                    >
                      <Card 
                        className="p-4 hover:shadow-md transition-all cursor-pointer h-full"
                        onClick={() => handleCardClick(item)}
                      >
                        <div className="space-y-3">
                          <Badge
                            variant="outline"
                            className="bg-green-100 text-green-800"
                          >
                            Audiência
                          </Badge>
                          
                          <h3 className="font-semibold text-foreground line-clamp-2">
                            {item.titulo}
                          </h3>
                          
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {item.descricao || `Audiência pública sobre ${item.tema}`}
                          </p>
                          
                          <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5" />
                              <span className="capitalize">{formatDate(item.data)}</span>
                            </div>
                            {item.hora && <span>{item.hora.slice(0, 5)}</span>}
                          </div>
                          
                          <p className="text-xs text-muted-foreground truncate">
                            📍 {item.local}
                          </p>
                        </div>
                      </Card>
                    </div>
                  );
                })
              ) : (
                <Card className="p-12 text-center border-border animate-fade-in col-span-full">
                  <div className="flex flex-col items-center gap-4">
                    <div className="p-4 bg-muted rounded-full">
                      <Calendar className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground mb-1">
                        Nenhuma audiência encontrada
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Tente ajustar os filtros ou verifique novamente mais tarde
                      </p>
                    </div>
                    <Button variant="outline" onClick={() => setSearchQuery("")}>
                      Limpar busca
                    </Button>
                  </div>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Filters Sheet */}
      <AudienciaFilters
        open={showFilters}
        onOpenChange={setShowFilters}
        filters={filters}
        onFiltersChange={setFilters}
      />
    </div>
  );
};

export default Audiencias;
