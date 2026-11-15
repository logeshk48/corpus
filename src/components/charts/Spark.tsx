import { View } from 'react-native';

// Watchlist-style mini trend: one thin column per day, the latest one solid
export default function Spark({ values, color, width = 46, height = 22 }: { values: number[]; color: string; width?: number; height?: number }) {
  const hi = Math.max(...values), lo = Math.min(...values);
  if (values.length < 3 || hi - lo < 1) return null;
  const gap = 1.5;
  const w = Math.max(1.5, (width - gap * (values.length - 1)) / values.length);
  return (
    <View style={{ width, height, flexDirection: 'row', alignItems: 'flex-end', gap }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {values.map((v, i) => (
        <View
          key={i}
          style={{ width: w, height: Math.max(2, ((v - lo) / (hi - lo)) * (height - 4) + 3), borderRadius: w / 2, backgroundColor: color, opacity: i === values.length - 1 ? 1 : 0.35 + (0.4 * i) / values.length }}
        />
      ))}
    </View>
  );
}
