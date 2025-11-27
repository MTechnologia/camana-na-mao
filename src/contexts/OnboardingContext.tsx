import { createContext, useContext, useState, useEffect, ReactNode } from "react";

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

  const triggerTutorial = () => {
    setShowTutorial(true);
  };

  const completeTutorial = () => {
    localStorage.setItem("hasCompletedOnboarding", "true");
    setIsFirstAccess(false);
    setShowTutorial(false);
  };

  return (
    <OnboardingContext.Provider
      value={{
        showTutorial,
        isFirstAccess,
        isLoading,
        triggerTutorial,
        completeTutorial,
      }}
    >
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
