import { Corpus, Font, Space, tabular, Type } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { Children, isValidElement, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOut, LayoutAnimationConfig, LinearTransition } from 'react-native-reanimated';
import { Duration } from '@/constants/motion';
import IconChip from './IconChip';

// Apple "inset grouped" list: an optional title, then white rounded rows with inset hairlines
// animate: rows added later slide in, removed rows fade out and the rest close the gap (not on first show)
export default function Group({ title, action, onAction, children, animate }: { title?: string; action?: string; onAction?: () => void; children: ReactNode; animate?: boolean }) {
  const rows = Children.toArray(children).filter(isValidElement);
  return (
    <View style={s.wrap}>
      {(title || action) && (
        <View style={s.head}>
          {title ? <Text style={s.title} accessibilityRole="header">{title}</Text> : <View />}
          {action && onAction && (
            <Pressable onPress={onAction} hitSlop={8}><Text style={s.action}>{action}</Text></Pressable>
          )}
        </View>
      )}
      <LayoutAnimationConfig skipEntering>
        <View style={s.card}>
          {rows.map((r, i) =>
            animate ? (
              <Animated.View key={r.key ?? i} entering={FadeInDown.duration(Duration.enter)} exiting={FadeOut.duration(Duration.exit)} layout={LinearTransition.duration(Duration.enter)}>
                {r}
                {i < rows.length - 1 && <View style={s.sep} />}
              </Animated.View>
            ) : (
              <View key={r.key ?? i}>
                {r}
                {i < rows.length - 1 && <View style={s.sep} />}
              </View>
            )
          )}
        </View>
      </LayoutAnimationConfig>
    </View>
  );
}

type RowProps = {
  icon?: string; color?: string; title: string; subtitle?: string; value?: string;
  valueColor?: string; onPress?: () => void; chevron?: boolean; right?: ReactNode;
};

export function GroupRow({ icon, color, title, subtitle, value, valueColor, onPress, chevron = !!onPress, right }: RowProps) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => [s.row, pressed && { backgroundColor: Corpus.cardAlt }]} accessibilityRole={onPress ? 'button' : undefined}>
      {icon && <IconChip icon={icon} color={color} />}
      <View style={s.body}>
        <Text style={s.rowTitle} numberOfLines={1}>{title}</Text>
        {!!subtitle && <Text style={s.sub} numberOfLines={2}>{subtitle}</Text>}
      </View>
      {right}
      {!!value && <Text style={[s.value, valueColor ? { color: valueColor } : null]} numberOfLines={1}>{value}</Text>}
      {chevron && <Ionicons name="chevron-forward" size={17} color={Corpus.textFaint} />}
    </Pressable>
  );
}

const s = StyleSheet.create({
  wrap: { gap: 6 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingHorizontal: 4 },
  title: { fontSize: Type.h3, fontFamily: Font.displayBold, color: Corpus.text, letterSpacing: -0.2 },
  action: { fontSize: Type.input, color: Corpus.gold },
  card: { backgroundColor: Corpus.card, borderRadius: 22, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingVertical: 8, paddingHorizontal: Space.md },
  body: { flex: 1, gap: 1 },
  rowTitle: { fontSize: Type.input, color: Corpus.text },
  sub: { fontSize: Type.body, color: Corpus.textMuted },
  value: { fontSize: Type.input, color: Corpus.textMuted, maxWidth: '45%', ...tabular },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: Corpus.border, marginLeft: 58 },
});
