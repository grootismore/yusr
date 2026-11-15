import { useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text } from '@/components/Text';
import { Button, Card, Chip, Field, Row } from '@/components/ui';
import * as api from '@/data/api';
import { useWrite } from '@/data/hooks';
import { success } from '@/lib/haptics';
import { space, useColors } from '@/theme/tokens';
import type { HouseholdMode } from './logic';

/** Start a couple or a household, or join one with a code. Used on the Household screen and in first-run setup. */
export function HouseholdStart({ onDone }: { onDone?: () => void }) {
  const colors = useColors();
  const { t } = useTranslation();
  const [mode, setMode] = useState<HouseholdMode>('couple');
  const [mine, setMine] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const create = useWrite(api.createHousehold);
  const join = useWrite(api.joinHousehold);

  return (
    <View style={{ gap: space.lg }}>
      {!joining ? (
        <>
          <Row>
            {(['couple', 'household'] as const).map((m) => <Chip key={m} label={t(`household.mode.${m}`)} selected={mode === m} onPress={() => setMode(m)} />)}
          </Row>
          <Text color={colors.inkMuted}>{t(`household.mode.${mode}Note`)}</Text>
          <Field label={t('household.yourName')} value={mine} onChangeText={setMine} maxLength={40} autoCapitalize="words" />
          <Field label={t(`household.mode.${mode}Name`)} hint={t(`household.mode.${mode}NameHint`)} value={name} onChangeText={setName} maxLength={60} autoCapitalize="words" />
          {error ? <Text color={colors.coral} accessibilityLiveRegion="polite">{error}</Text> : null}
          <Button label={t(`household.mode.${mode}Create`)} icon="people-outline" loading={create.isPending} onPress={async () => {
            if (!mine.trim() || !name.trim()) { setError(t('household.needNames')); return; }
            setError(null);
            try { await create.mutateAsync({ name: name.trim(), displayName: mine.trim(), mode }); success(); onDone?.(); } catch { setError(t('household.failed')); }
          }} />
          <Button kind="ghost" label={t('household.haveCode')} onPress={() => { setJoining(true); setError(null); }} />
        </>
      ) : (
        <Card>
          <Text variant="heading">{t('household.joinTitle')}</Text>
          <Text variant="small" color={colors.inkMuted}>{t('household.joinNote')}</Text>
          <Field label={t('household.yourName')} value={mine} onChangeText={setMine} maxLength={40} autoCapitalize="words" />
          <Field label={t('household.code')} value={code} onChangeText={(v) => setCode(v.toUpperCase())} autoCapitalize="characters" autoCorrect={false} maxLength={12} />
          {error ? <Text color={colors.coral} accessibilityLiveRegion="polite">{error}</Text> : null}
          <Button label={t('household.join')} loading={join.isPending} onPress={async () => {
            if (!mine.trim() || code.trim().length < 8) { setError(t('household.needCode')); return; }
            setError(null);
            try { await join.mutateAsync({ code: code.trim(), displayName: mine.trim() }); success(); onDone?.(); } catch (e) { setError(String((e as { code?: string })?.code) === '23514' ? t('household.coupleFull') : t('household.badCode')); }
          }} />
          <Button kind="ghost" label={t('household.startOwn')} onPress={() => { setJoining(false); setError(null); }} />
        </Card>
      )}
    </View>
  );
}
