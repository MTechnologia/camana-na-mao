import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { 
  Building2, 
  Bus, 
  MessageSquare, 
  ChevronLeft, 
  Loader2,
  AlertCircle,
  Search,
  Plus,
  Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import PageHeader from "@/components/ui/page-header";
import { useServiceSubscriptions } from "@/hooks/useServiceSubscriptions";
import { useTransportSubscriptions } from "@/hooks/useTransportSubscriptions";
import { useAudienciaTopicSubscriptions } from "@/hooks/useAudienciaTopicSubscriptions";
import { useTransportLines } from "@/hooks/useTransportLines";
import { useAuth } from "@/contexts/AuthContext";

const COMMON_TOPICS = [
  "Mobilidade", 
  "Educação", 
  "Saúde", 
  "Meio Ambiente", 
  "Cultura", 
  "Segurança",
  "Urbanismo",
  "Esportes"
];

export default function SubscriptionsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const { 
    subscriptions: serviceSubs, 
    loading: loadingServices, 
    toggleSubscription: toggleService 
  } = useServiceSubscriptions();
  
  const { 
    subscriptions: transportSubs, 
    loading: loadingTransport, 
    toggleSubscription: toggleTransport 
  } = useTransportSubscriptions();
  
  const { 
    subscriptions: topicSubs, 
    loading: loadingTopics, 
    toggleSubscription: toggleTopic 
  } = useAudienciaTopicSubscriptions();

  const { lines: allLines, loading: loadingLines } = useTransportLines();

  const [transportSearch, setTransportSearch] = useState("");
  
  const filteredLines = useMemo(() => {
    if (!transportSearch || transportSearch.length < 2) return [];
    
    // Filtra para não mostrar linhas que o usuário já segue, evitando duplicidade em tela
    const subscribedLineIds = new Set(transportSubs.map(s => s.line_id));
    
    return allLines.filter(line => 
      !subscribedLineIds.has(line.id) && (
        line.line_code.toLowerCase().includes(transportSearch.toLowerCase()) ||
        line.line_name.toLowerCase().includes(transportSearch.toLowerCase())
      )
    ).slice(0, 5);
  }, [allLines, transportSearch, transportSubs]);

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <h1 className="text-xl font-bold mb-2">Acesso restrito</h1>
        <p className="text-muted-foreground mb-6">Você precisa estar logado para gerenciar suas inscrições.</p>
        <Button onClick={() => navigate("/login")}>Entrar</Button>
      </div>
    );
  }

  const isLoading = loadingServices || loadingTransport || loadingTopics;

  const isServiceSubscribed = (serviceId: string) => serviceSubs.some(s => s.service_id === serviceId);
  const isTransportSubscribed = (lineId: string) =>
    transportSubs.some((s) => s.line_id === lineId && s.subscription_type === "alert");
  const isTopicSubscribed = (tema: string) => topicSubs.some(s => s.tema === tema);

  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader 
        title="Central de Inscrições" 
        backTo="/perfil"
      />
      
      <div className="pt-[70px] px-4 max-w-2xl mx-auto space-y-8">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">
            Gerencie aqui todos os alertas e notificações que você recebe sobre serviços, transporte e temas legislativos.
          </p>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Carregando suas preferências...</p>
          </div>
        ) : (
          <>
            {/* Seção: Serviços */}
            <section className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  <h2 className="font-semibold text-lg">Serviços Públicos</h2>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-primary text-xs h-8"
                  onClick={() => navigate("/servicos-proximos")}
                >
                  <Search className="h-3 w-3 mr-1" />
                  Buscar serviços
                </Button>
              </div>
              <Card>
                <CardContent className="p-0">
                  {serviceSubs.length === 0 ? (
                    <div className="p-8 text-center space-y-3">
                      <p className="text-sm text-muted-foreground">
                        Você não está seguindo nenhum equipamento público no momento.
                      </p>
                      <Button variant="outline" size="sm" onClick={() => navigate("/servicos-proximos")}>
                        Explorar serviços próximos
                      </Button>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {serviceSubs.map((sub) => (
                        <div key={sub.id} className="flex items-center justify-between p-4">
                          <div className="flex-1 min-w-0 mr-4">
                            <p className="font-medium text-sm truncate">{sub.public_services?.name || "Serviço"}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {sub.public_services?.district}
                            </p>
                          </div>
                          <Switch 
                            checked={true} 
                            onCheckedChange={() => toggleService(sub.service_id, false)}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </section>

            {/* Seção: Linhas de Transporte */}
            <section className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <Bus className="h-5 w-5 text-primary" />
                <h2 className="font-semibold text-lg">Linhas de Transporte</h2>
              </div>
              
              <div className="px-1">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar linha para seguir (ex: 8500-10 ou Jabaquara)"
                    className="pl-9 text-sm"
                    value={transportSearch}
                    onChange={(e) => setTransportSearch(e.target.value)}
                  />
                </div>
                
                {filteredLines.length > 0 && (
                  <Card className="mt-2 shadow-sm">
                    <CardContent className="p-0 divide-y">
                      {filteredLines.map(line => (
                        <div key={line.id} className="flex items-center justify-between p-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{line.line_code} - {line.line_name}</p>
                            <p className="text-[10px] text-muted-foreground uppercase">{line.line_type}</p>
                          </div>
                          <Switch 
                            checked={isTransportSubscribed(line.id)}
                            onCheckedChange={(checked) => toggleTransport(line.id, checked)}
                          />
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </div>

              <Card>
                <CardContent className="p-0">
                  {transportSubs.length === 0 ? (
                    <div className="p-8 text-center">
                      <p className="text-sm text-muted-foreground">
                        Você não está seguindo nenhuma linha de transporte no momento. 
                        Use a busca acima para encontrar uma linha.
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {transportSubs.map((sub) => (
                        <div key={sub.id} className="flex items-center justify-between p-4">
                          <div className="flex-1 min-w-0 mr-4">
                            <p className="font-medium text-sm">
                              {sub.transport_lines?.line_code} - {sub.transport_lines?.line_name}
                            </p>
                            <p className="text-xs text-muted-foreground capitalize">
                              {sub.transport_lines?.line_type}
                            </p>
                          </div>
                          <Switch 
                            checked={true} 
                            onCheckedChange={() => toggleTransport(sub.line_id!, false)}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </section>

            {/* Seção: Temas de Audiência */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 px-1">
                <MessageSquare className="h-5 w-5 text-primary" />
                <h2 className="font-semibold text-lg">Temas de Audiência</h2>
              </div>

              <div className="grid grid-cols-2 gap-2 px-1">
                {COMMON_TOPICS.map(tema => {
                  const active = isTopicSubscribed(tema);
                  return (
                    <Button
                      key={tema}
                      variant={active ? "default" : "outline"}
                      className={cn(
                        "justify-between h-auto py-3 px-4 font-normal text-sm border-muted-foreground/20",
                        active && "bg-primary/10 text-primary border-primary/30 hover:bg-primary/20"
                      )}
                      onClick={() => toggleTopic(tema, !active)}
                    >
                      {tema}
                      {active ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4 text-muted-foreground" />}
                    </Button>
                  );
                })}
              </div>

              <Card>
                <CardContent className="p-0">
                  {topicSubs.length === 0 ? (
                    <div className="p-8 text-center">
                      <p className="text-sm text-muted-foreground">
                        Você não tem temas de interesse cadastrados para alertas.
                        Selecione temas acima para ser notificado sobre novas audiências.
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {topicSubs.map((sub) => (
                        <div key={sub.id} className="flex items-center justify-between p-4">
                          <div className="flex-1 min-w-0 mr-4">
                            <p className="font-medium text-sm">{sub.tema}</p>
                            <p className="text-xs text-muted-foreground">
                              Avisar quando houver audiências sobre este tema
                            </p>
                          </div>
                          <Switch 
                            checked={true} 
                            onCheckedChange={() => toggleTopic(sub.tema, false)}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
