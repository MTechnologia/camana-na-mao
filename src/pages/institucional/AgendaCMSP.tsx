import { useState, useMemo } from "react";
import InstitutionalLayout from "@/components/institucional/InstitutionalLayout";
import ContentArticle from "@/components/institucional/ContentArticle";
import { Calendar, Clock, MapPin, Users, Search, X, CalendarPlus, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QuickFilterPills } from "@/components/filters/QuickFilterPills";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useAgenda, AgendaItem, getEventTypeConfig } from "@/hooks/useAgenda";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

const typeFilterOptions = [
  { value: "sessao", label: "Sessões" },
  { value: "comissao", label: "Comissões" },
  { value: "audiencia", label: "Audiências" },
  { value: "cerimonia", label: "Cerimônias" },
];

const AgendaCMSP = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<AgendaItem | null>(null);

  const { data: agendaData = [], isLoading, error, refetch } = useAgenda();

  const formatDate = (dateStr: string) => {
    try {
      const date = parseISO(dateStr);
      return format(date, "EEEE, d 'de' MMMM", { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  const formatShortDate = (dateStr: string) => {
    try {
      const date = parseISO(dateStr);
      return format(date, "dd/MM/yyyy");
    } catch {
      return dateStr;
    }
  };

  const handleAddToCalendar = (item: AgendaItem) => {
    const startDate = new Date(`${item.eventDate}T${item.eventTime || "10:00"}:00`);
    const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000); // +2 hours

    const formatGoogleDate = (d: Date) =>
      d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

    const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
      item.title
    )}&dates=${formatGoogleDate(startDate)}/${formatGoogleDate(
      endDate
    )}&location=${encodeURIComponent(item.location)}&details=${encodeURIComponent(
      `Evento da Câmara Municipal de São Paulo\n\nLocal: ${item.location}\n\n${item.description}`
    )}`;

    window.open(googleUrl, "_blank");
    toast.success("Abrindo Google Calendar...");
  };

  const filteredAgenda = useMemo(() => {
    return agendaData.filter((item) => {
      // Search filter
      const matchesSearch = searchQuery === "" || 
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase());

      // Type filter
      const matchesType = selectedTypes.length === 0 || selectedTypes.includes(item.eventType);

      return matchesSearch && matchesType;
    });
  }, [agendaData, searchQuery, selectedTypes]);

  const hasActiveFilters = searchQuery !== "" || selectedTypes.length > 0;

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedTypes([]);
  };

  return (
    <InstitutionalLayout
      title="Agenda CMSP"
      category="Institucional"
    >
      <ContentArticle
        title="Agenda da Câmara Municipal"
        date="Atualizado automaticamente"
        readTime="Fonte: Portal da Câmara"
      >
        <p className="text-muted-foreground">
          Acompanhe todas as atividades legislativas da Câmara Municipal de São Paulo.
          Sessões plenárias, reuniões de comissões e audiências públicas.
        </p>

        {/* Filters Section */}
        <div className="mt-6 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar evento..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Type Pills */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground">Tipo:</span>
            <QuickFilterPills
              options={typeFilterOptions}
              selected={selectedTypes}
              onChange={(value) => setSelectedTypes(value as string[])}
              mode="multi"
              showAllOption
              allLabel="Todos"
              size="sm"
            />
          </div>

          {/* Clear filters */}
          {hasActiveFilters && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="gap-1">
                {filteredAgenda.length} resultado{filteredAgenda.length !== 1 ? 's' : ''}
              </Badge>
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-xs">
                <X className="h-3 w-3 mr-1" />
                Limpar filtros
              </Button>
            </div>
          )}
        </div>

        <Tabs defaultValue="proximos" className="mt-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="proximos">Próximos</TabsTrigger>
            <TabsTrigger value="mes">Este mês</TabsTrigger>
          </TabsList>

          <TabsContent value="proximos" className="space-y-4 mt-4">
            {/* Loading State */}
            {isLoading && (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="p-4">
                    <Skeleton className="h-5 w-24 mb-2" />
                    <Skeleton className="h-6 w-3/4 mb-3" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-4 w-1/3" />
                      <Skeleton className="h-4 w-2/3" />
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {/* Error State */}
            {error && !isLoading && (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">
                  Não foi possível carregar a agenda
                </p>
                <Button variant="outline" onClick={() => refetch()}>
                  <Loader2 className="h-4 w-4 mr-2" />
                  Tentar novamente
                </Button>
              </div>
            )}

            {/* Empty State */}
            {!isLoading && !error && filteredAgenda.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  {hasActiveFilters
                    ? "Nenhum evento encontrado com os filtros selecionados"
                    : "Nenhum evento programado no momento"}
                </p>
                {hasActiveFilters && (
                  <Button variant="ghost" onClick={clearFilters} className="mt-4">
                    Limpar filtros
                  </Button>
                )}
              </div>
            )}

            {/* Events List */}
            {!isLoading && !error && filteredAgenda.length > 0 && (
              filteredAgenda.map((item) => {
                const typeConfig = getEventTypeConfig(item.eventType);
                return (
                  <Card 
                    key={item.id} 
                    onClick={() => setSelectedEvent(item)}
                    className="p-4 hover:shadow-md transition-all cursor-pointer relative active:scale-[0.99]"
                  >
                    <div className="space-y-3">
                      <Badge
                        variant="outline"
                        className={`mb-2 inline-block ${typeConfig.color}`}
                      >
                        {typeConfig.label}
                      </Badge>
                      <h3 className="font-semibold text-foreground mb-2">
                        {item.title}
                      </h3>

                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span className="capitalize">{formatDate(item.eventDate)}</span>
                        </div>

                        {item.eventTime && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            <span>{item.eventTime}</span>
                          </div>
                        )}

                        <div className="flex items-center gap-2 text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          <span>{item.location}</span>
                        </div>

                        {item.organizer && item.organizer !== 'Câmara Municipal de São Paulo' && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Users className="h-4 w-4" />
                            <span>{item.organizer}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </TabsContent>

          <TabsContent value="mes" className="mt-4">
            <p className="text-center text-muted-foreground py-8">
              Visualização mensal em desenvolvimento
            </p>
          </TabsContent>
        </Tabs>

        <div className="mt-8 p-4 bg-muted/50 rounded-lg text-sm text-muted-foreground">
          <p><strong>Fonte:</strong> Portal da Câmara Municipal de São Paulo</p>
          <p><strong>Atualização:</strong> Automática via API</p>
          <p><strong>Observação:</strong> A agenda pode sofrer alterações. Confirme sempre no dia.</p>
        </div>
      </ContentArticle>

      {/* Event Detail Drawer */}
      <Sheet open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <SheetContent side="bottom" className="h-auto max-h-[85vh] rounded-t-2xl">
          {selectedEvent && (
            <>
              <SheetHeader className="text-left pb-4">
                <Badge
                  variant="outline"
                  className={`w-fit ${getEventTypeConfig(selectedEvent.eventType).color}`}
                >
                  {getEventTypeConfig(selectedEvent.eventType).label}
                </Badge>
                <SheetTitle className="text-xl">
                  {selectedEvent.title}
                </SheetTitle>
                <SheetDescription>
                  Detalhes do evento da Câmara Municipal
                </SheetDescription>
              </SheetHeader>

              <Separator className="my-4" />

              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Data</p>
                    <p className="font-medium capitalize">{formatDate(selectedEvent.eventDate)}</p>
                    <p className="text-sm text-muted-foreground">{formatShortDate(selectedEvent.eventDate)}</p>
                  </div>
                </div>

                {selectedEvent.eventTime && (
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Clock className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Horário</p>
                      <p className="font-medium">{selectedEvent.eventTime}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Local</p>
                    <p className="font-medium">{selectedEvent.location}</p>
                  </div>
                </div>

                {selectedEvent.organizer && (
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Organizador</p>
                      <p className="font-medium">{selectedEvent.organizer}</p>
                    </div>
                  </div>
                )}

                {selectedEvent.description && (
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Descrição</p>
                    <p className="text-sm">{selectedEvent.description}</p>
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-6 pb-4">
                <Button
                  className="flex-1"
                  onClick={() => handleAddToCalendar(selectedEvent)}
                >
                  <CalendarPlus className="h-4 w-4 mr-2" />
                  Adicionar ao Calendário
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </InstitutionalLayout>
  );
};

export default AgendaCMSP;
