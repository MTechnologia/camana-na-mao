import { createContext, useContext, useState, ReactNode, useMemo, useCallback } from "react";

export interface JourneyType {
  id: string;
  label: string;
  edgeFunction: string;
  initialMessage?: string;
  color: string;
  icon: string;
}

interface AIJourneyContextType {
  currentJourney: JourneyType | null;
  currentConversationId: string | null;
  activeConversationId: string | null;
  backgroundConversation: { journeyId: string; conversationId: string } | null;
  setJourney: (journey: JourneyType, conversationId?: string, context?: Record<string, any>) => void;
  setActiveConversationId: (id: string | null) => void;
  journeyContext: Record<string, any>;
  clearJourney: () => void;
  minimizeToBackground: () => void;
  restoreFromBackground: () => void;
  clearBackground: () => void;
}

const AIJourneyContext = createContext<AIJourneyContextType | undefined>(undefined);

export const AIJourneyProvider = ({ children }: { children: ReactNode }) => {
  const [currentJourney, setCurrentJourney] = useState<JourneyType | null>(null);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [journeyContext, setJourneyContext] = useState<Record<string, any>>({});
  const [backgroundConversation, setBackgroundConversation] = useState<{ journeyId: string; conversationId: string } | null>(null);

  const setJourney = useCallback((journey: JourneyType, conversationId?: string, context: Record<string, any> = {}) => {
    setCurrentJourney(journey);
    setCurrentConversationId(conversationId || null);
    setJourneyContext(context);
  }, []);

  const clearJourney = useCallback(() => {
    setCurrentJourney(null);
    setCurrentConversationId(null);
    setJourneyContext({});
  }, []);

  const minimizeToBackground = useCallback(() => {
    if (currentJourney && currentConversationId) {
      setBackgroundConversation({
        journeyId: currentJourney.id,
        conversationId: currentConversationId,
      });
      setCurrentJourney(null);
      setCurrentConversationId(null);
      setJourneyContext({});
    }
  }, [currentJourney, currentConversationId]);

  const restoreFromBackground = useCallback(() => {
    if (backgroundConversation) {
      setCurrentConversationId(backgroundConversation.conversationId);
      setBackgroundConversation(null);
    }
  }, [backgroundConversation]);

  const clearBackground = useCallback(() => {
    setBackgroundConversation(null);
  }, []);

  const value = useMemo(() => ({ 
    currentJourney, 
    currentConversationId,
    activeConversationId,
    backgroundConversation,
    setJourney,
    setActiveConversationId,
    journeyContext, 
    clearJourney,
    minimizeToBackground,
    restoreFromBackground,
    clearBackground
  }), [
    currentJourney, 
    currentConversationId,
    activeConversationId,
    backgroundConversation,
    setJourney,
    journeyContext, 
    clearJourney,
    minimizeToBackground,
    restoreFromBackground,
    clearBackground
  ]);

  return (
    <AIJourneyContext.Provider value={value}>
      {children}
    </AIJourneyContext.Provider>
  );
};

export const useAIJourney = () => {
  const context = useContext(AIJourneyContext);
  if (!context) {
    throw new Error("useAIJourney must be used within AIJourneyProvider");
  }
  return context;
};
