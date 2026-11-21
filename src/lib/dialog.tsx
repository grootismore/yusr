import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/Text';
import { Button } from '@/components/ui';
import { LIFT, radius, space, useColors } from '@/theme/tokens';

type Ask = { id: number; title: string; message?: string; confirmLabel: string; cancelLabel?: string; destructive?: boolean; resolve: (ok: boolean) => void };
type Options = { title: string; message?: string; confirmLabel: string; cancelLabel?: string; destructive?: boolean };

let n = 0;
// Every mounted host, oldest first. A question goes to the newest one: a screen shown as a modal on a phone sits on top
// of the root, and a dialog opened from the root cannot be seen above it, so each screen carries its own host.
const hosts: ((a: Ask) => void)[] = [];

/**
 * A question in the app's own card, instead of the system alert. Resolves true when the confirm button is tapped, false when
 * cancelled (cancel button, backdrop, or Android back). Call from anywhere; <DialogHost/> shows it, one at a time.
 */
export function confirmDialog(o: Options): Promise<boolean> {
  return new Promise((resolve) => { const host = hosts[hosts.length - 1]; if (host) host({ id: ++n, ...o, resolve }); else resolve(false); });
}

/** A message with one button. Resolves once it is dismissed. */
export async function noticeDialog(o: { title: string; message?: string; okLabel: string }): Promise<void> {
  await confirmDialog({ title: o.title, message: o.message, confirmLabel: o.okLabel });
}

export function DialogHost() {
  const colors = useColors();
  const [queue, setQueue] = useState<Ask[]>([]);

  useEffect(() => {
    const host = (a: Ask) => setQueue((q) => [...q, a]);
    hosts.push(host);
    return () => { const i = hosts.indexOf(host); if (i >= 0) hosts.splice(i, 1); };
  }, []);

  const current = queue[0];
  if (!current) return null;

  const settle = (ok: boolean) => {
    current.resolve(ok);
    setQueue((q) => q.slice(1));
  };

  return (
    <Modal transparent animationType="fade" visible statusBarTranslucent onRequestClose={() => settle(false)}>
      <View style={{ flex: 1, justifyContent: 'center', padding: space.xl }}>
        <Pressable accessibilityLabel={current.cancelLabel ?? current.confirmLabel} onPress={() => settle(false)} style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.35)' }]} />
        <View key={current.id} accessibilityRole="alert" style={{ alignSelf: 'center', width: '100%', maxWidth: 420, gap: space.md, padding: space.xl, borderRadius: radius.lg, borderCurve: 'continuous',
          backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardEdge, boxShadow: LIFT }}>
          <Text variant="heading" accessibilityRole="header">{current.title}</Text>
          {current.message ? <Text color={colors.inkMuted}>{current.message}</Text> : null}
          <View style={{ gap: space.sm, marginTop: space.sm }}>
            <Button label={current.confirmLabel} kind={current.destructive ? 'danger' : 'primary'} onPress={() => settle(true)} />
            {current.cancelLabel ? <Button label={current.cancelLabel} kind="secondary" onPress={() => settle(false)} /> : null}
          </View>
        </View>
      </View>
    </Modal>
  );
}
