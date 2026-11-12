import { useSyncExternalStore } from 'react';

/** A short message at the bottom of the screen, with an optional action (such as Undo). One at a time. */
export interface Notice {
  id: number;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

let current: Notice | null = null;
let counter = 0;
let timer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());

export function hideNotice(): void {
  clearTimeout(timer);
  current = null;
  emit();
}

/** Shows `message` for a few seconds (longer when there is an action to reach). A new one replaces the old. */
export function showNotice(message: string, action?: { label: string; onPress: () => void }, ms = action ? 7000 : 4000): void {
  clearTimeout(timer);
  current = { id: ++counter, message, actionLabel: action?.label, onAction: action?.onPress };
  emit();
  timer = setTimeout(hideNotice, ms);
}

/** The notice right now, outside React (for tests). */
export const getNotice = (): Notice | null => current;

export const useNotice = (): Notice | null =>
  useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => current,
  );
