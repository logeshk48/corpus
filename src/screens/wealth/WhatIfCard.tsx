import { Choice } from '@/components/ui';
import { Corpus, Font, tabular, Type } from '@/constants/theme';
import { compactINR, formatINR } from '@/utils/format';
import { project, real, type ProjectionInput } from '@/utils/projection';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

const EXTRA = [0, 2000, 5000, 10000, 20000];
const STEP = [0, 5, 10, 15];

// "What if I save ₹5,000 more / invest all my savings / raise SIPs / put idle cash to work?"
export default function WhatIfCard({ base, idle }: { base: ProjectionInput; idle: number }) {
  const [extra, setExtra] = useState('0');
  const [where, setWhere] = useState<'sips' | 'all'>('sips');
  const [step, setStep] = useState('0');
  const [useIdle, setUseIdle] = useState<'no' | 'yes'>('no');
  const ex = Number(extra), st = Number(step), all = where === 'all', idl = useIdle === 'yes';
  const nowPts = useMemo(() => project(base, 20), [base]);
  const whatPts = useMemo(() => project({ ...base, extraSave: ex, investAll: all, stepUpPct: st, moveToInvest: idl ? idle : 0 }, 20), [base, ex, all, st, idl, idle]);
  const at = (pts: typeof nowPts, m: number) => real(pts.find((p) => p.month === m)!.netWorth, m);
  const crore = (pts: typeof nowPts) => {
    const hit = pts.find((p) => p.month > 0 && real(p.netWorth, p.month) >= 1e7);
    return hit ? new Date().getFullYear() + Math.ceil(hit.month / 12) : null;
  };
  const changed = ex || all || st || idl;
  const c1 = crore(nowPts), c2 = crore(whatPts);
  return (
    <View style={s.card}>
      <Text style={s.title}>What if</Text>
      <Choice label="I save more each month" options={EXTRA.map((e) => ({ value: String(e), label: e ? `+${compactINR(e)}` : 'Same' }))} value={extra} onChange={setExtra} />
      <Choice label="Savings go into" options={[{ value: 'sips', label: 'Only my SIPs' }, { value: 'all', label: 'Investing all of it' }]} value={where} onChange={setWhere} />
      <Choice label="Raise SIPs every year by" options={STEP.map((x) => ({ value: String(x), label: x ? `${x}%` : 'No' }))} value={step} onChange={setStep} />
      {idle > 0 && <Choice label={`Invest my idle ${compactINR(idle)} today`} options={[{ value: 'no', label: 'No' }, { value: 'yes', label: 'Yes' }]} value={useIdle} onChange={setUseIdle} />}
      <View style={s.strip}>
        {[60, 120, 240].map((m, i) => {
          const a = at(nowPts, m), b = at(whatPts, m);
          return (
            <View key={m} style={[s.stat, i > 0 && s.ruled]}>
              <Text style={s.label}>In {m / 12} years</Text>
              <Text style={s.value}>{compactINR(b)}</Text>
              <Text style={[s.label, changed ? { color: b - a >= 0 ? Corpus.income : Corpus.danger } : null]}>{changed ? `${b - a >= 0 ? '+' : '−'}${compactINR(Math.abs(b - a))}` : 'As now'}</Text>
            </View>
          );
        })}
      </View>
      <Text style={s.text}>
        {!changed ? 'Pick a change above to see what it does to your future net worth.'
          : `${c2 && c2 !== c1 ? `₹1 crore (today's value) around ${c2}${c1 ? `, ${c1 - c2} year${c1 - c2 === 1 ? '' : 's'} sooner` : ''}. ` : ''}${ex ? `${formatINR(ex)} a month is about ${formatINR(Math.round(ex / 30))} a day. ` : ''}${all ? 'Keep your safety cushion aside before investing everything.' : ''}`}
      </Text>
      <Text style={s.note}>In today's money, with 6% a year of rising prices taken out.</Text>
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: Corpus.card, borderRadius: 24, padding: 18, gap: 14 },
  title: { fontSize: Type.title, fontFamily: Font.displayBold, color: Corpus.text },
  strip: { flexDirection: 'row', paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Corpus.border },
  stat: { flex: 1, gap: 2 },
  ruled: { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: Corpus.border, paddingLeft: 12 },
  label: { fontSize: Type.small, color: Corpus.textMuted, ...tabular },
  value: { fontSize: Type.title, fontFamily: Font.displayBold, color: Corpus.text, ...tabular },
  text: { fontSize: Type.body, color: Corpus.text, lineHeight: 19 },
  note: { fontSize: Type.small, color: Corpus.textMuted, lineHeight: 17 },
});
