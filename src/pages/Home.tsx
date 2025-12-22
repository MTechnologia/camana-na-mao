import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import OfflineMode from "@/components/ai/OfflineMode";
import AgentChatLayout from "@/components/ai/AgentChatLayout";
import { useOnboarding } from "@/contexts/OnboardingContext";
import AppOnboardingTutorial from "@/components/onboarding/AppOnboardingTutorial";
import { MessageSquare } from "lucide-react";

const BrandingLoader = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden bg-gradient-to-br from-primary via-primary/90 to-primary/70">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-white/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-1/2 -left-1/2 w-full h-full bg-primary-foreground/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "0.5s" }} />
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center px-8">
        {/* Animated icon */}
        <div className="mb-8 animate-scale-in">
          <div className="w-24 h-24 rounded-3xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20 shadow-2xl">
            <MessageSquare className="w-12 h-12 text-white animate-pulse" />
          </div>
        </div>

        {/* Brand text with staggered animation */}
        <div className="text-center animate-fade-in" style={{ animationDelay: "0.2s" }}>
          <h1 className="text-white text-4xl font-bold mb-2 drop-shadow-lg">
            Fala
          </h1>
          <h2 className="text-white text-4xl font-bold drop-shadow-lg">
            Cidadão SP
          </h2>
        </div>

        {/* Loading indicator */}
        <div className="mt-10 flex flex-col items-center gap-4 animate-fade-in" style={{ animationDelay: "0.4s" }}>
          {/* Custom loading dots */}
          <div className="flex gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-white/80 animate-bounce" style={{ animationDelay: "0ms" }} />
            <div className="w-2.5 h-2.5 rounded-full bg-white/80 animate-bounce" style={{ animationDelay: "150ms" }} />
            <div className="w-2.5 h-2.5 rounded-full bg-white/80 animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
          <p className="text-white/70 text-sm font-medium">
            Preparando sua experiência...
          </p>
        </div>
      </div>

      {/* Bottom branding */}
      <div className="absolute bottom-8 left-0 right-0 text-center animate-fade-in" style={{ animationDelay: "0.6s" }}>
        <p className="text-white/50 text-xs">
          Câmara Municipal de São Paulo
        </p>
      </div>
    </div>
  );
};

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

  // Loading guard - aguarda auth carregar antes de renderizar
  if (authLoading) {
    return <BrandingLoader />;
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
