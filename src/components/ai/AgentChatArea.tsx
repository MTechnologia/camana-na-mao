import { useEffect, useRef, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAIJourney } from "@/contexts/AIJourneyContext";
import { useUnifiedAIChat } from "@/hooks/useUnifiedAIChat";
import { useAIConversations } from "@/hooks/useAIConversations";
import { useProfile } from "@/hooks/useProfile";
import ChatMessageBubble from "./ChatMessageBubble";
import ChatInput from "./ChatInput";
import ReportSuccessCard from "./ReportSuccessCard";
import ContextualGreeting from "./ContextualGreeting";
import QuickActionsCarousel from "./QuickActionsCarousel";
import TypingIndicator from "./TypingIndicator";
import { AI_JOURNEYS } from "@/config/aiJourneys";
import { motion, AnimatePresence } from "framer-motion";

const contentVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] as const }
  },
  exit: { 
    opacity: 0, 
    y: -20,
    transition: { duration: 0.2, ease: [0.4, 0, 1, 1] as const }
  }
};

const AgentChatArea = () => {
  const { currentJourney, activeConversationId, setJourney, setActiveConversationId, clearJourney } = useAIJourney();
  const [localConversationId, setLocalConversationId] = useState<string | null>(activeConversationId);
  const { profile, getInitials } = useProfile();
  const hasCleared = useRef(false);
  
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

  // Clear messages when returning to hub (both conversationId and journey are null)
  useEffect(() => {
    if (activeConversationId === null && !currentJourney && !hasCleared.current) {
      hasCleared.current = true;
      clearMessages();
      setLocalConversationId(null);
    } else if (activeConversationId !== null || currentJourney) {
      hasCleared.current = false;
    }
  }, [activeConversationId, currentJourney, clearMessages]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading, createdReport]);

  const showWelcome = !activeConversationId && !currentJourney;

  // User avatar data
  const userAvatarUrl = profile?.avatar_url;
  const userInitials = profile?.full_name ? getInitials(profile.full_name) : "?";

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

  const handleStartJourney = async (journeyId: string) => {
    // Get the journey config
    const journey = AI_JOURNEYS[journeyId as keyof typeof AI_JOURNEYS];
    if (!journey) return;

    // Clear any existing state
    clearMessages();
    
    // Create a new conversation with the initial message
    const newConvId = await createConversation(journey.id, journey.initialMessage);
    
    if (newConvId) {
      // Set the journey and conversation in context
      setLocalConversationId(newConvId);
      setJourney(journey, newConvId);
      setActiveConversationId(newConvId);
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      <AnimatePresence mode="wait">
        {showWelcome ? (
          <motion.div
            key="welcome"
            variants={contentVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="flex-1 flex flex-col items-center justify-center px-4"
          >
            <motion.div 
              className="w-full max-w-md flex flex-col items-center"
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, duration: 0.3 }}
            >
              <ContextualGreeting />
              <QuickActionsCarousel onStartJourney={handleStartJourney} />
              <motion.p 
                className="text-xs text-muted-foreground text-center mt-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.3 }}
              >
                Digite sua mensagem ou escolha uma opção acima
              </motion.p>
            </motion.div>
          </motion.div>
        ) : (
          <motion.div
            key="chat"
            variants={contentVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="flex-1 min-h-0"
          >
            <ScrollArea className="h-full">
              <div className="w-full max-w-2xl mx-auto px-4 py-6 space-y-4">
                {messages.map((msg, index) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05, duration: 0.2 }}
                  >
                    <ChatMessageBubble 
                      message={msg}
                      userAvatarUrl={userAvatarUrl}
                      userInitials={userInitials}
                    />
                  </motion.div>
                ))}
                
                {createdReport && createdReport.type === 'urban_report' && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    <ReportSuccessCard 
                      reportId={createdReport.id} 
                      onNewReport={handleNewReport}
                    />
                  </motion.div>
                )}
                
                {isLoading && !createdReport && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                  >
                    <TypingIndicator />
                  </motion.div>
                )}
                
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Area */}
      {!createdReport && (
        <motion.div 
          className="border-t border-border bg-card p-3 sm:p-4 shrink-0"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.3 }}
        >
          <div className="max-w-2xl mx-auto">
            <ChatInput 
              onSendMessage={handleSendMessage} 
              disabled={isLoading}
              placeholder={currentJourney ? `Fale sobre ${currentJourney.label.toLowerCase()}...` : "Digite sua mensagem..."}
            />
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default AgentChatArea;
