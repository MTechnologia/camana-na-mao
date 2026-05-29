import { createContext, useContext, useState, ReactNode, useMemo, useCallback } from "react";

interface AIJourneyContextType {
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;
  clearConversation: () => void;
  /** Incrementado a cada «nova conversa» para resetar mensagens/tracker no chat. */
  chatSessionEpoch: number;
  startNewChatSession: () => void;
}

const AIJourneyContext = createContext<AIJourneyContextType | undefined>(undefined);

export const AIJourneyProvider = ({ children }: { children: ReactNode }) => {
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [chatSessionEpoch, setChatSessionEpoch] = useState(0);

  const clearConversation = useCallback(() => {
    setActiveConversationId(null);
  }, []);

  const startNewChatSession = useCallback(() => {
    setActiveConversationId(null);
    setChatSessionEpoch((n) => n + 1);
  }, []);

  const value = useMemo(() => ({
    activeConversationId,
    setActiveConversationId,
    clearConversation,
    chatSessionEpoch,
    startNewChatSession,
  }), [activeConversationId, clearConversation, chatSessionEpoch, startNewChatSession]);

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
