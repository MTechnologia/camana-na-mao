import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import OfflineMode from "@/components/ai/OfflineMode";
import AgentChatLayout from "@/components/ai/AgentChatLayout";
import { useOnboarding } from "@/contexts/OnboardingContext";
import AppOnboardingTutorial from "@/components/onboarding/AppOnboardingTutorial";
import { PageSkeleton } from "@/components/skeletons/PageSkeleton";
import { DebugOverlay } from "@/components/debug/DebugOverlay";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

const Home = () => {
  const { user, session, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { isOnline, isChecking, checkConnection } = useNetworkStatus();
  const [authChecked, setAuthChecked] = useState(false);
  const { showTutorial, completeTutorial, isLoading: onboardingLoading } = useOnboarding();

  // Auth guard: sem sessão → welcome
  useEffect(() => {
    if (authLoading) return;

    setAuthChecked(true);

    if (!user && !session) {
      navigate("/welcome", { replace: true });
      return;
    }
  }, [user, session, authLoading, navigate]);

  // Loading guard - mostra skeleton enquanto auth ou conexão não estão prontos
  if (authLoading || !authChecked || isChecking) {
    return (
      <>
        <PageSkeleton />
        <DebugOverlay />
      </>
    );
  }

  // Se não tem user nem session após verificação, não renderizar nada (vai redirecionar)
  if (!user && !session) {
    return null;
  }

  // Só mostra offline após confirmação real (2 falhas consecutivas)
  if (!isOnline) {
    return (
      <>
        <OfflineMode onRetry={checkConnection} />
        <DebugOverlay />
      </>
    );
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
      <DebugOverlay />
    </>
  );
};

export default Home;
