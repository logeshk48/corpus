import { celebrate } from '@/components/fx/Celebrate';
import Shine from '@/components/fx/Shine';
import { Button, Group, IconChip, Screen } from '@/components/ui';
import { Chip, Corpus, Font, tabular, Type } from '@/constants/theme';
import { useToast } from '@/context/ToastContext';
import { useInbox } from '@/hooks/useInbox';
import { useSafeToday } from '@/hooks/useSafeToday';
import { useSettings } from '@/hooks/useSettings';
import { useTransactions } from '@/hooks/useTransactions';
import { useTween } from '@/hooks/useTween';
import { logBillForThisMonth, undoBillPayment } from '@/services/bills';
import { saveInboxMarks } from '@/services/settings';
import type { Bill } from '@/types/bill';
import type { InboxMark } from '@/types/settings';
import { isoDay, openDue } from '@/utils/bills';
import { formatINR } from '@/utils/format';
import { baseId, briefing, pruneMarks, snoozeOptions, type InboxGroup, type InboxItem, type InboxKind } from '@/utils/inbox';
import { weekReview } from '@/utils/weekReview';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

// Each kind of reminder has its own icon and colour, the same ones used where it comes from
const KIND: Record<InboxKind, { icon: string; color: string; open: string }> = {
  people: { icon: 'people', color: Chip.pink, open: 'Open People' },
  card: { icon: 'card', color: Chip.blue, open: 'Open card' },
  bill: { icon: 'receipt', color: Chip.red, open: 'Open bill' },
  sip: { icon: 'repeat', color: Chip.green, open: 'Open Invest' },
  debt: { icon: 'flag', color: Chip.orange, open: 'Open plan' },
  budget: { icon: 'pie-chart', color: Chip.orange, open: 'Open Budgets' },
  checkin: { icon: 'refresh', color: Chip.gray, open: 'Update balances' },
  low: { icon: 'warning', color: Chip.red, open: 'Open Accounts' },
};
const GROUP: Record<InboxGroup, string> = { overdue: 'Late', today: 'Today', week: 'Next 7 days', later: 'Later' };
const shortDay = (d: Date) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

