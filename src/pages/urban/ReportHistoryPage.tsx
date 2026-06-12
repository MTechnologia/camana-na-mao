import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import PageHeader from "@/components/ui/page-header";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useImageLightbox } from "@/components/ui/ImageLightbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { LucideIcon } from "lucide-react";
import {
  AlertCircle,
  Brush,
  Building2,
  Calendar,
  CloudFog,
  Droplets,
  FileText,
  Footprints,
  Heart,
  Info,
  Landmark,
  Lightbulb,
  MapPin,
  Plus,
  Rabbit,
  Route,
  Search,
  Sparkles,
  Trash2,
  Trees,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ReportFilters } from "@/components/urban/ReportFilters";
import { ReportInteractions } from "@/components/urban/ReportInteractions";
import { ReportComments } from "@/components/urban/ReportComments";
import { DeleteReportConfirmDialog } from "@/components/admin/DeleteReportConfirmDialog";
import { ReferralDialog } from "@/components/referral/ReferralDialog";
import { CitizenSeverityBadge } from "@/components/citizen/CitizenSeverityBadge";
import { toast } from "@/hooks/use-toast";
import { embeddedRelationCount } from "@/lib/citizenReportStatus";
import { formatShortDate } from "@/lib/dateUtils";
import { cn } from "@/lib/utils";

const categoryVisual: Record<string, { Icon: LucideIcon; color: string }> = {
  iluminacao: { Icon: Lightbulb, color: "text-amber-500" },
  calcada: { Icon: Footprints, color: "text-stone-600" },
  via_publica: { Icon: Route, color: "text-slate-600" },
  lixo: { Icon: Brush, color: "text-orange-600" },
  area_verde: { Icon: Trees, color: "text-green-600" },
  esgoto: { Icon: Droplets, color: "text-blue-500" },
  higiene_urbana: { Icon: Sparkles, color: "text-teal-600" },
  animais: { Icon: Rabbit, color: "text-amber-700" },
  poluicao: { Icon: CloudFog, color: "text-muted-foreground" },
  feedback_camara: { Icon: Landmark, color: "text-primary" },
  outro: { Icon: Building2, color: "text-muted-foreground" },
};

interface Report {
  id: string;
  protocol_code?: string | null;
  category: string;
  subcategory: string | null;
  description: string | null;
  severity: string | null;
  status: string | null;
  location_address: string | null;
  created_at: string;
  user_id: string;
  photos?: string[] | null;
  urban_report_likes?: unknown;
  profiles?: {
    full_name: string;
    avatar_url: string | null;
  };
}

interface Filters {
  category: string | null;
  severity: string | null;
  district: string | null;
}

const categoryLabels: Record<string, string> = {
  iluminacao: "Iluminação",
  calcada: "Calçada",
  via_publica: "Via Pública",
  lixo: "Lixo e Limpeza",
  area_verde: "Área Verde",
  esgoto: "Esgoto/Bueiro",
  higiene_urbana: "Higiene Urbana",
  animais: "Animais",
  poluicao: "Poluição",
  feedback_camara: "Feedback Câmara",
  outro: "Outro",
};

