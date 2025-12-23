import { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from "react";
import { useAuth } from "./AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface OnboardingContextType {
  showTutorial: boolean;
  isFirstAccess: boolean;
  isLoading: boolean;
  triggerTutorial: () => void;
  completeTutorial: () => void;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export const OnboardingProvider = ({ children }: { children: ReactNode }) => {
  const [showTutorial, setShowTutorial] = useState(false);
  const [isFirstAccess, setIsFirstAccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      setIsLoading(true);
      
      // If user is logged in, check database
      if (user) {
        try {
          const { data: profile, error } = await supabase
            .from("profiles")
            .select("onboarding_completed_at")
            .eq("id", user.id)
            .single();

          if (error) {
            console.error("Error fetching onboarding status:", error);
            // Fallback to localStorage
            const hasCompletedOnboarding = localStorage.getItem("hasCompletedOnboarding");
            setIsFirstAccess(!hasCompletedOnboarding);
            setShowTutorial(!hasCompletedOnboarding);
          } else {
            const hasCompleted = !!profile?.onboarding_completed_at;
            setIsFirstAccess(!hasCompleted);
            setShowTutorial(!hasCompleted);
            
            // Sync localStorage with DB status
            if (hasCompleted) {
              localStorage.setItem("hasCompletedOnboarding", "true");
            }
          }
        } catch (err) {
          console.error("Error checking onboarding:", err);
          const hasCompletedOnboarding = localStorage.getItem("hasCompletedOnboarding");
          setIsFirstAccess(!hasCompletedOnboarding);
          setShowTutorial(!hasCompletedOnboarding);
        }
      } else {
        // Not logged in - use localStorage for visitors
        const hasCompletedOnboarding = localStorage.getItem("hasCompletedOnboarding");
        setIsFirstAccess(!hasCompletedOnboarding);
        setShowTutorial(!hasCompletedOnboarding);
      }
      
      setIsLoading(false);
    };

    checkOnboardingStatus();
  }, [user]);

  const triggerTutorial = useCallback(() => {
    setShowTutorial(true);
  }, []);

  const completeTutorial = useCallback(async () => {
    // Always set localStorage as fallback
    localStorage.setItem("hasCompletedOnboarding", "true");
    setIsFirstAccess(false);
    setShowTutorial(false);

    // If user is logged in, persist to database
    if (user) {
      try {
        const { error } = await supabase
          .from("profiles")
          .update({ onboarding_completed_at: new Date().toISOString() })
          .eq("id", user.id);

        if (error) {
          console.error("Error saving onboarding status to DB:", error);
        }
      } catch (err) {
        console.error("Error persisting onboarding completion:", err);
      }
    }
  }, [user]);

  const value = useMemo(() => ({
    showTutorial,
    isFirstAccess,
    isLoading,
    triggerTutorial,
    completeTutorial,
  }), [showTutorial, isFirstAccess, isLoading, triggerTutorial, completeTutorial]);

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
};

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error("useOnboarding must be used within an OnboardingProvider");
  }
  return context;
};
