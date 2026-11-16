import { Button, Sheet } from '@/components/ui';
import { Corpus, Font, tabular, Type } from '@/constants/theme';
import type { Iou } from '@/types/iou';
import { formatINR } from '@/utils/format';
import { agingWarning, instalmentStatus } from '@/utils/instalments';
import { interestStatus, yearlyRate } from '@/utils/interest';
import { ageLabel, isOverdue, progress, remaining, type PersonSummary } from '@/utils/iou';
import { Ionicons } from '@expo/vector-icons';
import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { IouSheetMode } from './IouSheet';

const shortDate = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

type Props = {
  p: PersonSummary;
  byId: Map<string, Iou>;
  onClose: () => void;
  onMode: (m: IouSheetMode) => void;
  onRepay: (i: Iou, amount: number) => void;
  onReopen: (i: Iou) => void;
  onReminder: (i: Iou, days: number) => void;
  onDelete: (i: Iou) => void;
  onSettleAll: () => void;
  onRemind: () => void;
};

// Everything with one person: what's open, what was paid back, and the actions in one place
export default function PersonSheet({ p, byId, onClose, onMode, onRepay, onReopen, onReminder, onDelete, onSettleAll, onRemind }: Props) {
  const [remindFor, setRemindFor] = useState<string | null>(null);
  const first = p.person.split(' ')[0];
  const summary = p.net > 0 ? `Owes you ${formatINR(p.net)}` : p.net < 0 ? `You owe ${formatINR(-p.net)}` : p.open.length ? 'Evens out to ₹0' : 'All settled';
  const entries = [...p.open, ...p.settled.slice(0, 5)];

  return (
    <Sheet
      title={p.person}
      subtitle={p.oldestOpen ? `${summary}. Opened ${ageLabel(p.oldestOpen)}` : summary}
      onClose={onClose}
      footer={
        <>
          <View style={s.actions}>
            {p.theyOwe > 0 && (
              <Button style={{ flex: 1 }} icon="arrow-down" label="They paid me" onPress={() => onMode({ kind: 'payPerson', person: p.person, direction: 'lent', open: p.open.filter((x) => x.direction === 'lent') })} />
            )}
            {p.youOwe > 0 && (
              <Button style={{ flex: 1 }} variant={p.theyOwe > 0 ? 'secondary' : 'primary'} icon="arrow-up" label={`I paid ${first}`} onPress={() => onMode({ kind: 'payPerson', person: p.person, direction: 'borrowed', open: p.open.filter((x) => x.direction === 'borrowed') })} />
            )}
          </View>
          <View style={s.actions}>
            {p.net > 0 && <Button style={{ flex: 1 }} variant="secondary" icon="logo-whatsapp" label="Send reminder" onPress={onRemind} />}
            <Button style={{ flex: 1 }} variant="secondary" icon="add" label="New entry" onPress={() => onMode({ kind: 'new', person: p.person })} />
          </View>
        </>
      }
    >
      {entries.map((i) => {
        const left = remaining(i);
        const done = left === 0 || !!i.settledAt;
        const linked = i.linkedId ? byId.get(i.linkedId) : undefined;
        const ist = !done ? interestStatus(i) : null;
        const ins = !done ? instalmentStatus(i) : null;
        const pr = progress(i);
        const aging = !done ? agingWarning(i) : null;
        const sub = [
          shortDate(i.date),
          left !== i.amount && !done ? `${formatINR(i.amount - left)} paid back` : '',
          i.dueDate && !done ? `due ${shortDate(i.dueDate)}` : '',
        ].filter(Boolean).join(', ');
        return (
          <View key={i.id} style={[s.entry, done && { opacity: 0.6 }]}>
            <View style={s.entryTop}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[s.entryTitle, done && s.struck]}>{i.note || (i.direction === 'lent' ? 'You lent' : 'You borrowed')}</Text>
                <Text style={[s.entrySub, isOverdue(i) && !done && { color: Corpus.danger }]}>
                  {i.direction === 'lent' ? 'Lent' : 'Borrowed'} {sub}{isOverdue(i) && !done ? ', overdue' : ''}
                </Text>
                {linked && (
                  <Text style={s.entrySub}>{i.direction === 'borrowed' ? `Given on to ${linked.person}` : `Came from ${linked.person}’s money`}</Text>
                )}
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[s.entryAmount, { color: done ? Corpus.textMuted : i.direction === 'lent' ? Corpus.income : Corpus.warning }]}>
                  {formatINR(done ? i.amount : left)}
                </Text>
                <Text style={s.entrySub}>{done ? 'settled' : i.direction === 'lent' ? 'to get' : 'to pay'}</Text>
              </View>
            </View>

            {!done && pr.paid > 0 && (
              <View style={{ gap: 4 }}>
                <View style={s.bar}><View style={[s.barFill, { width: `${pr.pct}%` }]} /></View>
                <Text style={s.entrySub}>
                  {pr.pct}% paid back{pr.doneBy ? `, done by ${pr.doneBy.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })} at this pace` : ''}
                </Text>
              </View>
            )}
            {ist && (
              <Line icon="trending-up" color={ist.pending > 0 ? Corpus.danger : undefined}>
                ₹{i.ratePerHundred} per ₹100 ({yearlyRate(i.ratePerHundred!)}% a year), {formatINR(ist.monthly)} a month.{' '}
                {ist.pending > 0 ? `${formatINR(ist.pending)} interest due now.` : `Next due ${shortDate(ist.nextDue.toISOString())}.`}
              </Line>
            )}
            {ins && (
              <Line icon="calendar" color={ins.behind ? Corpus.danger : undefined}>
                {i.onCard ? 'EMI on your card. ' : ''}{formatINR(ins.per)} a month, {ins.paidCount} of {ins.total} paid
                {ins.behind ? `, ${ins.behind} behind` : ins.nextDue ? `, next ${shortDate(ins.nextDue.toISOString())}` : ''}.
              </Line>
            )}
            {aging && <Line icon="alert-circle" color={Corpus.warning}>{aging}</Line>}
            {i.proofRef ? <Line icon="document-text">{i.proofRef}</Line> : null}
            {(i.repayments ?? []).map((r, k) => (
              <Line key={`r${k}`} icon="return-down-forward">{i.direction === 'lent' ? 'Got' : 'Paid'} {formatINR(r.amount)} on {shortDate(r.date)}</Line>
            ))}
            {(i.interestPayments ?? []).map((r, k) => (
              <Line key={`i${k}`} icon="return-down-forward">Interest {i.direction === 'lent' ? 'received' : 'paid'} {formatINR(r.amount)} on {shortDate(r.date)}</Line>
            ))}
            {i.remindAt && !done && remindFor !== i.id && <Line icon="alarm">Reminder on {shortDate(i.remindAt)}</Line>}

            <View style={s.pills}>
              {done ? (
                <Pill label="Undo settle" onPress={() => onReopen(i)} />
              ) : (
                <>
                  {ins ? (
                    <Pill strong label={i.direction === 'lent' ? `Got ${formatINR(ins.thisPayment)}` : `Paid ${formatINR(ins.thisPayment)}`} onPress={() => onRepay(i, ins.thisPayment)} />
                  ) : (
                    <Pill strong label={i.ratePerHundred ? 'Principal back' : 'Paid back'} onPress={() => onMode({ kind: 'repay', iou: i })} />
                  )}
                  {i.ratePerHundred ? <Pill label={i.direction === 'lent' ? 'Got interest' : 'Paid interest'} onPress={() => onMode({ kind: 'payInterest', iou: i })} /> : null}
                  <Pill icon="alarm-outline" label={i.remindAt ? 'Reminder' : 'Remind me'} onPress={() => setRemindFor(remindFor === i.id ? null : i.id)} />
                </>
              )}
              <Pill icon="create-outline" label="Edit" onPress={() => onMode({ kind: 'edit', iou: i })} />
              <Pill icon="trash-outline" label="Delete" onPress={() => onDelete(i)} />
            </View>

            {remindFor === i.id && (
              <View style={s.pills}>
                <Text style={s.entrySub}>{i.direction === 'lent' ? 'Remind me to ask' : 'Remind me to pay'}</Text>
                {([['Tomorrow', 1], ['3 days', 3], ['1 week', 7], ['2 weeks', 14]] as const).map(([label, d]) => (
                  <Pill key={label} label={label} onPress={() => { setRemindFor(null); onReminder(i, d); }} />
                ))}
                {i.remindAt && <Pill label="Off" onPress={() => { setRemindFor(null); onReminder(i, 0); }} />}
              </View>
            )}
          </View>
        );
      })}

      {p.open.length > 1 && <Button variant="quiet" icon="checkmark-done" label={`Settle all with ${first}`} onPress={onSettleAll} />}
    </Sheet>
  );
}

