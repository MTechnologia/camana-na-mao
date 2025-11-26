import { useState, useEffect } from "react";

export const useFirstAccess = () => {
  const [isFirstAccess, setIsFirstAccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkFirstAccess = () => {
      const hasCompletedOnboarding = localStorage.getItem("hasCompletedOnboarding");
      setIsFirstAccess(!hasCompletedOnboarding);
      setIsLoading(false);
    };

    checkFirstAccess();
  }, []);

  const completeOnboarding = () => {
    localStorage.setItem("hasCompletedOnboarding", "true");
    setIsFirstAccess(false);
  };

  return { isFirstAccess, isLoading, completeOnboarding };
};
