import { Corpus, Font, Space, Type } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useRef, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';

// iOS-style navigation for every pushed screen:
// a fixed bar (glass back button · compact title · actions) over a large title that scrolls away.
// Works with any scroller: spread `scrollProps` on it, render `bar` after it and `title` at the top of its content.
export type ChromeOptions = { title: string; subtitle?: string; right?: ReactNode; onBack?: () => void };

const BAR = 52;
const blur = Platform.OS === 'web' ? ({ backdropFilter: 'blur(20px) saturate(180%)' } as object) : null;

export function useNavChrome({ title, subtitle, right, onBack }: ChromeOptions) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const scrollY = useRef(new Animated.Value(0)).current;
  const [solid, setSolid] = useState(false);
  useEffect(() => { AccessibilityInfo.isReduceTransparencyEnabled?.().then(setSolid).catch(() => {}); }, []);
  const goBack = onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/')));

  return useMemo(() => {
    const show = scrollY.interpolate({ inputRange: [30, 60], outputRange: [0, 1], extrapolate: 'clamp' });
    const scrollProps = {
      onScroll: Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true }),
      scrollEventThrottle: 16,
    };
    const bar = (
      <View style={[s.bar, { height: insets.top + BAR, paddingTop: insets.top }]} pointerEvents="box-none">
        <Animated.View style={[StyleSheet.absoluteFill, s.barBg, solid ? { backgroundColor: Corpus.card } : blur, { opacity: show }]} pointerEvents="none" />
        <Pressable onPress={goBack} hitSlop={6} style={({ pressed }) => [s.round, pressed && { backgroundColor: Corpus.cardAlt }]} accessibilityRole="button" accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={22} color={Corpus.text} />
        </Pressable>
        <Animated.Text style={[s.compact, { opacity: show }]} numberOfLines={1} accessibilityElementsHidden importantForAccessibility="no">{title}</Animated.Text>
        <View style={s.right}>{right}</View>
      </View>
    );
    const titleBlock = (
      <View style={s.titleBlock}>
        <Text style={s.large} accessibilityRole="header">{title}</Text>
        {!!subtitle && <Text style={s.sub}>{subtitle}</Text>}
      </View>
    );
    return { scrollProps, bar, title: titleBlock, padTop: insets.top + BAR, padBottom: insets.bottom + 48, scrollY };
  }, [scrollY, insets.top, insets.bottom, title, subtitle, right, goBack, solid]);
}

const s = StyleSheet.create({
  bar: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', paddingHorizontal: Space.md - 4, gap: 8 },
  barBg: { backgroundColor: Corpus.glass, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Corpus.border },
  round: {
    width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center',
    backgroundColor: Corpus.glass, borderWidth: 0.5, borderColor: Corpus.glassEdge,
    shadowColor: Corpus.shadow, shadowOpacity: 0.5, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  compact: { flex: 1, textAlign: 'center', fontSize: Type.title, fontFamily: Font.display, color: Corpus.text },
  right: { minWidth: 44, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 8 },
  titleBlock: { gap: 2, marginBottom: Space.sm },
  large: { fontSize: Type.amount, fontFamily: Font.displayBold, color: Corpus.text, letterSpacing: -0.4 },
  sub: { fontSize: Type.label, color: Corpus.textMuted },
});
