import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AIHeader from "@/components/ai/AIHeader";
import AIAvatar from "@/components/ai/AIAvatar";
import AILoadingScreen from "@/components/ai/AILoadingScreen";
import AIWelcome from "@/components/ai/AIWelcome";
import InteractionButtons from "@/components/ai/InteractionButtons";
import OnboardingTutorial from "@/components/ai/OnboardingTutorial";
import SessionResume from "@/components/ai/SessionResume";
import AIMessage from "@/components/ai/AIMessage";
import OfflineMode from "@/components/ai/OfflineMode";
import ChatInput from "@/components/ai/ChatInput";
import { useFirstAccess } from "@/hooks/useFirstAccess";
import { useSessionContext } from "@/hooks/useSessionContext";
import { useAIChat } from "@/hooks/useAIChat";
import { useToast } from "@/hooks/use-toast";

const IA = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const { isFirstAccess, completeOnboarding } = useFirstAccess();
  const { hasActiveSession, sessionData, clearSession, getTimeAgo } = useSessionContext();
  const { messages, isLoading: isChatLoading, sendMessage } = useAIChat();

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

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    completeOnboarding();
  };

  const handleOnboardingSkip = () => {
    setShowOnboarding(false);
    completeOnboarding();
  };

  const handleInteractionSelect = (action: string) => {
    if (action === "evaluate") {
      navigate("/avaliar");
      return;
    }
    
    const actionMessages = {
      share: "Quero contar uma coisa",
      plan: "Ajude-me a me planejar",
      services: "Conhecer serviços disponíveis",
    };
    const message = actionMessages[action as keyof typeof actionMessages];
    if (message) {
      sendMessage(message);
    } else if (action === "transport") {
      navigate("/transporte/novo");
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

      {/* Header with AI Avatar */}
      <div className="pt-20 pb-8 px-6">
        <div className="flex flex-col items-center">
          <AIAvatar />
          <div className="mt-6 w-full">
            <AIWelcome userName="Luana" />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 -mt-6">
        {/* Session Resume */}
        {hasActiveSession && sessionData && (
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

        {/* Interaction Buttons - Only on initial screen */}
        {messages.length === 0 && (
          <InteractionButtons onSelect={handleInteractionSelect} />
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