export default function ReportHistoryPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const reportIdFromQuery = searchParams.get("reportId");
  const { user } = useAuth();
  const { canReferToCouncilMember } = useUserRole();
  const { openLightbox, lightbox } = useImageLightbox();
  const [myReports, setMyReports] = useState<Report[]>([]);
  const [allReports, setAllReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>({
    category: null,
    severity: null,
    district: null,
  });
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [reportToDelete, setReportToDelete] = useState<Report | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [referralDialogOpen, setReferralDialogOpen] = useState(false);
  const [referralReport, setReferralReport] = useState<{
    id: string;
    type: "urban";
    title: string;
    description?: string;
    category?: string;
    location?: string;
    severity?: string;
    date?: string;
  } | null>(null);

  useEffect(() => {
    loadReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, []);

  useEffect(() => {
    loadAllReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadAllReports runs when filters change
  }, [filters]);

  useEffect(() => {
    const reportId = reportIdFromQuery;
    if (!reportId) return;

    const reportFromLists =
      myReports.find((report) => report.id === reportId) ||
      allReports.find((report) => report.id === reportId);

    if (reportFromLists) {
      setSelectedReport(reportFromLists);
      return;
    }

    let cancelled = false;
    void (async () => {
      const { data, error } = await supabase
        .from("urban_reports")
        .select(
          "id, protocol_code, category, subcategory, description, severity, status, location_address, created_at, user_id, photos, urban_report_likes(count)",
        )
        .eq("id", reportId)
        .maybeSingle();

      if (cancelled || error || !data) return;
      setSelectedReport(data as Report);
    })();

    return () => {
      cancelled = true;
    };
  }, [reportIdFromQuery, myReports, allReports]);

  useEffect(() => {
    if (!reportIdFromQuery || loading) return;
    const inList =
      myReports.some((r) => r.id === reportIdFromQuery) ||
      allReports.some((r) => r.id === reportIdFromQuery);
    if (!inList) return;
    const el = document.querySelector(
      `[data-urban-report-card="${CSS.escape(reportIdFromQuery)}"]`,
    );
    if (el) {
      requestAnimationFrame(() => {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    }
  }, [reportIdFromQuery, myReports, allReports, loading]);

  const loadReports = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("urban_reports")
        .select(
          "id, protocol_code, category, subcategory, description, severity, status, location_address, created_at, user_id, photos, urban_report_likes(count)",
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const userIds = [...new Set(data?.map((r) => r.user_id) || [])];
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", userIds);

      const profilesMap = new Map(profilesData?.map((p) => [p.id, p]));

      const reportsWithProfiles =
        data?.map((report) => ({
          ...report,
          profiles: profilesMap.get(report.user_id),
        })) || [];

      setMyReports(reportsWithProfiles);
    } catch (error) {
      console.error("Erro ao carregar minhas contribuições:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadAllReports = async () => {
    try {
      let query = supabase
        .from("urban_reports")
        .select(
          "id, protocol_code, category, subcategory, description, severity, status, location_address, created_at, user_id, photos, urban_report_likes(count)",
        )
        .order("created_at", { ascending: false })
        .limit(50);

      if (filters.category) {
        query = query.eq("category", filters.category);
      }

      if (filters.severity) {
        query = query.eq("severity", filters.severity);
      }

      const { data, error } = await query;

      if (error) throw error;

      const userIds = [...new Set(data?.map((r) => r.user_id) || [])];
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", userIds);

      const profilesMap = new Map(profilesData?.map((p) => [p.id, p]));

      const reportsWithProfiles =
        data?.map((report) => ({
          ...report,
          profiles: profilesMap.get(report.user_id),
        })) || [];

      setAllReports(reportsWithProfiles);
    } catch (error) {
      console.error("Erro ao carregar contribuições:", error);
    }
  };

  const handleDeleteReport = async () => {
    if (!reportToDelete) return;

    try {
      setDeleting(true);

      if (reportToDelete.photos?.length) {
        const photoPaths = reportToDelete.photos.map((url) => {
          const urlParts = url.split("/");
          return urlParts[urlParts.length - 1];
        });

        for (const path of photoPaths) {
          await supabase.storage
            .from("urban-reports")
            .remove([`${reportToDelete.user_id}/${path}`]);
        }
      }

      const { error } = await supabase.from("urban_reports").delete().eq("id", reportToDelete.id);

      if (error) throw error;

      setMyReports((prev) => prev.filter((r) => r.id !== reportToDelete.id));

      toast({
        title: "Contribuição excluída",
        description: "Sua contribuição foi removida com sucesso.",
      });
      setReportToDelete(null);
    } catch (error) {
      console.error("Error deleting report:", error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir a contribuição. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const renderReportCard = (
    report: Report,
    showAuthor: boolean = false,
    canDelete: boolean = false,
    isHighlighted: boolean = false,
  ) => {
    const canShowReferralAction = canReferToCouncilMember && !!user && report.user_id === user.id;
    const categoryLabel = categoryLabels[report.category] || report.category;
    const cardTitle = report.subcategory || categoryLabel;
    const apoiosCount = embeddedRelationCount(
      report as unknown as Record<string, unknown>,
      "urban_report_likes",
    );
    const catVis = categoryVisual[report.category];
    const CategoryIcon = catVis?.Icon ?? AlertCircle;
    const categoryIconClass = catVis?.color ?? "text-muted-foreground";
    const photosMine = Array.isArray(report.photos) ? report.photos : [];

    return (
      <Card
        key={report.id}
        data-urban-report-card={report.id}
        data-testid="report-card"
        className={cn(
          "hover:shadow-md transition-shadow border-border",
          isHighlighted && "ring-2 ring-primary border-primary/50",
        )}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-2 gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <MapPin className="w-4 h-4 text-primary shrink-0" aria-hidden />
              <span className="font-medium line-clamp-2">{cardTitle}</span>
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
                {formatShortDate(report.created_at)}
              </span>
              {canDelete ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground hover:bg-muted"
                  onClick={() => setReportToDelete(report)}
                  disabled={deleting}
                  aria-label="Excluir contribuição"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              ) : null}
            </div>
          </div>

          {showAuthor && report.profiles?.full_name ? (
            <p className="text-xs text-muted-foreground mb-2">Por {report.profiles.full_name}</p>
          ) : null}

          <div className="space-y-2 mb-2">
            {report.subcategory || report.severity ? (
              <div className="flex items-center gap-2 flex-wrap">
                <CategoryIcon className={cn("w-4 h-4 shrink-0", categoryIconClass)} aria-hidden />
                {report.subcategory ? <p className="text-sm font-medium">{categoryLabel}</p> : null}
                {report.severity ? (
                  <CitizenSeverityBadge severity={report.severity} size="sm" />
                ) : null}
              </div>
            ) : null}

            {report.description ? (
              <p className="text-sm text-muted-foreground line-clamp-2">{report.description}</p>
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
            {report.location_address ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <MapPin className="w-3 h-3 shrink-0" aria-hidden />
                <span className="line-clamp-2">{report.location_address}</span>
              </div>
            ) : null}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="w-3 h-3 shrink-0" aria-hidden />
              <span>
                {format(new Date(report.created_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", {
                  locale: ptBR,
                })}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-border/50">
            <div className="flex flex-wrap items-center gap-3">
              <ReportInteractions
                reportId={report.id}
                onCommentClick={() => setSelectedReport(report)}
              />

              {canShowReferralAction ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setReferralReport({
                      id: report.id,
                      type: "urban",
                      title: report.subcategory || categoryLabel,
                      description: report.description || undefined,
                      category: report.category,
                      location: report.location_address || undefined,
                      severity: report.severity || undefined,
                      date: report.created_at,
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-24 pt-[60px]">
        <PageHeader title="Contribuições Urbanas" backTo="/relatos" />
        <div className="max-w-7xl mx-auto px-6 py-6 space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24 pt-[60px]">
      <PageHeader title="Contribuições Urbanas" backTo="/relatos" />

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-4 animate-fade-in">
        <Alert className="bg-primary/5 border-primary/20">
          <Info className="h-4 w-4 text-primary" />
          <AlertDescription className="text-sm text-muted-foreground">
            As contribuições sobre problemas urbanos são analisadas em conjunto com outras
            experiências para identificar padrões e subsidiar políticas públicas.
          </AlertDescription>
        </Alert>

        <Tabs defaultValue="my-reports" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="my-reports">Minhas Contribuições</TabsTrigger>
            <TabsTrigger value="all-reports">Todas as Contribuições</TabsTrigger>
          </TabsList>

          <TabsContent value="my-reports" className="space-y-4">
            {myReports.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold text-foreground mb-1">
                  Nenhuma contribuição encontrada
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Compartilhe experiências sobre problemas urbanos para ajudar a melhorar sua cidade
                </p>
                <Button onClick={() => navigate("/")}>
                  <Plus className="w-4 h-4 mr-2" />
                  Compartilhar Experiência
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {myReports.map((report) => renderReportCard(report, false, true))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="all-reports" className="space-y-4">
            <ReportFilters filters={filters} onFilterChange={setFilters} />

            {allReports.length === 0 ? (
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
                {allReports.map((report) =>
                  renderReportCard(report, true, false, reportIdFromQuery === report.id),
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialog de Comentários */}
      <Dialog
        open={!!selectedReport}
        onOpenChange={(open) => {
          if (open) return;
          setSelectedReport(null);
          const params = new URLSearchParams(searchParams);
          params.delete("reportId");
          setSearchParams(params, { replace: true });
        }}
      >
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Comentários</DialogTitle>
          </DialogHeader>
          {selectedReport &&
            (() => {
              const apoiosDialog = embeddedRelationCount(
                selectedReport as unknown as Record<string, unknown>,
                "urban_report_likes",
              );
              return (
                <div className="space-y-4">
                  <div className="pb-4 border-b border-border space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {apoiosDialog > 0 ? (
                        <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                          <Heart className="w-4 h-4 text-red-500/80 shrink-0" aria-hidden />
                          {apoiosDialog} apoio(s)
                        </span>
                      ) : null}
                    </div>
                    <h4 className="font-semibold mb-1">
                      {categoryLabels[selectedReport.category] || selectedReport.category}
                    </h4>
                    {selectedReport.severity ? (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm text-muted-foreground">Gravidade:</span>
                        <CitizenSeverityBadge severity={selectedReport.severity} size="sm" />
                      </div>
                    ) : null}
                    {selectedReport.description && (
                      <p className="text-sm text-muted-foreground">{selectedReport.description}</p>
                    )}
                    {selectedReport.location_address ? (
                      <p className="text-sm text-muted-foreground flex items-start gap-2">
                        <MapPin className="w-4 h-4 shrink-0 mt-0.5" aria-hidden />
                        <span>{selectedReport.location_address}</span>
                      </p>
                    ) : null}
                    {Array.isArray(selectedReport.photos) && selectedReport.photos.length > 0 ? (
                      <div>
                        <p className="text-sm font-medium mb-2">Fotos</p>
                        <div className="flex flex-wrap gap-2">
                          {selectedReport.photos.slice(0, 6).map((url, i) => (
                            <button
                              key={url}
                              type="button"
                              onClick={() =>
                                openLightbox(selectedReport.photos as string[], i)
                              }
                              className="block w-20 h-20 rounded-lg overflow-hidden border bg-muted"
                            >
                              <img src={url} alt="" className="w-full h-full object-cover" />
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                  <ReportComments reportId={selectedReport.id} />
                </div>
              );
            })()}
        </DialogContent>
      </Dialog>

      {lightbox}

      <DeleteReportConfirmDialog
        open={!!reportToDelete}
        onOpenChange={(open) => !open && setReportToDelete(null)}
        onConfirm={handleDeleteReport}
        report={reportToDelete}
        variant="simple"
      />

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
    </div>
  );
}
