import { IconChip, Tap } from '@/components/ui';
import { Corpus, Font, Space, tabular, Type } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

// One choice in a setup question: tap anywhere on it. Selected shows a filled check (or dot) and a ring,
// so it never depends on colour alone. `more` opens under the title only when chosen.
export default function Pick({ title, line, more, tag, icon, color, right, selected, kind, onPress }: {
  title: string; line?: string; more?: string; tag?: string; icon?: string; color?: string; right?: string;
  selected: boolean; kind: 'check' | 'radio'; onPress: () => void;
}) {
  return (
    <Tap onPress={onPress} style={[s.card, selected && s.on]} accessibilityRole={kind === 'radio' ? 'radio' : 'checkbox'} accessibilityState={{ checked: selected }}>
      {icon && <IconChip icon={icon} color={color} size={36} />}
      <View style={s.body}>
        <View style={s.titleRow}>
          <Text style={s.title}>{title}</Text>
          {!!tag && <Text style={s.tag}>{tag}</Text>}
        </View>
        {!!line && <Text style={s.line}>{line}</Text>}
        {selected && !!more && <Animated.Text entering={FadeIn.duration(180)} style={s.more}>{more}</Animated.Text>}
      </View>
      {!!right && <Text style={s.right}>{right}</Text>}
      <View style={[kind === 'check' ? s.box : s.radio, selected && s.boxOn]}>
        {selected && (kind === 'check' ? <Ionicons name="checkmark" size={15} color={Corpus.onGold} /> : <View style={s.dot} />)}
      </View>
    </Tap>
  );
}

const s = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: Corpus.card, borderRadius: 20, padding: Space.md, borderWidth: 1.5, borderColor: Corpus.card },
  on: { borderColor: Corpus.gold },
  body: { flex: 1, gap: 3 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  title: { fontSize: Type.input, fontFamily: Font.display, color: Corpus.text },
  tag: { fontSize: Type.small, fontFamily: Font.display, color: Corpus.income, backgroundColor: Corpus.incomeTint, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, overflow: 'hidden' },
  line: { fontSize: Type.body, color: Corpus.textMuted, lineHeight: 18 },
  more: { fontSize: Type.body, color: Corpus.text, lineHeight: 18, marginTop: 4 },
  right: { fontSize: Type.input, fontFamily: Font.display, color: Corpus.text, ...tabular },
  box: { width: 24, height: 24, borderRadius: 7, borderWidth: 1.5, borderColor: Corpus.border, alignItems: 'center', justifyContent: 'center' },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: Corpus.border, alignItems: 'center', justifyContent: 'center' },
  boxOn: { backgroundColor: Corpus.gold, borderColor: Corpus.gold },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: Corpus.onGold },
});
