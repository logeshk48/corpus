import { IconChip } from '@/components/ui';
import { findCategory } from '@/constants/categories';
import { CategoryChip, Chip, Corpus, Font, Space, tabular, Type } from '@/constants/theme';
import type { Bill } from '@/types/bill';
import { endLabel, frequencyTag, isPaidThisMonth, remainingPayments } from '@/utils/bills';
import { compactINR, formatINR } from '@/utils/format';
import { loanStatus } from '@/utils/loan';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  bill: Bill;
  status: { text: string; color?: string; icon?: string };
  first?: boolean;
  action?: { label: string; filled?: boolean; onPress: () => void };
  onOpen: () => void;
};

// One bill: what it is, where it stands this month (in words), the amount, and a pay button when it's due
export default function BillRow({ bill, status, action, onOpen }: Props) {
  const cat = findCategory('expense', bill.category);
  const left = remainingPayments(bill);
  const owed = bill.loan && left ? loanStatus(bill.loan, isPaidThisMonth(bill)).outstanding : null;
  const tags = [frequencyTag(bill), bill.variable ? 'Amount varies' : null].filter(Boolean).join(', ');
  return (
    <View style={s.wrap}>
      <Pressable onPress={onOpen} style={({ pressed }) => [s.row, pressed && { backgroundColor: Corpus.cardAlt }]} accessibilityRole="button"
        accessibilityLabel={`${bill.name}, ${formatINR(bill.amount)}. ${status.text}`}>
        <IconChip icon={(bill.variable ? 'flash' : cat?.icon ?? 'receipt')} color={bill.active ? CategoryChip[bill.category] ?? Chip.red : Chip.gray} />
        <View style={s.body}>
          <View style={s.top}>
            <Text style={[s.name, !bill.active && { color: Corpus.textMuted }]} numberOfLines={1}>{bill.name}</Text>
            <Text style={[s.amount, !bill.active && { color: Corpus.textMuted }]}>{bill.variable ? 'about ' : ''}{formatINR(bill.amount)}</Text>
          </View>
          <View style={s.statusRow}>
            {status.icon && <Ionicons name={status.icon as keyof typeof Ionicons.glyphMap} size={13} color={status.color ?? Corpus.textMuted} style={{ marginTop: 2 }} />}
            <Text style={[s.meta, status.color ? { color: status.color } : null]} numberOfLines={2}>{status.text}{tags ? `. ${tags}` : ''}</Text>
          </View>
          {left ? (
            <Text style={s.meta} numberOfLines={1}>
              {owed !== null ? `${compactINR(Math.round(owed))} owed, ` : ''}{left} payment{left === 1 ? '' : 's'} left, ends {endLabel(bill)}
            </Text>
          ) : null}
        </View>
      </Pressable>
      {action && (
        <Pressable onPress={action.onPress} hitSlop={6} style={({ pressed }) => [s.action, action.filled && s.actionOn, pressed && { opacity: 0.7 }]} accessibilityRole="button" accessibilityLabel={`${action.label} ${bill.name}`}>
          <Text style={[s.actionText, action.filled && { color: Corpus.onGold }]}>{action.label}</Text>
        </Pressable>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', paddingRight: Space.md },
  row: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 62, paddingVertical: 10, paddingLeft: Space.md, paddingRight: 10 },
  body: { flex: 1, gap: 1 },
  top: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  name: { flex: 1, fontSize: Type.input, color: Corpus.text },
  amount: { fontSize: Type.input, fontFamily: Font.display, color: Corpus.text, ...tabular },
  statusRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 4 },
  meta: { flexShrink: 1, fontSize: Type.body, color: Corpus.textMuted, lineHeight: 18, ...tabular },
  action: { minHeight: 36, paddingHorizontal: 16, borderRadius: 18, backgroundColor: Corpus.cardAlt, justifyContent: 'center' },
  actionOn: { backgroundColor: Corpus.gold },
  actionText: { fontSize: Type.body, fontFamily: Font.display, color: Corpus.text },
});
