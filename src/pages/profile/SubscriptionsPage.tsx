import { useState, useMemo, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  Building2,
  Bus,
  MessageSquare,
  Calendar,
  Bell,
  Video,
  FileText,
  Loader2,
  AlertCircle,
  Search,
  Plus,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PageHeader from "@/components/ui/page-header";
import { useServiceSubscriptions } from "@/hooks/useServiceSubscriptions";
import { useTransportSubscriptions } from "@/hooks/useTransportSubscriptions";
import { useAudienciaTopicSubscriptions } from "@/hooks/useAudienciaTopicSubscriptions";
import { useTransportLines } from "@/hooks/useTransportLines";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

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

type AudienciaRef = {
  id: string;
  titulo: string;
  data: string;
  status?: string;
};

type InscricaoLembrete = {
  id: string;
  created_at: string;
  audiencia: AudienciaRef | null;
};

type Participacao = {
  id: string;
  tipo: string;
  created_at: string;
  audiencia: AudienciaRef | null;
};

export default function SubscriptionsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const [lembretesAudiencia, setLembretesAudiencia] = useState<InscricaoLembrete[]>([]);
  const [participacoesAudiencia, setParticipacoesAudiencia] = useState<Participacao[]>([]);
  const [loadingAudiencias, setLoadingAudiencias] = useState(true);
  
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
  const activeTab = searchParams.get("aba") === "audiencias" ? "audiencias" : "alertas";
  
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

  useEffect(() => {
    if (!user?.id) {
      setLembretesAudiencia([]);
      setParticipacoesAudiencia([]);
      setLoadingAudiencias(false);
      return;
    }

    let cancelled = false;
    setLoadingAudiencias(true);

    async function loadAudiencias() {
      const [resInsc, resPart] = await Promise.all([
        supabase
          .from("audiencia_inscricoes")
          .select("id, created_at, audiencia:audiencias(id, titulo, data, status)")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("audiencia_participacoes")
          .select("id, tipo, created_at, audiencia:audiencias(id, titulo, data, status)")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(50),
      ]);

      if (cancelled) return;

      setLembretesAudiencia((resInsc.data ?? []) as InscricaoLembrete[]);
      setParticipacoesAudiencia((resPart.data ?? []) as Participacao[]);
      setLoadingAudiencias(false);
    }

    void loadAudiencias();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const formatData = (dateStr: string) => {
    try {
      const d = dateStr.slice(0, 10);
      if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
        const [y, m, day] = d.split("-").map(Number);
        return format(new Date(y, m - 1, day), "d MMM yyyy", { locale: ptBR });
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  const tipoLabel = (tipo: string) =>
    tipo === "videoconferencia" ? "Videoconferência" : tipo === "escrito" ? "Manifestação escrita" : tipo;

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <h1 className="text-xl font-bold mb-2">Acesso restrito</h1>
        <p className="text-muted-foreground mb-6">Você precisa estar logado para gerenciar suas inscrições.</p>
        <Button onClick={() => navigate("/login", { state: { from: `/perfil/inscricoes${window.location.search}` } })}>
          Entrar
        </Button>
      </div>
    );
  }

  const isLoading = loadingServices || loadingTransport || loadingTopics || loadingLines;

  const isServiceSubscribed = (serviceId: string) => serviceSubs.some(s => s.service_id === serviceId);
  const isTransportSubscribed = (lineId: string) =>
    transportSubs.some((s) => s.line_id === lineId && s.subscription_type === "alert");
  const isTopicSubscribed = (tema: string) => topicSubs.some(s => s.tema === tema);
  const getTransportButtonClasses = (active: boolean) =>
    cn(
      "min-w-24 justify-center rounded-full border px-4 py-2 text-xs font-medium transition-colors",
      active
        ? "border-primary bg-primary text-primary-foreground hover:bg-primary/90"
        : "border-muted-foreground/20 bg-background text-muted-foreground hover:bg-muted",
    );

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
        <Tabs
          value={activeTab}
          onValueChange={(value) => {
            if (value === "audiencias") setSearchParams({ aba: "audiencias" });
            else setSearchParams({});
          }}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2 h-auto rounded-xl bg-muted p-1 gap-1">
            <TabsTrigger
              value="alertas"
              className="rounded-lg py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none"
            >
              Alertas e temas
            </TabsTrigger>
            <TabsTrigger
              value="audiencias"
              className="rounded-lg py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none"
            >
              Audiências públicas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="alertas" className="space-y-8">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Carregando suas preferências...</p>
              </div>
            ) : (
              <>
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
                          {filteredLines.map((line) => (
                            <div key={line.id} className="flex items-center justify-between p-3">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium">{line.line_code} - {line.line_name}</p>
                                <p className="text-[10px] text-muted-foreground uppercase">{line.line_type}</p>
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                className={getTransportButtonClasses(isTransportSubscribed(line.id))}
                                onClick={() => toggleTransport(line.id, !isTransportSubscribed(line.id))}
                              >
                                {isTransportSubscribed(line.id) ? (
                                  <>
                                    <Check className="mr-1.5 h-3.5 w-3.5" />
                                    Seguindo
                                  </>
                                ) : (
                                  <>
                                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                                    Seguir
                                  </>
                                )}
                              </Button>
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
                              <Button
                                type="button"
                                variant="outline"
                                className={getTransportButtonClasses(true)}
                                onClick={() => toggleTransport(sub.line_id!, false)}
                              >
                                <Check className="mr-1.5 h-3.5 w-3.5" />
                                Seguindo
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </section>

                <section className="space-y-4">
                  <div className="flex items-center gap-2 px-1">
                    <MessageSquare className="h-5 w-5 text-primary" />
                    <h2 className="font-semibold text-lg">Temas de Audiência</h2>
                  </div>

                  <div className="grid grid-cols-2 gap-2 px-1">
                    {COMMON_TOPICS.map((tema) => {
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
          </TabsContent>

          <TabsContent value="audiencias" className="space-y-6">
            <p className="text-sm text-muted-foreground">
              Registro das suas inscrições para lembretes e das suas participações em audiências públicas.
            </p>

            {loadingAudiencias ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <>
                <section>
                  <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-3">
                    <Video className="h-5 w-5" />
                    Participações (videoconferência / escrito)
                  </h2>
                  {participacoesAudiencia.length === 0 ? (
                    <Card>
                      <CardContent className="p-4 text-center text-muted-foreground text-sm">
                        Você ainda não tem inscrições para participar de audiências (videoconferência ou manifestação escrita).
                      </CardContent>
                    </Card>
                  ) : (
                    <ul className="space-y-2">
                      {participacoesAudiencia.map((participacao) => {
                        const audiencia = participacao.audiencia;
                        return (
                          <Card
                            key={participacao.id}
                            className="cursor-pointer hover:shadow-md transition-all"
                            onClick={() => audiencia?.id && navigate(`/audiencias/${audiencia.id}`)}
                          >
                            <CardContent className="p-4 flex items-start gap-3">
                              <div className="rounded-full bg-primary/10 p-2 shrink-0">
                                {participacao.tipo === "videoconferencia" ? (
                                  <Video className="h-4 w-4 text-primary" />
                                ) : (
                                  <FileText className="h-4 w-4 text-primary" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-foreground truncate">{audiencia?.titulo || "Audiência"}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {tipoLabel(participacao.tipo)} · {audiencia?.data ? formatData(audiencia.data) : "—"}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Inscrito em {format(new Date(participacao.created_at), "d MMM yyyy 'às' HH:mm", { locale: ptBR })}
                                </p>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </ul>
                  )}
                </section>

                <section>
                  <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-3">
                    <Bell className="h-5 w-5" />
                    Inscrições para lembretes
                  </h2>
                  {lembretesAudiencia.length === 0 ? (
                    <Card>
                      <CardContent className="p-4 text-center text-muted-foreground text-sm">
                        Você ainda não se inscreveu para receber lembretes de audiências.
                      </CardContent>
                    </Card>
                  ) : (
                    <ul className="space-y-2">
                      {lembretesAudiencia.map((lembrete) => {
                        const audiencia = lembrete.audiencia;
                        return (
                          <Card
                            key={lembrete.id}
                            className="cursor-pointer hover:shadow-md transition-all"
                            onClick={() => audiencia?.id && navigate(`/audiencias/${audiencia.id}`)}
                          >
                            <CardContent className="p-4 flex items-start gap-3">
                              <div className="rounded-full bg-muted p-2 shrink-0">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-foreground truncate">{audiencia?.titulo || "Audiência"}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {audiencia?.data ? formatData(audiencia.data) : "—"}
                                </p>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </ul>
                  )}
                </section>

                <Button variant="outline" onClick={() => navigate("/audiencias")} className="w-full">
                  Ver todas as audiências
                </Button>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
