import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";
import PageHeader from "@/components/ui/page-header";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RatingStars } from "@/components/evaluation/RatingStars";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useGeolocation } from "@/hooks/useGeolocation";
import { MAX_GPS_ACCURACY_NEARBY_UI_METERS } from "@/lib/gpsAccuracy";
import { Phone, Clock, Star, Bell, Info, ExternalLink, AlertTriangle, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { servicosProximos } from "@/data/searchData";
import { buildGoogleMapsUrl, getAddressDisplay } from "@/lib/mapUtils";
import { needsVerificationForLowAverageRating } from "@/lib/serviceRatingVerification";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ServiceRatingsHistorySection } from "@/components/evaluation/ServiceRatingsHistorySection";
import { DimensionAveragesChart } from "@/components/evaluation/DimensionAveragesChart";
import { ServiceCorrectionSuggestSection } from "@/components/services/ServiceCorrectionSuggestSection";
import { ServiceFavoriteButton } from "@/components/services/ServiceFavoriteButton";
import { SERVICE_CORRECTION_REVIEW_SLA_HOURS } from "@/lib/serviceCorrectionFields";
import {
  getOccupancyBadgeMeta,
  getOccupancyCoverageMeta,
  getOccupancyLevel,
  MIN_OCCUPANCY_SAMPLE_USERS,
  OCCUPANCY_SOURCE_SHORT,
  OCCUPANCY_WINDOW_MINUTES,
} from "@/lib/occupancySignals";
import type { ServiceLike } from "@/lib/serviceCorrectionFields";

/** Sanitiza HTML permitindo apenas strong, p e br (conteúdo de services_offered dos CEUs). */
function sanitizeServicesOfferedHtml(html: string): string {
  return html.replace(
    /<(?!\/?(?:strong|p|br)\s*\/?\s*>)\/?\w+[^>]*>/gi,
    ""
  );
}

/** Horário padrão quando a fonte (GeoSampa) não fornece tx_horario_funcionamento. */
const DEFAULT_OPENING_HOURS_BY_TYPE: Record<string, string> = {
  ubs: "Segunda a sexta, 7h às 19h (horário padrão das UBS em SP). Confirme na unidade.",
  hospital: "Atendimento 24h ou conforme unidade. Confirme pelo telefone.",
  library: "Segunda a sexta, em geral 9h às 18h. Confirme na unidade.",
  school: "Conforme calendário escolar. Confirme na unidade.",
  ceu: "Conforme programação. Confirme na unidade.",
  sports_center: "Varía por unidade. Confirme no local.",
};

function getOpeningHoursDisplay(
  openingHours: unknown,
  serviceType?: string
): string | null {
  const text =
    typeof openingHours === "string"
      ? openingHours
      : (openingHours as { text?: string })?.text;
  if (text?.trim()) return text.trim();
  const type = serviceType ?? "other";
  return DEFAULT_OPENING_HOURS_BY_TYPE[type] ?? null;
}

