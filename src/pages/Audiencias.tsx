import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Calendar, MapPin, Users, Clock, Filter, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import FloatingNavbar from "@/components/FloatingNavbar";
import AudienciaCard from "@/components/audiencias/AudienciaCard";
import AudienciaDetailDialog from "@/components/audiencias/AudienciaDetailDialog";
import EmailInviteDialog from "@/components/audiencias/EmailInviteDialog";
import InterestSelectionDialog from "@/components/audiencias/InterestSelectionDialog";

export interface Audiencia {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  theme: string;
  participants: number;
  status: 'upcoming' | 'ongoing' | 'finished';
  organizer: string;
}

const Audiencias = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAudiencia, setSelectedAudiencia] = useState<Audiencia | null>(null);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [showInterestDialog, setShowInterestDialog] = useState(false);

  // Mock data - audiências públicas
  const audiencias: Audiencia[] = [
    {
      id: "1",
      title: "Mobilidade Urbana na Zona Leste",
      description: "Discussão sobre melhorias no transporte público e ciclovias na região da Zona Leste de São Paulo.",
      date: "2025-12-15",
      time: "14:00",
      location: "Auditório da Câmara Municipal - Viaduto Jacareí, 100",
      theme: "Mobilidade",
      participants: 45,
      status: "upcoming",
      organizer: "Comissão de Trânsito e Mobilidade"
    },
    {
      id: "2",
      title: "Educação Digital nas Escolas Públicas",
      description: "Debate sobre a implementação de tecnologias digitais e inclusão digital nas escolas da rede municipal.",
      date: "2025-12-18",
      time: "10:00",
      location: "Plenário Juscelino Kubitschek",
      theme: "Educação",
      participants: 78,
      status: "upcoming",
      organizer: "Comissão de Educação"
    },
    {
      id: "3",
      title: "Saúde Preventiva e UBS",
      description: "Discussão sobre ampliação e modernização das Unidades Básicas de Saúde nos bairros periféricos.",
      date: "2025-12-20",
      time: "16:00",
      location: "Auditório Prestes Maia",
      theme: "Saúde",
      participants: 62,
      status: "upcoming",
      organizer: "Comissão de Saúde"
    },
    {
      id: "4",
      title: "Sustentabilidade e Meio Ambiente",
      description: "Políticas públicas para gestão de resíduos sólidos e criação de áreas verdes na cidade.",
      date: "2025-12-22",
      time: "09:00",
      location: "Sala das Comissões",
      theme: "Meio Ambiente",
      participants: 34,
      status: "upcoming",
      organizer: "Comissão de Meio Ambiente"
    }
  ];

  const filteredAudiencias = audiencias.filter(
    (audiencia) =>
      audiencia.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      audiencia.theme.toLowerCase().includes(searchQuery.toLowerCase()) ||
      audiencia.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCardClick = (audiencia: Audiencia) => {
    setSelectedAudiencia(audiencia);
  };

  const handleRequestInvite = () => {
    setShowEmailDialog(true);
  };

  const handleEmailInviteSent = () => {
    setShowEmailDialog(false);
    setShowInterestDialog(true);
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/home")}
              className="hover:bg-muted"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-xl font-semibold text-foreground">Audiências Públicas</h1>
              <p className="text-sm text-muted-foreground">Participe e contribua</p>
            </div>
          </div>
        </div>
      </header>

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
          <Button variant="outline" size="icon" className="border-border">
            <Filter className="h-5 w-5" />
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4 animate-fade-in" style={{ animationDelay: "50ms" }}>
          <Card className="p-4 bg-card border-border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{audiencias.length}</p>
                <p className="text-xs text-muted-foreground">Próximas</p>
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
                  {audiencias.reduce((sum, a) => sum + a.participants, 0)}
                </p>
                <p className="text-xs text-muted-foreground">Inscritos</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Audiências List */}
        <div className="space-y-4">
          {filteredAudiencias.length > 0 ? (
            filteredAudiencias.map((audiencia, index) => (
              <div
                key={audiencia.id}
                className="animate-fade-in"
                style={{ animationDelay: `${100 + index * 50}ms` }}
              >
                <AudienciaCard audiencia={audiencia} onClick={() => handleCardClick(audiencia)} />
              </div>
            ))
          ) : (
            <Card className="p-12 text-center border-border animate-fade-in">
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
      </div>

      {/* Dialogs */}
      {selectedAudiencia && (
        <AudienciaDetailDialog
          audiencia={selectedAudiencia}
          open={!!selectedAudiencia}
          onClose={() => setSelectedAudiencia(null)}
          onRequestInvite={handleRequestInvite}
        />
      )}

      <EmailInviteDialog
        open={showEmailDialog}
        onClose={() => setShowEmailDialog(false)}
        onSuccess={handleEmailInviteSent}
        audienciaTitle={selectedAudiencia?.title || ""}
      />

      <InterestSelectionDialog
        open={showInterestDialog}
        onClose={() => setShowInterestDialog(false)}
      />

      <FloatingNavbar />
    </div>
  );
};

export default Audiencias;
