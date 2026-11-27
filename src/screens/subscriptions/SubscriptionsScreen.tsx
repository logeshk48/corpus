import Jarvy from '@/components/fx/Jarvy';
import { IconChip, Screen, Tap } from '@/components/ui';
import { findCategory } from '@/constants/categories';
import { CategoryChip, Chip, Corpus, Font, Note, Pastel, tabular, Type } from '@/constants/theme';
import { useToast } from '@/context/ToastContext';
import { useBills } from '@/hooks/useBills';
import { useSettings } from '@/hooks/useSettings';
import { useTransactions } from '@/hooks/useTransactions';
import { addBill, deleteBill } from '@/services/bills';
import { saveSettings } from '@/services/settings';
import { yearMonth } from '@/utils/bills';
import { formatINR } from '@/utils/format';
import { subscriptionRadar, usualIncome, type Sub } from '@/utils/subscriptions';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import RadarDial from './RadarDial';

const ink = Pastel.lilac;
const short = (d: Date) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
const when = (d: number) => (d < 0 ? 'late' : d === 0 ? 'today' : d === 1 ? 'tomorrow' : `in ${d} days`);
const nth = (n: number) => (n % 10 === 1 && n !== 11 ? 'st' : n % 10 === 2 && n !== 12 ? 'nd' : n % 10 === 3 && n !== 13 ? 'rd' : 'th');

