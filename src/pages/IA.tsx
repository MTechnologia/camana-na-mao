import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import AIHeader from "@/components/ai/AIHeader";
import AIAvatar from "@/components/ai/AIAvatar";
import AILoadingScreen from "@/components/ai/AILoadingScreen";
import AIWelcome from "@/components/ai/AIWelcome";
import InteractionCarousel from "@/components/ai/InteractionCarousel";
import OnboardingTutorial from "@/components/ai/OnboardingTutorial";
import SessionResume from "@/components/ai/SessionResume";
import AIMessage from "@/components/ai/AIMessage";
import OfflineMode from "@/components/ai/OfflineMode";
import ChatInput from "@/components/ai/ChatInput";
import JourneyHeader from "@/components/ai/JourneyHeader";
import MinimizedConversationsList from "@/components/ai/MinimizedConversationsList";
import { useFirstAccess } from "@/hooks/useFirstAccess";
import { useSessionContext } from "@/hooks/useSessionContext";
import { useUnifiedAIChat } from "@/hooks/useUnifiedAIChat";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { useAIJourney } from "@/contexts/AIJourneyContext";
import { getJourneyById, AI_JOURNEYS } from "@/config/aiJourneys";
import ContinueConversationModal from "@/components/ai/ContinueConversationModal";
import ConversationHub from "@/components/ai/ConversationHub";
import { useAIConversations } from "@/hooks/useAIConversations";

