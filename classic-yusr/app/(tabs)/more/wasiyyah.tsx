import { Text } from '@/components/Text';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { PreventCapture } from '@/components/PreventCapture';
import { Group, Money, Row, Screen } from '@/components/ui';
import { currentBalance, totalOwed, totalReceivable } from '@/features/debts/logic';
import {
  useCommitments,
  useContacts,
  useDebts,
  useProfile,
  useReceivables,
  useTransactions,
  useWasiyyahNote,
} from '@/features/transactions/hooks';
import { readiness } from '@/features/wasiyyah/register';
import { sum } from '@/lib/money';
import { useColors } from '@/lib/theme';
import { AppIcon } from '@/components/AppIcon';

export default function WasiyyahScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const colors = useColors();
  const debts = useDebts().active;
  const receivables = useReceivables().active;
  const commitments = useCommitments().active.filter((c) => c.active);
  const transactions = useTransactions();
  const contacts = useContacts().current;
  const note = useWasiyyahNote();
  const { privacyMode } = useProfile();

  const ready = readiness({
    debtCount: debts.filter((d) => currentBalance(d, transactions) > 0).length,
    contactCount: contacts.length,
    hasNote: (note ?? '').trim() !== '',
  });
  const text = { fontSize: 15, color: colors.secondaryText, paddingHorizontal: 16 } as const;
  const step = (label: string, done: boolean, onPress: () => void) => (
    <Row
      label={label}
      value={done ? t('wasiyyah.done') : t('wasiyyah.notDone')}
      right={<AppIcon accessible={false} name={done ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={done ? colors.tint : colors.secondaryText} />}
      onPress={onPress}
    />
  );

  return (
    <Screen>
      <PreventCapture />
      <Text style={text}>{t('wasiyyah.intro')}</Text>
      <Text style={text}>{t('wasiyyah.notAutomatic')}</Text>

      <Group title={`${t('wasiyyah.readiness')} · ${t('wasiyyah.readinessDone', { done: ready.done })}`}>
        {step(t('wasiyyah.stepDebts'), ready.debtsAdded, () => router.push('/debts/debt'))}
        {step(t('wasiyyah.stepContact'), ready.contactInvited, () => router.push('/more/contacts'))}
        {step(t('wasiyyah.stepNote'), ready.noteWritten, () => router.push('/more/wasiyyah-note'))}
      </Group>

      <Group title={t('wasiyyah.register')}>
        <Row label={t('wasiyyah.debtsRow')} right={<Money laari={totalOwed(debts, transactions)} />} />
        <Row label={t('wasiyyah.receivablesRow')} right={<Money laari={totalReceivable(receivables)} />} />
        <Row label={t('wasiyyah.givingRow')} right={<Money laari={sum(commitments.map((c) => c.amount_laari))} hidden={privacyMode} />} />
        <Row label={t('wasiyyah.noteRow')} value={ready.noteWritten ? t('wasiyyah.noteWritten') : t('wasiyyah.noteEmpty')} chevron onPress={() => router.push('/more/wasiyyah-note')} />
      </Group>

      <Group>
        <Row label={t('wasiyyah.share')} chevron onPress={() => router.push('/more/wasiyyah-share')} />
        <Row label={t('wasiyyah.contacts')} value={`${contacts.length}/3`} chevron onPress={() => router.push('/more/contacts')} />
        <Row label={t('wasiyyah.activity')} chevron onPress={() => router.push('/more/audit-log')} />
      </Group>
    </Screen>
  );
}
