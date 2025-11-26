import { createContext, useContext, useState, ReactNode } from 'react';

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

  const startEvaluation = (data?: any) => {
    setReportData(data || {});
    setReportStep(1);
  };

  const nextStep = () => {
    setReportStep(prev => prev + 1);
  };

  const cancelEvaluation = () => {
    setCurrentReport(null);
    setReportStep(1);
    setReportData({});
  };

  return (
    <TransportContext.Provider
      value={{
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
      }}
    >
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
