import { Corpus } from '@/constants/theme';
import { useEffect, useId } from 'react';
import { View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSpring, withTiming } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

// A glass jar with liquid in it. The level is how close the jar is to its goal; the surface rolls in a slow
// wave so the jar looks alive, and when money goes in the level springs up to its new height.
// Built from transforms (not an animated SVG path) so it moves the same on phones and the web.
// Decoration for the number next to it: hidden from screen readers, still when Reduce Motion is on.
export default function LiquidJar({ level, color, width = 64, height = 84, marks = false }: {
  level: number; color: string; width?: number; height?: number; marks?: boolean;
}) {
  const reduce = useReducedMotion();
  const id = useId().replace(/:/g, '');
  const W = width, H = height, s = Math.max(1.5, W / 32);
  const shoulder = H * 0.3;
  const neckL = W * 0.18, neckR = W * 0.82, r = W * 0.24;
  const jar = `M ${neckL} ${H * 0.1} L ${neckL} ${H * 0.17} Q ${s} ${H * 0.19} ${s} ${H * 0.3} L ${s} ${H - r} Q ${s} ${H - s} ${r} ${H - s} L ${W - r} ${H - s} Q ${W - s} ${H - s} ${W - s} ${H - r} L ${W - s} ${H * 0.3} Q ${W - s} ${H * 0.19} ${neckR} ${H * 0.17} L ${neckR} ${H * 0.1} Z`;

  // the liquid lives in a clipped box from the shoulder to the bottom of the glass
  const boxW = W - s * 2, boxH = H - s - shoulder;
  const amp = Math.max(2, H * 0.03);
  const wave = (w: number) => {
    let d = `M 0 ${amp}`;
    for (let i = 0; i <= 48; i++) {
      const x = (w * 2 * i) / 48;
      d += ` L ${x.toFixed(1)} ${(amp + amp * Math.sin((i / 24) * Math.PI * 2)).toFixed(1)}`;
    }
    return `${d} L ${w * 2} ${boxH + amp * 2} L 0 ${boxH + amp * 2} Z`;
  };
  const d = wave(boxW);

  const lv = useSharedValue(0);
  const roll = useSharedValue(0);
  const clamped = Math.max(0, Math.min(1, level));
  useEffect(() => { lv.value = reduce ? clamped : withSpring(clamped, { damping: 15, stiffness: 80 }); }, [clamped, reduce, lv]);
  useEffect(() => {
    if (reduce) return;
    roll.value = withRepeat(withTiming(1, { duration: 2800, easing: Easing.linear }), -1, false);
  }, [reduce, roll]);
  const front = useAnimatedStyle(() => ({ transform: [{ translateY: boxH - lv.value * boxH - amp }, { translateX: -roll.value * boxW }] }));
  const back = useAnimatedStyle(() => ({ transform: [{ translateY: boxH - lv.value * boxH - amp * 1.4 }, { translateX: -(1 - roll.value) * boxW }] }));

  return (
    <View style={{ width: W, height: H }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={W} height={H} style={{ position: 'absolute' }}>
        <Rect x={W * 0.12} y={s / 2} width={W * 0.76} height={H * 0.09} rx={H * 0.03} fill={color} />
        <Path d={jar} fill={Corpus.cardAlt} />
      </Svg>
      <View style={{ position: 'absolute', left: s, top: shoulder, width: boxW, height: boxH, overflow: 'hidden', borderBottomLeftRadius: r - s, borderBottomRightRadius: r - s }}>
        <Animated.View style={[{ position: 'absolute', left: 0, top: 0, opacity: 0.35 }, back]}>
          <Svg width={boxW * 2} height={boxH + amp * 2}><Path d={d} fill={color} /></Svg>
        </Animated.View>
        <Animated.View style={[{ position: 'absolute', left: 0, top: 0 }, front]}>
          <Svg width={boxW * 2} height={boxH + amp * 2}>
            <Defs>
              <LinearGradient id={`l${id}`} x1="0" y1="0" x2="0" y2={boxH} gradientUnits="userSpaceOnUse">
                <Stop offset="0" stopColor={color} stopOpacity={0.8} />
                <Stop offset="1" stopColor={color} stopOpacity={1} />
              </LinearGradient>
            </Defs>
            <Path d={d} fill={`url(#l${id})`} />
          </Svg>
        </Animated.View>
      </View>
      <Svg width={W} height={H} style={{ position: 'absolute' }}>
        {marks && [0.25, 0.5, 0.75].map((m) => (
          <Rect key={m} x={W - s - W * (m === 0.5 ? 0.3 : 0.18) - 3} y={H - s - m * boxH} width={W * (m === 0.5 ? 0.3 : 0.18)} height={1.5} rx={0.75} fill={Corpus.text} opacity={0.2} />
        ))}
        <Rect x={W * 0.14} y={H * 0.34} width={W * 0.08} height={H * 0.42} rx={W * 0.04} fill={Corpus.sheen} opacity={0.3} />
        <Path d={jar} fill="none" stroke={color} strokeWidth={s} strokeLinejoin="round" />
      </Svg>
    </View>
  );
}
