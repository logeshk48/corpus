import { ScreenHeader, SectionLabel } from '@/components/ui';
import { Corpus, Radius, Space, Type } from '@/constants/theme';
import { useInbox } from '@/hooks/useInbox';
import { useSettings } from '@/hooks/useSettings';
import { useToast } from '@/context/ToastContext';
import { logBillForThisMonth, undoBillPayment } from '@/services/bills';
import { saveInboxMarks } from '@/services/settings';
import type { InboxMark } from '@/types/settings';
import { formatINR } from '@/utils/format';
import { useSafeToday } from '@/hooks/useSafeToday';
import { useTransactions } from '@/hooks/useTransactions';
import { weekReview } from '@/utils/weekReview';
import { baseId, briefing, pruneMarks, snoozeOptions, type InboxGroup, type InboxItem, type InboxKind } from '@/utils/inbox';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const KIND: Record<InboxKind, { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  people: { icon: 'people-outline', color: Corpus.gold },
  card: { icon: 'card-outline', color: Corpus.danger },
  bill: { icon: 'receipt-outline', color: Corpus.warning },
  sip: { icon: 'repeat-outline', color: Corpus.income },
  debt: { icon: 'flag-outline', color: Corpus.danger },
  budget: { icon: 'pie-chart-outline', color: Corpus.warning },
  checkin: { icon: 'refresh-outline', color: Corpus.textMuted },
  low: { icon: 'alert-circle-outline', color: Corpus.danger },
};
const GROUP: Record<InboxGroup, string> = { overdue: 'OVERDUE', today: 'TODAY', week: 'THIS WEEK', later: 'LATER THIS MONTH' };

