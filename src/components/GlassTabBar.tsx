import { Corpus, Type } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/build/react-navigation/bottom-tabs';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Floating "liquid glass" tab bar, Apple iOS 26 style: a capsule of tabs + a separate round Ask button.
const TABS: Record<string, { label: string; icon: keyof typeof Ionicons.glyphMap; on: keyof typeof Ionicons.glyphMap }> = {
  index: { label: 'Today', icon: 'home-outline', on: 'home' },
  analytics: { label: 'Insights', icon: 'bar-chart-outline', on: 'bar-chart' },
  add: { label: 'Add', icon: 'add-circle-outline', on: 'add-circle' },
  invest: { label: 'Invest', icon: 'trending-up-outline', on: 'trending-up' },
};

// Real blur on the web; on phones the bar is frosted white until a native blur is added
const blur = Platform.OS === 'web' ? ({ backdropFilter: 'blur(24px) saturate(180%)' } as object) : null;

export const TAB_BAR_SPACE = 96; // leave this much room at the bottom of tab screens

export default function GlassTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  return (
    <View style={[s.wrap, { bottom: Math.max(insets.bottom, 10) + 6 }]} pointerEvents="box-none">
      <View style={[s.bar, blur]} accessibilityRole="tablist">
        {state.routes.map((r, i) => {
          const t = TABS[r.name];
          if (!t) return null; // Settings lives behind the profile button
          const focused = state.index === i;
          return (
            <Pressable
              key={r.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={t.label}
              onPress={() => {
                const e = navigation.emit({ type: 'tabPress', target: r.key, canPreventDefault: true });
                if (!focused && !e.defaultPrevented) navigation.navigate(r.name);
              }}
              style={[s.tab, focused && s.tabOn]}
            >
              <Ionicons name={focused ? t.on : t.icon} size={22} color={focused ? Corpus.gold : Corpus.text} />
              <Text style={[s.label, focused && s.labelOn]}>{t.label}</Text>
            </Pressable>
          );
        })}
      </View>
      <Pressable style={[s.round, blur]} onPress={() => router.push('/ask' as Href)} accessibilityRole="button" accessibilityLabel="Ask Corpus">
        <Ionicons name="search" size={22} color={Corpus.text} />
      </Pressable>
    </View>
  );
}

const glass = {
  backgroundColor: Corpus.glass,
  borderWidth: 0.5,
  borderColor: Corpus.glassEdge,
  shadowColor: Corpus.shadow,
  shadowOpacity: 1,
  shadowRadius: 18,
  shadowOffset: { width: 0, height: 8 },
  elevation: 10,
} as const;

const s = StyleSheet.create({
  wrap: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', alignItems: 'center', gap: 10 },
  bar: { ...glass, flex: 1, height: 62, borderRadius: 31, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 5 },
  tab: { flex: 1, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', gap: 2 },
  tabOn: { backgroundColor: Corpus.goldTint },
  label: { fontSize: Type.micro, fontWeight: '500', color: Corpus.text },
  labelOn: { fontWeight: '700', color: Corpus.gold },
  round: { ...glass, width: 62, height: 62, borderRadius: 31, alignItems: 'center', justifyContent: 'center' },
});
