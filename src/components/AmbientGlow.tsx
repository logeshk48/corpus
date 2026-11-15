import { Corpus } from '@/constants/theme';
import { Animated, StyleSheet, useWindowDimensions } from 'react-native';

// The living background: a soft glow behind Today whose colour IS your money status —
// green on track, amber tight, red over, grey before there's data. Readable before any number.
const SRC = {
  ok: require('../../assets/images/bg/glow-green.png'),
  tight: require('../../assets/images/bg/glow-amber.png'),
  over: require('../../assets/images/bg/glow-red.png'),
  none: require('../../assets/images/bg/glow-neutral.png'),
};
export type GlowTone = keyof typeof SRC;

export default function AmbientGlow({ tone, opacity }: { tone: GlowTone; opacity?: Animated.AnimatedInterpolation<number> }) {
  const { width } = useWindowDimensions();
  return (
    <Animated.Image
      source={SRC[tone]}
      resizeMode="cover"
      accessible={false}
      style={[st.glow, { width: width + 120, height: Math.round((width + 120) * 0.78), opacity: opacity ?? Corpus.glow }]}
    />
  );
}

const st = StyleSheet.create({ glow: { position: 'absolute', top: -40, left: -60, pointerEvents: 'none' } });
