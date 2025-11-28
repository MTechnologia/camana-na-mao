import { createContext, useContext, useState, ReactNode } from "react";

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

  const setJourney = (journey: JourneyType, conversationId?: string, context: Record<string, any> = {}) => {
    setCurrentJourney(journey);
    setCurrentConversationId(conversationId || null);
    setJourneyContext(context);
  };

  const clearJourney = () => {
    setCurrentJourney(null);
    setCurrentConversationId(null);
    setJourneyContext({});
  };

  const minimizeToBackground = () => {
    if (currentJourney && currentConversationId) {
      setBackgroundConversation({
        journeyId: currentJourney.id,
        conversationId: currentConversationId,
      });
      clearJourney();
    }
  };

  const restoreFromBackground = () => {
    if (backgroundConversation) {
      setCurrentConversationId(backgroundConversation.conversationId);
      setBackgroundConversation(null);
    }
  };

  const clearBackground = () => {
    setBackgroundConversation(null);
  };

  return (
    <AIJourneyContext.Provider value={{ 
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
    }}>
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
