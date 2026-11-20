import { useSyncExternalStore } from 'react';
import { getItem, setItem } from '@/lib/kv';
import { GROUPS, type Group, type Overrides } from './logic';

// The person's own Needs/Wants/Savings choices per category, kept on the device like the app's other small settings.
const KEY = 'kharadhu.rule.groups';
let current: Overrides = {};
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

export async function loadRuleGroups(): Promise<void> {
  try {
    const raw = await getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
    current = Object.fromEntries(Object.entries(parsed).filter(([, v]) => GROUPS.includes(v as Group))) as Overrides;
  } catch { current = {}; }
  notify();
}

export async function setRuleGroup(categoryId: string, group: Group | null): Promise<void> {
  const next = { ...current };
  if (group) next[categoryId] = group; else delete next[categoryId];
  current = next;
  notify();
  await setItem(KEY, JSON.stringify(next));
}

export const useRuleGroups = (): Overrides => useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, () => current);
