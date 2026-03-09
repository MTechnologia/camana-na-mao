import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { cleanInternalMarkers } from '@/lib/sanitizeMarkers';

export interface AIConversation {
  id: string;
  journeyId: string;
  title: string;
  lastMessage: string;
  lastMessagePreview: string;
  lastMessageAt: Date;
  createdAt: Date;
  messageCount: number;
  status: 'active' | 'archived';
  reportData?: {
    category?: string;
    address?: string;
    status?: string;
  };
}

// Extract report data from messages
const extractReportData = (messages: Array<{ content?: string }>): { category?: string; address?: string; status?: string } | undefined => {
  for (const msg of messages) {
    const content = msg?.content || "";
    
    // Try to extract from COLLECTION_PROGRESS marker
    const progressMatch = content.match(/\[COLLECTION_PROGRESS:(\w+):(\{.*?\})\]/);
    if (progressMatch) {
      try {
        const data = JSON.parse(progressMatch[2]);
        const category = data.category || data.report_type;
        const address = [data.street, data.street_number, data.neighborhood].filter(Boolean).join(", ");
        return {
          category: formatCategory(category),
          address: address || undefined,
          status: "Em andamento"
        };
      } catch { /* ignore parse errors */ }
    }
    
    // Try to extract from REPORT_CREATED marker
    const reportMatch = content.match(/\[REPORT_CREATED:([^\]]+)\]/);
    if (reportMatch) {
      return { status: "Registrado" };
    }
  }
  return undefined;
};

// Format category for display
const formatCategory = (category: string | undefined): string | undefined => {
  if (!category) return undefined;
  const categoryMap: Record<string, string> = {
    "iluminacao": "Iluminação",
    "via_publica": "Via Pública",
    "esgoto": "Esgoto/Saneamento",
    "lixo": "Lixo/Limpeza",
    "calcada": "Calçada",
    "sinalizacao": "Sinalização",
    "area_verde": "Área Verde",
    "animais": "Animais",
    "atraso": "Atraso",
    "lotacao": "Lotação",
    "manutencao": "Manutenção",
    "seguranca": "Segurança",
    "acessibilidade": "Acessibilidade"
  };
  return categoryMap[category.toLowerCase()] || category;
};

// Generate intelligent title from user messages (skip generic starts, find descriptive content)
const generateIntelligentTitle = (messages: Array<{ role?: string; content?: string }>): string => {
  const userMessages = messages.filter(m => m?.role === "user");
  
  // Generic phrases to skip
  const genericPhrases = [
    "quero registrar um problema urbano",
    "quero fazer um relato",
    "quero registrar",
    "preciso registrar",
    "problema urbano",
    "relato urbano"
  ];
  
  for (const msg of userMessages) {
    const cleaned = cleanInternalMarkers(msg.content || "").trim();
    const lowerCleaned = cleaned.toLowerCase();
    
    // Skip generic/short messages
    if (cleaned.length < 5) continue;
    if (genericPhrases.some(phrase => lowerCleaned.includes(phrase))) continue;
    
    // Found a descriptive message
    return cleaned.length > 80 ? cleaned.substring(0, 80) + "..." : cleaned;
  }
  
  // Fallback to first user message if no descriptive one found
  const firstUser = userMessages[0];
  if (firstUser?.content) {
    const cleaned = cleanInternalMarkers(firstUser.content);
    if (cleaned.length > 0) {
      return cleaned.length > 80 ? cleaned.substring(0, 80) + "..." : cleaned;
    }
  }
  
  return "Conversa iniciada";
};

export const useAIConversations = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [conversations, setConversations] = useState<AIConversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadConversations = useCallback(async () => {
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
        const messages = (conv.messages as Array<{ role?: string; content?: string }>) || [];
        const lastMsg = messages[messages.length - 1];
        const lastMsgContent = cleanInternalMarkers(lastMsg?.content || '');
        
        // Generate intelligent title from first user message
        const intelligentTitle = generateIntelligentTitle(messages);
        
        // Extract report data from messages
        const reportData = extractReportData(messages);
        
        return {
          id: conv.id,
          journeyId: conv.journey_id || 'general',
          title: intelligentTitle,
          lastMessage: lastMsgContent,
          lastMessagePreview: lastMsgContent.length > 100 ? lastMsgContent.substring(0, 100) + '...' : lastMsgContent,
          lastMessageAt: new Date(conv.last_message_at),
          createdAt: new Date(conv.created_at),
          messageCount: messages.length,
          status: conv.status as 'active' | 'archived',
          reportData,
        };
      });

      setConversations(formatted);
    } catch (error: unknown) {
      console.error('Error loading conversations:', error);
      toast({
        title: 'Erro ao carregar conversas',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- toast is stable
  }, [user]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

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

  const createConversation = async (journeyId: string, initialMessage?: string) => {
    if (!user) return null;

    try {
      const title = initialMessage ? generateTitle(initialMessage) : 'Nova conversa';
      
      // Criar array de mensagens com a mensagem inicial do assistente
      const messages = [];
      if (initialMessage) {
        messages.push({
          id: crypto.randomUUID(),
          role: "assistant",
          content: initialMessage,
          timestamp: new Date().toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          source: "IA Câmara na Mão",
        });
      }
      
      const { data, error } = await supabase
        .from('ai_conversations')
        .insert({
          user_id: user.id,
          journey_id: journeyId,
          title,
          messages,
          status: 'active',
          context: journeyId,
        })
        .select()
        .single();

      if (error) throw error;

      await loadConversations();
      return data.id;
    } catch (error: unknown) {
      console.error('Error creating conversation:', error);
      toast({
        title: 'Erro ao criar conversa',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
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
    } catch (error: unknown) {
      console.error('Error resuming conversation:', error);
      toast({
        title: 'Erro ao retomar conversa',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
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
    } catch (error: unknown) {
      console.error('Error archiving conversation:', error);
      toast({
        title: 'Erro ao arquivar conversa',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
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
    } catch (error: unknown) {
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
    } catch (error: unknown) {
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
