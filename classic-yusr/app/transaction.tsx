import { useMemo, useState } from 'react';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { DateField } from '@/components/DateField';
import { Button, Chips, EmptyState, ErrorText, Field, Group, HeaderTextButton, Screen, Segmented } from '@/components/ui';
import { toInputText, parsePositiveAmount, useCategoryName, useFormatDate } from '@/features/transactions/format';
import {
  useAccounts,
  useCategories,
  useCommitments,
  useDebts,
  useRecurringItems,
  useSaveRecurring,
  useSaveTransaction,
  useAddCashAccount,
  useDeleteTransactionWithUndo,
  useProfile,
  useTransactions,
} from '@/features/transactions/hooks';
import { currentBalance } from '@/features/debts/logic';
import { nextDueAfter } from '@/features/transactions/recurring';
import { safeToSpend } from '@/features/transactions/budget';
import { monthOf, toISODate } from '@/features/transactions/logic';
import { formatMVR } from '@/lib/money';
import { showNotice } from '@/lib/notice';
import { KINDS, type Kind, type Transaction } from '@/features/transactions/types';
import { successHaptic } from '@/lib/haptics';
import { useDiscardGuard } from '@/lib/useDiscardGuard';
import { useSubmitOnce } from '@/lib/useSubmitOnce';

