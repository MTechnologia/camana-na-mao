import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Clock,
  Bus,
  Info,
  Calendar,
  MapPin,
  Search,
  Plus,
  AlertCircle,
  Heart,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useImageLightbox } from "@/components/ui/ImageLightbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PageHeader from "@/components/ui/page-header";
import { useTransportReport } from "@/hooks/useTransportReport";
import { Skeleton } from "@/components/ui/skeleton";
import { formatShortDate } from "@/lib/dateUtils";
import { transportProblems } from "@/data/transportProblems";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CitizenSeverityBadge } from "@/components/citizen/CitizenSeverityBadge";
import { ReferralDialog } from "@/components/referral/ReferralDialog";
import { useUserRole } from "@/hooks/useUserRole";
import { formatTransportReportDescriptionForDisplay } from "@/lib/parseTransportReportPreview";
import { embeddedRelationCount } from "@/lib/citizenReportStatus";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { TransportReportInteractions } from "@/components/transport/TransportReportInteractions";
import { TransportReportComments } from "@/components/transport/TransportReportComments";
import { TransportLineFollowButton } from "@/components/transport/TransportLineFollowButton";
import {
  TransportReportFilters,
  type TransportReportFiltersState,
} from "@/components/transport/TransportReportFilters";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useTransportSubscriptions } from "@/hooks/useTransportSubscriptions";

const RECURRENCE_LABELS: Record<string, string> = {
  primeira_vez: "Primeira vez",
  algumas_vezes_mes: "Algumas vezes/mês",
  toda_semana: "Toda semana",
  todos_os_dias: "Todos os dias",
};

const DIRECTION_LABELS: Record<string, string> = {
  ida: "Ida",
  volta: "Volta",
  circular: "Circular",
};

function personalImpactLabel(pi: unknown): string {
  const n = typeof pi === "number" ? pi : parseInt(String(pi ?? ""), 10);
  if (!Number.isInteger(n) || n < 2) return "—";
  if (n >= 5) return "Alto (compromisso ou não embarque)";
  if (n >= 4) return "Atraso > 30 min";
  if (n >= 3) return "Atraso < 30 min";
  return "Desconforto";
}

function transportTypeLabel(reportType: unknown): string {
  const id = String(reportType ?? "");
  const p = transportProblems.find((x) => x.id === id);
  if (p) return p.label;
  if (id === "conducao") return "Condução";
  return id || "Tipo não informado";
}

type TransportListRow = Record<string, unknown> & {
  profiles?: { full_name: string; avatar_url: string | null };
};

