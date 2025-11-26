import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface AIConversation {
  id: string;
  journeyId: string;
  title: string | null;
  lastMessage: string;
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
        .eq('status', 'active')
        .order('last_message_at', { ascending: false });

      if (error) throw error;

      const formatted: AIConversation[] = (data || []).map((conv) => {
        const messages = (conv.messages as any[]) || [];
        const lastMsg = messages[messages.length - 1];
        
        return {
          id: conv.id,
          journeyId: conv.journey_id || 'general',
          title: conv.title || 'Conversa sem título',
          lastMessage: lastMsg?.content || '',
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

  const createConversation = async (journeyId: string, title?: string) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('ai_conversations')
        .insert({
          user_id: user.id,
          journey_id: journeyId,
          title: title || null,
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
        .single();

      if (error) throw error;
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
    try {
      const { error } = await supabase
        .from('ai_conversations')
        .update({ status: 'archived' })
        .eq('id', conversationId);

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

  return {
    conversations,
    conversationsByJourney,
    createConversation,
    resumeConversation,
    archiveConversation,
    loadConversations,
    isLoading,
  };
};
