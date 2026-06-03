import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useConfigEnvironmentOptional } from "@/contexts/ConfigEnvironmentContext";
import { DEFAULT_REFERRAL_ROUTING_RULES } from "@/lib/referralRoutingRulesDefaults";
import {
  loadReferralRoutingRules,
  saveReferralRoutingRules,
} from "@/lib/referralRoutingRulesStorage";
import type { ReferralRoutingRules } from "@/types/referralRoutingRules";
import type { ConfigEnvironment } from "@/types/systemConfig";

type ReferralRoutingRulesContextValue = {
  rules: ReferralRoutingRules;
  environmentKey: ConfigEnvironment | "default";
  updateRules: (patch: Partial<ReferralRoutingRules>) => void;
  resetRules: () => void;
};

const ReferralRoutingRulesContext = createContext<ReferralRoutingRulesContextValue | null>(null);

function resolveEnvironmentKey(
  env: ReturnType<typeof useConfigEnvironmentOptional>,
): ConfigEnvironment | "default" {
  return env?.environment ?? "default";
}

export function ReferralRoutingRulesProvider({ children }: { children: ReactNode }) {
  const configEnv = useConfigEnvironmentOptional();
  const environmentKey = resolveEnvironmentKey(configEnv);

  const [rules, setRules] = useState<ReferralRoutingRules>(() =>
    loadReferralRoutingRules(environmentKey),
  );

  useEffect(() => {
    setRules(loadReferralRoutingRules(environmentKey));
  }, [environmentKey]);

  useEffect(() => {
    saveReferralRoutingRules(rules, environmentKey);
  }, [rules, environmentKey]);

  const updateRules = useCallback((patch: Partial<ReferralRoutingRules>) => {
    setRules((prev) => ({
      ...prev,
      ...patch,
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  const resetRules = useCallback(() => {
    setRules({
      ...DEFAULT_REFERRAL_ROUTING_RULES,
      updatedAt: new Date().toISOString(),
    });
  }, []);

  const value = useMemo(
    () => ({ rules, environmentKey, updateRules, resetRules }),
    [rules, environmentKey, updateRules, resetRules],
  );

  return (
    <ReferralRoutingRulesContext.Provider value={value}>
      {children}
    </ReferralRoutingRulesContext.Provider>
  );
}

export function useReferralRoutingRules(): ReferralRoutingRulesContextValue {
  const ctx = useContext(ReferralRoutingRulesContext);
  if (!ctx) {
    throw new Error("useReferralRoutingRules must be used within ReferralRoutingRulesProvider");
  }
  return ctx;
}
