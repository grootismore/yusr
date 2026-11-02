import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { formatMVR } from '@/lib/money';

/** Colours of the water column. The card is always deep green, in light and dark appearance. */
export const DEPTH = {
  gradient: ['#0D4E3A', '#13705F'] as const,
  text: '#FFFFFF',
  spent: '#041F17',
  debts: '#5FC3B2',
  giving: '#E3B965',
  bills: '#A9DCD1',
  used: '#041F17',
  safe: '#F3FBF7',
  paid: '#5FC3B2',
  owed: '#F3FBF7', // the unpaid remainder, an empty stretch of the column
} as const;

export interface DepthPart {
  key: string;
  label: string;
  laari: number;
  color: string;
  /** Show "••••" instead of the figure (private mode). */
  hidden?: boolean;
  /** Left out of the legend when the headline already says it (the amount you can spend, the amount you owe). */
  legend?: boolean;
}

/**
 * The one hero per screen: a lagoon-depth card. The big figure is what matters, the column under it
 * shows where the rest of the money sits, and the legend names each layer with its real amount.
 * The contour lines are texture only.
 */
export function DepthCard({
  lead,
  amount,
  note,
  parts,
  accessibilityLabel,
  footer,
}: {
  lead: string;
  amount: number;
  note?: string;
  parts: readonly DepthPart[];
  accessibilityLabel: string;
  footer?: ReactNode;
}) {
  return (
    <LinearGradient
      colors={DEPTH.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      accessible
      accessibilityRole="summary"
      accessibilityLabel={accessibilityLabel}
      style={{ borderRadius: 20, padding: 18, gap: 10, overflow: 'hidden' }}
    >
      <Svg
        accessible={false}
        importantForAccessibility="no-hide-descendants"
        width="100%"
        height="100%"
        viewBox="0 0 300 170"
        preserveAspectRatio="none"
        style={{ position: 'absolute', top: 0, start: 0, end: 0, bottom: 0 }}
      >
        {[130, 108, 86, 64].map((y, i) => (
          <Path
            key={y}
            d={`M-10 ${y}C45 ${y - 26} 88 ${y + 14} 140 ${y - 12}S235 ${y - 34} 310 ${y - 6}`}
            stroke="#FFFFFF"
            strokeOpacity={0.12 + i * 0.01}
            strokeWidth={1}
            fill="none"
          />
        ))}
      </Svg>
      <Text style={{ fontSize: 15, fontWeight: '600', color: DEPTH.text, opacity: 0.92 }}>{lead}</Text>
      <Text
        adjustsFontSizeToFit
        numberOfLines={1}
        style={{ fontSize: 38, fontWeight: '800', letterSpacing: -0.8, color: DEPTH.text, writingDirection: 'ltr', fontVariant: ['tabular-nums'], textAlign: 'left' }}
      >
        {formatMVR(amount)}
      </Text>
      {note ? <Text style={{ fontSize: 15, fontWeight: '600', color: DEPTH.text }}>{note}</Text> : null}
      {parts.length > 0 ? (
        <>
          <View style={{ flexDirection: 'row', height: 14, gap: 2, borderRadius: 7, overflow: 'hidden', marginTop: 4 }}>
            {parts.map((part) => (
              <View key={part.key} style={{ flex: part.laari, minWidth: 5, backgroundColor: part.color, borderWidth: 1, borderColor: 'rgba(255,255,255,0.28)', borderRadius: 3 }} />
            ))}
          </View>
          <View style={{ gap: 6 }}>
            {parts.filter((part) => part.legend !== false).map((part) => (
              <View key={part.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: part.color, borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)' }} />
                <Text style={{ fontSize: 14, color: DEPTH.text, flexShrink: 1 }}>{part.label}</Text>
                <Text style={{ fontSize: 14, fontWeight: '700', color: DEPTH.text, fontVariant: ['tabular-nums'], writingDirection: 'ltr', marginStart: 'auto' }}>
                  {part.hidden ? '••••' : formatMVR(part.laari)}
                </Text>
              </View>
            ))}
          </View>
        </>
      ) : null}
      {footer}
    </LinearGradient>
  );
}
