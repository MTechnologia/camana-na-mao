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
import { useFirstAccess } from "@/hooks/useFirstAccess";
import { useSessionContext } from "@/hooks/useSessionContext";
import { useUnifiedAIChat } from "@/hooks/useUnifiedAIChat";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { useAIJourney } from "@/contexts/AIJourneyContext";
import { getJourneyById } from "@/config/aiJourneys";

const IA = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const { user } = useAuth();
  const { profile } = useProfile();
  const { isFirstAccess, completeOnboarding } = useFirstAccess();
  const { hasActiveSession, sessionData, clearSession, getTimeAgo } = useSessionContext();
  const { currentJourney, setJourney, clearJourney } = useAIJourney();
  const { messages, isLoading: isChatLoading, sendMessage, clearMessages, addAssistantMessage } = useUnifiedAIChat(currentJourney);

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

  const handleInteractionSelect = (journeyId: string) => {
    navigate(`/ia?journey=${journeyId}`);
  };

  const handleClearJourney = () => {
    clearJourney();
    clearMessages();
    navigate("/ia");
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
          <JourneyHeader journey={currentJourney} onClear={handleClearJourney} />
        </div>
      )}

      {/* Header with AI Avatar - Only show when no journey is active */}
      {!currentJourney && (
        <div className="pt-20 pb-8 px-6">
          <div className="flex flex-col items-center">
            <AIAvatar />
            <div className="mt-6 w-full">
              <AIWelcome userName={userName} />
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className={`px-6 ${currentJourney ? 'pt-4' : '-mt-6'}`}>
        {/* Session Resume - Only show when no journey is active */}
        {!currentJourney && hasActiveSession && sessionData && (
          <SessionResume
            lastTopic={sessionData.lastTopic}
            timeAgo={getTimeAgo()}
            onContinue={() => {
              toast({
                title: "Continuando conversa",
                description: "Retomando seu contexto anterior...",
              });
            }}
            onNewChat={clearSession}
          />
        )}

        {/* Interaction Carousel - Only show when no journey is active and no messages */}
        {!currentJourney && messages.length === 0 && (
          <InteractionCarousel onSelect={handleInteractionSelect} />
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
    </div>
  );
};

export default IA;
