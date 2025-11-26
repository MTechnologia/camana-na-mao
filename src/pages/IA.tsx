import { useState, useEffect } from "react";
import { Send, Mic } from "lucide-react";
import { useNavigate } from "react-router-dom";
import FloatingNavbar from "@/components/FloatingNavbar";
import AIAvatar from "@/components/ai/AIAvatar";
import AILoadingScreen from "@/components/ai/AILoadingScreen";
import AIWelcome from "@/components/ai/AIWelcome";
import LegislativeNews from "@/components/ai/LegislativeNews";
import InteractionButtons from "@/components/ai/InteractionButtons";
import ModeToggle from "@/components/ai/ModeToggle";
import AccessibilityPanel from "@/components/ai/AccessibilityPanel";
import OnboardingTutorial from "@/components/ai/OnboardingTutorial";
import SessionResume from "@/components/ai/SessionResume";
import AIMessage from "@/components/ai/AIMessage";
import OfflineMode from "@/components/ai/OfflineMode";
import { useFirstAccess } from "@/hooks/useFirstAccess";
import { useSessionContext } from "@/hooks/useSessionContext";
import { useAIChat } from "@/hooks/useAIChat";
import { useToast } from "@/hooks/use-toast";

const IA = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [mode, setMode] = useState<"text" | "voice">("text");
  const [inputValue, setInputValue] = useState("");
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
    const actionMessages = {
      share: "Quero contar uma coisa",
      plan: "Ajude-me a me planejar",
      services: "Conhecer serviços disponíveis",
    };
    const message = actionMessages[action as keyof typeof actionMessages];
    if (message) {
      sendMessage(message);
    }
  };

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;
    sendMessage(inputValue);
    setInputValue("");
  };

  const handleVoiceMode = () => {
    if (mode === "voice") {
      toast({
        title: "Erro no microfone",
        description: "Não foi possível acessar o microfone. Tente o modo texto.",
        variant: "destructive",
      });
      setMode("text");
      navigate("/voz");
    } else {
      navigate("/voz");
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
    <div className="min-h-screen bg-background pb-32">
      {/* Header with AI Avatar */}
      <div className="bg-gradient-to-br from-primary/10 to-secondary/10 pt-8 pb-12 px-6">
        <AIAvatar />
        <AIWelcome userName="Luana" />
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

        {/* Legislative News */}
        <LegislativeNews />

        {/* Interaction Buttons */}
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

        {/* Mode Toggle */}
        <ModeToggle mode={mode} onModeChange={setMode} />

        {/* Input Area */}
        <div className="fixed bottom-24 left-0 right-0 px-6 bg-gradient-to-t from-background via-background to-transparent pt-4">
          <div className="bg-card rounded-full border border-border shadow-lg p-2 flex items-center gap-2 max-w-2xl mx-auto">
            <input
              type="text"
              placeholder={mode === "text" ? "Digite sua mensagem..." : "Clique no microfone para falar"}
              className="flex-1 bg-transparent border-none outline-none px-4 text-foreground placeholder:text-muted-foreground"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
              disabled={mode === "voice"}
            />
            {mode === "text" ? (
              <button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isChatLoading}
                className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Enviar mensagem"
              >
                <Send size={20} />
              </button>
            ) : (
              <button
                onClick={handleVoiceMode}
                className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary/90 transition-colors"
                aria-label="Gravar áudio"
              >
                <Mic size={20} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Accessibility Panel */}
      <AccessibilityPanel />

      <FloatingNavbar />
    </div>
  );
};

export default IA;