// Subscriptions: every plan you pay for again and again, on one radar.
export default function SubscriptionsScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const { bills, loading } = useBills();
  const { settings } = useSettings();
  const { transactions: tx } = useTransactions('last12Months');
  const [picked, setPicked] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const dismissed = settings.dismissedInsights ?? [];
  const r = subscriptionRadar(bills, tx, dismissed);
  const income = usualIncome(tx);
  const share = income > 0 ? Math.round((r.monthly / income) * 100) : null;
  const next = r.coming[0];
  const listed = r.active.filter((s) => !s.found);
  const open = (s: Sub) => s.billId && router.push(`/bill/${s.billId}` as Href);

  const makeBill = async (s: Sub) => {
    const f = s.found!;
    setBusy(s.key);
    try {
      const ym = yearMonth(new Date());
      const id = await addBill({
        name: f.name, amount: f.amount, category: f.category, dayOfMonth: Math.min(31, Math.max(1, f.day)), active: true,
        startMonth: ym, frequency: 'monthly', ...(f.paidThisMonth ? { lastLoggedMonth: ym } : {}),
      });
      showToast({ message: `${f.name} is now a bill`, actionLabel: 'Undo', onAction: () => deleteBill(id) });
    } catch {
      showToast({ message: 'Couldn’t add it. Try again.' });
    } finally { setBusy(null); }
  };
  const notAPlan = async (s: Sub) => {
    setBusy(`${s.key}:n`);
    try { await saveSettings({ dismissedInsights: [...dismissed, s.key] }); } finally { setBusy(null); }
  };

  const empty = !loading && r.active.length === 0 && r.paused.length === 0;

  return (
    <Screen title="Subscriptions" tone={Chip.purple} onBack={() => (router.canGoBack() ? router.back() : router.replace('/bills' as Href))}>
      {empty ? (
        <View style={st.empty}>
          <Jarvy mood="sleepy" level={0.2} color={ink.icon} size={64} />
          <Text style={st.emptyTitle}>Nothing on the radar yet</Text>
          <Text style={st.emptyText}>Add Netflix, a phone recharge or your gym as a bill and it shows up here. Corpus also spots payments you make every month.</Text>
          <Tap onPress={() => router.push('/bills' as Href)} scaleTo={0.96} style={st.emptyBtn} accessibilityRole="button">
            <Text style={st.emptyBtnText}>Add a bill</Text>
          </Tap>
        </View>
      ) : (
        <>
          <View style={st.hero}>
            <RadarDial coming={r.coming} monthly={r.monthly} picked={picked} onPick={setPicked} />
            <Text style={st.heroLine}>
              {next
                ? <>Next up: <Text style={st.heroStrong}>{next.name}</Text>, {formatINR(next.amount)} {when(next.daysAway ?? 0)}.</>
                : 'Nothing charges in the next 30 days.'}
              {r.coming.length > 1 ? ` ${r.coming.length} charges in the next 30 days. Tap a dot to read it.` : ''}
            </Text>
          </View>

          <View style={st.stats}>
            <View style={st.stat}><Text style={st.statNum}>{formatINR(r.yearly)}</Text><Text style={st.statLabel}>a year</Text></View>
            <View style={[st.stat, st.rule]}><Text style={st.statNum}>{formatINR(Math.round(r.yearly / 365))}</Text><Text style={st.statLabel}>a day</Text></View>
            <View style={[st.stat, st.rule]}>
              <Text style={st.statNum}>{share != null ? `${share}%` : r.active.length}</Text>
              <Text style={st.statLabel}>{share != null ? 'of your pay' : 'plans'}</Text>
            </View>
          </View>

          {r.rises.filter((s) => s.billId).slice(0, 2).map((s) => (
            <View key={s.key} style={st.note}>
              <Text style={st.noteLabel}>Price went up</Text>
              <Text style={st.noteTitle}>{s.name} is {formatINR(s.rise!)} more now</Text>
              <Text style={st.noteText}>{formatINR(s.amount)} each time, {formatINR(s.yearly)} a year. Still worth it?</Text>
              <Tap onPress={() => open(s)} scaleTo={0.96} style={st.noteBtn} accessibilityRole="button" accessibilityLabel={`Open ${s.name}`}>
                <Text style={st.noteBtnText}>Open {s.name}</Text>
              </Tap>
            </View>
          ))}

          {r.found.length > 0 && (
            <View style={st.section}>
              <View style={st.hRow}>
                <Text style={st.h}>Found in your spends</Text>
                <Text style={st.hint}>Not bills yet</Text>
              </View>
              {r.found.map((s) => (
                <View key={s.key} style={st.found}>
                  <View style={st.rowTop}>
                    <IconChip icon={findCategory('expense', s.category)?.icon ?? 'repeat'} color={CategoryChip[s.category] ?? Chip.purple} />
                    <View style={{ flex: 1 }}>
                      <Text style={st.name} numberOfLines={1}>{s.name}</Text>
                      <Text style={st.sub}>Paid {s.found!.months} months in a row, around the {s.found!.day}{nth(s.found!.day)}</Text>
                    </View>
                    <Text style={st.amount}>{formatINR(s.amount)}</Text>
                  </View>
                  <View style={st.btns}>
                    <Tap onPress={() => makeBill(s)} disabled={!!busy} scaleTo={0.96} style={[st.btn, st.btnOn]} accessibilityRole="button">
                      {busy === s.key ? <ActivityIndicator size="small" color={Corpus.onGold} /> : <Text style={[st.btnText, { color: Corpus.onGold }]}>Add as a bill</Text>}
                    </Tap>
                    <Tap onPress={() => notAPlan(s)} disabled={!!busy} scaleTo={0.96} style={st.btn} accessibilityRole="button">
                      <Text style={st.btnText}>Not a plan</Text>
                    </Tap>
                  </View>
                </View>
              ))}
            </View>
          )}

          {listed.length > 0 && (
            <View style={st.section}>
              <View style={st.hRow}>
                <Text style={st.h}>Your plans</Text>
                <Text style={st.hint}>Costliest first</Text>
              </View>
              <View style={st.list}>
                {listed.map((s, i) => (
                  <Tap key={s.key} onPress={() => open(s)} scaleTo={0.98} style={[st.row, i > 0 && st.rowRule]} accessibilityRole="button"
                    accessibilityLabel={`${s.name}, ${formatINR(s.amount)}, ${s.freq.toLowerCase()}, ${formatINR(s.yearly)} a year`}>
                    <View style={st.rowTop}>
                      <IconChip icon={findCategory('expense', s.category)?.icon ?? 'repeat'} color={CategoryChip[s.category] ?? Chip.purple} />
                      <View style={{ flex: 1 }}>
                        <Text style={st.name} numberOfLines={1}>{s.name}</Text>
                        <Text style={st.sub} numberOfLines={1}>
                          {s.freq}{s.next ? `, next ${short(s.next)}` : ''}
                          {s.rise ? <Text style={{ color: Corpus.warning }}>, up {formatINR(s.rise)}</Text> : null}
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={st.amount}>{formatINR(s.amount)}</Text>
                        <Text style={st.sub}>{formatINR(s.yearly)} a year</Text>
                      </View>
                    </View>
                    {listed.length > 1 && <View style={st.track}>
                      <View style={[st.fill, { width: `${Math.max(3, (s.yearly / Math.max(1, r.yearly)) * 100)}%`, backgroundColor: CategoryChip[s.category] ?? Chip.purple }]} />
                    </View>}
                  </Tap>
                ))}
              </View>
            </View>
          )}

          {r.paused.length > 0 && (
            <View style={st.section}>
              <Text style={st.h}>Paused</Text>
              <View style={st.list}>
                {r.paused.map((s, i) => (
                  <Tap key={s.key} onPress={() => open(s)} scaleTo={0.98} style={[st.row, i > 0 && st.rowRule, { opacity: 0.6 }]} accessibilityRole="button">
                    <View style={st.rowTop}>
                      <IconChip icon={findCategory('expense', s.category)?.icon ?? 'repeat'} color={Chip.gray} />
                      <View style={{ flex: 1 }}>
                        <Text style={st.name} numberOfLines={1}>{s.name}</Text>
                        <Text style={st.sub}>Not counted, saves {formatINR(s.yearly)} a year</Text>
                      </View>
                    </View>
                  </Tap>
                ))}
              </View>
            </View>
          )}

          <View style={st.tip}>
            <Ionicons name="bulb-outline" size={16} color={Corpus.textMuted} />
            <Text style={st.tipText}>Cancelling one? Cancel it in that app first, then pause the bill here so Corpus stops keeping money aside for it.</Text>
          </View>
        </>
      )}
    </Screen>
  );
}

