import { useCallback, useEffect } from 'react';
import { AppState } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import * as api from '@/data/api';
import { runOp } from '@/data/queued';
import { dueInstalments } from '@/features/debts/auto';
import { today } from './dates';
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

  // Instalments the lender took from salary are written down by the app, once a month per debt.
  const writeInstalments = useCallback(async () => {
    if (!signedIn) return;
    try {
      const [debts, payments] = await Promise.all([api.listDebts(), api.listDebtPayments()]);
      const due = dueInstalments(debts, payments, today());
      for (const d of due) await api.addDebtPayment({ debt_id: d.debt_id, amount_laari: d.amount_laari, paid_on: d.paid_on, note: null, source: 'auto', period: d.period });
      if (due.length) await qc.invalidateQueries();
    } catch { /* offline or not ready: it is tried again next time the app opens */ }
  }, [signedIn, qc]);

  useEffect(() => { void loadOutbox().then(run).then(writeInstalments); }, [run, writeInstalments]);
  useEffect(() => { if (online && pending > 0) void run(); }, [online, pending, run]);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') void run().then(writeInstalments); });
    return () => sub.remove();
  }, [run, writeInstalments]);
  useEffect(() => {
    if (pending === 0) return;
    const id = setInterval(() => void run(), RETRY_MS);
    return () => clearInterval(id);
  }, [pending, run]);
}
