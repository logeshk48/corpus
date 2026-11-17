import Shine from '@/components/fx/Shine';
import { ActivityRing, Button, Group, IconChip, Screen, Segmented } from '@/components/ui';
import { Chip, Corpus, Font, tabular, Type } from '@/constants/theme';
import { useSettings } from '@/hooks/useSettings';
import { useTween } from '@/hooks/useTween';
import { useWealth } from '@/hooks/useWealth';
import { saveSettings } from '@/services/settings';
import { compactINR, formatINR } from '@/utils/format';
import { liquidFundReturn } from '@/utils/market';
import { upcomingBills } from '@/utils/moneyHealth';
import { project, real } from '@/utils/projection';
import { projectionInputs } from '@/utils/projectionInputs';
import { idleCash, savingsTrend, SAVINGS_ACCOUNT_RATE } from '@/utils/wealthTrend';
import { monthlyFlows, pointsFor, recentAverage, type Pillar, type PillarId, type Status } from '@/utils/wealthScore';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import ProtectionSheet from './ProtectionSheet';
import WhatIfCard from './WhatIfCard';

// Where each part's step is taken. 'sheet' = the insurance questions on this screen.
const META: Record<PillarId, { icon: string; go: string; goLabel: string; unlockGo: string }> = {
  spend: { icon: 'wallet', go: '/analytics', goLabel: 'See spending', unlockGo: '/income' },
  safety: { icon: 'shield-checkmark', go: '/vaults', goLabel: 'Open Jars', unlockGo: '/accounts' },
  debt: { icon: 'trending-down', go: '/debts', goLabel: 'See debts', unlockGo: '/income' },
  grow: { icon: 'trending-up', go: '/invest', goLabel: 'Open Invest', unlockGo: '/income' },
  protect: { icon: 'umbrella', go: 'sheet', goLabel: 'Update answers', unlockGo: 'sheet' },
};
// Status is shown with a word and an icon as well as a colour
const STATUS: Record<Status, { word: string; icon: string; chip: string; color: string }> = {
  good: { word: 'Good', icon: 'checkmark-circle', chip: Chip.green, color: Corpus.income },
  ok: { word: 'Okay', icon: 'remove-circle', chip: Chip.yellow, color: Corpus.warning },
  weak: { word: 'Weak', icon: 'alert-circle', chip: Chip.red, color: Corpus.danger },
  unknown: { word: 'Not scored', icon: 'help-circle', chip: Chip.gray, color: Corpus.textMuted },
};
const TONE = { good: Corpus.income, ok: Corpus.warning, weak: Corpus.danger };
const pct = (r: number | null) => (r == null ? 'None' : `${r < 0 ? '−' : ''}${Math.abs(Math.round(r * 100))}%`);
const monthName = (ym: string, o: Intl.DateTimeFormatOptions) => new Date(`${ym}-01T00:00:00`).toLocaleDateString('en-IN', o);

