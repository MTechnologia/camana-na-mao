import InstitutionalLayout from "@/components/institucional/InstitutionalLayout";
import ContentArticle from "@/components/institucional/ContentArticle";
import { Calendar, Clock, MapPin, Users, Heart } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFavorites } from "@/contexts/FavoritesContext";

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
];

const typeLabels = {
  sessao: { label: "Sessão Plenária", color: "bg-blue-500/10 text-blue-600" },
  comissao: { label: "Comissão", color: "bg-purple-500/10 text-purple-600" },
  audiencia: { label: "Audiência Pública", color: "bg-green-500/10 text-green-600" },
};

const AgendaCMSP = () => {
  const { toggleFavorite, isFavorited } = useFavorites();

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
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

          <Tabs defaultValue="proximos" className="mt-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="proximos">Próximos</TabsTrigger>
              <TabsTrigger value="mes">Este mês</TabsTrigger>
            </TabsList>

            <TabsContent value="proximos" className="space-y-4 mt-4">
              {mockAgenda.map((item) => {
                const typeInfo = typeLabels[item.type];
                return (
                  <Card key={item.id} className="p-4 hover:shadow-md transition-shadow relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite({
                          id: `agenda-${item.id}`,
                          type: 'agenda',
                          title: item.title,
                          subtitle: typeInfo.label,
                          path: `/institucional/agenda`,
                          metadata: { date: item.date, time: item.time, location: item.location },
                        });
                      }}
                      className="absolute top-3 right-3 p-2 hover:bg-muted/50 rounded-full transition-colors z-10"
                      aria-label="Favoritar evento da agenda"
                    >
                      <Heart
                        className={`h-5 w-5 ${
                          isFavorited(`agenda-${item.id}`)
                            ? "fill-pink-500 text-pink-500"
                            : "text-muted-foreground"
                        }`}
                      />
                    </button>
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
              })}
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
      </InstitutionalLayout>
  );
};

export default AgendaCMSP;