const IA = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [minimizedConversations, setMinimizedConversations] = useState<{
    conversationId: string;
    journeyId: string;
  }[]>(() => {
    // Restaurar do localStorage ao inicializar
    const saved = localStorage.getItem('minimizedConversations');
    return saved ? JSON.parse(saved) : [];
  });

  // Persistir minimizedConversations no localStorage
  useEffect(() => {
    if (minimizedConversations.length > 0) {
      localStorage.setItem('minimizedConversations', JSON.stringify(minimizedConversations));
    } else {
      localStorage.removeItem('minimizedConversations');
    }
  }, [minimizedConversations]);

  const { user } = useAuth();
  const { profile } = useProfile();
  const { isFirstAccess, completeOnboarding } = useFirstAccess();
  const { hasActiveSession, sessionData, clearSession, getTimeAgo } = useSessionContext();
  const { currentJourney, currentConversationId, setJourney, clearJourney } = useAIJourney();
  const { messages, isLoading: isChatLoading, sendMessage, clearMessages, addAssistantMessage } = useUnifiedAIChat(currentJourney, currentConversationId);
  const [showContinueModal, setShowContinueModal] = useState<{
    journeyId: string;
    conversation: any;
  } | null>(null);

  const {
    conversations,
    conversationsByJourney,
    createConversation,
    resumeConversation,
    archiveConversation,
    restoreConversation,
    deleteConversation,
    loadConversations,
    isLoading: isLoadingConversations,
  } = useAIConversations();

  // Display initial message when journey is set
  useEffect(() => {
    if (currentJourney?.initialMessage && messages.length === 0) {
      addAssistantMessage(currentJourney.initialMessage, "CMSP Connect");
    }
  }, [currentJourney, messages.length, addAssistantMessage]);

  // Get user's first name or fallback to "Cidadão"
  const userName = profile?.full_name?.split(" ")[0] || user?.user_metadata?.full_name?.split(" ")[0] || "Cidadão";

  useEffect(() => {
    // Check online status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Loading simulation
    const timer = setTimeout(() => {
      setIsLoading(false);
      if (isFirstAccess) {
        setShowOnboarding(true);
      }
    }, 2000);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [isFirstAccess]);

  // Handle navigation from navbar - auto-minimize active conversation
  useEffect(() => {
    const viewParam = searchParams.get("view");
    
    // Se veio da navbar (view=hub) e tem conversa ativa, auto-minimizar
    if (viewParam === 'hub' && currentJourney && currentConversationId) {
      setMinimizedConversations(prev => {
        const exists = prev.some(c => c.conversationId === currentConversationId);
        if (exists) return prev;
        return [...prev, { conversationId: currentConversationId, journeyId: currentJourney.id }];
      });
      clearJourney();
      
      // Limpar o parâmetro da URL
      navigate('/ia', { replace: true });
    }
  }, [searchParams, currentJourney, currentConversationId, clearJourney, navigate]);

  // Handle journey parameter
  useEffect(() => {
    const journeyParam = searchParams.get("journey");
    if (journeyParam && !currentJourney) {
      const journey = getJourneyById(journeyParam);
      if (journey) {
        setJourney(journey);
      }
    }
  }, [searchParams, currentJourney, setJourney]);

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    completeOnboarding();
  };

  const handleOnboardingSkip = () => {
    setShowOnboarding(false);
    completeOnboarding();
  };

  const handleInteractionSelect = async (journeyId: string) => {
    const journey = getJourneyById(journeyId);
    if (!journey) return;

    // Auto-minimizar conversa atual se existir e for diferente
    if (currentJourney && currentConversationId && currentJourney.id !== journeyId) {
      setMinimizedConversations(prev => {
        const exists = prev.some(c => c.conversationId === currentConversationId);
        if (exists) return prev;
        return [...prev, { conversationId: currentConversationId, journeyId: currentJourney.id }];
      });
      clearJourney();
      clearMessages();
    }

    // Verifica se já existe conversa ativa dessa jornada
    const existingConversations = conversationsByJourney[journeyId] || [];
    const activeConversation = existingConversations[0]; // Pega a mais recente

    if (activeConversation) {
      // Mostrar modal perguntando se quer continuar
      setShowContinueModal({ journeyId, conversation: activeConversation });
    } else {
      // Criar nova conversa diretamente
      await startNewConversation(journeyId, journey);
    }
  };

  const startNewConversation = async (journeyId: string, journey: any) => {
    clearMessages();
    const newConvId = await createConversation(journeyId);
    setJourney(journey, newConvId);
  };

  const handleResumeConversation = async (conversationId: string, journeyId: string) => {
    const journey = getJourneyById(journeyId);
    if (!journey) return;

    const conversationData = await resumeConversation(conversationId);
    if (conversationData) {
      setJourney(journey, conversationId);
    }
  };

  const handleArchiveConversation = async (conversationId: string) => {
    await archiveConversation(conversationId);
    toast({
      title: "Conversa arquivada",
      description: "A conversa foi arquivada com sucesso.",
    });
  };

  const handleStartNewConversation = async (journeyId: string) => {
    const journey = getJourneyById(journeyId);
    if (journey) {
      await startNewConversation(journeyId, journey);
    }
  };

  const handleContinueExisting = () => {
    if (!showContinueModal) return;
    
    const journey = getJourneyById(showContinueModal.journeyId);
    if (journey) {
      setJourney(journey, showContinueModal.conversation.id);
    }
    setShowContinueModal(null);
  };

  const handleStartNew = async () => {
    if (!showContinueModal) return;
    
    const journey = getJourneyById(showContinueModal.journeyId);
    if (journey) {
      await startNewConversation(showContinueModal.journeyId, journey);
    }
    setShowContinueModal(null);
  };

  const handleClearJourney = () => {
    clearJourney();
    clearMessages();
    // NÃO limpa minimizedConversations aqui - mantém conversas em andamento
    navigate("/ia");
  };

  const handleMinimizeConversation = () => {
    if (currentJourney && currentConversationId) {
      setMinimizedConversations(prev => {
        const exists = prev.some(c => c.conversationId === currentConversationId);
        if (exists) return prev;
        return [...prev, { conversationId: currentConversationId, journeyId: currentJourney.id }];
      });
      clearJourney();
    }
  };

  const handleResumeMinimized = (conversationId: string, journeyId: string) => {
    // Auto-minimiza conversa atual (se existir)
    if (currentJourney && currentConversationId) {
      setMinimizedConversations(prev => {
        const exists = prev.some(c => c.conversationId === currentConversationId);
        if (exists) return prev;
        return [...prev, { conversationId: currentConversationId, journeyId: currentJourney.id }];
      });
    }
    
    // Abre a selecionada
    const journey = getJourneyById(journeyId);
    if (journey) {
      setJourney(journey, conversationId);
      // Remove da lista de minimizadas
      setMinimizedConversations(prev => 
        prev.filter(c => c.conversationId !== conversationId)
      );
    }
  };

  const handleDismissMinimized = (conversationId: string) => {
    setMinimizedConversations(prev => 
      prev.filter(c => c.conversationId !== conversationId)
    );
  };

  const handleArchiveCurrentConversation = async () => {
    if (currentConversationId) {
      await archiveConversation(currentConversationId);
      handleClearJourney();
    }
  };

  const handleSendMessage = (message: string) => {
    if (message.trim()) {
      sendMessage(message.trim());
    }
  };

  if (!isOnline) {
    return <OfflineMode />;
  }

  if (isLoading) {
    return <AILoadingScreen />;
  }

  if (showOnboarding) {
    return (
      <OnboardingTutorial
        onComplete={handleOnboardingComplete}
        onSkip={handleOnboardingSkip}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/10 via-primary/5 via-30% to-transparent pb-24">
      {/* Header with escape route */}
      <AIHeader />

      {/* Journey Header - Shows when a journey is active */}
      {currentJourney && (
        <div className="pt-16">
          <JourneyHeader
            journey={currentJourney}
            onClear={handleClearJourney}
            onMinimize={handleMinimizeConversation}
            onArchive={handleArchiveCurrentConversation}
          />
        </div>
      )}

      {/* Header with AI Avatar - Only show when no journey is active */}
      {!currentJourney && (
        <div className="pt-20 pb-4 px-6">
          {/* Minimized Conversations List */}
          {minimizedConversations.length > 0 && (
            <MinimizedConversationsList
              conversations={conversations}
              minimizedConversations={minimizedConversations}
              onContinue={handleResumeMinimized}
              onDismiss={handleDismissMinimized}
              getJourneyById={getJourneyById}
            />
          )}
          
          <div className="flex flex-col items-center">
            <AIAvatar />
            <div className="mt-6 w-full">
              <AIWelcome userName={userName} />
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className={`px-6 ${currentJourney ? 'pt-4' : ''}`}>
        {/* Interaction Carousel - sempre visível quando não há jornada */}
        {!currentJourney && (
          <InteractionCarousel onSelect={handleInteractionSelect} />
        )}

        {/* Conversation Hub - All Journeys */}
        {!currentJourney && (
          <div className="pb-24">
            <ConversationHub
              conversations={conversations}
              showAllJourneys={true}
              onSelectConversation={handleResumeConversation}
              onNewConversation={handleStartNewConversation}
              onArchive={archiveConversation}
              onRestore={restoreConversation}
              onDelete={deleteConversation}
              isLoading={isLoadingConversations}
              activeConversationId={currentConversationId || undefined}
            />
          </div>
        )}

        {/* Chat Messages */}
        {messages.length > 0 && (
          <div className="mb-6 space-y-4">
            {messages.map((message) => (
              <div key={message.id}>
                {message.role === "user" ? (
                  <div className="flex justify-end">
                    <div className="bg-primary text-white rounded-2xl rounded-tr-none px-4 py-3 max-w-[80%]">
                      <p className="text-sm">{message.content}</p>
                      <span className="text-xs opacity-70 mt-1 block">
                        {message.timestamp}
                      </span>
                    </div>
                  </div>
                ) : (
                  <AIMessage
                    content={message.content}
                    source={message.source || "Portal da Câmara"}
                    timestamp={message.timestamp}
                  />
                )}
              </div>
            ))}
            {isChatLoading && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: "0.2s" }} />
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: "0.4s" }} />
                <span className="text-sm ml-2">Digitando...</span>
              </div>
            )}
          </div>
        )}

        {/* Mode Toggle removed - now handled in ChatInput */}

        {/* Chat Input */}
        <ChatInput onSendMessage={handleSendMessage} disabled={isChatLoading} />
      </div>

      {/* Modal de continuação de conversa */}
      <ContinueConversationModal
        isOpen={!!showContinueModal}
        conversation={showContinueModal?.conversation}
        journeyLabel={
          showContinueModal
            ? AI_JOURNEYS[showContinueModal.journeyId]?.label || ""
            : ""
        }
        onContinue={handleContinueExisting}
        onStartNew={handleStartNew}
        onClose={() => setShowContinueModal(null)}
      />
    </div>
  );
};

export default IA;
