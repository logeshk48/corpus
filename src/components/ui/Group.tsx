import { Corpus, Space, Type } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { Children, isValidElement, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import IconChip from './IconChip';

// Apple "inset grouped" list: an optional title, then white rounded rows with inset hairlines
export default function Group({ title, action, onAction, children }: { title?: string; action?: string; onAction?: () => void; children: ReactNode }) {
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
      <View style={s.card}>
        {rows.map((r, i) => (
          <View key={i}>
            {r}
            {i < rows.length - 1 && <View style={s.sep} />}
          </View>
        ))}
      </View>
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
        {!!subtitle && <Text style={s.sub} numberOfLines={1}>{subtitle}</Text>}
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
  title: { fontSize: Type.h3, fontWeight: '700', color: Corpus.text },
  action: { fontSize: Type.input, color: Corpus.gold },
  card: { backgroundColor: Corpus.card, borderRadius: 22, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingVertical: 8, paddingHorizontal: Space.md },
  body: { flex: 1, gap: 1 },
  rowTitle: { fontSize: Type.input, color: Corpus.text },
  sub: { fontSize: Type.body, color: Corpus.textMuted },
  value: { fontSize: Type.input, color: Corpus.textMuted, maxWidth: '45%' },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: Corpus.border, marginLeft: 58 },
});
