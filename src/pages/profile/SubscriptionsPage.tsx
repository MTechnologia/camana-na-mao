import { useState, useMemo, useEffect } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  Building2,
  Bus,
  Calendar,
  Bell,
  Video,
  FileText,
  Loader2,
  AlertCircle,
  Search,
  Plus,
  Check,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PageHeader from "@/components/ui/page-header";
import { useServiceSubscriptions } from "@/hooks/useServiceSubscriptions";
import { useTransportSubscriptions } from "@/hooks/useTransportSubscriptions";
import { useTransportLines, type TransportLineSearchRow } from "@/hooks/useTransportLines";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  buildAudienciaTopicsForUi,
  buildAudienciasInterestOrFilter,
  interestCategoriesToSearchTerms,
} from "@/lib/interestAudienciaMapping";
import { syncInterestAudienciaAlerts } from "@/lib/syncInterestAudienciaAlerts";

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

type AudienciaRecomendada = AudienciaRef & {
  tema?: string | null;
  descricao?: string | null;
};

export default function SubscriptionsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const [lembretesAudiencia, setLembretesAudiencia] = useState<InscricaoLembrete[]>([]);
  const [participacoesAudiencia, setParticipacoesAudiencia] = useState<Participacao[]>([]);
  const [loadingAudiencias, setLoadingAudiencias] = useState(true);
  const [profileInterestCategories, setProfileInterestCategories] = useState<string[]>([]);
  const [loadingProfileInterests, setLoadingProfileInterests] = useState(true);
  const [recommendedAudiencias, setRecommendedAudiencias] = useState<AudienciaRecomendada[]>([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);

  const { 
    subscriptions: serviceSubs, 
    loading: loadingServices, 
    toggleSubscription: toggleService 
  } = useServiceSubscriptions();
  
  const { 
    subscriptions: transportSubs, 
    loading: loadingTransport, 
    toggleSubscription: toggleTransport,
    subscribeToLine,
  } = useTransportSubscriptions();
  
  const { searchLinesRemote } = useTransportLines({ loadCatalog: false });

  const [transportSearch, setTransportSearch] = useState("");
  const [transportSearchResults, setTransportSearchResults] = useState<TransportLineSearchRow[]>([]);
  const [loadingTransportSearch, setLoadingTransportSearch] = useState(false);
  const activeTab = searchParams.get("aba") === "audiencias" ? "audiencias" : "alertas";

  const profileSearchTerms = useMemo(
    () => interestCategoriesToSearchTerms(profileInterestCategories),
    [profileInterestCategories],
  );

  const subscribedLineIds = useMemo(
    () => new Set(transportSubs.map((s) => s.line_id).filter(Boolean)),
    [transportSubs],
  );
  const subscribedLineCodes = useMemo(
    () =>
      new Set(
        transportSubs
          .map((s) => s.transport_lines?.line_code?.trim().toLowerCase())
          .filter(Boolean) as string[],
      ),
    [transportSubs],
  );

  useEffect(() => {
    const q = transportSearch.trim();
    if (q.length < 2) {
      setTransportSearchResults([]);
      setLoadingTransportSearch(false);
      return;
    }

    let cancelled = false;
    setLoadingTransportSearch(true);
    const timer = setTimeout(() => {
      void (async () => {
        try {
          const rows = await searchLinesRemote(q, 10);
          if (cancelled) return;
          const filtered = rows.filter(
            (line) =>
              !subscribedLineIds.has(line.id ?? "") &&
              !subscribedLineCodes.has(line.line_code.trim().toLowerCase()),
          );
          setTransportSearchResults(filtered);
        } catch (err) {
          console.error("[SubscriptionsPage] transport search", err);
          if (!cancelled) setTransportSearchResults([]);
        } finally {
          if (!cancelled) setLoadingTransportSearch(false);
        }
      })();
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [transportSearch, searchLinesRemote, subscribedLineIds, subscribedLineCodes]);

  useEffect(() => {
    if (!user?.id) {
      setProfileInterestCategories([]);
      setLoadingProfileInterests(false);
      return;
    }

    let cancelled = false;
    setLoadingProfileInterests(true);

    void (async () => {
      const { data, error } = await supabase
        .from("user_interests")
        .select("interest_category")
        .eq("user_id", user.id);

      if (cancelled) return;

      if (error) {
        console.error("[SubscriptionsPage] user_interests", error);
        setProfileInterestCategories([]);
      } else {
        setProfileInterestCategories((data ?? []).map((row) => row.interest_category));
      }
      setLoadingProfileInterests(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id, location.pathname]);

  useEffect(() => {
    if (!user?.id || loadingProfileInterests || profileInterestCategories.length === 0) {
      setRecommendedAudiencias([]);
      setLoadingRecommendations(false);
      return;
    }
    if (profileSearchTerms.length === 0) {
      setRecommendedAudiencias([]);
      setLoadingRecommendations(false);
      return;
    }

    const orFilter = buildAudienciasInterestOrFilter(profileSearchTerms);
    if (!orFilter) {
      setRecommendedAudiencias([]);
      setLoadingRecommendations(false);
      return;
    }

    let cancelled = false;
    setLoadingRecommendations(true);
    const today = new Date().toISOString().slice(0, 10);

    void (async () => {
      const { data, error } = await supabase
        .from("audiencias")
        .select("id, titulo, data, status, tema, descricao, comissao")
        .gte("data", today)
        .or(orFilter)
        .order("data", { ascending: true })
        .limit(20);

      if (cancelled) return;

      if (error) {
        console.error("[SubscriptionsPage] recommended audiencias", error);
        setRecommendedAudiencias([]);
      } else {
        setRecommendedAudiencias((data ?? []) as AudienciaRecomendada[]);
      }
      setLoadingRecommendations(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id, loadingProfileInterests, profileInterestCategories, profileSearchTerms]);

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

  const isLoading = loadingServices || loadingTransport;

  const isServiceSubscribed = (serviceId: string) => serviceSubs.some(s => s.service_id === serviceId);
  const isTransportSubscribed = (lineId: string) =>
    transportSubs.some((s) => s.line_id === lineId && s.subscription_type === "alert");

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
        title="Minhas Inscrições" 
        backTo="/perfil"
      />
      
      <div className="pt-[70px] px-4 max-w-2xl mx-auto space-y-8">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">
            Gerencie alertas de serviços e transporte e veja audiências recomendadas conforme seus interesses no perfil.
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
              Alertas
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
                        placeholder="Buscar linha SPTrans (ex: 875A-10 ou Lapa)"
                        className="pl-9 pr-9 text-sm"
                        value={transportSearch}
                        onChange={(e) => setTransportSearch(e.target.value)}
                      />
                      {loadingTransportSearch && (
                        <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
                      )}
                    </div>

                    {transportSearch.trim().length >= 2 && !loadingTransportSearch && transportSearchResults.length === 0 && (
                      <p className="mt-2 px-1 text-xs text-muted-foreground">
                        Nenhuma linha encontrada na SPTrans para este termo.
                      </p>
                    )}

                    {transportSearchResults.length > 0 && (
                      <Card className="mt-2 shadow-sm">
                        <CardContent className="p-0 divide-y">
                          {transportSearchResults.map((line) => {
                            const following = line.id
                              ? isTransportSubscribed(line.id)
                              : subscribedLineCodes.has(line.line_code.trim().toLowerCase());
                            return (
                            <div key={`${line.line_code}-${line.sptrans_codigo_linha ?? "x"}`} className="flex items-center justify-between p-3">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium">{line.line_code}</p>
                                <p className="text-xs text-muted-foreground truncate">{line.line_name}</p>
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                disabled={following}
                                className={getTransportButtonClasses(following)}
                                onClick={() =>
                                  void subscribeToLine({
                                    id: line.id,
                                    line_code: line.line_code,
                                    line_name: line.line_name,
                                    line_type: line.line_type,
                                    sptrans_codigo_linha: line.sptrans_codigo_linha,
                                  })
                                }
                              >
                                {following ? (
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
                            );
                          })}
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
                                  {sub.transport_lines?.line_code}
                                </p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {sub.transport_lines?.line_name}
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
                  <div className="flex items-start justify-between gap-3 px-1">
                    <div className="flex items-start gap-2 min-w-0">
                      <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <div className="space-y-1 min-w-0">
                        <h2 className="font-semibold text-lg">Audiências recomendadas</h2>
                        <p className="text-sm text-muted-foreground">
                          Lista futura com base nos interesses definidos em Meu Perfil.
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-primary text-xs h-8 shrink-0"
                      onClick={() => navigate("/perfil/interesses")}
                    >
                      Interesses
                    </Button>
                  </div>

                  {loadingProfileInterests || loadingRecommendations ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : profileInterestCategories.length === 0 ? (
                    <Card className="border-dashed">
                      <CardContent className="p-4 text-center space-y-3">
                        <p className="text-sm text-muted-foreground">
                          Selecione pelo menos 3 interesses no perfil para ver audiências recomendadas.
                        </p>
                        <Button variant="outline" size="sm" onClick={() => navigate("/perfil/interesses")}>
                          Definir interesses
                        </Button>
                      </CardContent>
                    </Card>
                  ) : recommendedAudiencias.length === 0 ? (
                    <Card className="border-dashed">
                      <CardContent className="p-4 text-center space-y-2">
                        <p className="text-sm text-muted-foreground">
                          Nenhuma audiência futura no calendário combina com seus interesses neste momento.
                        </p>
                        <Button variant="outline" size="sm" onClick={() => navigate("/audiencias")}>
                          Ver todas as audiências
                        </Button>
                      </CardContent>
                    </Card>
                  ) : (
                    <ul className="space-y-2 px-1">
                      {recommendedAudiencias.map((audiencia) => (
                        <Card
                          key={audiencia.id}
                          className="cursor-pointer hover:shadow-md transition-all"
                          onClick={() => navigate(`/audiencias/${audiencia.id}`)}
                        >
                          <CardContent className="p-3">
                            <p className="font-medium text-sm truncate">{audiencia.titulo}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {audiencia.tema ? `${audiencia.tema} · ` : ""}
                              {audiencia.data ? formatData(audiencia.data) : "—"}
                            </p>
                          </CardContent>
                        </Card>
                      ))}
                    </ul>
                  )}
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
                    Histórico de Participações - Videoconferências e Manifestações
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
                    <Card className="border-dashed">
                      <CardContent className="p-4 text-center space-y-3">
                        <p className="text-sm text-muted-foreground">
                          Você ainda não se inscreveu para receber lembretes de audiências.
                        </p>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Nas audiências públicas, use o botão{" "}
                          <strong className="font-medium text-foreground">Receber lembretes desta audiência</strong>{" "}
                          em cada evento de seu interesse. Você receberá confirmação e avisos antes da data (push e
                          e-mail, conforme suas preferências).
                        </p>
                        <Button className="w-full gap-2" onClick={() => navigate("/audiencias")}>
                          Ver audiências e inscrever em lembretes
                          <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
                        </Button>
                        <Button
                          variant="link"
                          size="sm"
                          className="text-xs text-muted-foreground h-auto p-0"
                          onClick={() => navigate("/perfil/preferencias")}
                        >
                          Ajustar notificações no perfil
                        </Button>
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

                <div className="flex flex-col gap-2 sm:flex-row">
                  {lembretesAudiencia.length > 0 && (
                    <Button
                      variant="default"
                      className="w-full gap-2 sm:flex-1"
                      onClick={() => navigate("/audiencias")}
                    >
                      Inscrever em mais lembretes
                      <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => navigate("/audiencias")}
                    className="w-full sm:flex-1"
                  >
                    Ver todas as audiências
                  </Button>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