function getOperationalStatusMeta(status: unknown): { label: string; className: string } | null {
  if (status === "open") {
    return {
      label: "Aberto",
      className: "border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    };
  }
  if (status === "closed") {
    return {
      label: "Fechado",
      className: "border-rose-500/40 bg-rose-500/15 text-rose-700 dark:text-rose-300",
    };
  }
  if (status === "maintenance") {
    return {
      label: "Em manutenção",
      className: "border-amber-500/40 bg-amber-500/15 text-amber-700 dark:text-amber-300",
    };
  }
  return null;
}

function isServiceIdUUID(str: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

export default function ServiceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { latitude: userLatitude, longitude: userLongitude } = useGeolocation({
    maxAccuracyMeters: MAX_GPS_ACCURACY_NEARBY_UI_METERS,
  });
  const [service, setService] = useState<{
    id: string;
    name?: string;
    metadata?: Record<string, unknown>;
    capacity_info?: string | null;
    average_rating?: number | null;
    total_ratings?: number | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [realServiceId, setRealServiceId] = useState<string | null>(null);
  const [occupancy, setOccupancy] = useState<{ usersCount: number; lastPingAt: string | null } | null>(null);
  const [loadingOccupancy, setLoadingOccupancy] = useState(false);

  const loadService = useCallback(async () => {
    if (!id) {
      toast.error("ID do serviço não encontrado");
      navigate("/servicos-proximos");
      return;
    }

    setLoading(true);
    setService(null);
    setRealServiceId(null);

    try {
      // Se é UUID, busca direto no Supabase (sempre dados atuais de média/total)
      if (isServiceIdUUID(id)) {
        const { data, error } = await supabase
          .from("public_services")
          .select("*")
          .eq("id", id)
          .maybeSingle();

        if (error) {
          console.error("Error loading public_services by id:", error);
          toast.error("Erro ao carregar equipamento");
          navigate("/servicos-proximos");
          return;
        }

        if (data) {
          setService(data);
          setRealServiceId(data.id);
          return;
        }

        toast.error("Equipamento não encontrado");
        navigate("/servicos-proximos");
        return;
      }

      // Busca nos dados mockados
      const mockedService = servicosProximos.find(s => s.id === id);
      if (mockedService && mockedService.metadata) {
        // Converter formato mockado para formato esperado
        const serviceData = {
          id: mockedService.id,
          name: mockedService.title,
          service_type: mockedService.metadata.serviceType || "other",
          address: mockedService.description,
          district: mockedService.metadata.district || "",
          latitude: mockedService.metadata.latitude,
          longitude: mockedService.metadata.longitude,
          phone: mockedService.metadata.phone,
          average_rating: mockedService.metadata.rating || 0,
          total_ratings: mockedService.metadata.totalRatings || 0,
          city: "São Paulo",
          state: "SP",
          opening_hours: null,
        };
        setService(serviceData);

        // Verifica se já existe no banco pelo nome
        const { data: existingService, error: existingErr } = await supabase
          .from("public_services")
          .select("id")
          .eq("name", mockedService.title)
          .maybeSingle();

        if (existingErr) {
          console.warn("Lookup public_services by mock name:", existingErr.message);
        }
        if (existingService) {
          setRealServiceId(existingService.id);
        }
        return;
      }

      toast.error("Serviço não encontrado");
      navigate("/servicos-proximos");
    } catch (error) {
      console.error("Error loading service:", error);
      toast.error("Erro ao carregar serviço");
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    void loadService();
  }, [id, location.key, loadService]);

  useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted && id) {
        void loadService();
      }
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, [id, loadService]);

  useEffect(() => {
    if (user && realServiceId) checkSubscription();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- checkSubscription runs when user/realServiceId change
  }, [user, realServiceId]);

  useEffect(() => {
    const serviceIdForOccupancy = realServiceId || (id && isServiceIdUUID(id) ? id : null);
    if (!serviceIdForOccupancy) {
      setOccupancy(null);
      return;
    }

    let cancelled = false;
    const fetchOccupancy = async () => {
      setLoadingOccupancy(true);
      try {
        const supabaseAny = supabase as unknown as {
          rpc: (name: string, params: Record<string, unknown>) => Promise<{ data: unknown; error: { message?: string } | null }>
        };
        const { data, error } = await supabaseAny.rpc("get_equipment_occupancy_summary_for_service", {
          p_service_id: serviceIdForOccupancy,
          p_window_minutes: OCCUPANCY_WINDOW_MINUTES,
        });
        if (cancelled) return;
        if (error) {
          console.warn("[service-occupancy] rpc error:", error.message);
          setOccupancy(null);
          return;
        }
        const row = Array.isArray(data) ? (data[0] as { users_count?: number; last_ping_at?: string | null } | undefined) : undefined;
        setOccupancy({
          usersCount: Number(row?.users_count ?? 0),
          lastPingAt: row?.last_ping_at ?? null,
        });
      } catch (err) {
        if (!cancelled) {
          console.warn("[service-occupancy] fetch failed:", err);
          setOccupancy(null);
        }
      } finally {
        if (!cancelled) setLoadingOccupancy(false);
      }
    };

    void fetchOccupancy();
    return () => {
      cancelled = true;
    };
  }, [realServiceId, id]);

  const checkSubscription = async () => {
    if (!user || !realServiceId) return;
    
    try {
      const { data } = await supabase
        .from("service_subscriptions")
        .select("id")
        .eq("user_id", user.id)
        .eq("service_id", realServiceId)
        .maybeSingle();

      setIsSubscribed(!!data);
    } catch (error) {
      console.error("Error checking subscription:", error);
    }
  };

  const ensureServiceInDatabase = async (): Promise<string | null> => {
    if (!service) return null;

    // Se já temos o ID real, retorna ele
    if (realServiceId) return realServiceId;

    // Se o ID atual é UUID, pode ser que já exista
    if (id && isServiceIdUUID(id)) return id;

    try {
      // Verifica se já existe pelo nome
      const { data: existingService } = await supabase
        .from("public_services")
        .select("id")
        .eq("name", service.name)
        .maybeSingle();

      if (existingService) {
        setRealServiceId(existingService.id);
        return existingService.id;
      }

      // Cria o serviço no banco
      const { data: newService, error } = await supabase
        .from("public_services")
        .insert({
          name: service.name,
          service_type: service.service_type,
          address: service.address,
          district: service.district,
          latitude: service.latitude,
          longitude: service.longitude,
          phone: service.phone,
          city: "São Paulo",
          state: "SP"
        })
        .select()
        .single();

      if (error) throw error;
      
      setRealServiceId(newService.id);
      return newService.id;
    } catch (error) {
      console.error("Error ensuring service in database:", error);
      return null;
    }
  };

  const handleSubscribe = async () => {
    if (!user) {
      toast.error("Faça login para acompanhar atualizações");
      return;
    }

    try {
      const serviceId = await ensureServiceInDatabase();
      if (!serviceId) {
        toast.error("Erro ao processar serviço");
        return;
      }

      if (isSubscribed) {
        await supabase
          .from("service_subscriptions")
          .delete()
          .eq("user_id", user.id)
          .eq("service_id", serviceId);
        
        setIsSubscribed(false);
        toast.success("Você não receberá mais atualizações");
      } else {
        await supabase
          .from("service_subscriptions")
          .insert({ user_id: user.id, service_id: serviceId });
        
        setIsSubscribed(true);
        toast.success("Você receberá atualizações sobre este serviço");
      }
    } catch (error) {
      console.error("Error toggling subscription:", error);
      toast.error("Erro ao atualizar inscrição");
    }
  };

  const handleEvaluate = async () => {
    if (!user) {
      toast.error("Faça login para avaliar");
      return;
    }

    try {
      // Garante que o serviço existe no banco
      const serviceId = await ensureServiceInDatabase();
      if (!serviceId) {
        toast.error("Erro ao processar serviço para avaliação");
        return;
      }

      // Criar uma visita para avaliar
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const { data: visit, error } = await supabase
        .from("service_visits")
        .insert({
          user_id: user.id,
          service_id: serviceId,
          expires_at: expiresAt.toISOString(),
          status: "pending"
        })
        .select()
        .single();

      if (error) throw error;

      navigate(`/avaliar/${visit.id}`);
    } catch (error) {
      console.error("Error creating visit:", error);
      toast.error("Erro ao iniciar avaliação");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-24 pt-[60px]">
        <PageHeader title="Carregando..." />
        <div className="p-4 space-y-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="min-h-screen bg-background pb-24 pt-[60px]">
        <PageHeader title="Serviço não encontrado" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24 pt-[60px]">
      <PageHeader title={service.name} />
      
      <div className="p-4 space-y-4">
        {/* Info Card */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <div>
              <h3 className="font-semibold text-foreground mb-1">Endereço</h3>
              <p className="text-sm text-muted-foreground">
                {getAddressDisplay(service.address, service.district)}
              </p>
              <p className="text-sm text-muted-foreground">
                {service.city} - {service.state}
              </p>
              {(() => {
                const lat = Number((service as { latitude?: unknown }).latitude);
                const lng = Number((service as { longitude?: unknown }).longitude);
                const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);
                if (!hasCoords) return null;
                const stateOrigin = (location.state as { originLat?: unknown; originLng?: unknown } | null) ?? null;
                const originLat =
                  typeof stateOrigin?.originLat === "number" && !Number.isNaN(stateOrigin.originLat)
                    ? stateOrigin.originLat
                    : userLatitude;
                const originLng =
                  typeof stateOrigin?.originLng === "number" && !Number.isNaN(stateOrigin.originLng)
                    ? stateOrigin.originLng
                    : userLongitude;
                const hasUserCoords =
                  typeof originLat === "number" &&
                  typeof originLng === "number" &&
                  !Number.isNaN(originLat) &&
                  !Number.isNaN(originLng);
                const mapsUrl = hasUserCoords
                  ? buildGoogleMapsUrl(originLat, originLng, lat, lng)
                  : `https://www.google.com/maps?q=${lat},${lng}`;
                return (
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline mt-2"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Como chegar
                  </a>
                );
              })()}
            </div>

            {service.phone && (
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{service.phone}</span>
              </div>
            )}

            {(() => {
              const meta = getOperationalStatusMeta((service as { operational_status?: unknown }).operational_status);
              if (!meta) return null;
              return (
                <div className="space-y-1">
                  <h3 className="font-semibold text-foreground text-sm">Status operacional</h3>
                  <Badge variant="outline" className={meta.className}>
                    {meta.label}
                  </Badge>
                </div>
              );
            })()}

            {/* Horário de funcionamento — sempre exibido (dado real ou orientação por tipo) */}
            <div className="space-y-1">
              <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                Horário de funcionamento
              </h3>
              <p className="text-sm text-muted-foreground">
                {getOpeningHoursDisplay(service.opening_hours, service.service_type) ??
                  "Horário não informado. Confirme na unidade."}
              </p>
            </div>

            {/* Capacidade / indicador a partir de dados abertos (qt_vaga, área m², etc.) */}
            {service.capacity_info && (
              <div className="space-y-1">
                <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
                  <Info className="w-4 h-4 text-muted-foreground" />
                  Capacidade (dados abertos)
                </h3>
                <p className="text-sm text-muted-foreground">
                  {service.capacity_info}
                </p>
              </div>
            )}

            {/* Ocupação simplificada para munícipe (sem heatmap). */}
            <div className="space-y-1">
              <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                Pessoas no local
              </h3>
              {loadingOccupancy ? (
                <p className="text-sm text-muted-foreground">Carregando estimativa...</p>
              ) : occupancy ? (
                <div className="space-y-2">
                  {occupancy.usersCount < MIN_OCCUPANCY_SAMPLE_USERS ? (
                    <>
                      <Badge
                        variant="outline"
                        className="border-slate-500/40 bg-slate-500/10 text-slate-700 dark:text-slate-300"
                      >
                        Dados insuficientes
                      </Badge>
                      <p className="text-sm text-muted-foreground">
                        Ainda não há volume suficiente para estimar a movimentação deste local.
                      </p>
                    </>
                  ) : (
                    <>
                      {(() => {
                        const level = getOccupancyLevel(occupancy.usersCount);
                        const badge = getOccupancyBadgeMeta(level);
                        const coverage = getOccupancyCoverageMeta(occupancy.usersCount);
                        return (
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className={badge.className}>
                              {badge.label}
                            </Badge>
                            <Badge variant="outline" className={coverage.className}>
                              {coverage.label}
                            </Badge>
                          </div>
                        );
                      })()}
                      <p className="text-sm text-muted-foreground">
                        Estimativa de presença nas últimas {Math.round(OCCUPANCY_WINDOW_MINUTES / 60)}h.
                      </p>
                    </>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Fonte: {OCCUPANCY_SOURCE_SHORT} (sinais de presença agregados).
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Base: {occupancy.usersCount} pessoa{occupancy.usersCount === 1 ? "" : "s"} com sinais recentes no app
                    {occupancy.lastPingAt
                      ? ` • último ping: ${new Date(occupancy.lastPingAt).toLocaleString("pt-BR")}`
                      : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Indicador estimado com base em interações de usuários do app (não é medição oficial da Prefeitura).
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Para desativar esse tipo de sinal, ajuste suas permissões de localização/notificações em{" "}
                    <a href="/perfil/preferencias" className="text-primary hover:underline">
                      Preferências
                    </a>.
                    Se desativar, a detecção de presença e os lembretes de avaliação podem não funcionar.
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Sem dados recentes de ocupação para esta unidade.
                </p>
              )}
            </div>

            {/* O que este serviço oferece — tipo, serviços e ambientes quando existirem */}
            <div className="space-y-1">
              <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
                <Info className="w-4 h-4 text-muted-foreground" />
                O que este serviço oferece
              </h3>
              {(() => {
                const svc = service as {
                  services_offered?: string | null;
                  ambientes?: { ambiente?: string; total?: number }[];
                };
                const hasOffered = !!svc.services_offered?.trim();
                const hasAmbientes = Array.isArray(svc.ambientes) && svc.ambientes.length > 0;
                if (!hasOffered && !hasAmbientes) {
                  return (
                    <p className="text-sm text-muted-foreground">
                      Informações não disponíveis para esta unidade.
                    </p>
                  );
                }
                let offered = svc.services_offered!;
                // Corrige truncamento do GeoJSON das UBS: remove ", encaminhamentos par" e garante ponto final
                if (typeof offered === "string" && /, encaminhamentos par\s*$/i.test(offered)) {
                  offered = offered.replace(/, encaminhamentos par\s*$/i, "").trim();
                  if (offered && !/[.!?]$/.test(offered)) offered += ".";
                }
                const isHtml = /<\s*(\/)?(strong|p|br)\s*(\/\s*)?>/i.test(offered);
                return (
                  <div className="text-sm text-muted-foreground space-y-2">
                    {hasOffered &&
                      (isHtml ? (
                        <div
                          className="space-y-2 [&_strong]:font-semibold [&_p]:mb-0 [&_p:last-child]:mb-0"
                          dangerouslySetInnerHTML={{
                            __html: sanitizeServicesOfferedHtml(offered),
                          }}
                        />
                      ) : (
                        <p className="whitespace-pre-line">{offered}</p>
                      ))}
                    {hasAmbientes && (
                      <ul className="list-disc list-inside space-y-0.5">
                        {svc.ambientes!.map((a, i) => (
                          <li key={i}>
                            {a.ambiente ?? "Ambiente"}
                            {a.total != null && a.total > 0 ? ` (${a.total})` : ""}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })()}
            </div>

            <div className="pt-2 border-t border-border space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <RatingStars rating={service.average_rating ?? 0} readonly />
                    <span className="text-sm text-muted-foreground">
                      ({service.total_ratings ?? 0} avaliações)
                    </span>
                  </div>
                  {(service.total_ratings ?? 0) > 0 && realServiceId ? (
                    <a
                      href="#historico-avaliacoes"
                      className="text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                    >
                      Ver histórico de avaliações individuais
                    </a>
                  ) : null}
                </div>
              </div>
              {needsVerificationForLowAverageRating(service.average_rating, service.total_ratings) && (
                <Alert
                  className="border-amber-600/40 bg-amber-500/10 text-amber-950 dark:text-amber-100 [&>svg]:text-amber-700 dark:[&>svg]:text-amber-300"
                  role="status"
                >
                  <AlertTriangle className="h-4 w-4" aria-hidden />
                  <AlertTitle>Média de avaliações abaixo de 2 estrelas</AlertTitle>
                  <AlertDescription>
                    Este equipamento está <strong>sinalizado para verificação</strong>. A média inclui notas já
                    enviadas (publicadas ou em revisão); comentários só ficam visíveis a todos após moderação.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>

        {(service.total_ratings ?? 0) > 0 && realServiceId ? (
          <DimensionAveragesChart serviceId={realServiceId} enabled />
        ) : null}

        <ServiceRatingsHistorySection
          serviceId={realServiceId}
          currentUserId={user?.id ?? null}
          id="historico-avaliacoes"
        />

        {/* Actions */}
        <div className="space-y-2">
          <Button
            className="w-full"
            size="lg"
            onClick={handleEvaluate}
          >
            <Star className="w-4 h-4 mr-2" />
            Avaliar este serviço
          </Button>

          <Button
            variant={isSubscribed ? "secondary" : "outline"}
            className="w-full"
            size="lg"
            onClick={handleSubscribe}
          >
            <Bell className="w-4 h-4 mr-2" />
            {isSubscribed ? "Deixar de acompanhar" : "Acompanhar atualizações"}
          </Button>

          <ServiceFavoriteButton
            serviceId={realServiceId}
            onRequestLogin={() => toast.error("Faça login para favoritar equipamentos.")}
          />

          <Card
            id="sugerir-correcao-cadastro"
            className="border-primary/20 bg-primary/[0.03]"
            role="region"
            aria-label="Sugestão de correção de dados do equipamento"
          >
            <CardContent className="p-4 space-y-3">
              <div className="space-y-1">
                <h2 className="text-base font-semibold text-foreground">
                  Dados incorretos ou desatualizados?
                </h2>
                <p className="text-sm text-muted-foreground leading-snug">
                  Se alguma informação deste equipamento estiver errada no app, você pode sugerir a correção.
                  Um administrador valida em até {SERVICE_CORRECTION_REVIEW_SLA_HOURS} horas e você é notificado; o
                  cadastro oficial só muda depois da aprovação e da atualização feita pela equipe (não automático pelo
                  formulário).
                </p>
              </div>
              <ServiceCorrectionSuggestSection
                service={service as ServiceLike}
                realServiceId={realServiceId}
                userId={user?.id ?? null}
                onRequestLogin={() => toast.error("Faça login para sugerir uma correção.")}
              />
            </CardContent>
          </Card>
        </div>
      </div>

    </div>
  );
}
