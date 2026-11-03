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
  useSoftDelete,
  useTransactions,
} from '@/features/transactions/hooks';
import { currentBalance } from '@/features/debts/logic';
import { nextDueAfter } from '@/features/transactions/recurring';
import { toISODate } from '@/features/transactions/logic';
import { KINDS, type Kind } from '@/features/transactions/types';
import { confirmAction } from '@/lib/confirm';
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
  const remove = useSoftDelete('transactions');

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

  if (id && !existing) return null;

  const chosenAccountId = accountId ?? defaultAccountId;
  const categoryOptions = categories.all.filter(
    (c) => c.kind === kind && (c.deleted_at === null || c.id === existing?.category_id),
  );
  const chosenCategoryId = categoryOptions.some((c) => c.id === categoryId) ? categoryId : null;
  const amount = parsePositiveAmount(amountText);

  const error =
    amount === null
      ? t('transactions.amountInvalid')
      : !chosenCategoryId
        ? t('transactions.pickCategory')
        : !chosenAccountId
          ? t('transactions.pickAccount')
          : null;

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
  }

  function onDelete() {
    if (!existing) return;
    confirmAction({
      title: t('transactions.deleteTitle'),
      message: t('transactions.deleteBody'),
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
      onConfirm: () => {
          remove(existing.id);
          leave();
          router.back();
        },
    });
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
          actionLabel={t('home.addAccount')}
          onAction={() => router.replace('/more/account')}
        />
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
