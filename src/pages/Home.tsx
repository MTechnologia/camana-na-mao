import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import OfflineMode from "@/components/ai/OfflineMode";
import AgentChatLayout from "@/components/ai/AgentChatLayout";
import { useOnboarding } from "@/contexts/OnboardingContext";
import AppOnboardingTutorial from "@/components/onboarding/AppOnboardingTutorial";
import PageLoader from "@/components/ui/page-loader";

const IA = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const { showTutorial, completeTutorial, isLoading: onboardingLoading } = useOnboarding();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/welcome");
      return;
    }
  }, [user, authLoading, navigate]);

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

  // Loading guard - aguarda auth carregar antes de renderizar
  if (authLoading) {
    return <PageLoader />;
  }

  if (!isOnline) {
    return <OfflineMode />;
  }

  return (
    <>
      {!onboardingLoading && showTutorial && (
        <AppOnboardingTutorial 
          onComplete={completeTutorial}
          onSkip={completeTutorial}
        />
      )}
      <AgentChatLayout />
    </>
  );
};

export default IA;