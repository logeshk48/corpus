import { Chip, Corpus } from '@/constants/theme';
import { useEffect, useId } from 'react';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { ClipPath, Defs, Path, Rect } from 'react-native-svg';

export type JarvyMood = 'calm' | 'happy' | 'look' | 'worried' | 'sleepy';

// Eyes are strokes, so every mood is one path and a width
const EYES: Record<JarvyMood, [string, number]> = {
  calm: ['M44 58 V70 M76 58 V70', 10],
  happy: ['M36 68 Q44 56 52 68 M68 68 Q76 56 84 68', 5],
  look: ['M50 64 V74 M82 64 V74', 10],
  worried: ['M44 64 h0.1 M76 64 h0.1', 13],
  sleepy: ['M36 64 Q44 70 52 64 M68 64 Q76 70 84 64', 5],
};

// Jarvy: the money jar with a face. The liquid is how much of the month's money is left, the eyes
// say how that feels. Kept small; one blink when it appears, nothing that loops.
export default function Jarvy({ mood = 'calm', level = 0.5, color = Corpus.income, size = 44 }: { mood?: JarvyMood; level?: number; color?: string; size?: number }) {
  const id = useId().replace(/:/g, '');
  const reduce = useReducedMotion();
  const blink = useSharedValue(1);
  useEffect(() => {
    if (reduce || mood === 'sleepy') return;
    blink.value = withDelay(900, withSequence(withTiming(0.1, { duration: 90 }), withTiming(1, { duration: 140 })));
  }, [mood, reduce, blink]);
  const eyes = useAnimatedStyle(() => ({ transform: [{ scaleY: blink.value }] }));
  const y = 144 - Math.max(0, Math.min(1, level)) * 118;
  const [d, w] = EYES[mood];
  const h = (size * 150) / 120;
  return (
    <Animated.View style={{ width: size, height: h }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={size} height={h} viewBox="0 0 120 150" style={{ position: 'absolute' }}>
        <Defs>
          <ClipPath id={`j${id}`}><Rect x={10} y={24} width={100} height={120} rx={40} /></ClipPath>
        </Defs>
        <Rect x={34} y={6} width={52} height={14} rx={7} fill={Chip.purple} />
        <Rect x={10} y={24} width={100} height={120} rx={40} fill={Corpus.sheen} stroke={Corpus.border} strokeWidth={3} />
        <Path d={`M0 ${y} Q30 ${y - 7} 60 ${y} T120 ${y} V150 H0 Z`} fill={color} clipPath={`url(#j${id})`} />
        <Rect x={20} y={38} width={7} height={26} rx={3.5} fill={Corpus.sheen} opacity={0.7} />
        {mood === 'worried' && <Path d="M100 28 C97 35 94 38 94 42 a6 6 0 0 0 12 0 C106 38 103 35 100 28 Z" fill={Chip.blue} />}
      </Svg>
      <Animated.View style={[{ position: 'absolute', width: size, height: h, transformOrigin: `${size / 2}px ${(64 / 150) * h}px` }, eyes]}>
        <Svg width={size} height={h} viewBox="0 0 120 150">
          <Path d={d} stroke={Corpus.jarInk} strokeWidth={w} strokeLinecap="round" fill="none" />
        </Svg>
      </Animated.View>
    </Animated.View>
  );
}
