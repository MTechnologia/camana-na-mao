import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Calendar, MapPin, Users, Clock, Building2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import PageHeader from "@/components/ui/page-header";

interface Audiencia {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  theme: string;
  participants: number;
  status: "upcoming" | "ongoing" | "finished";
  organizer: string;
}

const mockAudiencias: Audiencia[] = [
  {
    id: "1",
    title: "Mobilidade Urbana na Zona Leste",
    description: "Discussão sobre melhorias no transporte público e ciclovias na região da Zona Leste de São Paulo.",
    date: "2024-12-15",
    time: "14:00",
    location: "Auditório da Câmara Municipal - Viaduto Jacareí",
    theme: "Mobilidade",
    participants: 45,
    status: "upcoming",
    organizer: "Comissão de Trânsito e Transporte",
  },
  {
    id: "2",
    title: "Educação Integral nas Escolas Municipais",
    description: "Debate sobre a implementação do programa de educação integral nas escolas da rede municipal.",
    date: "2024-12-18",
    time: "10:00",
    location: "Plenário 1º de Maio",
    theme: "Educação",
    participants: 67,
    status: "upcoming",
    organizer: "Comissão de Educação",
  },
  {
    id: "3",
    title: "Investimentos em UBS e Hospitais",
    description: "Apresentação do plano de investimentos em Unidades Básicas de Saúde e hospitais municipais.",
    date: "2024-12-20",
    time: "15:30",
    location: "Auditório Prestes Maia",
    theme: "Saúde",
    participants: 89,
    status: "upcoming",
    organizer: "Comissão de Saúde",
  },
  {
    id: "4",
    title: "Preservação de Parques Urbanos",
    description: "Discussão sobre políticas de preservação e manutenção dos parques urbanos da cidade.",
    date: "2024-12-22",
    time: "09:00",
    location: "Sala das Comissões",
    theme: "Meio Ambiente",
    participants: 34,
    status: "upcoming",
    organizer: "Comissão de Meio Ambiente",
  },
];

const themeColors: Record<string, string> = {
  "Mobilidade": "bg-blue-500/10 text-blue-600 border-blue-500/20",
  "Educação": "bg-purple-500/10 text-purple-600 border-purple-500/20",
  "Saúde": "bg-red-500/10 text-red-600 border-red-500/20",
  "Meio Ambiente": "bg-green-500/10 text-green-600 border-green-500/20",
  "Cultura": "bg-pink-500/10 text-pink-600 border-pink-500/20",
  "Segurança": "bg-orange-500/10 text-orange-600 border-orange-500/20",
};

const AudienciaDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const audiencia = mockAudiencias.find(a => a.id === id);

  if (!audiencia) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader title="Audiência não encontrada" backTo="/audiencias" />
        <div className="pt-[60px] p-6 text-center">
          <p className="text-muted-foreground mb-4">A audiência solicitada não foi encontrada.</p>
          <Button onClick={() => navigate("/audiencias")}>Voltar para audiências</Button>
        </div>
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader title="Detalhes da Audiência" backTo="/audiencias" />
      
      <div className="pt-[60px] p-6 space-y-6">
        {/* Header com título e badge */}
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-2xl font-bold text-foreground">{audiencia.title}</h1>
            <Badge
              variant="outline"
              className={`border shrink-0 ${themeColors[audiencia.theme] || "bg-gray-500/10 text-gray-600 border-gray-500/20"}`}
            >
              {audiencia.theme}
            </Badge>
          </div>
          <p className="text-base text-muted-foreground">{audiencia.description}</p>
        </div>

        <Separator />

        {/* Informações principais */}
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Data</p>
              <p className="text-sm text-muted-foreground capitalize">
                {formatDate(audiencia.date)}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Horário</p>
              <p className="text-sm text-muted-foreground">{audiencia.time}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <MapPin className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Local</p>
              <p className="text-sm text-muted-foreground">{audiencia.location}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Organizador</p>
              <p className="text-sm text-muted-foreground">{audiencia.organizer}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Participantes</p>
              <p className="text-sm text-muted-foreground">
                {audiencia.participants} pessoas já se inscreveram
              </p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Como participar */}
        <div className="bg-muted/50 rounded-lg p-4 space-y-3">
          <h4 className="font-semibold text-foreground flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            Como participar
          </h4>
          <p className="text-sm text-muted-foreground">
            As audiências públicas são abertas a todos os cidadãos. Ao se inscrever você receberá:
          </p>
          <ul className="text-sm text-muted-foreground space-y-1 ml-4">
            <li>• Link de acesso à audiência</li>
            <li>• Materiais de apoio</li>
            <li>• Lembrete do evento</li>
          </ul>
        </div>

        {/* Observações legais */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>
            <strong>Fonte:</strong> Portal da Câmara Municipal de São Paulo
          </p>
          <p>
            <strong>Atualizado:</strong> Hoje às 10:30 (verificação a cada 15 minutos)
          </p>
          <p>
            <strong>Privacidade:</strong> Seus dados são protegidos conforme LGPD
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <Button variant="outline" onClick={() => navigate("/audiencias")} className="flex-1">
            Voltar
          </Button>
          <Button onClick={() => navigate(`/audiencias/${id}/participar`)} className="flex-1">
            <User className="h-4 w-4 mr-2" />
            Quero participar
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AudienciaDetailPage;
