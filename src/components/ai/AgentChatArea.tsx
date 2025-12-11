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
import ContextualFeed from "./ContextualFeed";
import QuickActionsCarousel from "./QuickActionsCarousel";
import TypingIndicator from "./TypingIndicator";
import JourneyProgressTracker from "./JourneyProgressTracker";
import JourneySuggestionCard from "./JourneySuggestionCard";
import { AI_JOURNEYS } from "@/config/aiJourneys";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare } from "lucide-react";

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

// Journeys that collect structured data and should show progress tracker
const STRUCTURED_JOURNEYS = ['urban_report', 'transport', 'evaluate'];

const AgentChatArea = () => {
  const { currentJourney, activeConversationId, setJourney, setActiveConversationId, clearJourney } = useAIJourney();
  const [localConversationId, setLocalConversationId] = useState<string | null>(activeConversationId);
  const { profile, getInitials } = useProfile();
  const hasCleared = useRef(false);
  
  useEffect(() => {
    setLocalConversationId(activeConversationId);
  }, [activeConversationId]);

  const { messages, isLoading, sendMessage, createdReport, clearCreatedReport, clearMessages, detectedIntent, dismissIntent } = useUnifiedAIChat(
    currentJourney || AI_JOURNEYS.general,
    localConversationId
  );
  const { createConversation } = useAIConversations();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeConversationId === null && !currentJourney && !hasCleared.current) {
      hasCleared.current = true;
      clearMessages();
      setLocalConversationId(null);
    } else if (activeConversationId !== null || currentJourney) {
      hasCleared.current = false;
    }
  }, [activeConversationId, currentJourney, clearMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading, createdReport]);

  const showWelcome = !activeConversationId && !currentJourney;
  const showProgressTracker = currentJourney && STRUCTURED_JOURNEYS.includes(currentJourney.id) && messages.length > 0;

  const userAvatarUrl = profile?.avatar_url;
  const userInitials = profile?.full_name ? getInitials(profile.full_name) : "?";

  const handleSendMessage = async (content: string) => {
    if (!content.trim()) return;

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
    const journey = AI_JOURNEYS[journeyId as keyof typeof AI_JOURNEYS];
    if (!journey) return;

    clearMessages();
    
    const newConvId = await createConversation(journey.id, journey.initialMessage);
    
    if (newConvId) {
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
              className="w-full max-w-md lg:max-w-2xl xl:max-w-4xl 2xl:max-w-5xl flex flex-col items-center"
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, duration: 0.3 }}
            >
              <ContextualGreeting />
              
              {/* Minimal Contextual Feed - News & Events */}
              <ContextualFeed />
              
              {/* Section Title for Quick Actions */}
              <motion.div 
                className="flex items-center gap-2 w-full max-w-md px-4 mt-6 mb-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.25, duration: 0.3 }}
              >
                <MessageSquare className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">
                  Inicie uma conversa com a Câmara
                </span>
              </motion.div>
              
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
            className="flex-1 min-h-0 flex flex-col"
          >
            {/* Progress Tracker for Structured Journeys */}
            {showProgressTracker && (
              <div className="px-4 py-2 border-b border-border bg-card/50 shrink-0">
                <div className="max-w-2xl lg:max-w-3xl xl:max-w-4xl mx-auto">
                  <JourneyProgressTracker 
                    journeyId={currentJourney.id}
                    messages={messages}
                  />
                </div>
              </div>
            )}

            <ScrollArea className="flex-1">
              <div className="w-full max-w-2xl lg:max-w-3xl xl:max-w-4xl mx-auto px-4 py-6 space-y-4">
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
                
                {/* Journey Suggestion Card - shown when intent is detected */}
                <AnimatePresence>
                  {detectedIntent && !createdReport && !isLoading && (
                    <JourneySuggestionCard
                      journeyType={detectedIntent.journey}
                      confidence={detectedIntent.confidence >= 0.9 ? "high" : "medium"}
                      onAccept={() => {
                        dismissIntent();
                        handleStartJourney(detectedIntent.journey);
                      }}
                      onDismiss={dismissIntent}
                    />
                  )}
                </AnimatePresence>
                
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

      {!createdReport && (
        <motion.div 
          className="border-t border-border bg-card p-3 sm:p-4 shrink-0"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.3 }}
        >
          <div className="max-w-2xl lg:max-w-3xl xl:max-w-4xl mx-auto">
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
