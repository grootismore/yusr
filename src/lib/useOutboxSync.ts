import { useCallback, useEffect } from 'react';
import { AppState } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import * as api from '@/data/api';
import { runOp } from '@/data/queued';
import * as Crypto from 'expo-crypto';
import { DEFAULT_USD_RATE } from '@/features/debts/compute';
import { dueInstalments } from '@/features/debts/auto';
import { dueRuns } from '@/features/recurring/logic';
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

  // Things that repeat are written down by the app: instalments the lender took from salary, and recurring items on their day.
  const writeInstalments = useCallback(async () => {
    if (!signedIn) return;
    try {
      const [debts, payments] = await Promise.all([api.listDebts(), api.listDebtPayments()]);
      const due = dueInstalments(debts, payments, today());
      for (const d of due) await api.addDebtPayment({ debt_id: d.debt_id, amount_laari: d.amount_laari, paid_on: d.paid_on, note: null, source: 'auto', period: d.period });
      // Recurring items set to add themselves are recorded on their day (the others wait for the person to tap Record).
      const [items, runs, rates] = await Promise.all([api.listRecurring(), api.listRecurringRuns(), api.getRates()]);
      const own = dueRuns(items.filter((i) => i.auto_add), runs, today());
      for (const { item, occurrence } of own) {
        const rate = item.currency === 'MVR' ? '1' : rates[item.currency] ?? (item.currency === 'USD' ? String(DEFAULT_USD_RATE) : '1');
        await api.logRecurring({ id: Crypto.randomUUID(), recurring_id: item.id, occurrence, kind: item.kind, name: item.name, amount_minor: item.amount_minor, currency: item.currency, fx_rate_to_mvr: rate, category_id: item.category_id });
      }
      if (due.length || own.length) await qc.invalidateQueries();
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
