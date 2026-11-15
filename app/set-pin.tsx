import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { PinPad } from '@/components/PinPad';
import { Text } from '@/components/Text';
import { Screen, StackHeader } from '@/components/ui';
import { success } from '@/lib/haptics';
import { PIN_LENGTH, savePin } from '@/lib/pin';
import { space, useColors } from '@/theme/tokens';

/** Choose a PIN, then type it again to confirm. */
export default function SetPin() {
  const colors = useColors();
  const { t } = useTranslation();
  const router = useRouter();
  const [first, setFirst] = useState<string | null>(null);
  const [pin, setPin] = useState('');
  const [mismatch, setMismatch] = useState(false);

  async function change(v: string) {
    setPin(v);
    if (v.length !== PIN_LENGTH) return;
    if (first === null) { setFirst(v); setPin(''); setMismatch(false); return; }
    if (v !== first) { setFirst(null); setPin(''); setMismatch(true); return; }
    await savePin(v);
    success();
    router.back();
  }

  return (
    <Screen>
      <StackHeader title={t('pin.setTitle')} />
      <Text variant="body" color={mismatch ? colors.coral : colors.inkMuted} style={{ textAlign: 'center', marginVertical: space.lg }}>
        {mismatch ? t('pin.mismatch') : first === null ? t('pin.choose', { count: PIN_LENGTH }) : t('pin.again')}
      </Text>
      <PinPad value={pin} onChange={change} />
    </Screen>
  );
}
