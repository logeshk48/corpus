import { View } from 'react-native';

// Apple Activity-style ring without SVG: overlapping round dots along a circle form a smooth arc
// with round ends. `progress` 0–1 is the filled part, starting at 12 o'clock.
export default function ActivityRing({ size, thickness, progress, color, track }: { size: number; thickness: number; progress: number; color: string; track: string }) {
  const r = (size - thickness) / 2;
  const n = Math.max(24, Math.ceil((2 * Math.PI * r) / (thickness * 0.35)));
  const filled = Math.round(Math.min(1, Math.max(0, progress)) * n);
  const dots = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * 2 * Math.PI - Math.PI / 2;
    dots.push(
      <View
        key={i}
        style={{
          position: 'absolute', width: thickness, height: thickness, borderRadius: thickness / 2,
          left: size / 2 + r * Math.cos(a) - thickness / 2, top: size / 2 + r * Math.sin(a) - thickness / 2,
          backgroundColor: i < filled ? color : track,
        }}
      />,
    );
  }
  // draw the track first, then the filled arc on top so its end cap sits over the track
  const trackDots = dots.slice(filled);
  const fillDots = dots.slice(0, filled);
  return <View style={{ width: size, height: size }} pointerEvents="none">{trackDots}{fillDots}</View>;
}
