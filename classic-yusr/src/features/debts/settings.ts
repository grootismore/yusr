import { useCallback, useState } from 'react';
import Storage from 'expo-sqlite/kv-store';
import { STRATEGIES, type Strategy } from './plan';

export interface PlanSettings {
  strategy: Strategy;
  /** Total monthly amount the user wants to put towards debts, in laari. 0 = just the minimums. */
  monthlyLaari: number;
}

const KEY = 'yusr.plan-settings';
const DEFAULTS: PlanSettings = { strategy: 'snowball', monthlyLaari: 0 };

function read(): PlanSettings {
  try {
    const raw = JSON.parse(Storage.getItemSync(KEY) ?? 'null');
    return {
      strategy: STRATEGIES.includes(raw?.strategy) ? raw.strategy : DEFAULTS.strategy,
      monthlyLaari: Number.isSafeInteger(raw?.monthlyLaari) && raw.monthlyLaari >= 0 ? raw.monthlyLaari : 0,
    };
  } catch {
    return DEFAULTS;
  }
}

// ponytail: stored on this device only (not synced). Move to the profile table if multi-device matters.
export function usePlanSettings() {
  const [settings, setSettings] = useState<PlanSettings>(read);
  const update = useCallback((patch: Partial<PlanSettings>) => {
    setSettings((previous) => {
      const next = { ...previous, ...patch };
      try {
        Storage.setItemSync(KEY, JSON.stringify(next));
      } catch {
        // Not persisted this time; the choice still applies for this session.
      }
      return next;
    });
  }, []);
  return [settings, update] as const;
}
