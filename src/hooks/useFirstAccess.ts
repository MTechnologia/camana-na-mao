import { useState, useEffect } from "react";

export const useFirstAccess = () => {
  const [isFirstAccess, setIsFirstAccess] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkFirstAccess = () => {
      const hasCompletedOnboarding = localStorage.getItem("hasCompletedOnboarding");
      setIsFirstAccess(!hasCompletedOnboarding);
      setShowTutorial(!hasCompletedOnboarding);
      setIsLoading(false);
    };

    checkFirstAccess();
  }, []);

  const completeOnboarding = () => {
    localStorage.setItem("hasCompletedOnboarding", "true");
    setIsFirstAccess(false);
    setShowTutorial(false);
  };

  const resetOnboarding = () => {
    localStorage.removeItem("hasCompletedOnboarding");
    setIsFirstAccess(true);
    setShowTutorial(true);
  };

  const triggerTutorial = () => {
    setShowTutorial(true);
  };

  return { 
    isFirstAccess, 
    isLoading, 
    showTutorial,
    completeOnboarding,
    resetOnboarding,
    triggerTutorial
  };
};
