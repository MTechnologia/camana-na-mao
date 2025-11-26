import { createContext, useContext, useState, ReactNode } from "react";

export interface JourneyType {
  id: 'general' | 'urban_report' | 'transport' | 'evaluate' | 'plan' | 'services';
  label: string;
  edgeFunction: string;
  initialMessage?: string;
  color: string;
  icon: string;
}

interface AIJourneyContextType {
  currentJourney: JourneyType | null;
  setJourney: (journey: JourneyType, context?: Record<string, any>) => void;
  journeyContext: Record<string, any>;
  clearJourney: () => void;
}

const AIJourneyContext = createContext<AIJourneyContextType | undefined>(undefined);

export const AIJourneyProvider = ({ children }: { children: ReactNode }) => {
  const [currentJourney, setCurrentJourney] = useState<JourneyType | null>(null);
  const [journeyContext, setJourneyContext] = useState<Record<string, any>>({});

  const setJourney = (journey: JourneyType, context: Record<string, any> = {}) => {
    setCurrentJourney(journey);
    setJourneyContext(context);
  };

  const clearJourney = () => {
    setCurrentJourney(null);
    setJourneyContext({});
  };

  return (
    <AIJourneyContext.Provider value={{ currentJourney, setJourney, journeyContext, clearJourney }}>
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
