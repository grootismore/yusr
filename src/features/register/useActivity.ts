import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { recordActivity } from '@/data/api';

/** Opening the app (or coming back to it) tells the check-in ladder "I'm okay". Never blocks the app. */
export function useActivity(signedIn: boolean) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!signedIn) return;
    const ping = () => void recordActivity().then(() => qc.invalidateQueries({ queryKey: ['checkin'] })).catch(() => undefined);
    ping();
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') ping(); });
    return () => sub.remove();
  }, [signedIn, qc]);
}
