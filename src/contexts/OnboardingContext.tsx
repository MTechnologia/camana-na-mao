import { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from "react";

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

  useEffect(() => {
    const hasCompletedOnboarding = localStorage.getItem("hasCompletedOnboarding");
    setIsFirstAccess(!hasCompletedOnboarding);
    setShowTutorial(!hasCompletedOnboarding);
    setIsLoading(false);
  }, []);

  const triggerTutorial = useCallback(() => {
    setShowTutorial(true);
  }, []);

  const completeTutorial = useCallback(() => {
    localStorage.setItem("hasCompletedOnboarding", "true");
    setIsFirstAccess(false);
    setShowTutorial(false);
  }, []);

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
