import Bullet from '@/components/charts/Bullet';
import { IconChip } from '@/components/ui';
import { CategoryChip, Chip, Corpus } from '@/constants/theme';
import { streamTypeMeta, type IncomeStream } from '@/types/incomeStream';
import { compactINR, formatINR } from '@/utils/format';
import { ordinal, streamState, type Usual } from '@/utils/incomeUsual';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';
import { styles } from './StreamCard.styles';

export const streamColor = (type: string) => CategoryChip[type] ?? Chip.gray;
// one colour per source, in the order they were added, so two clients never share a colour (same on the list and the detail page)
const PALETTE = [Chip.green, Chip.teal, Chip.blue, Chip.indigo, Chip.purple];
export const sourceColor = (all: { id: string }[], id: string) => { const i = all.findIndex((x) => x.id === id); return i < 0 ? Chip.gray : PALETTE[i % PALETTE.length]; };

// What to say about a source this month, in words (never colour alone)
export function stateLine(s: IncomeStream, received: number, u: Usual): { text: string; icon?: string; color?: string } {
  const st = streamState(s, received, u);
  const range = u.months >= 2 ? (u.low === u.high ? `Usually ${compactINR(u.avg)}` : `Usually ${compactINR(u.low)} to ${compactINR(u.high)}`) : null;
  switch (st.kind) {
    case 'fixedDone': return { text: 'All of it has come in', icon: 'checkmark-circle', color: Corpus.income };
    case 'fixedLeft': return { text: `${formatINR(st.left)} still to come` };
    case 'late': return { text: `Usually paid by the ${ordinal(st.payDay)}. Got it?`, icon: 'time', color: Corpus.warning };
    case 'waiting': return { text: range ? `Not paid yet. ${range}` : 'Not paid yet this month' };
    case 'low': return { text: `A lower month. ${range}` };
    case 'high': return { text: `A strong month. ${range}`, icon: 'trending-up', color: Corpus.income };
    case 'usual': return { text: `A usual month. ${range}` };
    default: return { text: streamTypeMeta(s.type).label };
  }
}

// One income source as a row: what came in this month, how that compares, and a quick "Got paid"
export default function StreamCard({ stream, receivedThisMonth, usual, onPress, onPaid, appear = 1, color }: {
  stream: IncomeStream; receivedThisMonth: number; usual: Usual; onPress?: () => void; onPaid: () => void; appear?: number; color?: string;
}) {
  const tint = color ?? streamColor(stream.type);
  const waiting = receivedThisMonth === 0;
  const meta = streamTypeMeta(stream.type);
  const fixed = stream.fixed && stream.expectedMonthly ? stream.expectedMonthly : null;
  const line = stateLine(stream, receivedThisMonth, usual);
  return (
    <View style={styles.wrap}>
      <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => [styles.row, pressed && { backgroundColor: Corpus.cardAlt }]} accessibilityRole="button"
        accessibilityLabel={`${stream.name}: ${formatINR(receivedThisMonth)} this month. ${line.text}`}>
        <View style={styles.top}>
          <IconChip icon={meta.icon} color={tint} />
          <View style={styles.middle}>
            <View style={styles.nameRow}>
              <Text style={styles.name} numberOfLines={1}>{stream.name}</Text>
              <Text style={styles.amount}>{formatINR(receivedThisMonth)}</Text>
            </View>
            <View style={styles.subRow}>
              {line.icon && <Ionicons name={line.icon as keyof typeof Ionicons.glyphMap} size={13} color={line.color} style={{ marginTop: 2 }} />}
              <Text style={[styles.sub, line.color ? { color: line.color } : null]} numberOfLines={2}>{line.text}</Text>
            </View>
          </View>
        </View>
        {fixed ? (
          <View style={styles.bar}>
            <Bullet value={receivedThisMonth} limit={fixed} color={tint} height={6} appear={appear} />
          </View>
        ) : null}
      </Pressable>
      <Pressable onPress={onPaid} hitSlop={6} style={({ pressed }) => [styles.paid, waiting && styles.paidOn, pressed && { opacity: 0.7 }]} accessibilityRole="button" accessibilityLabel={`Got paid by ${stream.name}`}>
        <Ionicons name="add" size={16} color={waiting ? Corpus.onGold : Corpus.text} />
        <Text style={[styles.paidText, waiting && { color: Corpus.onGold }]}>Got paid</Text>
      </Pressable>
    </View>
  );
}
