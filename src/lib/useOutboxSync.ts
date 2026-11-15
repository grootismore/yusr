import { useCallback, useEffect } from 'react';
import { AppState } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { runOp } from '@/data/queued';
import { useOnline } from './online';
import { flushOutbox, loadOutbox, usePending } from './outbox';
import { toast } from './toast';

const RETRY_MS = 30_000;

/** Sends what was saved offline, when signed in: at launch, on coming back to the app, when the connection returns, and every 30 seconds while anything waits. */
export function useOutboxSync(signedIn: boolean): void {
  const qc = useQueryClient();
  const { t } = useTranslation();
  const online = useOnline();
  const pending = usePending();
  const run = useCallback(async () => {
    if (!signedIn) return;
    const r = await flushOutbox(runOp);
    if (r.sent || r.failed) await qc.invalidateQueries();
    if (r.failed) toast(t('offline.someFailed', { count: r.failed }), 'error');
  }, [signedIn, qc, t]);

  useEffect(() => { void loadOutbox().then(run); }, [run]);
  useEffect(() => { if (online && pending > 0) void run(); }, [online, pending, run]);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') void run(); });
    return () => sub.remove();
  }, [run]);
  useEffect(() => {
    if (pending === 0) return;
    const id = setInterval(() => void run(), RETRY_MS);
    return () => clearInterval(id);
  }, [pending, run]);
}
