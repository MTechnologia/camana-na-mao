import { useEffect, useRef, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAIJourney } from "@/contexts/AIJourneyContext";
import { useUnifiedAIChat } from "@/hooks/useUnifiedAIChat";
import { useAIConversations } from "@/hooks/useAIConversations";
import ChatEmptyState from "./ChatEmptyState";
import ChatMessageBubble from "./ChatMessageBubble";
import ChatInput from "./ChatInput";
import ReportSuccessCard from "./ReportSuccessCard";
import { Loader2 } from "lucide-react";
import { AI_JOURNEYS } from "@/config/aiJourneys";

const ChatArea = () => {
  const { currentJourney, activeConversationId, setJourney, setActiveConversationId, clearJourney } = useAIJourney();
  const [localConversationId, setLocalConversationId] = useState<string | null>(activeConversationId);
  
  // Sincronizar ID local com o contexto
  useEffect(() => {
    setLocalConversationId(activeConversationId);
  }, [activeConversationId]);

  const { messages, isLoading, sendMessage, createdReport, clearCreatedReport, clearMessages } = useUnifiedAIChat(
    currentJourney || AI_JOURNEYS.general,
    localConversationId
  );
  const { createConversation } = useAIConversations();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, createdReport]);

  const hasMessages = messages.length > 0;

  const handleSendMessage = async (content: string) => {
    if (!content.trim()) return;

    // Se não tem conversa ativa, criar uma nova primeiro
    if (!localConversationId) {
      const journeyToUse = currentJourney || AI_JOURNEYS.general;
      // Passar mensagem inicial da jornada para criar a conversa
      const newConvId = await createConversation(journeyToUse.id, journeyToUse.initialMessage);
      
      if (newConvId) {
        // Atualizar estados locais e globais
        setLocalConversationId(newConvId);
        setJourney(journeyToUse, newConvId);
        setActiveConversationId(newConvId);
        
        // Enviar mensagem após um pequeno delay para garantir que o estado atualize
        setTimeout(() => {
          sendMessage(content.trim());
        }, 50);
        return;
      }
    }

    sendMessage(content.trim());
  };

  const handleNewReport = () => {
    // Clear current state and start fresh with urban_report journey
    clearCreatedReport();
    clearMessages();
    setLocalConversationId(null);
    setActiveConversationId(null);
    
    // Set journey to urban_report for a new report
    const urbanJourney = AI_JOURNEYS.urban_report;
    if (urbanJourney) {
      setJourney(urbanJourney);
    }
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
              
              {/* Show success card when report is created */}
              {createdReport && createdReport.type === 'urban_report' && (
                <ReportSuccessCard 
                  reportId={createdReport.id} 
                  onNewReport={handleNewReport}
                />
              )}
              
              {isLoading && !createdReport && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Pensando...</span>
                </div>
              )}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input Area - hide if report just created */}
      {!createdReport && (
        <div className="border-t border-border bg-card p-4">
          <div className="max-w-4xl mx-auto">
            <ChatInput onSendMessage={handleSendMessage} disabled={isLoading} />
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatArea;
