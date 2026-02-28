import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export const useUrbanReportInteractions = (reportId: string) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [likesCount, setLikesCount] = useState(0);
  const [commentsCount, setCommentsCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadInteractions = useCallback(async () => {
    try {
      // Carregar contagem de curtidas
      const { count: likes } = await supabase
        .from('urban_report_likes')
        .select('*', { count: 'exact', head: true })
        .eq('report_id', reportId);

      setLikesCount(likes || 0);

      // Carregar contagem de comentários
      const { count: comments } = await supabase
        .from('urban_report_comments')
        .select('*', { count: 'exact', head: true })
        .eq('report_id', reportId);

      setCommentsCount(comments || 0);

      // Verificar se o usuário curtiu
      if (user) {
        const { data } = await supabase
          .from('urban_report_likes')
          .select('id')
          .eq('report_id', reportId)
          .eq('user_id', user.id)
          .maybeSingle();

        setIsLiked(!!data);
      }
    } catch (error) {
      console.error('Erro ao carregar interações:', error);
    } finally {
      setLoading(false);
    }
  }, [reportId, user]);

  useEffect(() => {
    loadInteractions();
  }, [loadInteractions]);

  const toggleLike = async () => {
    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Acesso negado',
        description: 'Você precisa estar logado para curtir relatos',
      });
      return;
    }

    try {
      if (isLiked) {
        await supabase
          .from('urban_report_likes')
          .delete()
          .eq('report_id', reportId)
          .eq('user_id', user.id);

        setIsLiked(false);
        setLikesCount(prev => prev - 1);
      } else {
        await supabase
          .from('urban_report_likes')
          .insert({
            report_id: reportId,
            user_id: user.id,
          });

        setIsLiked(true);
        setLikesCount(prev => prev + 1);
      }
    } catch (error) {
      console.error('Erro ao curtir/descurtir:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível processar sua curtida',
      });
    }
  };

  return {
    likesCount,
    commentsCount,
    isLiked,
    loading,
    toggleLike,
    refreshInteractions: loadInteractions,
  };
};
