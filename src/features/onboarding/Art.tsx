import { View } from 'react-native';
import { markBoot } from '@/lib/boot';
import { useTranslation } from 'react-i18next';
import { Money } from '@/components/Money';
import { Text } from '@/components/Text';
import { Icon, ProgressBar, Row, type IconName } from '@/components/ui';
import { radius, space, useColors } from '@/theme/tokens';

/** Small illustrations for the intro pages, drawn with views so they follow the theme and need no image files. */
function Chip({ icon, label, style }: { icon: IconName; label?: string; style: object }) {
  const colors = useColors();
  return (
    <View style={[{ position: 'absolute', flexDirection: 'row', alignItems: 'center', gap: space.xs, paddingVertical: space.sm, paddingHorizontal: space.md, borderRadius: radius.pill,
      backgroundColor: colors.surface, boxShadow: '0 6px 18px rgba(0,0,0,0.18)' }, style]}>
      <Icon name={icon} size={18} color={colors.accent} />
      {label ? <Text variant="small">{label}</Text> : null}
    </View>
  );
}

const Line = ({ w }: { w: `${number}%` }) => {
  const colors = useColors();
  return <View style={{ height: 10, width: w, borderRadius: 5, backgroundColor: colors.groundDeep }} />;
};

export function OnboardArt({ kind }: { kind: 'p1' | 'p2' | 'p3' }) {
  markBoot('onboard-art');
  const colors = useColors();
  const { t } = useTranslation();
  return (
    <View style={{ width: 280, height: 230, alignItems: 'center', justifyContent: 'center' }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={{ width: 230, padding: space.lg, gap: space.md, borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: colors.surface, transform: [{ rotate: '-4deg' }], boxShadow: '0 14px 34px rgba(0,0,0,0.22)' }}>
        {kind === 'p1' ? (
          <>
            <Row>
              <View style={{ width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.accentWash, alignItems: 'center', justifyContent: 'center' }}><Icon name="receipt-outline" color={colors.accent} /></View>
              <View style={{ flex: 1, gap: space.sm }}><Line w="80%" /><Line w="50%" /></View>
            </Row>
            <Money laari={12550} variant="heading" />
            <ProgressBar percent={62} state="ok" label="" />
          </>
        ) : null}
        {kind === 'p2' ? (
          <>
            <Row><Icon name="leaf-outline" size={26} color={colors.accent} /><View style={{ flex: 1, gap: space.sm }}><Line w="70%" /></View></Row>
            <Money laari={5750000} variant="heading" />
            <ProgressBar percent={40} state="ok" label="" />
            <Row>{[0, 1, 2, 3].map((i) => <View key={i} style={{ flex: 1, height: 28, borderRadius: 8, backgroundColor: i < 2 ? colors.accent : colors.groundDeep }} />)}</Row>
          </>
        ) : null}
        {kind === 'p3' ? (
          <>
            <View style={{ alignItems: 'center' }}><View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.accentWash, alignItems: 'center', justifyContent: 'center' }}><Icon name="shield-checkmark" size={34} color={colors.accent} /></View></View>
            {[0, 1, 2].map((i) => <Row key={i}><Icon name="checkmark-circle" size={20} color={colors.accent} /><Line w={i === 1 ? '60%' : '80%'} /></Row>)}
          </>
        ) : null}
      </View>
      {kind === 'p1' ? <Chip icon="scan" label={t('tabs.raseedhu')} style={{ top: 6, end: 0 }} /> : null}
      {kind === 'p2' ? <Chip icon="heart-outline" label={t('more.giving')} style={{ bottom: 10, start: 0 }} /> : null}
      {kind === 'p3' ? <Chip icon="lock-closed-outline" style={{ top: 10, start: 6 }} /> : null}
    </View>
  );
}
