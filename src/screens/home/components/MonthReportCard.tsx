import { Corpus, Radius, Space, Type } from '@/constants/theme';
import { formatINR } from '@/utils/format';
import type { MonthReport } from '@/utils/monthReport';
import type { PlanItem } from '@/utils/monthPlan';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

// First week of the month: how last month went
type Verdict = { tone: 'good' | 'ok' | 'bad' | 'neutral'; text: string };
const VCOLOR = { good: Corpus.income, ok: Corpus.warning, bad: Corpus.danger, neutral: Corpus.textMuted };

export default function MonthReportCard({ r, verdict, plan, onAct, onOpen, onYear, onClose }: {
  r: MonthReport; verdict: Verdict; plan: PlanItem[]; onAct: (p: PlanItem) => Promise<void>;
  onOpen: () => void; onYear: () => void; onClose: () => void;
}) {
  const [done, setDone] = useState<string[]>([]);
  const pct = (x: number) => `${x > 0 ? '+' : '−'}${Math.round(Math.abs(x) * 100)}%`;
  const lines: { text: string; color?: string }[] = [];
  if (r.spentChange != null && Math.abs(r.spentChange) >= 0.05) lines.push({ text: `Spent ${pct(r.spentChange)} vs ${formatINR(Math.round(r.prevSpent))} the month before`, color: r.spentChange > 0 ? Corpus.warning : Corpus.income });
  if (r.overBudget != null) lines.push(r.overBudget > 0 ? { text: `${formatINR(Math.round(r.overBudget))} over your ${formatINR(r.budget!)} budget`, color: Corpus.danger } : { text: `Within your ${formatINR(r.budget!)} budget ✓`, color: Corpus.income });
  if (r.top) lines.push({ text: `Most on ${r.top.label}: ${formatINR(Math.round(r.top.amount))}` });
  if (r.jump && r.jump.label !== r.top?.label) lines.push({ text: `${r.jump.label} went up ${formatINR(Math.round(r.jump.by))}`, color: Corpus.warning });
  if (r.invested) lines.push({ text: `Invested ${formatINR(Math.round(r.invested))} through SIPs`, color: Corpus.income });
  if (r.netWorthChange != null) lines.push({ text: `Net worth ${r.netWorthChange >= 0 ? '+' : '−'}${formatINR(Math.abs(Math.round(r.netWorthChange)))}`, color: r.netWorthChange >= 0 ? Corpus.income : Corpus.danger });
  if (r.scoreChange) lines.push({ text: `Wealth score ${r.score} (${r.scoreChange > 0 ? '▲' : '▼'} ${Math.abs(r.scoreChange)})`, color: r.scoreChange > 0 ? Corpus.income : Corpus.warning });
  if (r.loggedDays < r.daysIn * 0.6) lines.push({ text: `Logged on ${r.loggedDays} of ${r.daysIn} days — the real spend is probably higher`, color: Corpus.textFaint });
  return (
    <View style={st.card}>
      <View style={st.head}>
        <Ionicons name="calendar-number-outline" size={16} color={Corpus.gold} />
        <Text style={st.title}>Your {r.name}</Text>
        <Pressable onPress={onClose} hitSlop={10}>
          <Ionicons name="close" size={16} color={Corpus.textFaint} />
        </Pressable>
      </View>
      <Text style={[st.verdict, { color: VCOLOR[verdict.tone] }]}>{verdict.text}</Text>
      <View style={st.nums}>
        <View style={st.num}>
          <Text style={st.label}>SAVED</Text>
          <Text style={[st.value, { color: r.saved >= 0 ? Corpus.income : Corpus.danger }]}>{r.income ? formatINR(Math.round(r.saved)) : '—'}</Text>
        </View>
        <View style={st.num}>
          <Text style={st.label}>SPENT</Text>
          <Text style={st.value}>{formatINR(Math.round(r.spent))}</Text>
        </View>
        <View style={st.num}>
          <Text style={st.label}>RATE</Text>
          <Text style={st.value}>{r.rate == null ? '—' : `${Math.round(r.rate * 100)}%`}</Text>
        </View>
      </View>
      {lines.slice(0, 5).map((l) => (
        <Text key={l.text} style={[st.line, l.color ? { color: l.color } : null]}>• {l.text}</Text>
      ))}
      {plan.length > 0 && (
        <View style={st.plan}>
          <Text style={st.label}>{`DO THIS IN ${new Date().toLocaleDateString('en-IN', { month: 'long' }).toUpperCase()}`}</Text>
          {plan.map((p, i) => {
            const ok = done.includes(p.id);
            return (
              <View key={p.id} style={st.item}>
                <Text style={st.n}>{i + 1}</Text>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={st.itemTitle}>{p.title}</Text>
                  <Text style={st.line}>{p.body}</Text>
                  <Pressable
                    style={[st.cta, ok && st.ctaDone]} disabled={ok} accessibilityRole="button"
                    onPress={() => onAct(p).then(() => { if (p.act.kind !== 'route') setDone((d) => [...d, p.id]); }).catch(() => {})}
                  >
                    <Text style={[st.ctaText, ok && { color: Corpus.income }]}>{ok ? 'Done ✓' : p.cta}</Text>
                  </Pressable>
                </View>
              </View>
            );
          })}
        </View>
      )}
      <View style={{ flexDirection: 'row', gap: 16 }}>
        <Text style={st.link} onPress={onOpen}>See {r.name} →</Text>
        <Text style={st.link} onPress={onYear}>Year report →</Text>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  card: { backgroundColor: Corpus.card, borderRadius: 22, padding: Space.md, gap: 8 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { flex: 1, fontSize: Type.label, fontWeight: '600', color: Corpus.text },
  nums: { flexDirection: 'row', gap: 8 },
  num: { flex: 1, gap: 2 },
  label: { fontSize: Type.caption, color: Corpus.textFaint, letterSpacing: 0.4 },
  value: { fontSize: Type.title, fontWeight: '700', color: Corpus.text },
  line: { fontSize: Type.small, color: Corpus.textMuted, lineHeight: 17 },
  verdict: { fontSize: Type.body, fontWeight: '600' },
  plan: { gap: 10, marginTop: 4, paddingTop: 10, borderTopWidth: 0.5, borderTopColor: Corpus.border },
  item: { flexDirection: 'row', gap: 10 },
  n: { width: 20, height: 20, borderRadius: 10, backgroundColor: Corpus.goldActive, color: Corpus.gold, fontSize: Type.caption, fontWeight: '700', textAlign: 'center', lineHeight: 20 },
  itemTitle: { fontSize: Type.body, fontWeight: '600', color: Corpus.text },
  cta: { alignSelf: 'flex-start', marginTop: 4, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 22, backgroundColor: Corpus.goldTint },
  ctaDone: { borderColor: Corpus.incomeLine, backgroundColor: Corpus.incomeTint },
  ctaText: { fontSize: Type.small, fontWeight: '600', color: Corpus.gold },
  link: { fontSize: Type.small, color: Corpus.gold, fontWeight: '600' },
});
