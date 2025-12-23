import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import OfflineMode from "@/components/ai/OfflineMode";
import AgentChatLayout from "@/components/ai/AgentChatLayout";
import { useOnboarding } from "@/contexts/OnboardingContext";
import AppOnboardingTutorial from "@/components/onboarding/AppOnboardingTutorial";
import { PageSkeleton } from "@/components/skeletons/PageSkeleton";
import { DebugOverlay } from "@/components/debug/DebugOverlay";

const Home = () => {
  const { user, session, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [authChecked, setAuthChecked] = useState(false);
  const { showTutorial, completeTutorial, isLoading: onboardingLoading } = useOnboarding();

  // Auth guard mais robusto - só redireciona quando temos certeza que não há sessão
  useEffect(() => {
    // Esperar authLoading terminar
    if (authLoading) return;

    // Marcar que já verificamos
    setAuthChecked(true);

    // Só redirecionar se NÃO tem user E NÃO tem session
    if (!user && !session) {
      navigate("/welcome", { replace: true });
    }
  }, [user, session, authLoading, navigate]);

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

  // Loading guard - mostra skeleton enquanto auth não está pronto
  if (authLoading || !authChecked) {
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

  if (!isOnline) {
    return (
      <>
        <OfflineMode />
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
