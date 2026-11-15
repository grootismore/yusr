import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { arcs } from '@/features/trends/chart';
import { useColors } from '@/theme/tokens';

const SIZE = 200, STROKE = 22, R = (SIZE - STROKE) / 2, C = 2 * Math.PI * R;

/** A ring split into slices, with whatever you pass as children (the total) in the middle. */
export function DonutChart({ values, colors: sliceColors, children, label }: { values: number[]; colors: string[]; children?: React.ReactNode; label: string }) {
  const colors = useColors();
  const parts = arcs(values, C);
  return (
    <View accessible accessibilityLabel={label} style={{ width: SIZE, height: SIZE, alignSelf: 'center', alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} style={{ position: 'absolute' }}>
        <Circle cx={SIZE / 2} cy={SIZE / 2} r={R} stroke={colors.groundDeep} strokeWidth={STROKE} fill="none" />
        {parts.map((a, i) => (
          <Circle key={i} cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" stroke={sliceColors[i % sliceColors.length]} strokeWidth={STROKE} strokeLinecap="round"
            strokeDasharray={`${a.length} ${C - a.length}`} strokeDashoffset={-a.start} transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`} />
        ))}
      </Svg>
      <View style={{ width: SIZE - STROKE * 2 - 8, alignItems: 'center' }}>{children}</View>
    </View>
  );
}