// Add / edit sheet. Built for speed: amount first, sensible defaults, one tap per choice.
export default function TransactionScreen() {
  const { id, debtId, commitmentId, recurringId } = useLocalSearchParams<{
    id?: string;
    debtId?: string;
    commitmentId?: string;
    recurringId?: string;
  }>();
  const { t } = useTranslation();
  const router = useRouter();
  const claim = useSubmitOnce();
  const formatDate = useFormatDate();
  const categoryName = useCategoryName();
  const accounts = useAccounts();
  const categories = useCategories();
  const transactions = useTransactions();
  const save = useSaveTransaction();
  const { privacyMode, hijriAdjustment } = useProfile();
  const removeWithUndo = useDeleteTransactionWithUndo();
  const addCash = useAddCashAccount();

  const debts = useDebts();
  const commitments = useCommitments();
  const recurringItems = useRecurringItems();
  const saveRecurring = useSaveRecurring();

  const existing = id ? transactions.find((x) => x.id === id) : undefined;
  // Opened from a debt ("Log a payment") or a giving commitment ("Mark done"): prefill and link it.
  const paymentDebt = !id && debtId ? debts.all.find((d) => d.id === debtId) : undefined;
  const doneCommitment = !id && commitmentId ? commitments.all.find((c) => c.id === commitmentId) : undefined;
  const dueItem = !id && recurringId ? recurringItems.all.find((r) => r.id === recurringId) : undefined;
  const defaultCategoryId = (nameEn: string) => categories.all.find((c) => c.is_default && c.name_en === nameEn)?.id ?? null;
  const prefill: {
    kind: Kind;
    categoryId: string | null;
    amount: number;
    accountId?: string;
    note?: string;
  } | null = paymentDebt
    ? {
        kind: 'expense',
        categoryId: defaultCategoryId('Debt payment'),
        amount: Math.min(paymentDebt.min_payment_laari, currentBalance(paymentDebt, transactions)),
      }
    : doneCommitment
      ? { kind: 'giving', categoryId: defaultCategoryId('Islamic giving'), amount: doneCommitment.amount_laari }
      : dueItem
        ? { kind: dueItem.kind, categoryId: dueItem.category_id, amount: dueItem.amount_laari, accountId: dueItem.account_id, note: dueItem.name }
        : null;
  // A payment or a done-commitment has a fixed kind; letting the user change it would make the server reject it.
  const linkedKind: Kind | null = prefill
    ? prefill.kind
    : existing?.debt_id
      ? 'expense'
      : existing?.commitment_id
        ? 'giving'
        : null;

  const [kind, setKind] = useState<Kind>(existing?.kind ?? prefill?.kind ?? 'expense');
  const [amountText, setAmountText] = useState(
    existing ? toInputText(existing.amount_laari) : prefill && prefill.amount > 0 ? toInputText(prefill.amount) : '',
  );
  const [categoryId, setCategoryId] = useState<string | null>(existing?.category_id ?? prefill?.categoryId ?? null);
  const [accountId, setAccountId] = useState<string | null>(existing?.account_id ?? prefill?.accountId ?? null);
  const [date, setDate] = useState(existing?.occurred_on ?? toISODate(new Date()));
  const [note, setNote] = useState(existing?.note ?? prefill?.note ?? '');
  const [submitted, setSubmitted] = useState(false);

  // Default account: the one used most recently (if still active), else the first.
  const defaultAccountId = useMemo(() => {
    const latest = [...transactions]
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
      .find((x) => accounts.active.some((a) => a.id === x.account_id));
    return latest?.account_id ?? accounts.active[0]?.id ?? null;
  }, [transactions, accounts.active]);

  // Asks before a changed form is closed without saving.
  const leave = useDiscardGuard([kind, amountText, categoryId, accountId, date, note]);

  // What this person usually picks for this kind: how often each category was used, and the latest one.
  const usage = useMemo(() => {
    const counts = new Map<string, number>();
    let recent: { id: string; at: string } | null = null;
    for (const x of transactions) {
      if (x.kind !== kind || x.deleted_at !== null) continue;
      counts.set(x.category_id, (counts.get(x.category_id) ?? 0) + 1);
      if (!recent || x.created_at > recent.at) recent = { id: x.category_id, at: x.created_at };
    }
    return { counts, recent: recent?.id ?? null };
  }, [transactions, kind]);

  if (id && !existing) return null;

  const chosenAccountId = accountId ?? defaultAccountId;
  // Most used first, so the usual choice is at the start of the list (the order is otherwise unchanged).
  const categoryOptions = categories.all
    .filter((c) => c.kind === kind && (c.deleted_at === null || c.id === existing?.category_id))
    .sort((a, b) => (usage.counts.get(b.id) ?? 0) - (usage.counts.get(a.id) ?? 0));
  // A new transaction starts on the category used last time for this kind; one tap changes it.
  const suggested = !existing && !prefill && categoryOptions.some((c) => c.id === usage.recent) ? usage.recent : null;
  const chosenCategoryId = categoryOptions.some((c) => c.id === categoryId) ? categoryId : suggested;
  const amount = parsePositiveAmount(amountText);

  const error =
    amount === null
      ? t('transactions.amountInvalid')
      : !chosenCategoryId
        ? t('transactions.pickCategory')
        : !chosenAccountId
          ? t('transactions.pickAccount')
          : null;

  // After a new entry, say what it did to the one number people watch (quietly, and only for this month).
  function tellWhatItDid(laari: number, account_id: string, category_id: string) {
    const today = toISODate(new Date());
    if (monthOf(date) !== monthOf(today) || (privacyMode && kind === 'giving')) return showNotice(t('transactions.saved'));
    const now = new Date().toISOString();
    const added = {
      id: 'new', user_id: '', account_id, category_id, amount_laari: laari, kind, occurred_on: date, note: null,
      debt_id: paymentDebt?.id ?? null, commitment_id: doneCommitment?.id ?? null, created_at: now, updated_at: now, deleted_at: null,
    } as Transaction;
    const bills = dueItem
      ? recurringItems.active.map((r) => (r.id === dueItem.id ? { ...r, next_due_on: nextDueAfter(dueItem, dueItem.next_due_on) } : r))
      : recurringItems.active;
    const { safeToSpend: room } = safeToSpend({
      today, transactions: [...transactions, added], debts: debts.active, commitments: commitments.active, recurring: bills, hijriAdjustment,
    });
    showNotice(room >= 0 ? t('transactions.savedSafe', { amount: formatMVR(room) }) : t('transactions.savedShort', { amount: formatMVR(-room) }));
  }

  function onSave() {
    setSubmitted(true);
    if (error || amount === null || !chosenCategoryId || !chosenAccountId) return;
    if (!claim()) return;
    save(
      {
        account_id: chosenAccountId,
        category_id: chosenCategoryId,
        amount_laari: amount,
        kind,
        occurred_on: date,
        note: note.trim() === '' ? null : note.trim(),
        ...(paymentDebt ? { debt_id: paymentDebt.id } : {}),
        ...(doneCommitment ? { commitment_id: doneCommitment.id } : {}),
      },
      existing,
    );
    if (dueItem) {
      // Logging it moves the bill on to its next date.
      saveRecurring(
        {
          name: dueItem.name, kind: dueItem.kind, amount_laari: dueItem.amount_laari, category_id: dueItem.category_id,
          account_id: dueItem.account_id, schedule: dueItem.schedule, day_of_month: dueItem.day_of_month,
          weekday: dueItem.weekday, next_due_on: nextDueAfter(dueItem, dueItem.next_due_on), active: dueItem.active,
        },
        dueItem,
      );
    }
    successHaptic();
    leave();
    router.back(); // saved on this device already; syncs in the background
    if (!existing) tellWhatItDid(amount, chosenAccountId, chosenCategoryId);
  }

  // No "are you sure?": the row is removed and Undo brings it straight back.
  function onDelete() {
    if (!existing) return;
    removeWithUndo(existing);
    leave();
    router.back();
  }

  const header = (
    <Stack.Screen
      options={{
        title: existing
          ? t('transactions.editTitle')
          : paymentDebt
            ? t('debts.logPayment')
            : doneCommitment
              ? t('giving.markDone')
              : t('transactions.newTitle'),
        headerLeft: () => <HeaderTextButton label={t('common.cancel')} onPress={() => router.back()} />,
        headerRight: () => <HeaderTextButton label={t('common.save')} onPress={onSave} />,
      }}
    />
  );

  if (accounts.active.length === 0) {
    return (
      <Screen>
        {header}
        <EmptyState
          title={t('transactions.needAccount')}
          body={t('transactions.needAccountBody')}
          actionLabel={t('accounts.useCash')}
          onAction={addCash}
        />
        <Button title={t('home.addAccount')} variant="secondary" onPress={() => router.replace('/more/account')} />
      </Screen>
    );
  }

  return (
    <Screen>
      {header}
      {submitted ? <ErrorText>{error}</ErrorText> : null}
      {linkedKind ? null : (
        <Segmented options={KINDS.map((value) => ({ value, label: t(`kind.${value}`) }))} value={kind} onChange={setKind} />
      )}
      <Group>
        <Field
          label={t('transactions.amount')}
          latin
          value={amountText}
          onChangeText={setAmountText}
          placeholder="0.00"
          keyboardType="decimal-pad"
        />
        <DateField label={t('transactions.date')} value={date} text={formatDate(date)} onChange={setDate} />
      </Group>
      <Group title={t('transactions.category')}>
        <Chips
          options={categoryOptions.map((c) => ({ value: c.id, label: categoryName(c) }))}
          value={chosenCategoryId}
          onChange={setCategoryId}
        />
      </Group>
      <Group title={t('transactions.account')}>
        <Chips
          options={accounts.active.map((a) => ({ value: a.id, label: a.name }))}
          value={chosenAccountId}
          onChange={setAccountId}
        />
      </Group>
      <Group>
        <Field label={t('transactions.note')} value={note} onChangeText={setNote} maxLength={500} returnKeyType="done" />
      </Group>
      {existing ? <Button variant="destructive" title={t('transactions.delete')} onPress={onDelete} /> : null}
    </Screen>
  );
}
