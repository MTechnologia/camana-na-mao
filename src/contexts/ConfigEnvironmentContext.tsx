import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { defaultConfigByEnvironment } from "@/data/defaultSystemConfig";
import { useAiConfig } from "@/hooks/useAiConfig";
import type { ConfigEnvironment, EnvironmentConfigBundle } from "@/types/systemConfig";

type ConfigEnvironmentContextValue = {
  environment: ConfigEnvironment;
  setEnvironment: (env: ConfigEnvironment) => void;
  config: EnvironmentConfigBundle;
  environmentLabel: string;
  aiConfigLoading: boolean;
  aiConfigError: boolean;
  refetchAiConfig: () => void;
};

const ConfigEnvironmentContext = createContext<ConfigEnvironmentContextValue | null>(null);

const LABELS: Record<ConfigEnvironment, string> = {
  production: "Produção",
  homologation: "Homologação",
};

export function ConfigEnvironmentProvider({ children }: { children: ReactNode }) {
  const [environment, setEnvironment] = useState<ConfigEnvironment>("production");
  const {
    bundle: aiBundle,
    isLoading: aiConfigLoading,
    isError: aiConfigError,
    refetch: refetchAiConfig,
  } = useAiConfig(environment);

  const config = useMemo<EnvironmentConfigBundle>(() => {
    const base = defaultConfigByEnvironment[environment];
    if (!aiBundle) return base;
    return {
      ...base,
      aiVersions: aiBundle.aiVersions,
      promptTemplates: aiBundle.promptTemplates,
      rollbackPolicy: aiBundle.rollbackPolicy,
    };
  }, [environment, aiBundle]);

  const value = useMemo<ConfigEnvironmentContextValue>(
    () => ({
      environment,
      setEnvironment,
      config,
      environmentLabel: LABELS[environment],
      aiConfigLoading,
      aiConfigError,
      refetchAiConfig: () => {
        void refetchAiConfig();
      },
    }),
    [environment, config, aiConfigLoading, aiConfigError, refetchAiConfig],
  );

  return (
    <ConfigEnvironmentContext.Provider value={value}>{children}</ConfigEnvironmentContext.Provider>
  );
}

export function useConfigEnvironment(): ConfigEnvironmentContextValue {
  const ctx = useContext(ConfigEnvironmentContext);
  if (!ctx) {
    throw new Error("useConfigEnvironment must be used within ConfigEnvironmentProvider");
  }
  return ctx;
}

export function useConfigEnvironmentOptional(): ConfigEnvironmentContextValue | null {
  return useContext(ConfigEnvironmentContext);
}
