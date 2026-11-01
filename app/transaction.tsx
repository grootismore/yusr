import { useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { DateField } from '@/components/DateField';
import { Button, Chips, EmptyState, ErrorText, Field, Group, HeaderTextButton, Screen, Segmented } from '@/components/ui';
import { toInputText, parsePositiveAmount, useCategoryName, useFormatDate } from '@/features/transactions/format';
import { useAccounts, useCategories, useSaveTransaction, useSoftDelete, useTransactions } from '@/features/transactions/hooks';
import { toISODate } from '@/features/transactions/logic';
import { KINDS, type Kind } from '@/features/transactions/types';

// Add / edit sheet. Built for speed: amount first, sensible defaults, one tap per choice.
export default function TransactionScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const formatDate = useFormatDate();
  const categoryName = useCategoryName();
  const accounts = useAccounts();
  const categories = useCategories();
  const transactions = useTransactions();
  const save = useSaveTransaction();
  const remove = useSoftDelete('transactions');

  const existing = id ? transactions.find((x) => x.id === id) : undefined;
  const [kind, setKind] = useState<Kind>(existing?.kind ?? 'expense');
  const [amountText, setAmountText] = useState(existing ? toInputText(existing.amount_laari) : '');
  const [categoryId, setCategoryId] = useState<string | null>(existing?.category_id ?? null);
  const [accountId, setAccountId] = useState<string | null>(existing?.account_id ?? null);
  const [date, setDate] = useState(existing?.occurred_on ?? toISODate(new Date()));
  const [note, setNote] = useState(existing?.note ?? '');
  const [submitted, setSubmitted] = useState(false);

  // Default account: the one used most recently (if still active), else the first.
  const defaultAccountId = useMemo(() => {
    const latest = [...transactions]
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
      .find((x) => accounts.active.some((a) => a.id === x.account_id));
    return latest?.account_id ?? accounts.active[0]?.id ?? null;
  }, [transactions, accounts.active]);

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
    save(
      {
        account_id: chosenAccountId,
        category_id: chosenCategoryId,
        amount_laari: amount,
        kind,
        occurred_on: date,
        note: note.trim() === '' ? null : note.trim(),
      },
      existing,
    );
    router.back(); // saved on this device already; syncs in the background
  }

  function onDelete() {
    if (!existing) return;
    Alert.alert(t('transactions.deleteTitle'), t('transactions.deleteBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => {
          remove(existing.id);
          router.back();
        },
      },
    ]);
  }

  const header = (
    <Stack.Screen
      options={{
        title: existing ? t('transactions.editTitle') : t('transactions.newTitle'),
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
      <Segmented options={KINDS.map((value) => ({ value, label: t(`kind.${value}`) }))} value={kind} onChange={setKind} />
      <Group>
        <Field
          label={t('transactions.amount')}
          latin
          value={amountText}
          onChangeText={setAmountText}
          placeholder="0.00"
          keyboardType="decimal-pad"
          autoFocus={!existing}
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
      {submitted ? <ErrorText>{error}</ErrorText> : null}
      {existing ? <Button variant="destructive" title={t('transactions.delete')} onPress={onDelete} /> : null}
    </Screen>
  );
}