export default function InboxScreen() {
  const router = useRouter();
  const { items, snoozed, bills } = useInbox();
  const { settings } = useSettings();
  const { showToast } = useToast();
  const [open, setOpen] = useState<string | null>(null);
  const [showSnoozed, setShowSnoozed] = useState(false);
  const safe = useSafeToday();
  const brief = briefing(items, safe ? safe.safeToday : null, new Date());
  // Week so far — on Mondays, last week (one day isn't a week)
  const { transactions: yearTx } = useTransactions('last12Months');
  const isMonday = new Date().getDay() === 1;
  const wk = weekReview(yearTx, isMonday ? new Date(Date.now() - 86_400_000) : new Date());
  const marks = settings.inbox ?? {};
  const mark = async (i: InboxItem, m: InboxMark | null, msg: string) => {
    const id = baseId(i.id);
    const before = marks[id];
    const next = { ...marks };
    if (m) next[id] = m;
    else delete next[id];
    await saveInboxMarks(pruneMarks(next));
    setOpen(null);
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
  const thisMonth = (d: Date) => d.getFullYear() === new Date().getFullYear() && d.getMonth() === new Date().getMonth();
  const paid = async (i: InboxItem) => {
    const bill = bills.find((b) => b.id === i.billId);
    if (!bill) return;
    await logBillForThisMonth(bill, i.amount ?? bill.amount);
    setOpen(null);
    showToast({ message: `${bill.name} ${formatINR(i.amount ?? bill.amount)} recorded as paid`, actionLabel: 'Undo', onAction: () => undoBillPayment(bill) });
  };
  const groups = (['overdue', 'today', 'week', 'later'] as InboxGroup[]).map((g) => ({ g, list: items.filter((i) => i.group === g) })).filter((x) => x.list.length);

  return (
    <SafeAreaView style={st.safe} edges={['top']}>
      <ScrollView contentContainerStyle={st.content} showsVerticalScrollIndicator={false}>
        <ScreenHeader title="Reminders" onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
        <View style={st.brief}>
          <Text style={st.briefLabel}>{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase()}</Text>
          {safe && (
            <Text style={st.briefBig}>
              {safe.safeToday > 0 ? formatINR(safe.safeToday) : '₹0'}
              <Text style={st.briefSmall}> to spend today</Text>
            </Text>
          )}
          <Text style={st.meta}>
            {brief.dueToday.length ? `Due today: ${brief.dueToday.map((i) => i.title).join(', ')}. ` : 'Nothing due today. '}
            {brief.dueTomorrow.length ? `Tomorrow: ${brief.dueTomorrow.map((i) => i.title).slice(0, 2).join(', ')}.` : ''}
            {brief.overdue ? ` ${brief.overdue} overdue below.` : ''}
          </Text>
          {settings.notify?.daily !== false && <Text style={st.when}>On your phone this comes every morning at {settings.briefingHour ?? 9}:00.</Text>}
        </View>

        {wk.count > 0 && (
          <View style={st.week}>
            <Text style={st.briefLabel}>{isMonday ? 'LAST WEEK' : 'THIS WEEK SO FAR'} · {wk.start.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}–{new Date(wk.end.getTime() - 86_400_000).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</Text>
            <View style={st.weekRow}>
              <View style={st.weekCell}>
                <Text style={st.weekNum}>{formatINR(wk.spent)}</Text>
                <Text style={st.when}>spent</Text>
              </View>
              <View style={st.weekCell}>
                <Text style={[st.weekNum, wk.change != null && { color: wk.change > 0 ? Corpus.danger : Corpus.income }]}>
                  {wk.change == null ? '—' : `${wk.change > 0 ? '+' : '−'}${Math.round(Math.abs(wk.change) * 100)}%`}
                </Text>
                <Text style={st.when}>vs week before</Text>
              </View>
              <View style={st.weekCell}>
                <Text style={st.weekNum}>{wk.noSpendDays}</Text>
                <Text style={st.when}>no-spend days</Text>
              </View>
            </View>
            {wk.top && (
              <Text style={st.meta}>
                Most on <Text style={{ color: Corpus.text, fontWeight: '600' }}>{wk.top.label}</Text>: {formatINR(wk.top.amount)} ({Math.round(wk.top.share * 100)}%).
                {wk.biggest ? ` Biggest: ${formatINR(wk.biggest.amount)}${wk.biggest.note ? ` on ${wk.biggest.note}` : ''}.` : ''}
              </Text>
            )}
            <Text style={[st.meta, wk.loggedDays < wk.daysSoFar && { color: Corpus.warning }]}>
              Logged on {wk.loggedDays} of {wk.daysSoFar} days{wk.loggedDays < wk.daysSoFar ? ' — missing days make every number lower than it really is.' : ' ✓'}
            </Text>
          </View>
        )}

        {items.length === 0 ? (
          <View style={st.empty}>
            <Ionicons name="checkmark-done-circle-outline" size={44} color={Corpus.income} />
            <Text style={st.emptyTitle}>All clear</Text>
            <Text style={st.meta}>No bills, dues, SIPs or money with people in the next 30 days.</Text>
          </View>
        ) : (
          groups.map(({ g, list }) => (
            <View key={g} style={{ gap: Space.sm }}>
              <SectionLabel right={`${list.length}`}>{GROUP[g]}</SectionLabel>
              {list.map((i: InboxItem) => (
                <View key={i.id} style={[st.row, g === 'overdue' && { borderColor: Corpus.dangerLine }]}>
                  <Pressable style={st.main} onPress={() => router.push(i.href as Href)}>
                    <View style={st.icon}>
                      <Ionicons name={KIND[i.kind].icon} size={17} color={g === 'overdue' ? Corpus.danger : KIND[i.kind].color} />
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={st.title}>{i.title}</Text>
                      <Text style={[st.meta, g === 'overdue' && { color: Corpus.danger }]}>{i.body}</Text>
                    </View>
                    {g !== 'today' && g !== 'overdue' && <Text style={st.when}>{i.when.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</Text>}
                    <Pressable hitSlop={10} onPress={() => setOpen(open === i.id ? null : i.id)} style={st.more}>
                      <Ionicons name={open === i.id ? 'close' : 'ellipsis-horizontal'} size={18} color={Corpus.textMuted} />
                    </Pressable>
                  </Pressable>
                  {open === i.id && (
                    <View style={st.actions}>
                      {i.kind === 'bill' && i.billId && thisMonth(i.when) ? (
                        <Pressable style={[st.chip, st.chipMain]} onPress={() => paid(i)}>
                          <Text style={st.chipMainText}>✓ Paid {i.amount ? formatINR(i.amount) : ''}</Text>
                        </Pressable>
                      ) : (
                        <Pressable style={[st.chip, st.chipMain]} onPress={() => mark(i, { done: new Date().toISOString() }, 'Marked done')}>
                          <Text style={st.chipMainText}>✓ Done</Text>
                        </Pressable>
                      )}
                      {snoozeOptions().map((o) => (
                        <Pressable key={o.label} style={st.chip} onPress={() => mark(i, { snooze: o.until.toISOString() }, `Snoozed until ${o.until.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}`)}>
                          <Text style={st.chipText}>{o.label}</Text>
                        </Pressable>
                      ))}
                    </View>
                  )}
                </View>
              ))}
            </View>
          ))
        )}
        {snoozed.length > 0 && (
          <View style={{ gap: Space.sm }}>
            <Pressable onPress={() => setShowSnoozed(!showSnoozed)}>
              <SectionLabel right={showSnoozed ? 'Hide' : `${snoozed.length}`}>SNOOZED</SectionLabel>
            </Pressable>
            {showSnoozed &&
              snoozed.map((i) => (
                <View key={i.id} style={[st.row, { opacity: 0.75 }]}>
                  <View style={st.main}>
                    <View style={st.icon}>
                      <Ionicons name="moon-outline" size={16} color={Corpus.textMuted} />
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={st.title}>{i.title}</Text>
                      <Text style={st.meta}>Back on {i.until.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</Text>
                    </View>
                    <Pressable style={st.chip} onPress={() => mark(i, null, 'Back in your list')}>
                      <Text style={st.chipText}>Wake</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
          </View>
        )}
        <Text style={st.note}>Tap ⋯ to mark done (or paid) or snooze. Done only hides this one — next month’s comes back. On your phone these also come as notifications (Settings → Notifications). On the web, this is where you see them.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Corpus.bg },
  content: { padding: Space.lg, paddingBottom: 120, gap: Space.md },
  brief: { backgroundColor: Corpus.goldTint, borderRadius: Radius.lg, borderWidth: 0.5, borderColor: Corpus.goldLine, padding: Space.md, gap: 4 },
  briefLabel: { fontSize: Type.caption, color: Corpus.gold, fontWeight: '700', letterSpacing: 0.6 },
  briefBig: { fontSize: Type.h2, fontWeight: '700', color: Corpus.text },
  briefSmall: { fontSize: Type.body, fontWeight: '500', color: Corpus.textMuted },
  week: { backgroundColor: Corpus.card, borderRadius: Radius.lg, borderWidth: 0.5, borderColor: Corpus.border, padding: Space.md, gap: 8 },
  weekRow: { flexDirection: 'row', gap: 8 },
  weekCell: { flex: 1, gap: 2 },
  weekNum: { fontSize: Type.title, fontWeight: '700', color: Corpus.text },
  row: { backgroundColor: Corpus.card, borderRadius: Radius.lg, borderWidth: 0.5, borderColor: Corpus.border, padding: Space.md, gap: 10 },
  main: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  more: { padding: 4 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingLeft: 46 },
  chip: { borderRadius: Radius.sm, borderWidth: 0.5, borderColor: Corpus.border, backgroundColor: Corpus.cardAlt, paddingHorizontal: 12, paddingVertical: 7 },
  chipText: { fontSize: Type.small, color: Corpus.text, fontWeight: '600' },
  chipMain: { backgroundColor: Corpus.gold, borderColor: Corpus.gold },
  chipMainText: { fontSize: Type.small, color: Corpus.onGold, fontWeight: '700' },
  icon: { width: 34, height: 34, borderRadius: 17, backgroundColor: Corpus.cardAlt, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: Type.bodyLg, fontWeight: '600', color: Corpus.text },
  meta: { fontSize: Type.small, color: Corpus.textMuted, lineHeight: 17 },
  when: { fontSize: Type.caption, color: Corpus.textFaint },
  empty: { alignItems: 'center', gap: Space.sm, paddingVertical: 50 },
  emptyTitle: { fontSize: Type.title, fontWeight: '600', color: Corpus.text },
  note: { fontSize: Type.small, color: Corpus.textFaint, lineHeight: 17, marginTop: Space.sm },
});