const st = StyleSheet.create({
  hero: { backgroundColor: ink.bg, borderRadius: 28, paddingTop: 18, paddingBottom: 18, paddingHorizontal: 18, gap: 10 },
  heroLine: { fontSize: Type.bodyLg, lineHeight: 20, color: ink.fg, textAlign: 'center' },
  heroStrong: { fontFamily: Font.display, color: ink.fg },
  stats: { flexDirection: 'row', backgroundColor: Corpus.card, borderRadius: 20, paddingVertical: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: Corpus.border },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  rule: { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: Corpus.border },
  statNum: { fontSize: Type.title, fontFamily: Font.displayBold, color: Corpus.text, ...tabular },
  statLabel: { fontSize: Type.small, color: Corpus.textMuted },
  note: { backgroundColor: Note.bg, borderRadius: 22, padding: 16, gap: 4, transform: [{ rotate: '-1deg' }] },
  noteLabel: { fontSize: Type.small, fontFamily: Font.display, color: Note.label },
  noteTitle: { fontSize: Type.title, fontFamily: Font.displayBold, color: Note.ink },
  noteText: { fontSize: Type.body, lineHeight: 19, color: Note.sub },
  noteBtn: { alignSelf: 'flex-start', marginTop: 8, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: Note.ink },
  noteBtnText: { fontSize: Type.body, fontFamily: Font.display, color: Note.bg },
  section: { gap: 10, marginTop: 6 },
  hRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: 4 },
  h: { fontSize: Type.h3, fontFamily: Font.displayBold, color: Corpus.text, paddingHorizontal: 4 },
  hint: { fontSize: Type.small, color: Corpus.textMuted },
  found: { borderRadius: 20, padding: 14, gap: 12, borderWidth: 1.5, borderStyle: 'dashed', borderColor: Corpus.border, backgroundColor: Corpus.card },
  btns: { flexDirection: 'row', gap: 8 },
  btn: { flex: 1, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Corpus.border },
  btnOn: { backgroundColor: Corpus.gold, borderColor: Corpus.gold },
  btnText: { fontSize: Type.body, fontFamily: Font.display, color: Corpus.text },
  list: { backgroundColor: Corpus.card, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, borderColor: Corpus.border, overflow: 'hidden' },
  row: { paddingHorizontal: 14, paddingVertical: 12, gap: 10 },
  rowRule: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Corpus.border },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  name: { fontSize: Type.label, fontFamily: Font.display, color: Corpus.text },
  sub: { fontSize: Type.small, color: Corpus.textMuted, marginTop: 2 },
  amount: { fontSize: Type.label, fontFamily: Font.displayBold, color: Corpus.text, ...tabular },
  track: { height: 4, borderRadius: 2, backgroundColor: Corpus.cardAlt, marginLeft: 42, overflow: 'hidden' },
  fill: { height: 4, borderRadius: 2 },
  tip: { flexDirection: 'row', gap: 8, paddingHorizontal: 6, marginTop: 4 },
  tipText: { flex: 1, fontSize: Type.small, lineHeight: 17, color: Corpus.textMuted },
  empty: { alignItems: 'center', gap: 10, padding: 24, backgroundColor: ink.bg, borderRadius: 28 },
  emptyTitle: { fontSize: Type.h3, fontFamily: Font.displayBold, color: ink.fg },
  emptyText: { fontSize: Type.bodyLg, lineHeight: 20, color: ink.fg, textAlign: 'center', opacity: 0.85 },
  emptyBtn: { marginTop: 6, paddingHorizontal: 18, height: 42, borderRadius: 21, backgroundColor: ink.fg, alignItems: 'center', justifyContent: 'center' },
  emptyBtnText: { fontSize: Type.label, fontFamily: Font.display, color: ink.bg },
});
