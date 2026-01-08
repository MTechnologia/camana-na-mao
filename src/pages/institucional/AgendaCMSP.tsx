import { useState, useMemo } from "react";
import InstitutionalLayout from "@/components/institucional/InstitutionalLayout";
import ContentArticle from "@/components/institucional/ContentArticle";
import { Calendar, Clock, MapPin, Users, Search, X, CalendarPlus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QuickFilterPills } from "@/components/filters/QuickFilterPills";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

interface AgendaItem {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  type: "sessao" | "comissao" | "audiencia";
  participants?: string[];
}

const mockAgenda: AgendaItem[] = [
  {
    id: "1",
    title: "Sessão Plenária Ordinária",
    date: "2024-12-15",
    time: "14:00",
    location: "Plenário Juscelino Kubitschek",
    type: "sessao",
    participants: ["47 Vereadores"],
  },
  {
    id: "2",
    title: "Comissão de Mobilidade e Transporte",
    date: "2024-12-16",
    time: "10:00",
    location: "Sala das Comissões 1",
    type: "comissao",
    participants: ["7 Vereadores", "Especialistas convidados"],
  },
  {
    id: "3",
    title: "Audiência Pública - Educação Integral",
    date: "2024-12-18",
    time: "15:00",
    location: "Auditório Prestes Maia",
    type: "audiencia",
    participants: ["Cidadãos", "Comissão de Educação"],
  },
  {
    id: "4",
    title: "Comissão de Saúde",
    date: "2024-12-19",
    time: "09:00",
    location: "Sala das Comissões 2",
    type: "comissao",
    participants: ["5 Vereadores"],
  },
  {
    id: "5",
    title: "Sessão Extraordinária",
    date: "2024-12-20",
    time: "16:00",
    location: "Plenário Juscelino Kubitschek",
    type: "sessao",
    participants: ["55 Vereadores"],
  },
];

const typeLabels = {
  sessao: { label: "Sessão Plenária", color: "bg-blue-500/10 text-blue-600" },
  comissao: { label: "Comissão", color: "bg-purple-500/10 text-purple-600" },
  audiencia: { label: "Audiência Pública", color: "bg-green-500/10 text-green-600" },
};

const typeFilterOptions = [
  { value: "sessao", label: "Sessões" },
  { value: "comissao", label: "Comissões" },
  { value: "audiencia", label: "Audiências" },
];

const AgendaCMSP = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<AgendaItem | null>(null);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  };

  const formatShortDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const handleAddToCalendar = (item: AgendaItem) => {
    const startDate = new Date(`${item.date}T${item.time}:00`);
    const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000); // +2 hours

    const formatGoogleDate = (d: Date) =>
      d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

    const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
      item.title
    )}&dates=${formatGoogleDate(startDate)}/${formatGoogleDate(
      endDate
    )}&location=${encodeURIComponent(item.location)}&details=${encodeURIComponent(
      `Evento da Câmara Municipal de São Paulo\n\nLocal: ${item.location}`
    )}`;

    window.open(googleUrl, "_blank");
    toast.success("Abrindo Google Calendar...");
  };

  const filteredAgenda = useMemo(() => {
    return mockAgenda.filter((item) => {
      // Search filter
      const matchesSearch = searchQuery === "" || 
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.location.toLowerCase().includes(searchQuery.toLowerCase());

      // Type filter
      const matchesType = selectedTypes.length === 0 || selectedTypes.includes(item.type);

      return matchesSearch && matchesType;
    });
  }, [searchQuery, selectedTypes]);

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
        date="Atualizado hoje às 10:30"
        readTime="Verificação a cada 15 minutos"
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
            {filteredAgenda.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  Nenhum evento encontrado com os filtros selecionados
                </p>
              </div>
            ) : (
              filteredAgenda.map((item) => {
                const typeInfo = typeLabels[item.type];
                return (
                  <Card 
                    key={item.id} 
                    onClick={() => setSelectedEvent(item)}
                    className="p-4 hover:shadow-md transition-all cursor-pointer relative active:scale-[0.99]"
                  >
                    <div className="space-y-3">
                      <Badge
                        variant="outline"
                        className={`mb-2 inline-block ${typeInfo.color}`}
                      >
                        {typeInfo.label}
                      </Badge>
                      <h3 className="font-semibold text-foreground mb-2">
                        {item.title}
                      </h3>

                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span className="capitalize">{formatDate(item.date)}</span>
                        </div>

                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>{item.time}</span>
                        </div>

                        <div className="flex items-center gap-2 text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          <span>{item.location}</span>
                        </div>

                        {item.participants && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Users className="h-4 w-4" />
                            <span>{item.participants.join(", ")}</span>
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
          <p><strong>Atualização:</strong> A cada 15 minutos</p>
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
                  className={`w-fit ${typeLabels[selectedEvent.type].color}`}
                >
                  {typeLabels[selectedEvent.type].label}
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
                    <p className="font-medium capitalize">{formatDate(selectedEvent.date)}</p>
                    <p className="text-sm text-muted-foreground">{formatShortDate(selectedEvent.date)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Horário</p>
                    <p className="font-medium">{selectedEvent.time}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Local</p>
                    <p className="font-medium">{selectedEvent.location}</p>
                  </div>
                </div>

                {selectedEvent.participants && selectedEvent.participants.length > 0 && (
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Participantes</p>
                      <p className="font-medium">{selectedEvent.participants.join(", ")}</p>
                    </div>
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
