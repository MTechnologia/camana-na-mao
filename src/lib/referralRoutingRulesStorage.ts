import { DEFAULT_REFERRAL_ROUTING_RULES } from '@/lib/referralRoutingRulesDefaults';
import type { ReferralRoutingRules } from '@/types/referralRoutingRules';
import type { ConfigEnvironment } from '@/types/systemConfig';

const PREFIX = 'cmsp-referral-routing-rules';

function storageKey(environment: ConfigEnvironment | 'default'): string {
  return `${PREFIX}-${environment}`;
}

export function loadReferralRoutingRules(
  environment: ConfigEnvironment | 'default' = 'default',
): ReferralRoutingRules {
  try {
    const raw = localStorage.getItem(storageKey(environment));
    if (!raw) return { ...DEFAULT_REFERRAL_ROUTING_RULES };
    const parsed = JSON.parse(raw) as ReferralRoutingRules;
    return { ...DEFAULT_REFERRAL_ROUTING_RULES, ...parsed };
  } catch {
    return { ...DEFAULT_REFERRAL_ROUTING_RULES };
  }
}

export function saveReferralRoutingRules(
  rules: ReferralRoutingRules,
  environment: ConfigEnvironment | 'default' = 'default',
): void {
  localStorage.setItem(storageKey(environment), JSON.stringify(rules));
}
