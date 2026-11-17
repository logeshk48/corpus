import { celebrate } from '@/components/fx/Celebrate';
import Shine from '@/components/fx/Shine';
import { Button, Group, IconChip, Screen } from '@/components/ui';
import { Chip, Corpus, Font, tabular, Type } from '@/constants/theme';
import { useToast } from '@/context/ToastContext';
import { useAccounts } from '@/hooks/useAccounts';
import { useInbox } from '@/hooks/useInbox';
import { useSettings } from '@/hooks/useSettings';
import { useTransactions } from '@/hooks/useTransactions';
import { useTween } from '@/hooks/useTween';
import { logBillForThisMonth, undoBillPayment } from '@/services/bills';
import { saveInboxMarks } from '@/services/settings';
import type { Bill } from '@/types/bill';
import type { InboxMark } from '@/types/settings';
import { accountBalances, accountTotals } from '@/utils/accounts';
import { isoDay, openDue } from '@/utils/bills';
import { formatINR } from '@/utils/format';
import { baseId, pruneMarks, snoozeOptions, type InboxItem, type InboxKind } from '@/utils/inbox';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

// Heads-up items get an icon; payments get a date tile instead, because "when" matters most for them
const KIND: Record<InboxKind, { icon: string; color: string; open: string }> = {
  people: { icon: 'people', color: Chip.pink, open: 'Open People' },
  card: { icon: 'card', color: Chip.blue, open: 'Open card' },
  bill: { icon: 'receipt', color: Chip.red, open: 'Open bill' },
  sip: { icon: 'repeat', color: Chip.green, open: 'Open Invest' },
  debt: { icon: 'flag', color: Chip.orange, open: 'Open plan' },
  budget: { icon: 'pie-chart', color: Chip.orange, open: 'Open Budgets' },
  checkin: { icon: 'refresh', color: Chip.gray, open: 'Update now' },
  low: { icon: 'warning', color: Chip.red, open: 'Open Accounts' },
};
const DAY = 86_400_000;
const sod = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
const shortDay = (d: Date) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
const money = (i: InboxItem) => (i.amount ? `${i.flow === 'in' ? '+' : ''}${formatINR(Math.round(i.amount))}` : '');

