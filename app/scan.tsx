import { useState } from 'react';
import { View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text } from '@/components/Text';
import { Button, Card, Icon, Row, Screen } from '@/components/ui';
import { ScanError, scanReceipt, type ScanFailure } from '@/data/api';
import { useScansUsed } from '@/data/hooks';
import { useQueryClient } from '@tanstack/react-query';
import { colors, space } from '@/theme/tokens';

const LIMIT = 10; // free scans per month; the server enforces it, this is only for display

export default function Scan() {
  const { t } = useTranslation();
  const router = useRouter();
  const qc = useQueryClient();
  const used = useScansUsed().data ?? 0;
  const left = Math.max(0, LIMIT - used);
  const [step, setStep] = useState<null | 'uploading' | 'reading'>(null);
  const [problem, setProblem] = useState<ScanFailure | 'camera' | null>(null);
  const [partial, setPartial] = useState<unknown>(null);
  const [lastUri, setLastUri] = useState<string | null>(null);

  async function run(uri: string) {
    setProblem(null); setLastUri(uri);
    try {
      const r = await scanReceipt(uri, setStep);
      void qc.invalidateQueries({ queryKey: ['scans'] });
      router.replace({ pathname: '/confirm', params: { draft: JSON.stringify(r.draft), path: r.imageDeleted ? '' : r.path } });
    } catch (e) {
      const kind = e instanceof ScanError ? e.kind : 'failed';
      setPartial(e instanceof ScanError ? e.draft : null);
      setProblem(kind);
      void qc.invalidateQueries({ queryKey: ['scans'] });
    } finally { setStep(null); }
  }

  async function pick(source: 'camera' | 'gallery') {
    if (source === 'camera') {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) { setProblem('camera'); return; }
    }
    const r = source === 'camera'
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
    if (!r.canceled && r.assets[0]) await run(r.assets[0].uri);
  }

  const busy = step !== null;
  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between' }}>
        <Text variant="title">{t('scan.title')}</Text>
        <Button kind="ghost" label={t('common.cancel')} onPress={() => router.back()} />
      </Row>
      <Text color={colors.inkMuted}>{t('scan.subtitle')}</Text>

      <Card tone={left === 0 ? 'warn' : 'plain'}>
        <Row>
          <Icon name="scan" color={colors.teal} />
          <Text variant="heading" accessibilityLiveRegion="polite">{t('scan.left', { left, limit: LIMIT })}</Text>
        </Row>
        {left === 0 ? <Text>{t('scan.noScans', { limit: LIMIT })}</Text> : null}
      </Card>

      {busy ? (
        <Card style={{ alignItems: 'center', paddingVertical: space.xxl }}>
          <Icon name="hourglass-outline" size={36} color={colors.teal} />
          <Text variant="heading" accessibilityLiveRegion="polite">{step === 'uploading' ? t('scan.uploading') : t('scan.working')}</Text>
        </Card>
      ) : (
        <View style={{ gap: space.md }}>
          <Button label={t('scan.camera')} icon="camera" disabled={left === 0} onPress={() => pick('camera')} />
          <Button kind="secondary" label={t('scan.gallery')} icon="images" disabled={left === 0} onPress={() => pick('gallery')} />
          <Button kind="ghost" label={t('scan.manual')} onPress={() => router.replace('/add-expense')} />
        </View>
      )}

      {problem && problem !== 'quota' ? (
        <Card tone="warn" >
          <Row><Icon name="information-circle" color={colors.amberDeep} /><Text style={{ flex: 1 }} accessibilityLiveRegion="polite">{t(problem === 'camera' ? 'scan.cameraDenied' : `scan.${problem}`)}</Text></Row>
          {problem === 'offline' && lastUri ? <Button label={t('common.retry')} onPress={() => run(lastUri)} /> : null}
          {problem === 'unreadable' ? (
            <>
              <Button kind="secondary" label={t('scan.retake')} onPress={() => pick('camera')} />
              <Button kind="ghost" label={t('scan.fillByHand')} onPress={() => (partial
                ? router.replace({ pathname: '/confirm', params: { draft: JSON.stringify(partial), path: '' } })
                : router.replace('/add-expense'))} />
            </>
          ) : null}
        </Card>
      ) : null}
    </Screen>
  );
}
