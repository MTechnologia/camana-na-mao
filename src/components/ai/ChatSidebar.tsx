import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAIConversations } from "@/hooks/useAIConversations";
import { useAIJourney } from "@/contexts/AIJourneyContext";

import ChatConversationItem from "./ChatConversationItem";
import { useMemo, useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface ChatSidebarProps {
  onConversationClick?: () => void;
}

const ChatSidebar = ({ onConversationClick }: ChatSidebarProps) => {
  const { conversations, deleteConversation } = useAIConversations();
  const { clearJourney, setActiveConversationId, activeConversationId, setJourney } = useAIJourney();
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  const handleNewChat = () => {
    clearJourney();
    setActiveConversationId(null);
  };

  const handleDeleteConversation = async (conversationId: string) => {
    await deleteConversation(conversationId);
    
    // Se deletou a conversa ativa, limpar estado e voltar para seleção de jornada
    if (activeConversationId === conversationId) {
      setActiveConversationId(null);
      clearJourney();
    }
    
    toast({
      title: "Conversa excluída",
      description: "A conversa foi removida com sucesso.",
    });
  };

  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    
    const query = searchQuery.toLowerCase();
    return conversations.filter(
      (conv) =>
        conv.title.toLowerCase().includes(query) ||
        conv.lastMessage.toLowerCase().includes(query)
    );
  }, [conversations, searchQuery]);

  const groupedConversations = useMemo(() => {
    const now = new Date();
    const groups: Record<string, typeof conversations> = {
      Hoje: [],
      Ontem: [],
      "Últimos 7 dias": [],
      "Últimos 30 dias": [],
      "Mais antigas": [],
    };

    filteredConversations.forEach((conv) => {
      const diffInHours = (now.getTime() - conv.lastMessageAt.getTime()) / (1000 * 60 * 60);
      
      if (diffInHours < 24) {
        groups["Hoje"].push(conv);
      } else if (diffInHours < 48) {
        groups["Ontem"].push(conv);
      } else if (diffInHours < 168) {
        groups["Últimos 7 dias"].push(conv);
      } else if (diffInHours < 720) {
        groups["Últimos 30 dias"].push(conv);
      } else {
        groups["Mais antigas"].push(conv);
      }
    });

    return groups;
  }, [filteredConversations]);

  const handleConversationClick = (conversationId: string, journeyId: string) => {
    setActiveConversationId(conversationId);
    onConversationClick?.();
  };

  return (
    <div className="flex flex-col h-full w-full pt-12">
      {/* Search - Top com padding para não sobrepor o X */}
      <div className="p-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar conversas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Conversations List - Center with scroll */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {Object.entries(groupedConversations).map(([group, convs]) => {
            if (convs.length === 0) return null;

            return (
              <div key={group} className="mb-4">
                <h3 className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {group}
                </h3>
                <div className="space-y-1">
                  {convs.map((conv) => (
                    <ChatConversationItem
                      key={conv.id}
                      conversation={conv}
                      onClick={(journeyId) => handleConversationClick(conv.id, journeyId)}
                      onDelete={() => handleDeleteConversation(conv.id)}
                    />
                  ))}
                </div>
              </div>
            );
          })}

          {filteredConversations.length === 0 && (
            <div className="p-4 text-center text-sm text-muted-foreground">
              {searchQuery ? "Nenhuma conversa encontrada" : "Nenhuma conversa ainda"}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* New Chat Button - Footer */}
      <div className="p-3 border-t border-border mt-auto">
        <Button
          onClick={handleNewChat}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
          size="lg"
        >
          <Plus className="h-5 w-5 mr-2" />
          Nova Conversa
        </Button>
      </div>
    </div>
  );
};

export default ChatSidebar;
