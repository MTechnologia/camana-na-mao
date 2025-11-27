import { useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAIJourney } from "@/contexts/AIJourneyContext";
import { useUnifiedAIChat } from "@/hooks/useUnifiedAIChat";
import { useAIConversations } from "@/hooks/useAIConversations";
import ChatEmptyState from "./ChatEmptyState";
import ChatMessageBubble from "./ChatMessageBubble";
import ChatInput from "./ChatInput";
import { Loader2 } from "lucide-react";
import { AI_JOURNEYS } from "@/config/aiJourneys";

const ChatArea = () => {
  const { currentJourney, activeConversationId, setJourney, setActiveConversationId } = useAIJourney();
  const { messages, isLoading, sendMessage } = useUnifiedAIChat(
    currentJourney,
    activeConversationId
  );
  const { createConversation } = useAIConversations();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const hasMessages = messages.length > 0;

  const handleSendMessage = async (content: string) => {
    if (!content.trim()) return;

    // Se não tem conversa ativa, criar uma nova com a jornada 'general'
    if (!activeConversationId && !currentJourney) {
      const generalJourney = AI_JOURNEYS.general;
      const newConvId = await createConversation('general', content);
      
      if (newConvId) {
        setJourney(generalJourney, newConvId);
        setActiveConversationId(newConvId);
        // Aguardar um tick para o estado atualizar
        setTimeout(() => sendMessage(content.trim()), 100);
        return;
      }
    }

    sendMessage(content.trim());
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Messages Area */}
      <ScrollArea className="flex-1 px-4" ref={scrollRef}>
        <div className="max-w-4xl mx-auto py-8">
          {!hasMessages ? (
            <ChatEmptyState onSuggestionClick={handleSendMessage} />
          ) : (
            <div className="space-y-6">
              {messages.map((msg) => (
                <ChatMessageBubble key={msg.id} message={msg} />
              ))}
              {isLoading && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Pensando...</span>
                </div>
              )}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="border-t border-border bg-card p-4">
        <div className="max-w-4xl mx-auto">
          <ChatInput onSendMessage={handleSendMessage} disabled={isLoading} />
        </div>
      </div>
    </div>
  );
};

export default ChatArea;
