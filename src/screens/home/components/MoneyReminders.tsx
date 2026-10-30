import { Corpus } from '@/constants/theme';
import type { MoneyReminder } from '@/utils/debtReminders';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';
import { styles } from './MoneyReminders.styles';

const COLOR = { overdue: Corpus.danger, today: Corpus.gold, soon: Corpus.warning, later: Corpus.textMuted };

// "Ask Rahul for ₹500 · Due today" — your own to-do list for money with people
export default function MoneyReminders({ items, onPress }: { items: MoneyReminder[]; onPress: (r?: MoneyReminder) => void }) {
  if (items.length === 0) return null;
  return (
    <Pressable style={styles.card} onPress={() => onPress()}>
      <View style={styles.head}>
        <Ionicons name="alarm-outline" size={16} color={Corpus.gold} />
        <Text style={styles.headText}>Money reminders</Text>
        {items.length > 3 && <Text style={styles.more}>+{items.length - 3} more</Text>}
      </View>
      {items.slice(0, 3).map((r) => (
        <Pressable key={r.id} style={styles.row} onPress={() => onPress(r)}>
          <View style={[styles.dot, { backgroundColor: COLOR[r.urgency] }]} />
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{r.title}</Text>
            <Text style={[styles.body, r.urgency === 'overdue' && { color: Corpus.danger }]}>{r.body}</Text>
          </View>
        </Pressable>
      ))}
    </Pressable>
  );
}
