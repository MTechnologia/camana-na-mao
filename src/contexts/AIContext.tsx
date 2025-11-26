import { createContext, useContext, useState, ReactNode } from "react";

interface AIContextType {
  mode: "text" | "voice";
  setMode: (mode: "text" | "voice") => void;
  isOnline: boolean;
  setIsOnline: (online: boolean) => void;
}

const AIContext = createContext<AIContextType | undefined>(undefined);

export const AIProvider = ({ children }: { children: ReactNode }) => {
  const [mode, setMode] = useState<"text" | "voice">("text");
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  return (
    <AIContext.Provider value={{ mode, setMode, isOnline, setIsOnline }}>
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
