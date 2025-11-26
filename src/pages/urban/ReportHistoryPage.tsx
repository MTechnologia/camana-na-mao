import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "@/components/ui/page-header";
import FloatingNavbar from "@/components/FloatingNavbar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, AlertCircle, CheckCircle, Clock, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Report {
  id: string;
  category: string;
  subcategory: string | null;
  description: string | null;
  severity: string | null;
  status: string | null;
  location_address: string | null;
  created_at: string;
}

const categoryLabels: Record<string, string> = {
  iluminacao: "Iluminação",
  calcada: "Calçada",
  via: "Via Pública",
  lixo: "Lixo e Limpeza",
  verde: "Área Verde",
  outro: "Outro"
};

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pendente", variant: "secondary" },
  in_progress: { label: "Em Andamento", variant: "default" },
  resolved: { label: "Resolvido", variant: "outline" },
  rejected: { label: "Rejeitado", variant: "destructive" }
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
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("urban_reports")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setReports(data || []);
    } catch (error) {
      console.error("Erro ao carregar relatos:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string | null) => {
    switch (status) {
      case "resolved":
        return <CheckCircle className="w-4 h-4" />;
      case "in_progress":
        return <Clock className="w-4 h-4" />;
      case "rejected":
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-24 pt-[60px]">
        <PageHeader title="Meus Relatos" />
        <div className="p-4 space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
        <FloatingNavbar />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24 pt-[60px]">
      <PageHeader title="Meus Relatos" />
      
      <div className="p-4">
        {reports.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">📝</div>
            <h3 className="font-semibold text-foreground mb-1">
              Nenhum relato encontrado
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Comece a relatar problemas urbanos para melhorar sua cidade
            </p>
            <Button onClick={() => navigate("/relato-urbano")}>
              <Plus className="w-4 h-4 mr-2" />
              Fazer Relato
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map((report) => {
              const statusInfo = statusLabels[report.status || "pending"];
              
              return (
                <Card key={report.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-foreground">
                            {categoryLabels[report.category] || report.category}
                          </h3>
                          {report.subcategory && (
                            <Badge variant="outline" className="text-xs">
                              {report.subcategory}
                            </Badge>
                          )}
                        </div>
                        
                        {report.severity && (
                          <p className="text-xs text-muted-foreground mb-2">
                            Gravidade: {severityLabels[report.severity]}
                          </p>
                        )}
                      </div>
                      
                      <Badge variant={statusInfo.variant} className="flex items-center gap-1">
                        {getStatusIcon(report.status)}
                        {statusInfo.label}
                      </Badge>
                    </div>

                    {report.description && (
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {report.description}
                      </p>
                    )}

                    <div className="space-y-1">
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
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <FloatingNavbar />
    </div>
  );
}
