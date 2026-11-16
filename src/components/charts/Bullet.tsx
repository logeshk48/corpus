import { Corpus } from '@/constants/theme';
import { View } from 'react-native';

// Bullet bar (ui-ux-pro-max: "performance vs target"): the track is the limit, the fill is what you've spent,
// the thin tick is where even spending would be by today. Colour is backed by words next to it, never alone.
export default function Bullet({ value, limit, pace, color, height = 10, appear = 1 }: {
  value: number; limit: number; pace?: number; color: string; height?: number; appear?: number;
}) {
  const frac = limit > 0 ? Math.min(1, value / limit) : 0;
  return (
    <View style={{ height: height + 8, justifyContent: 'center' }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={{ height, borderRadius: height / 2, backgroundColor: Corpus.cardAlt, overflow: 'hidden' }}>
        <View style={{ width: `${frac * appear * 100}%`, height, borderRadius: height / 2, backgroundColor: color }} />
      </View>
      {pace !== undefined && pace > 0 && pace < 1 && (
        <View style={{ position: 'absolute', left: `${pace * 100}%`, top: 0, bottom: 0, width: 2, marginLeft: -1, borderRadius: 1, backgroundColor: Corpus.text }} />
      )}
    </View>
  );
}
