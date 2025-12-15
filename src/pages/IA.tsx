import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import OfflineMode from "@/components/ai/OfflineMode";
import AgentChatLayout from "@/components/ai/AgentChatLayout";
import { AIJourneyProvider } from "@/contexts/AIJourneyContext";
import { useOnboarding } from "@/contexts/OnboardingContext";
import AppOnboardingTutorial from "@/components/onboarding/AppOnboardingTutorial";

const IA = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const { showTutorial, completeTutorial, isLoading: onboardingLoading } = useOnboarding();

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
  }, [user, navigate]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!isOnline) {
    return <OfflineMode />;
  }

  return (
    <>
      {/* Tutorial de onboarding - apenas para usuários autenticados na página /ia */}
      {!onboardingLoading && showTutorial && (
        <AppOnboardingTutorial 
          onComplete={completeTutorial}
          onSkip={completeTutorial}
        />
      )}
      <AIJourneyProvider>
        <AgentChatLayout />
      </AIJourneyProvider>
    </>
  );
};

export default IA;