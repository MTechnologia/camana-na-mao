import { useEffect, useRef, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAIJourney } from "@/contexts/AIJourneyContext";
import { useUnifiedAIChat } from "@/hooks/useUnifiedAIChat";
import { useAIConversations } from "@/hooks/useAIConversations";
import ChatMessageBubble from "./ChatMessageBubble";
import ChatInput from "./ChatInput";
import ReportSuccessCard from "./ReportSuccessCard";
import ContextualGreeting from "./ContextualGreeting";
import QuickActionsCarousel from "./QuickActionsCarousel";
import { Loader2 } from "lucide-react";
import { AI_JOURNEYS } from "@/config/aiJourneys";

const AgentChatArea = () => {
  const { currentJourney, activeConversationId, setJourney, setActiveConversationId, clearJourney } = useAIJourney();
  const [localConversationId, setLocalConversationId] = useState<string | null>(activeConversationId);
  
  // Sync local ID with context
  useEffect(() => {
    setLocalConversationId(activeConversationId);
  }, [activeConversationId]);

  const { messages, isLoading, sendMessage, createdReport, clearCreatedReport, clearMessages } = useUnifiedAIChat(
    currentJourney || AI_JOURNEYS.general,
    localConversationId
  );
  const { createConversation } = useAIConversations();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading, createdReport]);

  const hasMessages = messages.length > 0;
  const showWelcome = !hasMessages && !activeConversationId && !currentJourney;

  const handleSendMessage = async (content: string) => {
    if (!content.trim()) return;

    // If no active conversation, create one first
    if (!localConversationId) {
      const journeyToUse = currentJourney || AI_JOURNEYS.general;
      const newConvId = await createConversation(journeyToUse.id, journeyToUse.initialMessage);
      
      if (newConvId) {
        setLocalConversationId(newConvId);
        setJourney(journeyToUse, newConvId);
        setActiveConversationId(newConvId);
        
        setTimeout(() => {
          sendMessage(content.trim());
        }, 50);
        return;
      }
    }

    sendMessage(content.trim());
  };

  const handleNewReport = () => {
    clearCreatedReport();
    clearMessages();
    setLocalConversationId(null);
    setActiveConversationId(null);
    clearJourney();
  };

  const handleStartJourney = (journeyId: string) => {
    // Clear any existing conversation to start fresh
    setLocalConversationId(null);
    setActiveConversationId(null);
    clearMessages();
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {showWelcome ? (
        // Welcome state - no scroll needed, just center content
        <div className="flex-1 flex flex-col items-center justify-center px-4">
          <div className="w-full max-w-md flex flex-col items-center">
            <ContextualGreeting />
            <QuickActionsCarousel onStartJourney={handleStartJourney} />
            <p className="text-xs text-muted-foreground text-center mt-4">
              Digite sua mensagem ou escolha uma opção acima
            </p>
          </div>
        </div>
      ) : (
        // Chat state - needs scroll
        <ScrollArea className="flex-1">
          <div className="w-full max-w-2xl mx-auto px-4 py-6 space-y-4">
            {messages.map((msg) => (
              <ChatMessageBubble key={msg.id} message={msg} />
            ))}
            
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
            
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      )}

      {/* Input Area */}
      {!createdReport && (
        <div className="border-t border-border bg-card p-3 sm:p-4 shrink-0">
          <div className="max-w-2xl mx-auto">
            <ChatInput 
              onSendMessage={handleSendMessage} 
              disabled={isLoading}
              placeholder={currentJourney ? `Fale sobre ${currentJourney.label.toLowerCase()}...` : "Digite sua mensagem..."}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default AgentChatArea;
