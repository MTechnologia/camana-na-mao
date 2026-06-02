import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export type AuditAction =
  | "login"
  | "logout"
  | "create"
  | "update"
  | "delete"
  | "view"
  | "export"
  | "subscribe"
  | "unsubscribe";

interface AuditLogData {
  action: AuditAction;
  entityType: string;
  entityId?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export const useAuditLog = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const log = async (data: AuditLogData) => {
    if (!user) return;

    try {
      const { error } = await supabase.from("audit_logs").insert({
        user_id: user.id,
        action: data.action,
        entity_type: data.entityType,
        entity_id: data.entityId,
        old_values: data.oldValues || null,
        new_values: data.newValues || null,
        metadata: data.metadata || {},
        ip_address: null, // Client-side can't get real IP
        user_agent: navigator.userAgent,
      });

      if (error) {
        console.error("Erro ao registrar log de auditoria:", error);
      }
    } catch (error) {
      console.error("Erro ao registrar log de auditoria:", error);
    }
  };

  const getMyLogs = async (limit: number = 50) => {
    if (!user) return [];

    try {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Erro ao buscar logs:", error);
      toast({
        title: "Erro ao carregar logs",
        description: "Não foi possível carregar o histórico de auditoria.",
        variant: "destructive",
      });
      return [];
    }
  };

  const getAllLogs = async (filters?: {
    action?: string;
    entityType?: string;
    startDate?: Date;
    endDate?: Date;
    userId?: string;
    limit?: number;
  }) => {
    try {
      let query = supabase.from("audit_logs").select("*").order("created_at", { ascending: false });

      if (filters?.action) {
        query = query.eq("action", filters.action);
      }
      if (filters?.entityType) {
        query = query.eq("entity_type", filters.entityType);
      }
      if (filters?.userId) {
        query = query.eq("user_id", filters.userId);
      }
      if (filters?.startDate) {
        query = query.gte("created_at", filters.startDate.toISOString());
      }
      if (filters?.endDate) {
        query = query.lte("created_at", filters.endDate.toISOString());
      }
      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Erro ao buscar todos os logs:", error);
      toast({
        title: "Erro ao carregar logs",
        description: "Não foi possível carregar os logs de auditoria.",
        variant: "destructive",
      });
      return [];
    }
  };

  /**
   * HU-12.2 — Lista de atores únicos que aparecem em audit_logs.
   * Usada pra popular o select de "Usuário" no filtro da UI.
   */
  const getActors = async (): Promise<
    Array<{
      userId: string;
      fullName: string;
      email: string;
      logCount: number;
    }>
  > => {
    try {
      const { data, error } = await supabase.rpc("list_audit_log_actors");
      if (error) throw error;
      const rows = (data ?? []) as Array<{
        user_id: string;
        full_name: string;
        email: string;
        log_count: number;
      }>;
      return rows.map((r) => ({
        userId: r.user_id,
        fullName: r.full_name,
        email: r.email,
        logCount: Number(r.log_count),
      }));
    } catch (error) {
      console.error("Erro ao listar atores:", error);
      return [];
    }
  };

  return {
    log,
    getMyLogs,
    getAllLogs,
    getActors,
  };
};
