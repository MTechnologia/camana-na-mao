import { createContext, useContext, useState, ReactNode, useMemo, useCallback } from "react";

interface AIContextType {
  mode: "text" | "voice";
  setMode: (mode: "text" | "voice") => void;
  isOnline: boolean;
  setIsOnline: (online: boolean) => void;
}

const AIContext = createContext<AIContextType | undefined>(undefined);

export const AIProvider = ({ children }: { children: ReactNode }) => {
  const [mode, setModeState] = useState<"text" | "voice">("text");
  const [isOnline, setIsOnlineState] = useState(navigator.onLine);

  const setMode = useCallback((newMode: "text" | "voice") => {
    setModeState(newMode);
  }, []);

  const setIsOnline = useCallback((online: boolean) => {
    setIsOnlineState(online);
  }, []);

  const value = useMemo(() => ({ 
    mode, 
    setMode, 
    isOnline, 
    setIsOnline 
  }), [mode, setMode, isOnline, setIsOnline]);

  return (
    <AIContext.Provider value={value}>
      {children}
    </AIContext.Provider>
  );
};

export const useAI = () => {
  const context = useContext(AIContext);
  if (!context) {
    throw new Error("useAI must be used within AIProvider");
  }
  return context;
};
