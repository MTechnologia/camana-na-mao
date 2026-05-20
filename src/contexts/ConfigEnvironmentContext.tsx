import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { defaultConfigByEnvironment } from '@/data/defaultSystemConfig';
import type { ConfigEnvironment, EnvironmentConfigBundle } from '@/types/systemConfig';

type ConfigEnvironmentContextValue = {
  environment: ConfigEnvironment;
  setEnvironment: (env: ConfigEnvironment) => void;
  config: EnvironmentConfigBundle;
  environmentLabel: string;
};

const ConfigEnvironmentContext = createContext<ConfigEnvironmentContextValue | null>(null);

const LABELS: Record<ConfigEnvironment, string> = {
  production: 'Produção',
  homologation: 'Homologação',
};

export function ConfigEnvironmentProvider({ children }: { children: ReactNode }) {
  const [environment, setEnvironment] = useState<ConfigEnvironment>('production');

  const config = defaultConfigByEnvironment[environment];

  const value = useMemo<ConfigEnvironmentContextValue>(
    () => ({
      environment,
      setEnvironment,
      config,
      environmentLabel: LABELS[environment],
    }),
    [environment, config],
  );

  return (
    <ConfigEnvironmentContext.Provider value={value}>{children}</ConfigEnvironmentContext.Provider>
  );
}

export function useConfigEnvironment(): ConfigEnvironmentContextValue {
  const ctx = useContext(ConfigEnvironmentContext);
  if (!ctx) {
    throw new Error('useConfigEnvironment must be used within ConfigEnvironmentProvider');
  }
  return ctx;
}

export function useConfigEnvironmentOptional(): ConfigEnvironmentContextValue | null {
  return useContext(ConfigEnvironmentContext);
}
