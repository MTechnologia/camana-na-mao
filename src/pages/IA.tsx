import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useFirstAccess } from "@/hooks/useFirstAccess";
import AILoadingScreen from "@/components/ai/AILoadingScreen";
import OnboardingTutorial from "@/components/ai/OnboardingTutorial";
import OfflineMode from "@/components/ai/OfflineMode";
import ChatLayout from "@/components/ai/ChatLayout";
import { AIJourneyProvider } from "@/contexts/AIJourneyContext";

const IA = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isFirstAccess, completeOnboarding } = useFirstAccess();
  const [isLoading, setIsLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    const timer = setTimeout(() => {
      setIsLoading(false);
      if (isFirstAccess) {
        setShowOnboarding(true);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [user, navigate, isFirstAccess]);

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

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    completeOnboarding();
  };

  const handleOnboardingSkip = () => {
    setShowOnboarding(false);
    completeOnboarding();
  };

  if (!isOnline) {
    return <OfflineMode />;
  }

  if (isLoading) {
    return <AILoadingScreen />;
  }

  if (showOnboarding) {
    return <OnboardingTutorial onComplete={handleOnboardingComplete} onSkip={handleOnboardingSkip} />;
  }

  return (
    <AIJourneyProvider>
      <ChatLayout />
    </AIJourneyProvider>
  );
};

export default IA;
