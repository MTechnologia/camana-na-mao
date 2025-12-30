import { useEffect, useRef, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useUnifiedAIChat } from "@/hooks/useUnifiedAIChat";
import { useAIConversations } from "@/hooks/useAIConversations";
import { useAIJourney } from "@/contexts/AIJourneyContext";
import { useProfile } from "@/hooks/useProfile";
import ChatMessageBubble from "./ChatMessageBubble";
import ChatInput from "./ChatInput";
// ReportSuccessCard removed - success summary now shown in agent message
import ContextualGreeting from "./ContextualGreeting";
import ContextualFeed from "./ContextualFeed";
import PriorityAction from "./PriorityAction";
import PromptChips, { CollectionTypePreset } from "./PromptChips";
import TypingIndicator from "./TypingIndicator";
import DataCollectionTracker from "./DataCollectionTracker";
import CapabilitiesOverlay from "./CapabilitiesOverlay";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";
import type { CollectionType } from "./DataCollectionTracker";

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
  const { activeConversationId, setActiveConversationId } = useAIJourney();
  const { profile, getInitials } = useProfile();
  const hasCleared = useRef(false);
  const pendingMessageRef = useRef<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isDiscoveryOpen, setIsDiscoveryOpen] = useState(false);
  const [presetCollectionType, setPresetCollectionType] = useState<CollectionType>(null);

  const { 
    messages, 
    isLoading,
    isHistoryLoaded,
    sendMessage, 
    createdReport, 
    clearCreatedReport, 
    clearMessages,
    addOptimisticMessage,
    collectionType,
    collectedFields
  } = useUnifiedAIChat(activeConversationId, presetCollectionType);
  
  const { createConversation } = useAIConversations();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Força re-render após hydration completa
  useEffect(() => {
    requestAnimationFrame(() => {
      setIsInitialized(true);
    });
  }, []);

  useEffect(() => {
    if (activeConversationId === null && !hasCleared.current) {
      hasCleared.current = true;
      clearMessages();
    } else if (activeConversationId !== null) {
      hasCleared.current = false;
    }
  }, [activeConversationId, clearMessages]);

  // Enviar mensagem pendente após conversa carregar completamente
  useEffect(() => {
    if (activeConversationId && pendingMessageRef.current && isHistoryLoaded && !isLoading) {
      const msg = pendingMessageRef.current;
      pendingMessageRef.current = null;
      sendMessage(msg);
    }
  }, [activeConversationId, isHistoryLoaded, isLoading, sendMessage]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading, createdReport]);

  const showWelcome = !activeConversationId;
  const userAvatarUrl = profile?.avatar_url;
  const userInitials = profile?.full_name ? getInitials(profile.full_name) : "?";

  const handleSendMessage = async (content: string) => {
    if (!content.trim()) return;

    if (!activeConversationId) {
      // Guardar mensagem para enviar após conversa criada
      pendingMessageRef.current = content.trim();
      
      const newConvId = await createConversation('general');
      if (newConvId) {
        setActiveConversationId(newConvId);
      }
      return;
    }

    sendMessage(content.trim());
  };

  const handleNewReport = () => {
    clearCreatedReport();
    clearMessages(false); // Clear messages but don't preserve collection type
    // Stay in chat - don't navigate away or set conversation to null
    // User can start typing immediately for a new report
  };

  const handleStartConversation = async (initialMessage?: string, collectionTypePreset?: CollectionTypePreset) => {
    setIsDiscoveryOpen(false);
    
    // Define o tipo de coleta ANTES de limpar para preservar
    if (collectionTypePreset) {
      setPresetCollectionType(collectionTypePreset as CollectionType);
    } else {
      setPresetCollectionType(null);
    }
    
    // Limpa mensagens mas preserva collectionType quando há preset
    clearMessages(!!collectionTypePreset);
    
    // UI otimista: adiciona mensagem do usuário imediatamente
    if (initialMessage) {
      addOptimisticMessage(initialMessage);
      pendingMessageRef.current = initialMessage;
    }
    
    const newConvId = await createConversation('general');
    
    if (newConvId) {
      setActiveConversationId(newConvId);
    }
  };

  const handleOpenDiscovery = () => {
    setIsDiscoveryOpen(true);
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
            className="flex-1 flex flex-col px-4 pt-4 pb-2"
          >
            {/* Topo: Saudação + Feed */}
            <motion.div 
              className="w-full max-w-md lg:max-w-2xl xl:max-w-4xl 2xl:max-w-5xl mx-auto flex flex-col items-center"
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, duration: 0.3 }}
            >
              <ContextualGreeting />
              <ContextualFeed />
            </motion.div>
            
            {/* Spacer */}
            <div className="flex-1 min-h-4" />
            
            {/* Priority Action + Prompt Chips */}
            <motion.div 
              className="w-full max-w-md lg:max-w-2xl xl:max-w-4xl 2xl:max-w-5xl mx-auto space-y-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.3 }}
            >
              {/* Priority Action - conditional */}
              <PriorityAction onAction={handleStartConversation} />
              
              {/* Prompt Chips Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-muted-foreground">
                    Sobre o que deseja falar?
                  </span>
                </div>
                
                <PromptChips 
                  onSelect={handleStartConversation} 
                  onOpenDiscovery={handleOpenDiscovery}
                />
                
                <p className="text-xs text-muted-foreground text-center">
                  Ou digite sua mensagem abaixo
                </p>
              </div>
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
            {/* Data Collection Progress Tracker */}
            <DataCollectionTracker 
              collectionType={collectionType}
              collectedFields={collectedFields}
            />
            
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
                
                {/* ReportSuccessCard removed - success summary now shown in agent message */}
                
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
            placeholder="Digite sua mensagem..."
            draftKey={activeConversationId || "new"}
          />
        </div>
      </motion.div>
      {/* Capabilities Discovery Overlay */}
      <CapabilitiesOverlay
        isOpen={isDiscoveryOpen}
        onClose={() => setIsDiscoveryOpen(false)}
        onSelectCapability={handleStartConversation}
      />
    </div>
  );
};

export default AgentChatArea;
