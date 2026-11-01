import { useMemo, useState } from 'react';
import { Alert, Share, Switch, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { PreventCapture } from '@/components/PreventCapture';
import { Button, Group, Row, Screen } from '@/components/ui';
import { currentBalance } from '@/features/debts/logic';
import {
  useCommitments,
  useDebts,
  useDebtSecretsMap,
  useLogRegisterShared,
  useReceivables,
  useTransactions,
  useWasiyyahNote,
} from '@/features/transactions/hooks';
import { buildRegister, registerToText, SECTIONS, type Section, type ShareLabels } from '@/features/wasiyyah/register';
import { useColors } from '@/lib/theme';

export default function WasiyyahShareScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  const debts = useDebts().active;
  const receivables = useReceivables().active;
  const commitments = useCommitments().active;
  const transactions = useTransactions();
  const note = useWasiyyahNote();
  const logShared = useLogRegisterShared();
  const [include, setInclude] = useState<ReadonlySet<Section>>(new Set(SECTIONS));
  const [busy, setBusy] = useState(false);

  const owedIds = useMemo(() => debts.filter((d) => currentBalance(d, transactions) > 0).map((d) => d.id), [debts, transactions]);
  const secrets = useDebtSecretsMap(owedIds);

  const labels: ShareLabels = {
    title: t('wasiyyah.shareLabels.title'), debts: t('wasiyyah.shareLabels.debts'), receivables: t('wasiyyah.shareLabels.receivables'),
    giving: t('wasiyyah.shareLabels.giving'), note: t('wasiyyah.shareLabels.note'), reference: t('wasiyyah.shareLabels.reference'),
    contactFirst: t('wasiyyah.shareLabels.contactFirst'), footer: t('wasiyyah.shareLabels.footer'),
    type: (type) => t(`giving.types.${type}`), schedule: (schedule) => t(`giving.schedules.${schedule}`),
  };
  const message = registerToText(buildRegister({ debts, transactions, receivables, commitments, secrets, note: note ?? '' }), include, labels);

  const toggle = (section: Section, on: boolean) =>
    setInclude((previous) => {
      const next = new Set(previous);
      if (on) next.add(section);
      else next.delete(section);
      return next;
    });

  async function share() {
    setBusy(true);
    try {
      // Record the share first (needs the server), so the activity log can never miss one.
      await logShared([...include]);
      await Share.share({ message });
    } catch {
      Alert.alert(t('wasiyyah.shareFailed'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <PreventCapture />
      <Text style={{ fontSize: 15, color: colors.secondaryText, paddingHorizontal: 16 }}>{t('wasiyyah.shareWarn')}</Text>
      <Group title={t('wasiyyah.shareChoose')}>
        {SECTIONS.map((section) => (
          <Row
            key={section}
            label={t(`wasiyyah.sections.${section}`)}
            right={<Switch accessibilityLabel={t(`wasiyyah.sections.${section}`)} value={include.has(section)} onValueChange={(on) => toggle(section, on)} />}
          />
        ))}
      </Group>
      <Group title={t('wasiyyah.preview')}>
        <Text selectable style={{ fontSize: 15, color: colors.text, padding: 16 }}>{message}</Text>
      </Group>
      {include.size === 0 ? <Text style={{ color: colors.secondaryText, paddingHorizontal: 16 }}>{t('wasiyyah.shareNothing')}</Text> : null}
      <Button title={t('wasiyyah.shareNow')} busy={busy} disabled={include.size === 0} onPress={share} />
    </Screen>
  );
}
