import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import OfflineMode from "@/components/ai/OfflineMode";
import AgentChatLayout from "@/components/ai/AgentChatLayout";
import { useOnboarding } from "@/contexts/OnboardingContext";
import AppOnboardingTutorial from "@/components/onboarding/AppOnboardingTutorial";
import { PageSkeleton } from "@/components/skeletons/PageSkeleton";

const Home = () => {
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

  // Loading guard - usa skeleton neutro em vez de branding
  if (authLoading) {
    return <PageSkeleton />;
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

export default Home;