function Line({ icon, color, children }: { icon: string; color?: string; children: ReactNode }) {
  return (
    <View style={s.line}>
      <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={14} color={color ?? Corpus.textMuted} style={{ marginTop: 2 }} />
      <Text style={[s.lineText, color ? { color } : null]}>{children}</Text>
    </View>
  );
}

function Pill({ label, icon, strong, onPress }: { label: string; icon?: string; strong?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.pill, strong && s.pillStrong, pressed && { opacity: 0.7 }]} accessibilityRole="button" hitSlop={4}>
      {icon && <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={14} color={strong ? Corpus.onGold : Corpus.text} />}
      <Text style={[s.pillText, strong && { color: Corpus.onGold }]}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  actions: { flexDirection: 'row', gap: 8 },
  entry: { backgroundColor: Corpus.bg, borderRadius: 18, padding: 14, gap: 8 },
  entryTop: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  entryTitle: { fontSize: Type.input, color: Corpus.text },
  struck: { textDecorationLine: 'line-through' },
  entrySub: { fontSize: Type.small, color: Corpus.textMuted },
  entryAmount: { fontSize: Type.title, fontFamily: Font.displayBold, ...tabular },
  bar: { height: 6, borderRadius: 3, backgroundColor: Corpus.cardAlt, overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3, backgroundColor: Corpus.income },
  line: { flexDirection: 'row', gap: 6, alignItems: 'flex-start' },
  lineText: { flex: 1, fontSize: Type.small, color: Corpus.textMuted, lineHeight: 17 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 34, paddingHorizontal: 12, borderRadius: 17, backgroundColor: Corpus.card },
  pillStrong: { backgroundColor: Corpus.gold },
  pillText: { fontSize: Type.body, fontFamily: Font.display, color: Corpus.text },
});
