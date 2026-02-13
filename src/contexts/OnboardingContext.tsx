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
      
      // If user is logged in, check database (e também se já tem interesses = personalização no cadastro)
      if (user) {
        try {
          const [{ data: profile, error: profileError }, { data: interests }] = await Promise.all([
            supabase.from("profiles").select("onboarding_completed_at").eq("id", user.id).maybeSingle(),
            supabase.from("user_interests").select("id").eq("user_id", user.id),
          ]);

          if (profileError) {
            console.error("Error fetching onboarding status:", profileError);
            const hasCompletedOnboarding = localStorage.getItem("hasCompletedOnboarding");
            setIsFirstAccess(!hasCompletedOnboarding);
            setShowTutorial(!hasCompletedOnboarding);
          } else {
            const hasCompletedInProfile = !!profile?.onboarding_completed_at;
            const hasInterestsFromRegistration = (interests?.length ?? 0) >= 3;
            const hasCompleted = hasCompletedInProfile || hasInterestsFromRegistration;
            setIsFirstAccess(!hasCompleted);
            setShowTutorial(!hasCompleted);
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