// One of the five questions. Tap it to see what it means, what full marks looks like, and its next step.
function Part({ p, points, open, onToggle, onGo }: { p: Pillar; points: number; open: boolean; onToggle: () => void; onGo: () => void }) {
  const st = STATUS[p.status];
  const m = META[p.id];
  return (
    <View>
      <Pressable onPress={onToggle} style={({ pressed }) => [s.part, pressed && { backgroundColor: Corpus.cardAlt }]}
        accessibilityRole="button" accessibilityState={{ expanded: open }}
        accessibilityLabel={`${p.question} ${p.known ? `${Math.round(p.score)} of 20, ${st.word}` : 'Not scored yet'}. ${p.value}`}>
        <IconChip icon={m.icon} color={st.chip} size={40} />
        <View style={{ flex: 1, gap: 6 }}>
          <View style={s.partTop}>
            <Text style={[s.partQ, { flex: 1 }]}>{p.question}</Text>
            <Text style={s.partPts}>{p.known ? `${Math.round(p.score)}/20` : ''}</Text>
          </View>
          {p.known && (
            <View style={s.bar}><View style={{ width: `${(p.score / 20) * 100}%`, backgroundColor: st.color }} /></View>
          )}
          <View style={s.partBottom}>
            <Ionicons name={st.icon as keyof typeof Ionicons.glyphMap} size={14} color={st.color} />
            <Text style={[s.small, { color: st.color, fontFamily: Font.display }]}>{st.word}.</Text>
            <Text style={[s.small, { flex: 1 }]} numberOfLines={open ? undefined : 1}>{p.value}</Text>
            <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={15} color={Corpus.textMuted} />
          </View>
        </View>
      </Pressable>
      {open && (
        <Animated.View entering={FadeIn.duration(180)} style={s.partMore}>
          <Text style={s.text}>{p.why}</Text>
          <Text style={s.small}><Text style={s.strong}>Full marks: </Text>{p.full}.</Text>
          {p.known && p.fix && (
            <View style={s.step}>
              <Text style={[s.text, { flex: 1 }]}><Text style={s.strong}>Next step: </Text>{p.fix}.</Text>
              <Text style={s.plus}>+{points}</Text>
            </View>
          )}
          {!p.known && p.unlock && <Text style={s.text}><Text style={s.strong}>To score this: </Text>{p.unlock}.</Text>}
          <View style={{ alignSelf: 'flex-start' }}>
            <Button variant="secondary" size="sm" label={p.known ? m.goLabel : p.unlock ?? m.goLabel} onPress={onGo} />
          </View>
        </Animated.View>
      )}
    </View>
  );
}

