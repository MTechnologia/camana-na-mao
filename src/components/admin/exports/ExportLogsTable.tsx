import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Download } from "lucide-react";
import { ResponsiveTable } from "@/components/admin/ResponsiveTable";
import { ReportsListPagination } from "@/components/admin/reports/ReportsListPagination";
import { getExportTypeLabel } from "@/lib/exportTypeLabels";

export const EXPORT_LOGS_PAGE_SIZE = 10;

interface ExportLog {
  id: string;
  export_type: string;
  format: string;
  status: string;
  row_count: number | null;
  created_at: string;
  completed_at: string | null;
  user_id: string;
  profiles?: { full_name: string };
}

function getStatusBadge(status: string) {
  switch (status) {
    case "completed":
      return <Badge className="bg-green-500/10 text-green-500">Concluído</Badge>;
    case "pending":
      return <Badge className="bg-yellow-500/10 text-yellow-500">Pendente</Badge>;
    case "error":
      return <Badge className="bg-red-500/10 text-red-500">Erro</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export function ExportLogsTable() {
  const [logs, setLogs] = useState<ExportLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const totalPages = Math.max(1, Math.ceil(totalCount / EXPORT_LOGS_PAGE_SIZE));

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const from = (page - 1) * EXPORT_LOGS_PAGE_SIZE;
      const to = from + EXPORT_LOGS_PAGE_SIZE - 1;

      const { data, error, count } = await supabase
        .from("export_logs")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;

      const total = count ?? 0;
      setTotalCount(total);

      const userIds = [...new Set(data?.map((l) => l.user_id) || [])];
      let profilesData: { id: string; full_name: string }[] | null = null;
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", userIds);
        profilesData = profiles;
      }

      setLogs(
        (data ?? []).map((log) => ({
          ...log,
          profiles: profilesData?.find((p) => p.id === log.user_id),
        })),
      );
    } catch (error) {
      console.error("[ExportLogsTable]", error);
      toast.error("Erro ao carregar histórico de exportações");
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    void fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  if (loading && logs.length === 0) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (!loading && totalCount === 0) {
    return (
      <div className="rounded-lg border bg-muted/20 py-12 text-center">
        <Download className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">Nenhuma exportação realizada ainda</p>
      </div>
    );
  }

  return (
    <div className={loading ? "pointer-events-none opacity-60" : undefined}>
      <ResponsiveTable
        data={logs}
        keyExtractor={(log) => log.id}
        columns={[
          {
            header: "Tipo",
            accessor: (log) => (
              <span className="font-medium">{getExportTypeLabel(log.export_type)}</span>
            ),
          },
          {
            header: "Formato",
            accessor: (log) => (
              <Badge variant="outline" className="text-xs">
                {log.format.toUpperCase()}
              </Badge>
            ),
            hideOnMobile: true,
          },
          {
            header: "Status",
            accessor: (log) => getStatusBadge(log.status),
          },
          {
            header: "Registros",
            accessor: (log) => (log.row_count ? log.row_count.toLocaleString("pt-BR") : "—"),
            hideOnMobile: true,
          },
          {
            header: "Usuário",
            accessor: (log) => log.profiles?.full_name || "Desconhecido",
            hideOnMobile: true,
          },
          {
            header: "Criado em",
            accessor: (log) => new Date(log.created_at).toLocaleDateString("pt-BR"),
          },
          {
            header: "Completado em",
            accessor: (log) =>
              log.completed_at ? new Date(log.completed_at).toLocaleDateString("pt-BR") : "—",
            hideOnMobile: true,
          },
        ]}
        renderMobileCard={(log) => (
          <div className="space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="font-medium">{getExportTypeLabel(log.export_type)}</p>
                <p className="text-sm text-muted-foreground">
                  {log.profiles?.full_name || "Desconhecido"}
                </p>
              </div>
              {getStatusBadge(log.status)}
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="outline" className="text-xs">
                {log.format.toUpperCase()}
              </Badge>
              {log.row_count != null && (
                <span className="text-muted-foreground">
                  {log.row_count.toLocaleString("pt-BR")} registros
                </span>
              )}
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{new Date(log.created_at).toLocaleDateString("pt-BR")}</span>
              {log.completed_at && (
                <span>Concluído: {new Date(log.completed_at).toLocaleDateString("pt-BR")}</span>
              )}
            </div>
          </div>
        )}
      />
      <ReportsListPagination
        page={page}
        totalPages={totalPages}
        totalCount={totalCount}
        pageSize={EXPORT_LOGS_PAGE_SIZE}
        onPageChange={setPage}
      />
    </div>
  );
}
