import { Spring } from '@/constants/motion';
import { Chip, Corpus, Font, Type } from '@/constants/theme';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated';

// Equal-width tabs with an icon over each word; a filled pill springs across to the one you pick
export default function PillTabs<T extends string>({ tabs, value, onChange }: { tabs: { value: T; label: string; icon: string }[]; value: T; onChange: (v: T) => void }) {
  const reduce = useReducedMotion();
  const [w, setW] = useState(0);
  const i = Math.max(0, tabs.findIndex((t) => t.value === value));
  const cell = w > 0 ? (w - 8) / tabs.length : 0;
  const x = useSharedValue(0);
  useEffect(() => { x.value = reduce ? i * cell : withSpring(i * cell, Spring.snappy); }, [i, cell, reduce, x]);
  const pill = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  return (
    <View style={s.track} onLayout={(e) => setW(e.nativeEvent.layout.width)} accessibilityRole="tablist">
      {cell > 0 && (
        <Animated.View style={[s.pill, { width: cell }, pill]}>
          <Svg width="100%" height="100%" preserveAspectRatio="none">
            <Defs>
              <LinearGradient id="pt" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor={Chip.indigo} />
                <Stop offset="1" stopColor={Chip.teal} />
              </LinearGradient>
            </Defs>
            <Rect x="0" y="0" width="100%" height="100%" rx="18" fill="url(#pt)" />
          </Svg>
        </Animated.View>
      )}
      {tabs.map((t) => {
        const on = t.value === value;
        return (
          <Pressable key={t.value} onPress={() => onChange(t.value)} style={s.tab} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={t.label}>
            <Ionicons name={(on ? t.icon : `${t.icon}-outline`) as keyof typeof Ionicons.glyphMap} size={18} color={on ? Corpus.sheen : Corpus.textMuted} />
            <Text style={[s.text, on && s.on]} numberOfLines={1}>{t.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  track: { flexDirection: 'row', padding: 4, borderRadius: 22, backgroundColor: Corpus.card },
  pill: { position: 'absolute', top: 4, bottom: 4, left: 4, borderRadius: 18, overflow: 'hidden', shadowColor: Chip.indigo, shadowOpacity: 0.45, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 8, gap: 2 },
  text: { fontSize: Type.small, fontFamily: Font.display, color: Corpus.textMuted },
  on: { color: Corpus.sheen },
});