export default function WealthScreen() {
  const router = useRouter();
  const w = useWealth();
  const { score: sc, loading } = w;
  const { settings } = useSettings();
  const [open, setOpen] = useState<PillarId | null>(null);
  const [asking, setAsking] = useState(false);
  const [how, setHow] = useState(false);
  const [money, setMoney] = useState<'today' | 'future'>('today');

  // Remember this month's score so next month can show the change
  const monthKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const log = settings.scoreLog ?? {};
  const lastMonth = Object.keys(log).filter((k) => k < monthKey).sort().pop();
  const delta = lastMonth != null ? sc.score - log[lastMonth] : null;
  useEffect(() => {
    if (!loading && sc.known >= 3 && log[monthKey] !== sc.score) saveSettings({ scoreLog: { ...log, [monthKey]: sc.score } }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, sc.score, sc.known]);
  const shownScore = useTween(loading || sc.known < 2 ? 0 : sc.score);

  // Savings rate, last 12 months
  const trend = useMemo(() => savingsTrend(monthlyFlows(w.tx, w.investments, 12)), [w.tx, w.investments]);
  // Idle cash: bank money beyond ~2 months of needs
  const [liquidRate, setLiquidRate] = useState<number | null>(null);
  useEffect(() => { liquidFundReturn().then(setLiquidRate); }, []);
  const avg = recentAverage(w.inputs.flows);
  const monthlyNeed = (avg?.spend ?? 0) + w.inputs.monthlyEmi;
  const cash = w.items.filter((i) => i.group === 'cash').reduce((a, i) => a + Math.max(0, i.value), 0);
  const idle = idleCash({ cash, monthlyNeed, billsDue30: upcomingBills(w.bills).reduce((a, b) => a + b.amount, 0), cardDues: w.inputs.cardDues, liquidRate: liquidRate ?? 6.4 });
  // Where you're heading, at today's habits
  const pin = useMemo(() => projectionInputs({ items: w.items, investments: w.investments, ious: w.ious, bills: w.bills, score: w.inputs }), [w.items, w.investments, w.ious, w.bills, w.inputs]);
  const pts = useMemo(() => project(pin, 25), [pin]);
  const today = money === 'today';
  const shown = (v: number, m: number) => (today ? real(v, m) : v);
  const yearly = pts.filter((p) => p.month % 12 === 0 && p.month <= 240);
  const peak = Math.max(1, ...yearly.map((p) => shown(p.netWorth, p.month)));
  const fiTarget = monthlyNeed * 12 * 25;
  const reach = (target: number) => {
    const hit = pts.find((p) => (today ? real(p.netWorth, p.month) : p.netWorth) >= target);
    return hit && hit.month > 0 ? new Date(new Date().getFullYear(), new Date().getMonth() + hit.month, 1) : null;
  };
  const crore = reach(1e7);
  const fi = fiTarget > 0 ? reach(fiTarget) : null;
  const maxRate = Math.max(0.4, ...trend.months.map((m) => m.rate ?? 0));

  const go = (p: Pillar) => {
    const to = p.known ? META[p.id].go : META[p.id].unlockGo;
    if (to === 'sheet') setAsking(true);
    else router.push(to as Href);
  };
  const c = TONE[sc.tone];
  const unknown = sc.pillars.filter((p) => !p.known);
  const insuranceAsk = unknown.find((p) => p.id === 'protect');
  // Weakest first, the parts that can't be scored yet at the end
  const ordered = [...sc.pillars].sort((a, b) => Number(b.known) - Number(a.known) || a.score - b.score);
  const top = sc.topFix;

  return (
    <>
      <Screen title="Wealth score" onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))}>
        {loading ? (
          <View style={[s.card, { height: 280 }]} accessibilityLabel="Loading" accessibilityState={{ busy: true }} />
        ) : (
          <>
            {/* 1. The score, what band it is in, and what that means */}
            <View style={[s.card, s.hero]}>
              <Shine />
              <View style={s.ring} accessibilityLabel={sc.known < 2 ? 'Not enough data yet' : `${sc.score} out of 100, ${sc.grade}`}>
                <ActivityRing size={168} thickness={14} progress={sc.known < 2 ? 0 : shownScore / 100} color={c} track={Corpus.cardAlt} />
                <View style={s.ringIn}>
                  <Text style={s.ringNum}>{sc.known < 2 ? '?' : Math.round(shownScore)}</Text>
                  <Text style={s.small}>out of 100</Text>
                </View>
              </View>
              <View style={[s.band, { backgroundColor: sc.tone === 'good' ? Corpus.incomeTint : sc.tone === 'ok' ? Corpus.warningTint : Corpus.dangerTint }]}>
                <Text style={[s.bandText, { color: c }]}>{sc.grade}</Text>
              </View>
              {delta != null && delta !== 0 && lastMonth && (
                <View style={s.delta}>
                  <Ionicons name={delta > 0 ? 'arrow-up' : 'arrow-down'} size={14} color={delta > 0 ? Corpus.income : Corpus.danger} />
                  <Text style={[s.small, { color: delta > 0 ? Corpus.income : Corpus.danger, fontFamily: Font.display }]}>{Math.abs(delta)} since {monthName(lastMonth, { month: 'long' })}</Text>
                </View>
              )}
              <Text style={[s.text, { textAlign: 'center' }]}>{sc.meaning}</Text>
              {/* the scale, so the number has context */}
              <View style={s.scale} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                {[{ t: 'Needs care', f: 40, from: 0 }, { t: 'Getting there', f: 20, from: 40 }, { t: 'Good', f: 20, from: 60 }, { t: 'Strong', f: 20, from: 80 }].map((b, i) => (
                  <View key={b.t} style={{ flex: b.f, gap: 4 }}>
                    <View style={[s.scaleBar, sc.grade === b.t && { backgroundColor: c }]} />
                    <View style={s.row}>
                      <Text style={[s.scaleText, { flex: 1 }]}>{b.from}</Text>
                      {i === 3 && <Text style={s.scaleText}>100</Text>}
                    </View>
                  </View>
                ))}
              </View>
              <Text style={[s.small, { textAlign: 'center' }]}>Below 40 needs care, 40 to 59 is getting there, 60 to 79 is good, 80 and up is strong.{unknown.length > 0 && sc.known >= 2 ? ` Based on ${sc.known} of 5 parts.` : ''}</Text>
            </View>

            {/* 2. The one step that moves it most, sized so you can actually do it soon */}
            {top && (
              <View style={[s.card, { gap: 10 }]}>
                <View style={s.row}>
                  <Text style={[s.title, { flex: 1 }]}>Your next step</Text>
                  <View style={s.plusPill}><Text style={s.plusText}>+{pointsFor(sc, top)} points</Text></View>
                </View>
                <Text style={s.bigText}>{top.fix}.</Text>
                <Text style={s.small}>{top.label}: {top.value}.</Text>
                <Button label={META[top.id].goLabel} onPress={() => go(top)} />
              </View>
            )}
            {insuranceAsk && (
              <Pressable onPress={() => setAsking(true)} style={({ pressed }) => [s.card, s.ask, pressed && { opacity: 0.85 }]} accessibilityRole="button">
                <IconChip icon="umbrella" color={Chip.purple} size={40} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={s.title}>Complete your score</Text>
                  <Text style={s.small}>Answer 2 quick questions about insurance. It takes 20 seconds.</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={Corpus.textMuted} />
              </Pressable>
            )}

            {/* 3. The five questions, weakest first */}
            <Group title="Five questions">
              {ordered.map((p) => (
                <Part key={p.id} p={p} points={pointsFor(sc, p)} open={open === p.id} onToggle={() => setOpen(open === p.id ? null : p.id)} onGo={() => go(p)} />
              ))}
            </Group>

            {/* 4. Is the habit getting better? */}
            {trend.count > 0 && (
              <View style={s.card}>
                <Text style={s.title}>Left over each month</Text>
                <Text style={s.small}>The share of income you did not spend, last 12 months</Text>
                <View style={s.chart}>
                  {trend.months.map((m, i) => {
                    const r = m.rate;
                    const now = i === trend.months.length - 1;
                    const color = r == null ? Corpus.cardAlt : r < 0 ? Corpus.danger : r >= 0.2 ? Corpus.income : Corpus.warning;
                    return (
                      <View key={m.month} style={s.col}>
                        <Text style={s.colPct}>{r == null ? '' : pct(r)}</Text>
                        <View style={[s.colBar, { height: `${r == null ? 3 : Math.max(4, (Math.max(0, r) / maxRate) * 75)}%`, backgroundColor: color, opacity: now ? 0.45 : 1 }]} />
                        <Text style={s.colLabel}>{monthName(m.month, { month: 'narrow' })}</Text>
                      </View>
                    );
                  })}
                </View>
                <View style={s.strip}>
                  <View style={s.stat}><Text style={s.small}>Average</Text><Text style={s.statNum}>{pct(trend.avg)}</Text></View>
                  <View style={[s.stat, s.ruled]}>
                    <Text style={s.small}>Last 3 months</Text>
                    <View style={s.row}>
                      {trend.change != null && <Ionicons name={trend.change >= 0 ? 'arrow-up' : 'arrow-down'} size={14} color={trend.change >= 0 ? Corpus.income : Corpus.danger} />}
                      <Text style={s.statNum}>{pct(trend.recent)}</Text>
                    </View>
                  </View>
                  <View style={[s.stat, s.ruled]}><Text style={s.small}>Kept in all</Text><Text style={s.statNum}>{compactINR(Math.round(trend.savedTotal))}</Text></View>
                </View>
                <Text style={s.text}>
                  {trend.change != null
                    ? trend.change >= 0.02 ? `Getting better: up ${Math.round(trend.change * 100)} points on the 3 months before.`
                      : trend.change <= -0.02 ? `Slipping: down ${Math.round(-trend.change * 100)} points on the 3 months before.`
                      : 'Steady over the last 6 months.'
                    : 'Keep logging. The trend shows after a few months.'}
                  {trend.negative ? ` ${trend.negative} month${trend.negative > 1 ? 's' : ''} you spent more than you earned.` : ''}
                </Text>
                <Text style={s.note}>Green is 20% or more, amber is less, red means you spent more than you earned. The faded bar is this month so far.</Text>
              </View>
            )}

            {/* 5. Money that could be earning more */}
            {idle.show && (
              <Pressable style={({ pressed }) => [s.card, pressed && { opacity: 0.9 }]} onPress={() => router.push('/invest' as Href)} accessibilityRole="button">
                <View style={s.row}>
                  <IconChip icon="hourglass" color={Chip.yellow} size={40} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.title}>{formatINR(idle.idle)} is sitting idle</Text>
                    <Text style={s.small}>In your bank at about {SAVINGS_ACCOUNT_RATE}%, beyond what you need there</Text>
                  </View>
                </View>
                <Text style={s.text}>
                  A liquid fund (about {(liquidRate ?? 6.4).toFixed(1)}% last year) would earn about <Text style={[s.strong, { color: Corpus.income }]}>{formatINR(idle.extraPerYear)} more a year</Text>. Keep {formatINR(idle.keep)} in the bank for 2 months of costs and bills.
                </Text>
                <Text style={s.note}>Liquid funds pay back in 1 working day. Gains are taxed like FD interest. Your bank's auto-sweep FD is a simpler option.</Text>
              </Pressable>
            )}

            {/* 6. Where today's habits lead */}
            {(pin.monthlySave > 0 || w.totals.total > 0) && (
              <View style={s.card}>
                <Text style={s.title}>Where you're heading</Text>
                <Segmented options={[{ value: 'today', label: "Today's money" }, { value: 'future', label: 'Future rupees' }]} value={money} onChange={setMoney} />
                <View style={[s.chart, { height: 90, gap: 2 }]}>
                  {yearly.map((p) => {
                    const v = shown(p.netWorth, p.month);
                    return <View key={p.month} style={[s.colBar, { flex: 1, height: `${Math.max(2, (Math.max(0, v) / peak) * 100)}%`, backgroundColor: p.month === 0 ? Corpus.textMuted : [60, 120, 240].includes(p.month) ? Corpus.text : Corpus.border }]} />;
                  })}
                </View>
                <View style={s.strip}>
                  {[0, 60, 120, 240].map((m, i) => {
                    const p = pts.find((x) => x.month === m)!;
                    return (
                      <View key={m} style={[s.stat, i > 0 && s.ruled]}>
                        <Text style={s.small}>{m === 0 ? 'Now' : `${m / 12} years`}</Text>
                        <Text style={s.statNum}>{compactINR(shown(p.netWorth, m))}</Text>
                      </View>
                    );
                  })}
                </View>
                <Text style={s.text}>
                  {crore ? `₹1 crore${today ? " (today's value)" : ''} around ${crore.getFullYear()}. ` : 'Not ₹1 crore within 25 years at this pace. '}
                  {fiTarget > 0 ? (fi ? `Enough to stop working (25× a year's spending, ${compactINR(fiTarget)}) around ${fi.getFullYear()}.` : `Enough to stop working (${compactINR(fiTarget)}) is more than 25 years away at this pace.`) : ''}
                </Text>
                <Text style={s.note}>
                  If today's habits continue: you keep {formatINR(Math.round(pin.monthlySave))} a month, {formatINR(pin.monthlyInvest)} of it in SIPs. Long-run averages: equity 12%, debt 7%, gold 8%, PF and PPF 8%. Markets don't move in straight lines, so read this as a direction, not a promise.
                </Text>
              </View>
            )}
            {(pin.monthlySave > 0 || w.totals.total > 0) && <WhatIfCard base={pin} idle={idle.show ? idle.idle : 0} />}

            {/* 7. How it works, in plain words */}
            <Pressable onPress={() => setHow(!how)} style={[s.card, s.row]} accessibilityRole="button" accessibilityState={{ expanded: how }}>
              <Text style={[s.title, { flex: 1 }]}>How the score works</Text>
              <Ionicons name={how ? 'chevron-up' : 'chevron-down'} size={18} color={Corpus.textMuted} />
            </Pressable>
            {how && (
              <Animated.View entering={FadeIn.duration(180)} style={[s.card, { gap: 10 }]}>
                <Text style={s.text}>Five questions, 20 points each. They follow the four areas the Financial Health Network measures (spend, save, borrow, plan and protect), with Indian rules of thumb.</Text>
                {sc.pillars.map((p) => (
                  <Text key={p.id} style={s.text}><Text style={s.strong}>{p.question} </Text>{p.full}.</Text>
                ))}
                <Text style={s.note}>
                  Uses your last 3 complete months, your balances, debts, investments and your insurance answers. SIPs and jar money count as kept, not spent. Shares don't count as cushion money because they can be down when you need them. Parts without data are left out and the rest scaled to 100. Next steps are the next milestone, not the whole distance. A guide, not financial advice.
                </Text>
              </Animated.View>
            )}
          </>
        )}
      </Screen>
      <ProtectionSheet open={asking} value={settings.protection} yearlyIncome={(avg?.income ?? 0) * 12} onClose={() => setAsking(false)} />
    </>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: Corpus.card, borderRadius: 24, padding: 18, gap: 8 },
  hero: { alignItems: 'center', gap: 12, overflow: 'hidden', paddingTop: 22 },
  ring: { width: 168, height: 168, alignItems: 'center', justifyContent: 'center' },
  ringIn: { position: 'absolute', alignItems: 'center' },
  ringNum: { fontSize: Type.entry, fontFamily: Font.displayBold, color: Corpus.text, letterSpacing: -1.5, ...tabular },
  band: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999 },
  bandText: { fontSize: Type.label, fontFamily: Font.displayBold },
  delta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  scale: { flexDirection: 'row', gap: 4, alignSelf: 'stretch', marginTop: 4 },
  scaleBar: { height: 6, borderRadius: 3, backgroundColor: Corpus.cardAlt },
  scaleText: { fontSize: Type.micro, color: Corpus.textMuted },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: Type.title, fontFamily: Font.displayBold, color: Corpus.text, letterSpacing: -0.2 },
  bigText: { fontSize: Type.input, fontFamily: Font.display, color: Corpus.text, lineHeight: 22, ...tabular },
  text: { fontSize: Type.body, color: Corpus.text, lineHeight: 19, ...tabular },
  small: { fontSize: Type.small, color: Corpus.textMuted, lineHeight: 17, ...tabular },
  strong: { fontFamily: Font.display, color: Corpus.text },
  note: { fontSize: Type.small, color: Corpus.textMuted, lineHeight: 17 },
  plusPill: { backgroundColor: Corpus.incomeTint, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  plusText: { fontSize: Type.body, fontFamily: Font.displayBold, color: Corpus.income, ...tabular },
  ask: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  part: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 14, paddingHorizontal: 16 },
  partTop: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  partQ: { fontSize: Type.label, fontFamily: Font.display, color: Corpus.text },
  partPts: { fontSize: Type.label, fontFamily: Font.displayBold, color: Corpus.text, ...tabular },
  partBottom: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  partMore: { gap: 8, paddingLeft: 68, paddingRight: 16, paddingBottom: 16 },
  step: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: Corpus.bg, borderRadius: 14, padding: 12 },
  plus: { fontSize: Type.body, fontFamily: Font.displayBold, color: Corpus.income, ...tabular },
  bar: { flexDirection: 'row', height: 6, borderRadius: 3, overflow: 'hidden', backgroundColor: Corpus.cardAlt },
  chart: { flexDirection: 'row', alignItems: 'flex-end', height: 120, gap: 4, marginTop: 4 },
  col: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'flex-end', gap: 3 },
  colPct: { fontSize: Type.micro, color: Corpus.textMuted, ...tabular },
  colBar: { width: '100%', borderRadius: 4 },
  colLabel: { fontSize: Type.micro, color: Corpus.textMuted },
  strip: { flexDirection: 'row', paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Corpus.border },
  stat: { flex: 1, gap: 2 },
  ruled: { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: Corpus.border, paddingLeft: 12 },
  statNum: { fontSize: Type.title, fontFamily: Font.displayBold, color: Corpus.text, ...tabular },
});
