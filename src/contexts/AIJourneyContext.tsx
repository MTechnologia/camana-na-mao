import { createContext, useContext, useState, ReactNode, useMemo, useCallback } from "react";

interface AIJourneyContextType {
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;
  clearConversation: () => void;
}

const AIJourneyContext = createContext<AIJourneyContextType | undefined>(undefined);

export const AIJourneyProvider = ({ children }: { children: ReactNode }) => {
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  const clearConversation = useCallback(() => {
    setActiveConversationId(null);
  }, []);

  const value = useMemo(() => ({ 
    activeConversationId,
    setActiveConversationId,
    clearConversation
  }), [activeConversationId, clearConversation]);

  return (
    <AIJourneyContext.Provider value={value}>
      {children}
    </AIJourneyContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components -- Context pattern: Provider + hook
export const useAIJourney = () => {
  const context = useContext(AIJourneyContext);
  if (!context) {
    throw new Error("useAIJourney must be used within AIJourneyProvider");
  }
  return context;
};
