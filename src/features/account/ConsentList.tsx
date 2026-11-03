import { Linking, Pressable, StyleSheet, Switch, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text } from '@/components/Text';
import { useColors } from '@/lib/theme';
import { legalUrl, type ConsentKind } from './legal';

/** One unticked switch per consent, with a link to read the document (sign-up and re-consent). */
export function ConsentList({
  kinds,
  agreed,
  onChange,
}: {
  kinds: readonly ConsentKind[];
  agreed: Record<string, boolean>;
  onChange: (next: Record<string, boolean>) => void;
}) {
  const { t } = useTranslation();
  const colors = useColors();
  return (
    <View style={{ backgroundColor: colors.surface, borderRadius: 16, overflow: 'hidden' }}>
      {kinds.map((kind, index) => {
        const url = kind === 'age_18' ? null : legalUrl(kind);
        return (
          <View
            key={kind}
            style={{
              minHeight: 44,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderTopWidth: index === 0 ? 0 : StyleSheet.hairlineWidth,
              borderTopColor: colors.separator,
            }}
          >
            <Text style={{ flex: 1, fontSize: 15, color: colors.text }}>{t(`auth.consent.${kind}`)}</Text>
            {url ? (
              <Pressable
                accessibilityRole="link"
                accessibilityLabel={t(`auth.consent.${kind}Read`)}
                onPress={() => void Linking.openURL(url)}
                style={{ minHeight: 44, justifyContent: 'center' }}
              >
                <Text style={{ fontSize: 15, color: colors.tint }}>{t('auth.consent.read')}</Text>
              </Pressable>
            ) : null}
            <Switch
              accessibilityLabel={t(`auth.consent.${kind}`)}
              value={agreed[kind] === true}
              onValueChange={(value) => onChange({ ...agreed, [kind]: value })}
            />
          </View>
        );
      })}
    </View>
  );
}