// A calendar-page tile: the day number big, the weekday small. Today is filled, late is red.
function DateTile({ when, late, today }: { when: Date; late: boolean; today: boolean }) {
  const fg = today ? Corpus.onGold : late ? Corpus.danger : Corpus.text;
  return (
    <View style={[s.tile, today && { backgroundColor: Corpus.gold }, late && { backgroundColor: Corpus.dangerTint }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Text style={[s.tileDay, { color: fg }]}>{when.getDate()}</Text>
      <Text style={[s.tileWk, { color: today ? Corpus.onGold : late ? Corpus.danger : Corpus.textMuted }]}>{when.toLocaleDateString('en-IN', { month: 'short' })}</Text>
    </View>
  );
}

type RowProps = {
  item: InboxItem; late: boolean; today: boolean; open: boolean; mainLabel: string;
  onToggle: () => void; onMain: () => void; onSnooze: (until: Date) => void; onGo: () => void;
};

// One reminder. Payments show a date tile and the amount; notes show an icon.
// Tap to open the actions under it. Late ones keep their actions open.
function Row({ item, late, today, open, mainLabel, onToggle, onMain, onSnooze, onGo }: RowProps) {
  const k = KIND[item.kind];
  const note = item.flow === 'note';
  const shown = open || late;
  const when = late ? `Late, was due ${shortDay(item.when)}` : today ? 'Today' : item.when.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' });
  return (
    <View>
      <Pressable onPress={late ? undefined : onToggle} disabled={late} style={({ pressed }) => [s.row, pressed && { backgroundColor: Corpus.cardAlt }]}
        accessibilityRole="button" accessibilityState={{ expanded: shown }}
        accessibilityLabel={`${item.name}${item.amount ? `, ${money(item)}` : ''}. ${note ? '' : `${when}. `}${item.sub}`}>
        {note ? <IconChip icon={k.icon} color={late ? Chip.red : k.color} size={40} /> : <DateTile when={item.when} late={late} today={today} />}
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={s.name} numberOfLines={2}>{item.name}</Text>
          <Text style={[s.sub, late && { color: Corpus.danger }]} numberOfLines={2}>{late && !note ? `Was due ${shortDay(item.when)}. ` : ''}{item.sub}</Text>
        </View>
        <View style={s.right}>
          {!!item.amount && !note && <Text style={[s.amount, item.flow === 'in' && { color: Corpus.income }, item.kind === 'debt' && { color: Corpus.textMuted, fontFamily: Font.display }]}>{money(item)}</Text>}
          {!late && <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={Corpus.textMuted} />}
        </View>
      </Pressable>
      {shown && (
        <Animated.View entering={FadeIn.duration(180)} style={[s.tray, note && { paddingLeft: 68 }]}>
          <Pressable onPress={onMain} style={({ pressed }) => [s.pill, s.pillMain, pressed && { opacity: 0.8 }]} accessibilityRole="button">
            <Ionicons name="checkmark" size={15} color={Corpus.onGold} />
            <Text style={[s.pillText, { color: Corpus.onGold }]}>{mainLabel}</Text>
          </Pressable>
          {snoozeOptions().map((o) => (
            <Pressable key={o.label} onPress={() => onSnooze(o.until)} style={({ pressed }) => [s.pill, pressed && { opacity: 0.7 }]} accessibilityRole="button" accessibilityLabel={`Remind me ${o.label.toLowerCase()}`}>
              <Ionicons name="moon" size={13} color={Corpus.textMuted} />
              <Text style={s.pillText}>{o.label}</Text>
            </Pressable>
          ))}
          <Pressable onPress={onGo} style={({ pressed }) => [s.pill, pressed && { opacity: 0.7 }]} accessibilityRole="link">
            <Text style={s.pillText}>{k.open}</Text>
            <Ionicons name="chevron-forward" size={13} color={Corpus.textMuted} />
          </Pressable>
        </Animated.View>
      )}
    </View>
  );
}

export default function InboxScreen() {
  const router = useRouter();
  const { items, snoozed, bills } = useInbox();
  const { settings } = useSettings();
  const { showToast } = useToast();
  const { accounts } = useAccounts();
  const { transactions: yearTx } = useTransactions('last12Months');
  const [open, setOpen] = useState<string | null>(null);
  const [showSnoozed, setShowSnoozed] = useState(false);
  const now = new Date();
  const today = sod(now);
  const marks = settings.inbox ?? {};

  // ── What is coming ──
  const pay = items.filter((i) => i.flow !== 'note');
  // Must-pay money. The payoff plan's extra is optional, so it is listed but not counted
  const out = pay.filter((i) => i.flow === 'out' && i.kind !== 'debt');
  const late = pay.filter((i) => i.group === 'overdue');
  const due30 = out.reduce((a, i) => a + (i.amount ?? 0), 0);
  const due7 = out.filter((i) => sod(i.when) - today <= 7 * DAY).reduce((a, i) => a + (i.amount ?? 0), 0);
  const collect = pay.filter((i) => i.flow === 'in').reduce((a, i) => a + (i.amount ?? 0), 0);
  const have = accounts.length ? accountTotals(accountBalances(accounts, yearTx)).have : null;
  // The first payment your money runs out on, if it does
  let run = 0;
  const shortAt = have === null ? undefined : out.find((i) => (run += i.amount ?? 0) > have);
  const needFirst = shortAt && have !== null ? out.slice(0, out.indexOf(shortAt) + 1).reduce((a, i) => a + (i.amount ?? 0), 0) - have : 0;
  const lastOut = out[out.length - 1];
  const nextOut = out.find((i) => i.group !== 'overdue');
  const dueV = useTween(due30);
  const notes = items.filter((i) => i.flow === 'note' && !(have !== null && i.id.startsWith('low:week')));

  // Payments in the order you meet them: today, tomorrow, this week (to Sunday), next week, later
  const endOfWeek = today + ((7 - now.getDay()) % 7) * DAY; // Sunday
  const buckets: { key: string; title: string; list: InboxItem[] }[] = [
    { key: 'today', title: 'Today', list: [] }, { key: 'tomorrow', title: 'Tomorrow', list: [] },
    { key: 'week', title: 'Rest of this week', list: [] }, { key: 'next', title: 'Next week', list: [] }, { key: 'later', title: 'Later', list: [] },
  ];
  for (const i of pay) {
    if (i.group === 'overdue') continue;
    const d = sod(i.when);
    const b = d <= today ? 0 : d === today + DAY ? 1 : d <= endOfWeek ? 2 : d <= endOfWeek + 7 * DAY ? 3 : 4;
    buckets[b].list.push(i);
  }
  const sum = (l: InboxItem[]) => l.filter((i) => i.flow === 'out' && i.kind !== 'debt').reduce((a, i) => a + (i.amount ?? 0), 0);

  // Clearing the last reminder gets a small celebration
  const prev = useRef(items.length);
  useEffect(() => { if (prev.current > 0 && items.length === 0) celebrate(); prev.current = items.length; }, [items.length]);

  const mark = async (i: InboxItem, m: InboxMark | null, msg: string) => {
    const id = baseId(i.id);
    const before = marks[id];
    const next = { ...marks };
    if (m) next[id] = m;
    else delete next[id];
    setOpen(null);
    await saveInboxMarks(pruneMarks(next));
    showToast({
      message: msg,
      actionLabel: 'Undo',
      onAction: () => {
        const back = { ...(settings.inbox ?? {}) };
        if (before) back[id] = before;
        else delete back[id];
        saveInboxMarks(back);
      },
    });
  };
  // A bill can be paid from here when this is the payment it is waiting on.
  // An auto-debit records itself on the day, so before then "Done" only hides the reminder.
  const billOf = (i: InboxItem): Bill | undefined => (i.kind === 'bill' ? bills.find((b) => b.id === i.billId) : undefined);
  const payable = (i: InboxItem) => {
    const b = billOf(i);
    return !!b && isoDay(openDue(b).date) === isoDay(i.when) && (!i.auto || i.group === 'overdue');
  };
  const paid = async (i: InboxItem) => {
    const bill = billOf(i);
    if (!bill) return;
    setOpen(null);
    await logBillForThisMonth(bill, i.amount ?? bill.amount);
    showToast({ message: `${bill.name} ${formatINR(i.amount ?? bill.amount)} paid`, actionLabel: 'Undo', onAction: () => undoBillPayment(bill) });
  };
  const row = (i: InboxItem, isLate: boolean) => (
    <Row
      key={i.id}
      item={i}
      late={isLate}
      today={sod(i.when) === today}
      open={open === i.id}
      mainLabel={payable(i) ? `Mark paid ${formatINR(i.amount ?? 0)}` : 'Done'}
      onToggle={() => setOpen(open === i.id ? null : i.id)}
      onMain={() => (payable(i) ? paid(i) : mark(i, { done: new Date().toISOString() }, `${i.name}: done`))}
      onSnooze={(until) => mark(i, { snooze: until.toISOString() }, `I'll remind you ${until.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}`)}
      onGo={() => router.push(i.href as Href)}
    />
  );

  return (
    <Screen title="Reminders" onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))}>
      {/* 1. How much goes out, and can you cover it */}
      <View style={[s.card, s.hero]}>
        <Shine />
        <Text style={s.muted}>To pay in the next 30 days</Text>
        <Text style={s.big}>{formatINR(Math.round(dueV))}</Text>
        <Text style={s.line}>
          {out.length === 0 ? 'Nothing to pay.' : `${out.length} payment${out.length === 1 ? '' : 's'}.`}
          {nextOut ? ` Next: ${nextOut.name}, ${sod(nextOut.when) === today ? 'today' : shortDay(nextOut.when)}.` : ''}
        </Text>

        {have !== null && due30 > 0 && (
          <View style={{ gap: 8 }}>
            <View style={s.bar} accessibilityLabel={`You have ${formatINR(Math.round(have))}, ${formatINR(due30)} to pay`}>
              <View style={{ width: `${Math.min(1, Math.max(0, have) / due30) * 100}%`, backgroundColor: shortAt ? Corpus.warning : Corpus.income }} />
            </View>
            <View style={s.cover}>
              <Ionicons name={shortAt ? 'alert-circle' : 'checkmark-circle'} size={16} color={shortAt ? Corpus.danger : Corpus.income} />
              <Text style={[s.line, { flex: 1 }]}>
                You have <Text style={s.strong}>{formatINR(Math.round(have))}</Text> in bank and cash.{' '}
                {shortAt
                  ? <Text style={{ color: Corpus.danger }}>
                      Add {formatINR(Math.round(needFirst))} by {shortDay(shortAt.when)} for {shortAt.name}
                      {lastOut && sod(lastOut.when) > sod(shortAt.when) && Math.round(due30 - have) > Math.round(needFirst) ? `, and ${formatINR(Math.round(due30 - have))} in all by ${shortDay(lastOut.when)}` : ''}.
                      {' '}Income that comes in before then counts.
                    </Text>
                  : 'That covers all of it.'}
              </Text>
            </View>
          </View>
        )}
        {have === null && due30 > 0 && <Text style={s.note}>Add your bank balance in Accounts to see if it covers these.</Text>}

        <View style={s.strip}>
          <View style={s.stat}><Text style={s.statNum}>{formatINR(due7)}</Text><Text style={s.statLabel}>Next 7 days</Text></View>
          <View style={s.rule} />
          <View style={s.stat}>
            <View style={s.statTop}>
              {late.length > 0 && <Ionicons name="alert-circle" size={15} color={Corpus.danger} />}
              <Text style={[s.statNum, late.length > 0 && { color: Corpus.danger }]}>{late.length}</Text>
            </View>
            <Text style={s.statLabel}>Late</Text>
          </View>
          {collect > 0 && <><View style={s.rule} /><View style={s.stat}><Text style={[s.statNum, { color: Corpus.income }]}>+{formatINR(Math.round(collect))}</Text><Text style={s.statLabel}>To collect</Text></View></>}
        </View>
      </View>

      {/* 2. Things that are late come first, with their actions already open */}
      {late.length > 0 && (
        <Group title="Late" animate>
          {late.map((i) => row(i, true))}
        </Group>
      )}

      {/* 3. Worth a look: no money moves, but something needs checking */}
      {notes.length > 0 && (
        <Group title="Worth a look" animate>
          {notes.map((i) => row(i, false))}
        </Group>
      )}

      {/* 4. Everything else, in the order it comes */}
      {buckets.filter((b) => b.list.length).map((b) => (
        <Group key={b.key} title={sum(b.list) ? `${b.title}, ${formatINR(Math.round(sum(b.list)))}` : b.title} animate>
          {b.list.map((i) => row(i, false))}
        </Group>
      ))}

      {items.length === 0 && (
        <View style={[s.card, s.empty]}>
          <IconChip icon="checkmark-done" color={Chip.green} size={48} />
          <Text style={s.emptyTitle}>All clear</Text>
          <Text style={[s.muted, { textAlign: 'center' }]}>No bills, card dues, SIPs or money with people in the next 30 days.</Text>
          <Button variant="secondary" size="sm" label="Back to Today" onPress={() => router.replace('/')} />
        </View>
      )}

      {snoozed.length > 0 && (
        <Group title={`Snoozed, ${snoozed.length}`} action={showSnoozed ? 'Hide' : 'Show'} onAction={() => setShowSnoozed(!showSnoozed)} animate>
          {showSnoozed ? snoozed.map((i) => (
            <View key={i.id} style={s.row}>
              <IconChip icon="moon" color={Chip.gray} size={40} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={s.name} numberOfLines={2}>{i.name}</Text>
                <Text style={s.sub}>Back on {i.until.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</Text>
              </View>
              <Button variant="secondary" size="sm" label="Wake" onPress={() => mark(i, null, 'Back in your list')} />
            </View>
          )) : (
            <Pressable key="peek" onPress={() => setShowSnoozed(true)} style={s.row} accessibilityRole="button">
              <Text style={[s.sub, { flex: 1 }]} numberOfLines={1}>{snoozed.map((i) => i.name).join(', ')}</Text>
            </Pressable>
          )}
        </Group>
      )}

      <Text style={s.note}>
        Done hides only this one; next month's comes back. Bills and card dues still count in the total until they are paid.
        {settings.notify?.daily !== false ? ` On your phone a summary arrives every morning at ${settings.briefingHour ?? 9}:00.` : ''}
      </Text>
    </Screen>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: Corpus.card, borderRadius: 24, padding: 18, gap: 8 },
  hero: { overflow: 'hidden', gap: 10 },
  big: { fontSize: Type.hero, fontFamily: Font.displayBold, color: Corpus.text, letterSpacing: -1.2, marginTop: -6, ...tabular },
  muted: { fontSize: Type.body, color: Corpus.textMuted, lineHeight: 19 },
  line: { fontSize: Type.body, color: Corpus.text, lineHeight: 19, ...tabular },
  strong: { fontFamily: Font.display },
  note: { fontSize: Type.small, color: Corpus.textMuted, lineHeight: 17 },
  bar: { flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden', backgroundColor: Corpus.cardAlt },
  cover: { flexDirection: 'row', gap: 6, alignItems: 'flex-start' },
  strip: { flexDirection: 'row', alignItems: 'center', paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Corpus.border },
  stat: { flex: 1, gap: 2 },
  statTop: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statNum: { fontSize: Type.title, fontFamily: Font.displayBold, color: Corpus.text, ...tabular },
  statLabel: { fontSize: Type.small, color: Corpus.textMuted },
  rule: { width: StyleSheet.hairlineWidth, height: 32, backgroundColor: Corpus.border, marginHorizontal: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, paddingVertical: 10, paddingHorizontal: 14 },
  tile: { width: 42, height: 46, borderRadius: 12, backgroundColor: Corpus.cardAlt, alignItems: 'center', justifyContent: 'center' },
  tileDay: { fontSize: Type.title, fontFamily: Font.displayBold, lineHeight: 20, ...tabular },
  tileWk: { fontSize: Type.micro, fontFamily: Font.display },
  name: { fontSize: Type.label, fontFamily: Font.display, color: Corpus.text },
  sub: { fontSize: Type.body, color: Corpus.textMuted, lineHeight: 18 },
  right: { alignItems: 'flex-end', gap: 4 },
  amount: { fontSize: Type.label, fontFamily: Font.displayBold, color: Corpus.text, ...tabular },
  tray: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 14, paddingBottom: 14, paddingLeft: 68 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 40, paddingHorizontal: 14, borderRadius: 20, backgroundColor: Corpus.bg },
  pillMain: { backgroundColor: Corpus.gold },
  pillText: { fontSize: Type.body, fontFamily: Font.display, color: Corpus.text, ...tabular },
  empty: { alignItems: 'center', gap: 10, paddingVertical: 28 },
  emptyTitle: { fontSize: Type.h3, fontFamily: Font.displayBold, color: Corpus.text },
});
