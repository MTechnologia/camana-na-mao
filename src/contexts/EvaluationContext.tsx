import { createContext, useContext, useState, ReactNode, useMemo, useCallback } from "react";

interface Service {
  id: string;
  name: string;
  service_type: string;
  address: string;
  district: string;
}

interface Visit {
  id: string;
  service_id: string;
  visited_at: string;
  expires_at: string;
}

interface EvaluationData {
  rating?: number;
  comments?: string;
  aspects?: {
    service: number;
    wait_time: number;
    infrastructure: number;
  };
  sentiment?: string;
  councilMemberSuggestion?: {
    name: string;
    party: string;
    reason: string;
  };
}

interface EvaluationContextType {
  currentService: Service | null;
  currentVisit: Visit | null;
  evaluationStep: number;
  evaluationData: EvaluationData;
  startEvaluation: (service: Service, visit?: Visit) => void;
  nextStep: () => void;
  updateData: (data: Partial<EvaluationData>) => void;
  saveEvaluation: () => Promise<void>;
  cancelEvaluation: () => void;
}

const EvaluationContext = createContext<EvaluationContextType | undefined>(undefined);

export const EvaluationProvider = ({ children }: { children: ReactNode }) => {
  const [currentService, setCurrentService] = useState<Service | null>(null);
  const [currentVisit, setCurrentVisit] = useState<Visit | null>(null);
  const [evaluationStep, setEvaluationStep] = useState(1);
  const [evaluationData, setEvaluationData] = useState<EvaluationData>({});

  const startEvaluation = useCallback((service: Service, visit?: Visit) => {
    setCurrentService(service);
    setCurrentVisit(visit || null);
    setEvaluationStep(1);
    setEvaluationData({});
  }, []);

  const nextStep = useCallback(() => {
    setEvaluationStep(prev => prev + 1);
  }, []);

  const updateData = useCallback((data: Partial<EvaluationData>) => {
    setEvaluationData(prev => ({ ...prev, ...data }));
  }, []);

  const saveEvaluation = useCallback(async () => {
    // Implementação será feita quando necessário
    console.log("Saving evaluation:", evaluationData);
  }, [evaluationData]);

  const cancelEvaluation = useCallback(() => {
    setCurrentService(null);
    setCurrentVisit(null);
    setEvaluationStep(1);
    setEvaluationData({});
  }, []);

  const value = useMemo(() => ({
    currentService,
    currentVisit,
    evaluationStep,
    evaluationData,
    startEvaluation,
    nextStep,
    updateData,
    saveEvaluation,
    cancelEvaluation,
  }), [
    currentService,
    currentVisit,
    evaluationStep,
    evaluationData,
    startEvaluation,
    nextStep,
    updateData,
    saveEvaluation,
    cancelEvaluation,
  ]);

  return (
    <EvaluationContext.Provider value={value}>
      {children}
    </EvaluationContext.Provider>
  );
};

export const useEvaluation = () => {
  const context = useContext(EvaluationContext);
  if (!context) {
    throw new Error("useEvaluation must be used within EvaluationProvider");
  }
  return context;
};
