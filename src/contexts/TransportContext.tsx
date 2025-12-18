import { createContext, useContext, useState, ReactNode, useMemo, useCallback } from 'react';

interface TransportContextType {
  currentReport: any;
  reportStep: number;
  reportData: any;
  patterns: any[];
  setCurrentReport: (report: any) => void;
  setReportStep: (step: number) => void;
  setReportData: (data: any) => void;
  setPatterns: (patterns: any[]) => void;
  startEvaluation: (data?: any) => void;
  nextStep: () => void;
  cancelEvaluation: () => void;
}

const TransportContext = createContext<TransportContextType | undefined>(undefined);

export const TransportProvider = ({ children }: { children: ReactNode }) => {
  const [currentReport, setCurrentReport] = useState<any>(null);
  const [reportStep, setReportStep] = useState(1);
  const [reportData, setReportData] = useState<any>({});
  const [patterns, setPatterns] = useState<any[]>([]);

  const startEvaluation = useCallback((data?: any) => {
    setReportData(data || {});
    setReportStep(1);
  }, []);

  const nextStep = useCallback(() => {
    setReportStep(prev => prev + 1);
  }, []);

  const cancelEvaluation = useCallback(() => {
    setCurrentReport(null);
    setReportStep(1);
    setReportData({});
  }, []);

  const value = useMemo(() => ({
    currentReport,
    reportStep,
    reportData,
    patterns,
    setCurrentReport,
    setReportStep,
    setReportData,
    setPatterns,
    startEvaluation,
    nextStep,
    cancelEvaluation,
  }), [
    currentReport,
    reportStep,
    reportData,
    patterns,
    startEvaluation,
    nextStep,
    cancelEvaluation,
  ]);

  return (
    <TransportContext.Provider value={value}>
      {children}
    </TransportContext.Provider>
  );
};

export const useTransport = () => {
  const context = useContext(TransportContext);
  if (!context) {
    throw new Error('useTransport must be used within TransportProvider');
  }
  return context;
};