export default function MyReportsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const highlightReportId = searchParams.get("reportId");
  const { user } = useAuth();
  const { getMyReports } = useTransportReport();
  const { canReferToCouncilMember } = useUserRole();
  const { openLightbox, lightbox } = useImageLightbox();
  const {
    subscriptions: transportSubscriptions,
    loading: transportSubscriptionsLoading,
    toggleSubscription: toggleTransportSubscription,
  } = useTransportSubscriptions();
  const [reports, setReports] = useState<TransportListRow[]>([]);
  const [allTransportReports, setAllTransportReports] = useState<TransportListRow[]>([]);
  const [transportFilters, setTransportFilters] = useState<TransportReportFiltersState>({
    report_type: null,
    severity: null,
    status: null,
  });
  const [loading, setLoading] = useState(true);
  const [loadingAll, setLoadingAll] = useState(true);
  const [referralDialogOpen, setReferralDialogOpen] = useState(false);
  const [referralReport, setReferralReport] = useState<{
    id: string;
    type: "transport";
    title: string;
    description?: string;
    location?: string;
    date?: string;
    report_type?: string;
    severity?: string;
  } | null>(null);

  const [otherReport, setOtherReport] = useState<Record<string, unknown> | null>(null);
  const [otherLoading, setOtherLoading] = useState(false);
  const [otherError, setOtherError] = useState(false);
  const [selectedTransportForComments, setSelectedTransportForComments] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [transportDetailReport, setTransportDetailReport] = useState<TransportListRow | null>(null);
  const [transportInteractionNonce, setTransportInteractionNonce] = useState<
    Record<string, number>
  >({});

  const bumpTransportInteractions = useCallback((reportId: string) => {
    setTransportInteractionNonce((prev) => ({
      ...prev,
      [reportId]: (prev[reportId] ?? 0) + 1,
    }));
  }, []);

  const loadAllTransportReports = useCallback(async () => {
    if (!user) {
      setAllTransportReports([]);
      setLoadingAll(false);
      return;
    }
    setLoadingAll(true);
    try {
      let query = supabase
        .from("transport_reports")
        .select(
          `
          id,
          protocol_code,
          line_id,
          line_code_custom,
          report_type,
          severity,
          description,
          occurrence_date,
          occurrence_time,
          location,
          status,
          created_at,
          photos,
          user_id,
          line:transport_lines(line_code, line_name, line_type),
          transport_report_likes(count)
        `,
        )
        .order("created_at", { ascending: false })
        .limit(50);

      if (transportFilters.report_type) {
        query = query.eq("report_type", transportFilters.report_type);
      }
      if (transportFilters.severity) {
        query = query.eq("severity", transportFilters.severity);
      }
      if (transportFilters.status) {
        query = query.eq("status", transportFilters.status);
      }

      const { data, error } = await query;
      if (error) throw error;

      const userIds = [...new Set((data ?? []).map((r) => r.user_id).filter(Boolean))] as string[];
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", userIds);

      const profilesMap = new Map(profilesData?.map((p) => [p.id, p]));
      const withProfiles: TransportListRow[] =
        (data ?? []).map((row) => ({
          ...row,
          profiles: profilesMap.get(row.user_id as string),
        })) ?? [];

      setAllTransportReports(withProfiles);
    } catch (e) {
      console.error("Erro ao carregar contribuições de transporte:", e);
      setAllTransportReports([]);
    } finally {
      setLoadingAll(false);
    }
  }, [user, transportFilters]);

  useEffect(() => {
    void loadReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount
  }, []);

  useEffect(() => {
    void loadAllTransportReports();
  }, [loadAllTransportReports]);

  useEffect(() => {
    if (!highlightReportId || !user) {
      setOtherReport(null);
      setOtherError(false);
      setOtherLoading(false);
      return;
    }
    if (loading) return;

    const mine = reports.some((r) => r.id === highlightReportId);
    if (mine) {
      setOtherReport(null);
      setOtherError(false);
      setOtherLoading(false);
      return;
    }

    let cancelled = false;
    setOtherLoading(true);
    setOtherError(false);
    void (async () => {
      const { data, error } = await supabase
        .from("transport_reports")
        .select(
          `
          id,
          user_id,
          protocol_code,
          line_id,
          line_code_custom,
          report_type,
          severity,
          description,
          occurrence_date,
          occurrence_time,
          direction,
          recurrence_frequency,
          personal_impact,
          location,
          status,
          created_at,
          photos,
          line:transport_lines(line_code, line_name, line_type),
          transport_report_likes(count)
        `,
        )
        .eq("id", highlightReportId)
        .maybeSingle();

      if (cancelled) return;
      setOtherLoading(false);
      if (error || !data) {
        setOtherError(true);
        setOtherReport(null);
        return;
      }
      if (data.user_id === user.id) {
        setOtherReport(null);
        return;
      }
      setOtherReport(data as Record<string, unknown>);
    })();

    return () => {
      cancelled = true;
    };
  }, [highlightReportId, user, loading, reports]);

  useEffect(() => {
    if (!highlightReportId || loading || otherLoading || otherReport) return;
    if (otherError) return;
    const mine =
      reports.some((r) => r.id === highlightReportId) ||
      allTransportReports.some((r) => r.id === highlightReportId);
    if (!mine) return;
    const el = document.querySelector(
      `[data-transport-report-card="${CSS.escape(highlightReportId)}"]`,
    );
    if (el) {
      requestAnimationFrame(() => {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    }
  }, [
    highlightReportId,
    reports,
    allTransportReports,
    loading,
    otherReport,
    otherLoading,
    otherError,
  ]);

  const loadReports = async () => {
    try {
      const data = await getMyReports();
      setReports((data ?? []) as TransportListRow[]);
    } catch (err) {
      console.error("Error loading reports:", err);
    } finally {
      setLoading(false);
    }
  };

  const closeCommunityView = useCallback(() => {
    setSearchParams({});
    setOtherReport(null);
    setOtherError(false);
  }, [setSearchParams]);

  const renderTransportListCard = (
    report: TransportListRow,
    showAuthor: boolean,
    isHighlighted: boolean,
  ) => {
    const problem = transportProblems.find((p) => p.id === report.report_type);
    const reportIdStr = String(report.id);
    const apoiosCount = embeddedRelationCount(
      report as Record<string, unknown>,
      "transport_report_likes",
    );
    const photosMine = Array.isArray(report.photos) ? (report.photos as string[]) : [];
    const lineRow = report.line as { line_code?: string; line_name?: string } | undefined;
    const typeLabel = transportTypeLabel(report.report_type);
    const narrativeDesc = formatTransportReportDescriptionForDisplay(
      report.description as string | undefined,
    );
    const lineId = typeof report.line_id === "string" ? report.line_id : null;
    const lineLabel = [lineRow?.line_code, lineRow?.line_name].filter(Boolean).join(" - ");

    return (
      <Card
        key={reportIdStr}
        data-transport-report-card={reportIdStr}
        className={cn(
          "hover:shadow-md transition-shadow border-border",
          isHighlighted && "ring-2 ring-primary border-primary/50",
        )}
        data-testid="report-card"
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-2 gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Bus className="w-4 h-4 text-primary shrink-0" />
              <span className="font-medium">
                {lineRow?.line_code || report.line_code_custom || "Linha não informada"}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-end">
              {apoiosCount > 0 ? (
                <span
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground"
                  title="Apoios"
                >
                  <Heart className="w-3.5 h-3.5 text-red-500/80" aria-hidden />
                  {apoiosCount}
                </span>
              ) : null}
              <span className="text-xs text-muted-foreground">
                {formatShortDate(report.created_at as string)}
              </span>
            </div>
          </div>

          {showAuthor && report.profiles?.full_name ? (
            <p className="text-xs text-muted-foreground mb-2">Por {report.profiles.full_name}</p>
          ) : null}

          <div className="space-y-2 mb-2">
            <div className="flex items-center gap-2 flex-wrap">
              {problem ? (
                <problem.icon className={cn("w-4 h-4 shrink-0", problem.color)} aria-hidden />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-muted-foreground" aria-hidden />
              )}
              <p className="text-sm font-medium">{typeLabel}</p>
              {report.severity ? (
                <CitizenSeverityBadge severity={report.severity as string} size="sm" />
              ) : null}
            </div>

            {narrativeDesc ? (
              <p className="text-sm text-muted-foreground line-clamp-2">{narrativeDesc}</p>
            ) : null}
          </div>

          {photosMine.length > 0 ? (
            <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1">
              {photosMine.slice(0, 5).map((url, i) => (
                <button
                  key={`${url}-${i}`}
                  type="button"
                  onClick={() => openLightbox(photosMine, i)}
                  className="flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden border border-border bg-muted"
                >
                  <img src={url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
              {photosMine.length > 5 ? (
                <span className="flex-shrink-0 text-xs text-muted-foreground self-center">
                  +{photosMine.length - 5}
                </span>
              ) : null}
            </div>
          ) : null}

          <div className="space-y-1 mb-3">
            {report.location ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <MapPin className="w-3 h-3 shrink-0" aria-hidden />
                <span className="line-clamp-2">{String(report.location)}</span>
              </div>
            ) : null}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="w-3 h-3 shrink-0" aria-hidden />
              <span>
                {format(
                  new Date(report.created_at as string),
                  "dd 'de' MMMM 'de' yyyy 'às' HH:mm",
                  {
                    locale: ptBR,
                  },
                )}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="w-3 h-3 shrink-0" aria-hidden />
              <span>
                Ocorrência:{" "}
                {report.occurrence_date ? formatShortDate(report.occurrence_date as string) : "—"}
                {report.occurrence_time ? ` às ${report.occurrence_time}` : ""}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-border/50">
            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8"
                onClick={() => setTransportDetailReport(report)}
              >
                <FileText className="w-3.5 h-3.5 mr-1.5" aria-hidden />
                Ver detalhes
              </Button>
              <TransportReportInteractions
                reportId={reportIdStr}
                refreshNonce={transportInteractionNonce[reportIdStr] ?? 0}
                onCommentClick={() => setSelectedTransportForComments(report)}
              />
              {lineId ? (
                <TransportLineFollowButton
                  lineId={lineId}
                  lineLabel={lineLabel || undefined}
                  subscriptions={transportSubscriptions}
                  loading={transportSubscriptionsLoading}
                  toggleSubscription={toggleTransportSubscription}
                  className="h-8"
                />
              ) : null}
              {canReferToCouncilMember ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const title =
                      lineRow?.line_code ||
                      report.line_code_custom ||
                      typeLabel ||
                      "Relato de transporte";

                    setReferralReport({
                      id: reportIdStr,
                      type: "transport",
                      title,
                      description: report.description ? String(report.description) : undefined,
                      location:
                        (report as { location_address?: string }).location_address ||
                        (report.location ? String(report.location) : undefined),
                      date: report.created_at as string,
                      report_type: report.report_type ? String(report.report_type) : undefined,
                      severity: report.severity ? String(report.severity) : undefined,
                    });
                    setReferralDialogOpen(true);
                  }}
                >
                  Encaminhar para vereador
                </Button>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderCommunityCard = () => {
    if (!otherReport) return null;
    const problem = transportProblems.find((p) => p.id === otherReport.report_type);
    const line = otherReport.line as { line_code?: string; line_name?: string } | null | undefined;
    const otherApoios = embeddedRelationCount(
      otherReport as Record<string, unknown>,
      "transport_report_likes",
    );
    const otherId = String(otherReport.id);
    const photos = Array.isArray(otherReport.photos) ? (otherReport.photos as string[]) : [];
    const recurrenceRaw = otherReport.recurrence_frequency
      ? String(otherReport.recurrence_frequency)
      : "";
    const recurrenceLabel = RECURRENCE_LABELS[recurrenceRaw] || recurrenceRaw || null;
    const dirLabel = otherReport.direction
      ? DIRECTION_LABELS[String(otherReport.direction)] || String(otherReport.direction)
      : null;
    const otherTypeLabel = transportTypeLabel(otherReport.report_type);
    const otherNarrativeDesc = formatTransportReportDescriptionForDisplay(
      otherReport.description as string | undefined,
    );
    const otherLineId = typeof otherReport.line_id === "string" ? otherReport.line_id : null;
    const otherLineLabel = [line?.line_code, line?.line_name].filter(Boolean).join(" - ");

    return (
      <Card className="border-primary/40 ring-1 ring-primary/20">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <Badge className="bg-primary/15 text-primary border-primary/30 hover:bg-primary/15">
              Relato de outro cidadão
            </Badge>
            <Button type="button" variant="ghost" size="sm" onClick={closeCommunityView}>
              Fechar
            </Button>
          </div>

          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <Bus className="w-4 h-4 text-primary shrink-0" />
              <span className="font-medium">
                {line?.line_code || otherReport.line_code_custom || "Linha não informada"}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-end">
              {otherApoios > 0 ? (
                <span
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground"
                  title="Apoios"
                >
                  <Heart className="w-3.5 h-3.5 text-red-500/80" aria-hidden />
                  {otherApoios}
                </span>
              ) : null}
              <span className="text-xs text-muted-foreground">
                {otherReport.created_at ? formatShortDate(otherReport.created_at as string) : ""}
              </span>
            </div>
          </div>


          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              {problem ? (
                <problem.icon className={cn("w-4 h-4 shrink-0", problem.color)} aria-hidden />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-muted-foreground" aria-hidden />
              )}
              <p className="text-sm font-medium">{otherTypeLabel}</p>
              {otherReport.severity ? (
                <CitizenSeverityBadge severity={otherReport.severity as string} size="sm" />
              ) : null}
            </div>
            {otherNarrativeDesc ? (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {otherNarrativeDesc}
              </p>
            ) : null}
          </div>

          <ul className="text-xs text-muted-foreground space-y-1 border-t border-border/50 pt-3">
            <li className="flex flex-wrap gap-x-2">
              <Clock className="w-3 h-3 shrink-0 mt-0.5" aria-hidden />
              <span>
                Ocorrência:{" "}
                {otherReport.occurrence_date
                  ? formatShortDate(otherReport.occurrence_date as string)
                  : "—"}
                {otherReport.occurrence_time ? ` às ${otherReport.occurrence_time}` : ""}
              </span>
            </li>
            {dirLabel ? (
              <li>
                <span className="font-medium text-foreground/80">Sentido:</span> {dirLabel}
              </li>
            ) : null}
            {recurrenceLabel ? (
              <li>
                <span className="font-medium text-foreground/80">Frequência:</span>{" "}
                {recurrenceLabel}
              </li>
            ) : null}
            <li>
              <span className="font-medium text-foreground/80">Impacto na rotina:</span>{" "}
              {personalImpactLabel(otherReport.personal_impact)}
            </li>
            {otherReport.location ? (
              <li>
                <span className="font-medium text-foreground/80">Local:</span>{" "}
                {String(otherReport.location)}
              </li>
            ) : null}
          </ul>

          {photos.length > 0 ? (
            <div className="grid grid-cols-3 gap-2 max-w-md">
              {photos.slice(0, 3).map((url, i) => (
                <button
                  key={url}
                  type="button"
                  onClick={() => openLightbox(photos, i)}
                  className="block aspect-video rounded-md overflow-hidden border bg-muted w-full"
                >
                  <img src={url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-border/50">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8"
              onClick={() => setTransportDetailReport(otherReport as TransportListRow)}
            >
              <FileText className="w-3.5 h-3.5 mr-1.5" aria-hidden />
              Ver detalhes
            </Button>
            <TransportReportInteractions
              reportId={otherId}
              refreshNonce={transportInteractionNonce[otherId] ?? 0}
              onCommentClick={() => setSelectedTransportForComments(otherReport)}
            />
            {otherLineId ? (
              <TransportLineFollowButton
                lineId={otherLineId}
                lineLabel={otherLineLabel || undefined}
                subscriptions={transportSubscriptions}
                loading={transportSubscriptionsLoading}
                toggleSubscription={toggleTransportSubscription}
                className="h-8"
              />
            ) : null}
          </div>
        </CardContent>
      </Card>
    );
  };

  const showLoginHint = Boolean(highlightReportId && !user);
  const showEmptyMine =
    !loading && reports.length === 0 && !otherReport && !otherLoading && !showLoginHint;

  const listSkeletons = (
    <>
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i} className="border-border">
          <CardContent className="p-4">
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
      ))}
    </>
  );

  const selectedCommentNarrative = selectedTransportForComments
    ? formatTransportReportDescriptionForDisplay(
        selectedTransportForComments.description as string | undefined,
      )
    : undefined;

  return (
    <>
      <PageHeader title="Contribuições de Transporte" backTo="/relatos" />
      <div className="min-h-screen bg-background pt-[60px] pb-24">
        <div className="max-w-7xl mx-auto px-6 py-6 space-y-4 animate-fade-in">
          <Alert className="bg-primary/5 border-primary/20">
            <Info className="h-4 w-4 text-primary" />
            <AlertDescription className="text-sm text-muted-foreground">
              As contribuições sobre transporte público são analisadas em conjunto com outras
              experiências para identificar padrões e subsidiar políticas públicas.
            </AlertDescription>
          </Alert>

          {showLoginHint ? (
            <Alert>
              <AlertDescription className="text-sm">
                Entre na sua conta para ver o detalhe deste relato, curtir ou comentar.
                <Button
                  type="button"
                  variant="link"
                  className="px-2 h-auto"
                  onClick={() => navigate("/login")}
                >
                  Fazer login
                </Button>
              </AlertDescription>
            </Alert>
          ) : null}

          {highlightReportId && user && otherLoading ? (
            <Card className="border-border">
              <CardContent className="p-4">
                <Skeleton className="h-40 w-full" />
              </CardContent>
            </Card>
          ) : null}

          {highlightReportId && user && otherError && !otherLoading ? (
            <Alert variant="destructive">
              <AlertDescription className="text-sm">
                Não foi possível carregar este relato. O link pode estar incorreto ou o relato foi
                removido.
                <Button
                  type="button"
                  variant="link"
                  className="text-destructive px-2 h-auto"
                  onClick={closeCommunityView}
                >
                  Voltar
                </Button>
              </AlertDescription>
            </Alert>
          ) : null}

          {user && otherReport && !otherLoading ? renderCommunityCard() : null}

          <Tabs defaultValue="my-reports" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="my-reports">Minhas Contribuições</TabsTrigger>
              <TabsTrigger value="all-reports">Todas as Contribuições</TabsTrigger>
            </TabsList>

            <TabsContent value="my-reports" className="space-y-4">
              {loading ? (
                listSkeletons
              ) : showEmptyMine ? (
                <div className="text-center py-12">
                  <Bus className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-semibold text-foreground mb-1">
                    Nenhuma contribuição encontrada
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Compartilhe experiências sobre transporte para ajudar a melhorar a mobilidade na
                    cidade
                  </p>
                  <Button onClick={() => navigate("/ia")}>
                    <Plus className="w-4 h-4 mr-2" />
                    Compartilhar experiência
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {reports.map((report) =>
                    renderTransportListCard(report, false, highlightReportId === report.id),
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="all-reports" className="space-y-4">
              {!user ? (
                <Alert>
                  <AlertDescription className="text-sm">
                    Entre na sua conta para ver relatos de outros cidadãos e interagir com curtidas
                    e comentários.
                    <Button
                      type="button"
                      variant="link"
                      className="px-2 h-auto"
                      onClick={() => navigate("/login")}
                    >
                      Fazer login
                    </Button>
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  <TransportReportFilters
                    filters={transportFilters}
                    onFilterChange={setTransportFilters}
                  />

                  {loadingAll ? (
                    listSkeletons
                  ) : allTransportReports.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="mb-3 flex justify-center" aria-hidden>
                        <Search className="h-12 w-12 text-muted-foreground" />
                      </div>
                      <h3 className="font-semibold text-foreground mb-1">
                        Nenhuma contribuição encontrada
                      </h3>
                      <p className="text-sm text-muted-foreground">Tente ajustar os filtros</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {allTransportReports.map((report) =>
                        renderTransportListCard(report, true, highlightReportId === report.id),
                      )}
                    </div>
                  )}
                </>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <Dialog
        open={!!selectedTransportForComments}
        onOpenChange={(open) => {
          if (open) return;
          setSelectedTransportForComments(null);
        }}
      >
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Comentários</DialogTitle>
          </DialogHeader>
          {selectedTransportForComments ? (
            <div className="space-y-4">
              <div className="pb-4 border-b border-border">
                <h4 className="font-semibold mb-1">
                  {(selectedTransportForComments.line as { line_code?: string } | undefined)
                    ?.line_code ||
                    (selectedTransportForComments.line_code_custom as string) ||
                    "Linha não informada"}
                </h4>
                {selectedCommentNarrative ? (
                  <p className="text-sm text-muted-foreground">{selectedCommentNarrative}</p>
                ) : null}
              </div>
              <TransportReportComments
                reportId={String(selectedTransportForComments.id)}
                onThreadChanged={() =>
                  bumpTransportInteractions(String(selectedTransportForComments!.id))
                }
              />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!transportDetailReport}
        onOpenChange={(open) => {
          if (!open) setTransportDetailReport(null);
        }}
      >
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhe do relato</DialogTitle>
          </DialogHeader>
          {transportDetailReport ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                {embeddedRelationCount(
                  transportDetailReport as Record<string, unknown>,
                  "transport_report_likes",
                ) > 0 ? (
                  <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                    <Heart className="w-4 h-4 text-red-500/80 shrink-0" aria-hidden />
                    {embeddedRelationCount(
                      transportDetailReport as Record<string, unknown>,
                      "transport_report_likes",
                    )}{" "}
                    apoio(s)
                  </span>
                ) : null}
              </div>
              <div className="space-y-2 text-sm border-b border-border pb-4">
                <p>
                  <span className="text-muted-foreground">Linha: </span>
                  <span className="font-medium">
                    {(transportDetailReport.line as { line_code?: string } | undefined)
                      ?.line_code ||
                      transportDetailReport.line_code_custom ||
                      "—"}
                  </span>
                </p>
                <p>
                  <span className="text-muted-foreground">Tipo: </span>
                  {transportTypeLabel(transportDetailReport.report_type)}
                </p>
                {transportDetailReport.severity ? (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-muted-foreground">Gravidade: </span>
                    <CitizenSeverityBadge
                      severity={transportDetailReport.severity as string}
                      size="sm"
                    />
                  </div>
                ) : null}
                {formatTransportReportDescriptionForDisplay(
                  transportDetailReport.description as string | undefined,
                ) ? (
                  <p>
                    <span className="text-muted-foreground">Descrição: </span>
                    <span className="text-foreground">
                      {formatTransportReportDescriptionForDisplay(
                        transportDetailReport.description as string | undefined,
                      )}
                    </span>
                  </p>
                ) : null}
                <p className="text-muted-foreground">
                  <Calendar className="w-3.5 h-3.5 inline mr-1 align-text-bottom" aria-hidden />
                  Registrado em{" "}
                  {format(
                    new Date(transportDetailReport.created_at as string),
                    "dd/MM/yyyy 'às' HH:mm",
                    {
                      locale: ptBR,
                    },
                  )}
                </p>
                <p className="text-muted-foreground">
                  <Clock className="w-3.5 h-3.5 inline mr-1 align-text-bottom" aria-hidden />
                  Ocorrência:{" "}
                  {transportDetailReport.occurrence_date
                    ? formatShortDate(transportDetailReport.occurrence_date as string)
                    : "—"}
                  {transportDetailReport.occurrence_time
                    ? ` às ${transportDetailReport.occurrence_time}`
                    : ""}
                </p>
                {transportDetailReport.direction ? (
                  <p>
                    <span className="text-muted-foreground">Sentido: </span>
                    {DIRECTION_LABELS[String(transportDetailReport.direction)] ||
                      String(transportDetailReport.direction)}
                  </p>
                ) : null}
                {transportDetailReport.recurrence_frequency ? (
                  <p>
                    <span className="text-muted-foreground">Frequência: </span>
                    {RECURRENCE_LABELS[String(transportDetailReport.recurrence_frequency)] ||
                      String(transportDetailReport.recurrence_frequency)}
                  </p>
                ) : null}
                <p>
                  <span className="text-muted-foreground">Impacto na rotina: </span>
                  {personalImpactLabel(transportDetailReport.personal_impact)}
                </p>
                {transportDetailReport.location ? (
                  <p>
                    <span className="text-muted-foreground">Local: </span>
                    {String(transportDetailReport.location)}
                  </p>
                ) : null}
              </div>
              {Array.isArray(transportDetailReport.photos) &&
              (transportDetailReport.photos as string[]).length > 0 ? (
                <div>
                  <p className="text-sm font-medium mb-2">Fotos</p>
                  <div className="flex flex-wrap gap-2">
                    {(transportDetailReport.photos as string[]).slice(0, 6).map((url, i) => (
                      <button
                        key={url}
                        type="button"
                        onClick={() =>
                          openLightbox(transportDetailReport.photos as string[], i)
                        }
                        className="block w-20 h-20 rounded-lg overflow-hidden border bg-muted"
                      >
                        <img src={url} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
              <div>
                <p className="text-sm font-medium mb-2">Comentários</p>
                <TransportReportComments
                  reportId={String(transportDetailReport.id)}
                  onThreadChanged={() =>
                    bumpTransportInteractions(String(transportDetailReport.id))
                  }
                />
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {lightbox}

      <ReferralDialog
        open={referralDialogOpen}
        onOpenChange={(open) => {
          setReferralDialogOpen(open);
          if (!open) setReferralReport(null);
        }}
        report={referralReport ? { ...referralReport } : null}
        onComplete={() => {
          setReferralDialogOpen(false);
          setReferralReport(null);
        }}
      />
    </>
  );
}
