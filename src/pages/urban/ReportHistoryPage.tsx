import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "@/components/ui/page-header";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Calendar, MapPin, Plus, Trash2, Info, FileText } from "lucide-react";
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
import { toast } from "@/hooks/use-toast";

interface Report {
  id: string;
  category: string;
  subcategory: string | null;
  description: string | null;
  severity: string | null;
  location_address: string | null;
  created_at: string;
  user_id: string;
  photos?: string[] | null;
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
  outro: "Outro"
};

const severityLabels: Record<string, string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
  critical: "Crítica"
};

export default function ReportHistoryPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { canReferToCouncilMember } = useUserRole();
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

  const loadReports = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("urban_reports")
        .select("id, category, subcategory, description, severity, location_address, created_at, user_id, photos")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const userIds = [...new Set(data?.map(r => r.user_id) || [])];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);

      const profilesMap = new Map(profilesData?.map(p => [p.id, p]));

      const reportsWithProfiles = data?.map(report => ({
        ...report,
        profiles: profilesMap.get(report.user_id)
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
        .select("id, category, subcategory, description, severity, location_address, created_at, user_id, photos")
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

      const userIds = [...new Set(data?.map(r => r.user_id) || [])];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);

      const profilesMap = new Map(profilesData?.map(p => [p.id, p]));

      const reportsWithProfiles = data?.map(report => ({
        ...report,
        profiles: profilesMap.get(report.user_id)
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

      const { error } = await supabase
        .from("urban_reports")
        .delete()
        .eq("id", reportToDelete.id);

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
    canDelete: boolean = false
  ) => {
    const canShowReferralAction =
      canReferToCouncilMember && !!user && report.user_id === user.id;

    return (
      <Card key={report.id} className="hover:shadow-md transition-shadow" data-testid="report-card">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              {report.subcategory && (
                <h3 className="font-semibold text-foreground mb-1">
                  {report.subcategory}
                </h3>
              )}
              
              {showAuthor && report.profiles && (
                <p className="text-xs text-muted-foreground mb-1">
                  Por {report.profiles.full_name}
                </p>
              )}

              {report.severity && (
                <p className="text-xs text-muted-foreground">
                  Gravidade: {severityLabels[report.severity]}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {categoryLabels[report.category] || report.category}
              </Badge>
              
              {canDelete && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted hover:scale-110 transition-all duration-200"
                  onClick={() => setReportToDelete(report)}
                  disabled={deleting}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>

          {report.description && (
            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
              {report.description}
            </p>
          )}

          {report.photos && report.photos.length > 0 && (
            <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1">
              {report.photos.slice(0, 5).map((url, i) => (
                <a
                  key={i}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden border border-border bg-muted"
                >
                  <img src={url} alt="" className="w-full h-full object-cover" />
                </a>
              ))}
              {report.photos.length > 5 && (
                <span className="flex-shrink-0 text-xs text-muted-foreground self-center">+{report.photos.length - 5}</span>
              )}
            </div>
          )}

          <div className="space-y-1 mb-3">
            {report.location_address && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <MapPin className="w-3 h-3" />
                <span className="line-clamp-1">{report.location_address}</span>
              </div>
            )}

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="w-3 h-3" />
              <span>
                {format(new Date(report.created_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-border/50">
            <div className="flex items-center gap-3">
              <ReportInteractions
                reportId={report.id}
                onCommentClick={() => setSelectedReport(report)}
              />

              {canShowReferralAction && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setReferralReport({
                      id: report.id,
                      type: "urban",
                      title:
                        report.subcategory ||
                        categoryLabels[report.category] ||
                        report.category,
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
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-24 pt-[60px]">
        <PageHeader title="Contribuições Urbanas" />
        <div className="p-4 space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24 pt-[60px]">
      <PageHeader title="Contribuições Urbanas" />

      <div className="p-4">
        {/* Explicação do propósito */}
        <Alert className="bg-primary/5 border-primary/20 mb-4">
          <Info className="h-4 w-4 text-primary" />
          <AlertDescription className="text-sm text-muted-foreground">
            Suas contribuições sobre problemas urbanos são analisadas em conjunto 
            para identificar padrões e subsidiar políticas públicas de melhoria da cidade.
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
                <div className="text-4xl mb-3">🔍</div>
                <h3 className="font-semibold text-foreground mb-1">
                  Nenhuma contribuição encontrada
                </h3>
                <p className="text-sm text-muted-foreground">
                  Tente ajustar os filtros
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {allReports.map((report) => renderReportCard(report, true))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialog de Comentários */}
      <Dialog open={!!selectedReport} onOpenChange={(open) => !open && setSelectedReport(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Comentários</DialogTitle>
          </DialogHeader>
          {selectedReport && (
            <div className="space-y-4">
              <div className="pb-4 border-b border-border">
                <h4 className="font-semibold mb-1">
                  {categoryLabels[selectedReport.category] || selectedReport.category}
                </h4>
                {selectedReport.description && (
                  <p className="text-sm text-muted-foreground">{selectedReport.description}</p>
                )}
              </div>
              <ReportComments reportId={selectedReport.id} />
            </div>
          )}
        </DialogContent>
      </Dialog>

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
