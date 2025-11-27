import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface AIConversation {
  id: string;
  journeyId: string;
  title: string;
  lastMessage: string;
  lastMessagePreview: string;
  lastMessageAt: Date;
  messageCount: number;
  status: 'active' | 'archived';
}

export const useAIConversations = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [conversations, setConversations] = useState<AIConversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadConversations = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('ai_conversations')
        .select('*')
        .eq('user_id', user.id)
        .order('last_message_at', { ascending: false });

      if (error) throw error;

      const formatted: AIConversation[] = (data || []).map((conv) => {
        const messages = (conv.messages as any[]) || [];
        const lastMsg = messages[messages.length - 1];
        const lastMsgContent = lastMsg?.content || '';
        
        return {
          id: conv.id,
          journeyId: conv.journey_id || 'general',
          title: conv.title || 'Conversa sem título',
          lastMessage: lastMsgContent,
          lastMessagePreview: lastMsgContent.length > 100 ? lastMsgContent.substring(0, 100) + '...' : lastMsgContent,
          lastMessageAt: new Date(conv.last_message_at),
          messageCount: messages.length,
          status: conv.status as 'active' | 'archived',
        };
      });

      setConversations(formatted);
    } catch (error: any) {
      console.error('Error loading conversations:', error);
      toast({
        title: 'Erro ao carregar conversas',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadConversations();
  }, [user?.id]);

  const conversationsByJourney = useMemo(() => {
    const grouped = conversations.reduce((acc, conv) => {
      if (!acc[conv.journeyId]) {
        acc[conv.journeyId] = [];
      }
      acc[conv.journeyId].push(conv);
      return acc;
    }, {} as Record<string, AIConversation[]>);

    return grouped;
  }, [conversations]);

  const generateTitle = (firstMessage: string): string => {
    const maxLength = 50;
    const cleaned = firstMessage.trim();
    
    if (cleaned.length <= maxLength) {
      return cleaned;
    }
    
    return cleaned.substring(0, maxLength) + '...';
  };

  const createConversation = async (journeyId: string, firstMessage?: string) => {
    if (!user) return null;

    try {
      const title = firstMessage ? generateTitle(firstMessage) : 'Nova conversa';
      
      const { data, error } = await supabase
        .from('ai_conversations')
        .insert({
          user_id: user.id,
          journey_id: journeyId,
          title,
          messages: [],
          status: 'active',
          context: journeyId,
        })
        .select()
        .single();

      if (error) throw error;

      await loadConversations();
      return data.id;
    } catch (error: any) {
      console.error('Error creating conversation:', error);
      toast({
        title: 'Erro ao criar conversa',
        description: error.message,
        variant: 'destructive',
      });
      return null;
    }
  };

  const resumeConversation = async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from('ai_conversations')
        .select('*')
        .eq('id', conversationId)
        .maybeSingle();

      if (error) {
        console.error('Error resuming conversation:', error);
        throw error;
      }

      if (!data) {
        toast({
          title: 'Conversa não encontrada',
          variant: 'destructive',
        });
        return null;
      }

      return data;
    } catch (error: any) {
      console.error('Error resuming conversation:', error);
      toast({
        title: 'Erro ao retomar conversa',
        description: error.message,
        variant: 'destructive',
      });
      return null;
    }
  };

  const archiveConversation = async (conversationId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('ai_conversations')
        .update({ status: 'archived' })
        .eq('id', conversationId)
        .eq('user_id', user.id);

      if (error) throw error;

      await loadConversations();
      toast({
        title: 'Conversa arquivada',
        description: 'A conversa foi arquivada com sucesso',
      });
    } catch (error: any) {
      console.error('Error archiving conversation:', error);
      toast({
        title: 'Erro ao arquivar conversa',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const restoreConversation = async (conversationId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('ai_conversations')
        .update({ status: 'active', updated_at: new Date().toISOString() })
        .eq('id', conversationId)
        .eq('user_id', user.id);

      if (error) throw error;

      await loadConversations();
      toast({
        title: 'Conversa restaurada',
        description: 'A conversa foi restaurada com sucesso.',
      });
    } catch (error: any) {
      console.error('Error restoring conversation:', error);
      toast({
        title: 'Erro ao restaurar',
        description: 'Não foi possível restaurar a conversa.',
        variant: 'destructive',
      });
    }
  };

  const deleteConversation = async (conversationId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('ai_conversations')
        .delete()
        .eq('id', conversationId)
        .eq('user_id', user.id);

      if (error) throw error;

      await loadConversations();
      toast({
        title: 'Conversa deletada',
        description: 'A conversa foi deletada permanentemente.',
      });
    } catch (error: any) {
      console.error('Error deleting conversation:', error);
      toast({
        title: 'Erro ao deletar',
        description: 'Não foi possível deletar a conversa.',
        variant: 'destructive',
      });
    }
  };

  return {
    conversations,
    conversationsByJourney,
    createConversation,
    resumeConversation,
    archiveConversation,
    restoreConversation,
    deleteConversation,
    loadConversations,
    isLoading,
  };
};
