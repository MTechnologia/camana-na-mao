import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface Comment {
  id: string;
  comment_text: string;
  created_at: string;
  user_id: string;
  profiles: {
    full_name: string;
    avatar_url: string | null;
  };
}

export const useUrbanReportComments = (reportId: string) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadComments = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("urban_report_comments")
        .select(
          `
          id,
          comment_text,
          created_at,
          user_id
        `,
        )
        .eq("report_id", reportId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Buscar perfis separadamente
      const userIds = [...new Set(data?.map((c) => c.user_id) || [])];
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", userIds);

      const profilesMap = new Map(profilesData?.map((p) => [p.id, p]));

      const commentsWithProfiles =
        data?.map((comment) => ({
          ...comment,
          profiles: profilesMap.get(comment.user_id) || { full_name: "Usuário", avatar_url: null },
        })) || [];

      setComments(commentsWithProfiles);
    } catch (error) {
      console.error("Erro ao carregar comentários:", error);
    } finally {
      setLoading(false);
    }
  }, [reportId]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  const addComment = async (text: string) => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Acesso negado",
        description: "Você precisa estar logado para comentar",
      });
      return false;
    }

    if (!text.trim()) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "O comentário não pode estar vazio",
      });
      return false;
    }

    setSubmitting(true);

    try {
      const { error } = await supabase.from("urban_report_comments").insert({
        report_id: reportId,
        user_id: user.id,
        comment_text: text.trim(),
      });

      if (error) throw error;

      toast({
        title: "Comentário enviado!",
        description: "Seu comentário foi adicionado com sucesso",
      });

      await loadComments();
      return true;
    } catch (error) {
      console.error("Erro ao adicionar comentário:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível adicionar o comentário",
      });
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  const deleteComment = async (commentId: string) => {
    try {
      const { error } = await supabase
        .from("urban_report_comments")
        .delete()
        .eq("id", commentId)
        .eq("user_id", user?.id);

      if (error) throw error;

      toast({
        title: "Comentário removido",
        description: "Seu comentário foi excluído com sucesso",
      });

      await loadComments();
    } catch (error) {
      console.error("Erro ao deletar comentário:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível remover o comentário",
      });
    }
  };

  return {
    comments,
    loading,
    submitting,
    addComment,
    deleteComment,
    refreshComments: loadComments,
  };
};