// One reminder. Tap it to open its actions in place: the main one (Mark paid / Done), snooze, or go to it.
function Row({ item, late, open, payable, onToggle, onMain, onSnooze, onGo }: {
  item: InboxItem; late: boolean; open: boolean; payable: boolean;
  onToggle: () => void; onMain: () => void; onSnooze: (until: Date, label: string) => void; onGo: () => void;
}) {
  const k = KIND[item.kind];
  const when = late ? 'Late' : item.group === 'today' ? 'Today' : shortDay(item.when);
  return (
    <View>
      <Pressable onPress={onToggle} style={({ pressed }) => [s.row, pressed && { backgroundColor: Corpus.cardAlt }]}
        accessibilityRole="button" accessibilityState={{ expanded: open }} accessibilityHint="Shows done, snooze and open">
        <IconChip icon={k.icon} color={late ? Chip.red : k.color} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={s.title} numberOfLines={2}>{item.title}</Text>
          <Text style={[s.body, late && { color: Corpus.danger }]} numberOfLines={open ? undefined : 2}>{item.body}</Text>
        </View>
        <View style={s.right}>
          <Text style={[s.when, late && { color: Corpus.danger }]}>{when}</Text>
          <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={Corpus.textMuted} />
        </View>
      </Pressable>
      {open && (
        <Animated.View entering={FadeIn.duration(180)} style={s.tray}>
          <Pressable onPress={onMain} style={({ pressed }) => [s.pill, s.pillMain, pressed && { opacity: 0.8 }]} accessibilityRole="button">
            <Ionicons name="checkmark" size={15} color={Corpus.onGold} />
            <Text style={[s.pillText, { color: Corpus.onGold }]}>{payable ? `Mark paid${item.amount ? ` ${formatINR(item.amount)}` : ''}` : 'Done'}</Text>
          </Pressable>
          {snoozeOptions().map((o) => (
            <Pressable key={o.label} onPress={() => onSnooze(o.until, o.label)} style={({ pressed }) => [s.pill, pressed && { opacity: 0.7 }]} accessibilityRole="button" accessibilityLabel={`Snooze until ${o.label.toLowerCase()}`}>
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
  const [open, setOpen] = useState<string | null>(null);
  const [showSnoozed, setShowSnoozed] = useState(false);
  const safe = useSafeToday();
  const now = new Date();
  const brief = briefing(items, safe ? safe.safeToday : null, now);
  const safeV = useTween(safe ? Math.max(0, safe.safeToday) : 0);
  // Week so far. On Mondays, last week (one day isn't a week)
  const { transactions: yearTx } = useTransactions('last12Months');
  const isMonday = now.getDay() === 1;
  const wk = weekReview(yearTx, isMonday ? new Date(Date.now() - 86_400_000) : now);
  const marks = settings.inbox ?? {};

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
  // A bill reminder can be paid from here when it is the payment the bill is waiting on
  const billOf = (i: InboxItem): Bill | undefined => (i.kind === 'bill' ? bills.find((b) => b.id === i.billId) : undefined);
  const payable = (i: InboxItem) => { const b = billOf(i); return !!b && isoDay(openDue(b).date) === isoDay(i.when); };
  const paid = async (i: InboxItem) => {
    const bill = billOf(i);
    if (!bill) return;
    setOpen(null);
    await logBillForThisMonth(bill, i.amount ?? bill.amount);
    showToast({ message: `${bill.name} ${formatINR(i.amount ?? bill.amount)} paid`, actionLabel: 'Undo', onAction: () => undoBillPayment(bill) });
  };

  const groups = (['overdue', 'today', 'week', 'later'] as InboxGroup[]).map((g) => ({ g, list: items.filter((i) => i.group === g) })).filter((x) => x.list.length);
  const count = (g: InboxGroup) => items.filter((i) => i.group === g).length;
  const late = count('overdue'), today = count('today'), soon = count('week');
  // Only money that has to go out counts as "due" (not tips like updating balances)
  const isDue = (i: InboxItem) => i.kind === 'bill' || i.kind === 'card' || i.kind === 'people' || i.kind === 'sip';
  const dueToday = brief.dueToday.filter(isDue), dueTomorrow = brief.dueTomorrow.filter(isDue);
  const next = items.find((i) => isDue(i) && i.group !== 'overdue' && i.group !== 'today');
  const dueLine = [
    dueToday.length ? `Due today: ${dueToday.map((i) => i.title).join(', ')}.` : 'Nothing to pay today.',
    dueTomorrow.length ? `Tomorrow: ${dueTomorrow.map((i) => i.title).slice(0, 2).join(', ')}.` : next ? `Next up on ${shortDay(next.when)}: ${next.title}.` : '',
  ].filter(Boolean).join(' ');

  return (
    <Screen title="Reminders" onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))}>
      <View style={[s.card, s.hero]}>
        <Shine />
        <Text style={s.muted}>{now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
        {safe && (
          <View style={{ gap: 0 }}>
            <Text style={[s.big, safe.safeToday <= 0 && { color: Corpus.danger }]}>{formatINR(Math.round(safeV))}</Text>
            <Text style={s.muted}>{safe.safeToday > 0 ? 'left to spend today' : 'left today. Spend nothing extra'}</Text>
          </View>
        )}
        <Text style={s.line}>{dueLine}</Text>
        <View style={s.strip}>
          <View style={s.stat} accessibilityLabel={`${late} late`}>
            <View style={s.statTop}>
              {late > 0 && <Ionicons name="alert-circle" size={15} color={Corpus.danger} />}
              <Text style={[s.statNum, late > 0 && { color: Corpus.danger }]}>{late}</Text>
            </View>
            <Text style={s.statLabel}>Late</Text>
          </View>
          <View style={s.rule} />
          <View style={s.stat}><Text style={s.statNum}>{today}</Text><Text style={s.statLabel}>Today</Text></View>
          <View style={s.rule} />
          <View style={s.stat}><Text style={s.statNum}>{soon}</Text><Text style={s.statLabel}>Next 7 days</Text></View>
        </View>
        {settings.notify?.daily !== false && <Text style={s.note}>On your phone this summary arrives every morning at {settings.briefingHour ?? 9}:00.</Text>}
      </View>

      {items.length === 0 ? (
        <View style={[s.card, s.empty]}>
          <IconChip icon="checkmark-done" color={Chip.green} size={48} />
          <Text style={s.emptyTitle}>All clear</Text>
          <Text style={[s.muted, { textAlign: 'center' }]}>No bills, card dues, SIPs or money with people in the next 30 days.</Text>
          <Button variant="secondary" size="sm" label="Back to Today" onPress={() => router.replace('/')} />
        </View>
      ) : (
        groups.map(({ g, list }) => (
          <Group key={g} title={`${GROUP[g]}, ${list.length}`} animate>
            {list.map((i) => (
              <Row
                key={i.id}
                item={i}
                late={g === 'overdue'}
                open={open === i.id}
                payable={payable(i)}
                onToggle={() => setOpen(open === i.id ? null : i.id)}
                onMain={() => (payable(i) ? paid(i) : mark(i, { done: new Date().toISOString() }, 'Marked done'))}
                onSnooze={(until) => mark(i, { snooze: until.toISOString() }, `Snoozed until ${until.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}`)}
                onGo={() => router.push(i.href as Href)}
              />
            ))}
          </Group>
        ))
      )}

      {snoozed.length > 0 && (
        <Group title={`Snoozed, ${snoozed.length}`} action={showSnoozed ? 'Hide' : 'Show'} onAction={() => setShowSnoozed(!showSnoozed)} animate>
          {showSnoozed ? snoozed.map((i) => (
            <View key={i.id} style={s.row}>
              <IconChip icon="moon" color={Chip.gray} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={s.title} numberOfLines={2}>{i.title}</Text>
                <Text style={s.body}>Back on {i.until.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</Text>
              </View>
              <Button variant="secondary" size="sm" label="Wake" onPress={() => mark(i, null, 'Back in your list')} />
            </View>
          )) : (
            <Pressable key="peek" onPress={() => setShowSnoozed(true)} style={s.row} accessibilityRole="button">
              <Text style={[s.body, { flex: 1 }]} numberOfLines={1}>{snoozed.map((i) => i.title).join(', ')}</Text>
            </Pressable>
          )}
        </Group>
      )}

      {wk.count > 0 && (
        <View style={s.card}>
          <Text style={s.cardTitle}>{isMonday ? 'Last week' : 'This week so far'}</Text>
          <Text style={s.muted}>{shortDay(wk.start)} to {shortDay(new Date(wk.end.getTime() - 86_400_000))}</Text>
          <View style={s.strip}>
            <View style={s.stat}><Text style={s.statNum}>{formatINR(wk.spent)}</Text><Text style={s.statLabel}>Spent</Text></View>
            <View style={s.rule} />
            <View style={s.stat}>
              <View style={s.statTop}>
                {wk.change != null && <Ionicons name={wk.change > 0 ? 'arrow-up' : 'arrow-down'} size={14} color={wk.change > 0 ? Corpus.danger : Corpus.income} />}
                <Text style={[s.statNum, wk.change != null && { color: wk.change > 0 ? Corpus.danger : Corpus.income }]}>
                  {wk.change == null ? 'New' : `${Math.round(Math.abs(wk.change) * 100)}%`}
                </Text>
              </View>
              <Text style={s.statLabel}>{wk.change == null ? 'No week before' : wk.change > 0 ? 'More than before' : 'Less than before'}</Text>
            </View>
            <View style={s.rule} />
            <View style={s.stat}><Text style={s.statNum}>{wk.noSpendDays}</Text><Text style={s.statLabel}>No-spend days</Text></View>
          </View>
          {wk.top && (
            <Text style={s.line}>
              Most went on <Text style={s.strong}>{wk.top.label}</Text>, {formatINR(wk.top.amount)} ({Math.round(wk.top.share * 100)}%).
              {wk.biggest ? ` Biggest single spend ${formatINR(wk.biggest.amount)}${wk.biggest.note ? ` on ${wk.biggest.note}` : ''}.` : ''}
            </Text>
          )}
          {wk.loggedDays < wk.daysSoFar && (
            <View style={s.warn}>
              <Ionicons name="alert-circle" size={15} color={Corpus.warning} />
              <Text style={[s.line, { flex: 1 }]}>You logged on {wk.loggedDays} of {wk.daysSoFar} days, so these numbers are lower than they really are.</Text>
            </View>
          )}
        </View>
      )}

      <Text style={s.note}>Done hides only this one. Next month's comes back. On your phone these also arrive as notifications.</Text>
    </Screen>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: Corpus.card, borderRadius: 24, padding: 18, gap: 8 },
  hero: { overflow: 'hidden', gap: 10 },
  big: { fontSize: Type.hero, fontFamily: Font.displayBold, color: Corpus.text, letterSpacing: -1.2, ...tabular },
  muted: { fontSize: Type.body, color: Corpus.textMuted, lineHeight: 19 },
  line: { fontSize: Type.body, color: Corpus.text, lineHeight: 19, ...tabular },
  strong: { fontFamily: Font.display },
  note: { fontSize: Type.small, color: Corpus.textMuted, lineHeight: 17 },
  strip: { flexDirection: 'row', alignItems: 'center', paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Corpus.border },
  stat: { flex: 1, gap: 2 },
  statTop: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statNum: { fontSize: Type.h3, fontFamily: Font.displayBold, color: Corpus.text, ...tabular },
  statLabel: { fontSize: Type.small, color: Corpus.textMuted },
  rule: { width: StyleSheet.hairlineWidth, height: 32, backgroundColor: Corpus.border, marginHorizontal: 12 },
  cardTitle: { fontSize: Type.title, fontFamily: Font.displayBold, color: Corpus.text, letterSpacing: -0.2 },
  warn: { flexDirection: 'row', gap: 6, alignItems: 'flex-start', backgroundColor: Corpus.warningTint, borderRadius: 14, padding: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 60, paddingVertical: 10, paddingHorizontal: 16 },
  title: { fontSize: Type.label, fontFamily: Font.display, color: Corpus.text },
  body: { fontSize: Type.body, color: Corpus.textMuted, lineHeight: 18 },
  right: { alignItems: 'flex-end', gap: 4, minWidth: 44 },
  when: { fontSize: Type.small, fontFamily: Font.display, color: Corpus.textMuted, ...tabular },
  tray: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingBottom: 14, paddingLeft: 62 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 40, paddingHorizontal: 14, borderRadius: 20, backgroundColor: Corpus.bg },
  pillMain: { backgroundColor: Corpus.gold },
  pillText: { fontSize: Type.body, fontFamily: Font.display, color: Corpus.text, ...tabular },
  empty: { alignItems: 'center', gap: 10, paddingVertical: 28 },
  emptyTitle: { fontSize: Type.h3, fontFamily: Font.displayBold, color: Corpus.text },
});
