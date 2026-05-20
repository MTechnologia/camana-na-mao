import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface LembreteRow {
  id: string;
  user_id: string;
  status: string;
  created_at: string;
  nome: string | null;
  email: string | null;
  telefone: string | null;
}

export interface ParticipacaoRowDetail {
  id: string;
  tipo: string;
  nome: string;
  email: string;
  telefone: string;
  entidade: string | null;
  created_at: string;
  protocolo: number | null;
  sugestao: string | null;
}

export interface AudienciaEngagementDetail {
  lembretes: LembreteRow[];
  participacoes: ParticipacaoRowDetail[];
}

export function useAudienciaEngagementDetail() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<AudienciaEngagementDetail | null>(null);

  const load = useCallback(async (audienciaId: string) => {
    setLoading(true);
    setError(null);
    setDetail(null);
    try {
      const { data: inscricoes, error: inscError } = await supabase
        .from("audiencia_inscricoes")
        .select("id, user_id, status, created_at")
        .eq("audiencia_id", audienciaId)
        .order("created_at", { ascending: false });

      if (inscError) throw inscError;

      const userIds = [...new Set((inscricoes ?? []).map((i) => i.user_id))];
      const profileMap = new Map<
        string,
        { full_name: string | null; phone: string | null }
      >();

      if (userIds.length > 0) {
        const { data: profiles, error: profError } = await supabase
          .from("profiles")
          .select("id, full_name, phone")
          .in("id", userIds);
        if (profError) throw profError;
        (profiles ?? []).forEach((p) => {
          profileMap.set(p.id, { full_name: p.full_name, phone: p.phone });
        });
      }

      const emailByUserId = new Map<string, string>();
      const { data: emailRows, error: emailsError } =
        await supabase.rpc("admin_user_emails");
      if (emailsError) {
        console.warn("[useAudienciaEngagementDetail] admin_user_emails", emailsError);
      } else {
        (emailRows ?? []).forEach((row) => {
          const trimmed = row.email?.trim();
          if (trimmed) emailByUserId.set(row.user_id, trimmed);
        });
      }

      const lembretes: LembreteRow[] = (inscricoes ?? []).map((row) => {
        const prof = profileMap.get(row.user_id);
        return {
          id: row.id,
          user_id: row.user_id,
          status: row.status,
          created_at: row.created_at,
          nome: prof?.full_name ?? null,
          email: emailByUserId.get(row.user_id) ?? null,
          telefone: prof?.phone ?? null,
        };
      });

      const { data: participacoes, error: partError } = await (supabase as unknown as {
        from: (table: string) => {
          select: (cols: string) => {
            eq: (col: string, val: string) => {
              order: (
                col: string,
                opts: { ascending: boolean },
              ) => Promise<{ data: ParticipacaoRowDetail[] | null; error: unknown }>;
            };
          };
        };
      })
        .from("audiencia_participacoes")
        .select(
          "id, tipo, nome, email, telefone, entidade, created_at, protocolo, sugestao",
        )
        .eq("audiencia_id", audienciaId)
        .order("created_at", { ascending: false });

      if (partError) throw partError;

      setDetail({
        lembretes,
        participacoes: (participacoes ?? []) as ParticipacaoRowDetail[],
      });
    } catch (err) {
      console.error("[useAudienciaEngagementDetail]", err);
      setError("Não foi possível carregar inscritos e manifestações.");
    } finally {
      setLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    setDetail(null);
    setError(null);
  }, []);

  return { detail, loading, error, load, clear };
}
