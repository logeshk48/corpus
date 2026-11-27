import { IconChip, Tap } from '@/components/ui';
import { Chip, Corpus, Font, Type } from '@/constants/theme';
import type { MoneyReminder } from '@/utils/debtReminders';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { needStyles } from './CatchUpCard';

const TAG = {
  overdue: { text: 'Overdue', color: Corpus.danger, bg: Corpus.dangerTint },
  today: { text: 'Today', color: Corpus.warning, bg: Corpus.warningTint },
  soon: { text: 'Soon', color: Corpus.warning, bg: Corpus.warningTint },
  later: { text: 'Later', color: Corpus.textMuted, bg: Corpus.cardAlt },
};

// Your own to-do list for money: people to ask or repay, and money that will run short
export default function MoneyReminders({ items, onPress }: { items: MoneyReminder[]; onPress: (r?: MoneyReminder) => void }) {
  if (items.length === 0) return null;
  return (
    <View style={[needStyles.card, s.card]}>
      <Tap onPress={() => onPress()} scaleTo={0.99} style={s.head} accessibilityRole="button">
        <IconChip icon="alarm" color={Chip.pink} size={38} />
        <View style={{ flex: 1 }}>
          <Text style={needStyles.title}>Money reminders</Text>
          <Text style={needStyles.text}>{items.length} to sort out</Text>
        </View>
        <Ionicons name="chevron-forward" size={17} color={Corpus.textFaint} />
      </Tap>
      {items.slice(0, 3).map((r) => {
        // a money shortfall isn't late, it's something to plan for
        const t = r.id === 'short' ? { text: 'Plan ahead', color: Corpus.warning, bg: Corpus.warningTint } : TAG[r.urgency];
        return (
          <Pressable key={r.id} onPress={() => onPress(r)} style={({ pressed }) => [s.row, pressed && { opacity: 0.7 }]} accessibilityRole="button">
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={s.title}>{r.title}</Text>
              <Text style={[needStyles.text, r.urgency === 'overdue' && { color: Corpus.danger }]}>{r.body}</Text>
            </View>
            <View style={[s.tag, { backgroundColor: t.bg }]}><Text style={[s.tagText, { color: t.color }]}>{t.text}</Text></View>
          </Pressable>
        );
      })}
      {items.length > 3 && <Text style={s.more}>{items.length - 3} more in Lent and borrowed</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  card: { flexDirection: 'column', alignItems: 'stretch', gap: 12 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Corpus.border },
  title: { fontSize: Type.bodyLg, fontFamily: Font.display, color: Corpus.text },
  tag: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 },
  tagText: { fontSize: Type.small, fontFamily: Font.display },
  more: { fontSize: Type.small, color: Corpus.textMuted },
});
