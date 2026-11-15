import { useState } from 'react';
import { Image, Pressable, ScrollView, Text as RNText, TextInput, View } from 'react-native';
import { i18n } from '@/lib/i18n';
import { sendFeedback } from '@/lib/monitoring';

// Plain React Native only, with fixed dark colours: this screen appears after something broke, so it must not depend on
// the app's own components, theme or fonts. The words come from the language files (with English as the fallback).
const BG = '#141517', INK = '#FFFFFF', MUTED = '#B9BDC2', SKY = '#8EC5F0', ON_SKY = '#1E2023', EDGE = '#34373D';
// If the language files are not loaded yet (the problem happened that early), English is used.
const tr = (key: string, fallback: string): string => (i18n.isInitialized ? i18n.t(key, { defaultValue: fallback }) : '') || fallback;

/**
 * What a person sees after the app closed on a problem: calm words, a way to carry on, and a way to tell us. The
 * technical details stay folded away for support; sending a report sends only what they choose to write plus that detail.
 */
export function CrashScreen({ details, onContinue, continueLabel }: { details: string; onContinue: () => void; continueLabel?: string }) {
  const [note, setNote] = useState('');
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const rtl = i18n.language === 'dv';

  return (
    <ScrollView style={{ flex: 1, backgroundColor: BG }} contentContainerStyle={{ flexGrow: 1, padding: 24, paddingTop: 88, gap: 18, alignItems: 'stretch' }} keyboardShouldPersistTaps="handled">
      <View style={{ alignItems: 'center', gap: 14 }}>
        <Image source={require('../../../assets/images/icon.png')} accessible={false} style={{ width: 72, height: 72, borderRadius: 16 }} />
        <RNText accessibilityRole="header" style={{ color: INK, fontSize: 24, fontWeight: '700', textAlign: 'center', writingDirection: rtl ? 'rtl' : 'ltr' }}>{tr('crash.title', 'Something went wrong')}</RNText>
        <RNText style={{ color: MUTED, fontSize: 16, lineHeight: 24, textAlign: 'center', writingDirection: rtl ? 'rtl' : 'ltr' }}>{tr('crash.body', 'Kharadhu closed unexpectedly. Your records are safe. We are sorry about that.')}</RNText>
      </View>

      <Pressable accessibilityRole="button" onPress={onContinue} style={{ minHeight: 54, borderRadius: 27, backgroundColor: SKY, alignItems: 'center', justifyContent: 'center' }}>
        <RNText style={{ color: ON_SKY, fontSize: 17, fontWeight: '700' }}>{continueLabel ?? tr('crash.continue', 'Open Kharadhu')}</RNText>
      </Pressable>

      {sent ? (
        <RNText accessibilityLiveRegion="polite" style={{ color: SKY, fontSize: 16, textAlign: 'center', writingDirection: rtl ? 'rtl' : 'ltr' }}>{tr('crash.thanks', 'Thank you. We have your report.')}</RNText>
      ) : (
        <View style={{ gap: 10, borderWidth: 1, borderColor: EDGE, borderRadius: 18, padding: 16 }}>
          <RNText style={{ color: INK, fontSize: 16, fontWeight: '600', writingDirection: rtl ? 'rtl' : 'ltr' }}>{tr('crash.reportTitle', 'Help us fix it')}</RNText>
          <TextInput value={note} onChangeText={setNote} multiline maxLength={500} placeholder={tr('crash.notePlaceholder', 'What were you doing? (optional)')} placeholderTextColor="#7C8187"
            style={{ minHeight: 72, color: INK, fontSize: 16, borderWidth: 1, borderColor: EDGE, borderRadius: 12, padding: 12, textAlignVertical: 'top', textAlign: rtl ? 'right' : 'left' }} />
          <Pressable accessibilityRole="button" onPress={() => { sendFeedback(note.trim(), details); setSent(true); }} style={{ minHeight: 48, borderRadius: 24, borderWidth: 1.5, borderColor: SKY, alignItems: 'center', justifyContent: 'center' }}>
            <RNText style={{ color: SKY, fontSize: 16, fontWeight: '700' }}>{tr('crash.report', 'Report a problem')}</RNText>
          </Pressable>
          <RNText style={{ color: MUTED, fontSize: 13, lineHeight: 19, writingDirection: rtl ? 'rtl' : 'ltr' }}>{tr('crash.privacy', 'This sends what you wrote and technical details about the problem. It does not include your records.')}</RNText>
        </View>
      )}

      <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpen(!open)} style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
        <RNText style={{ color: MUTED, fontSize: 14 }}>{open ? tr('crash.hideDetails', 'Hide details') : tr('crash.showDetails', 'Details for support')}</RNText>
      </Pressable>
      {open ? <RNText selectable style={{ color: MUTED, fontSize: 12, lineHeight: 18 }}>{details}</RNText> : null}
    </ScrollView>
  );
}
