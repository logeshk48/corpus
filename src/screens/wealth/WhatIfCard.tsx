import { Corpus } from '@/constants/theme';
import { styles as sheet } from '@/screens/budgets/components/BudgetEditorSheet.styles';
import { compactINR, formatINR } from '@/utils/format';
import { project, real, type ProjectionInput } from '@/utils/projection';
import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { styles } from './WealthScreen.styles';

const EXTRA = [0, 2000, 5000, 10000, 20000];
const STEP = [0, 5, 10, 15];

// "What if I save ₹5,000 more / invest all my savings / step up SIPs / put idle cash to work?"
export default function WhatIfCard({ base, idle }: { base: ProjectionInput; idle: number }) {
  const [extra, setExtra] = useState(5000);
  const [all, setAll] = useState(false);
  const [step, setStep] = useState(0);
  const [useIdle, setUseIdle] = useState(false);
  const nowPts = useMemo(() => project(base, 20), [base]);
  const whatPts = useMemo(() => project({ ...base, extraSave: extra, investAll: all, stepUpPct: step, moveToInvest: useIdle ? idle : 0 }, 20), [base, extra, all, step, useIdle, idle]);
  const at = (pts: typeof nowPts, m: number) => real(pts.find((p) => p.month === m)!.netWorth, m);
  const crore = (pts: typeof nowPts) => {
    const hit = pts.find((p) => p.month > 0 && real(p.netWorth, p.month) >= 1e7);
    return hit ? new Date().getFullYear() + Math.ceil(hit.month / 12) : null;
  };
  const changed = extra || all || step || useIdle;
  const c1 = crore(nowPts), c2 = crore(whatPts);
  const Chip = ({ on, label, onPress }: { on: boolean; label: string; onPress: () => void }) => (
    <Pressable style={[sheet.chip, on && sheet.chipSuggested]} onPress={onPress}>
      <Text style={[sheet.chipText, on && sheet.chipTextSuggested]}>{label}</Text>
    </Pressable>
  );
  return (
    <View style={styles.card}>
      <Text style={styles.name}>What if…</Text>
      <Text style={styles.statLabel}>I SAVE MORE EACH MONTH</Text>
      <View style={sheet.chips}>
        {EXTRA.map((e) => (
          <Chip key={e} on={extra === e} label={e ? `+${compactINR(e)}` : 'No change'} onPress={() => setExtra(e)} />
        ))}
      </View>
      <Text style={styles.statLabel}>WHERE SAVINGS GO</Text>
      <View style={sheet.chips}>
        <Chip on={!all} label="Only SIPs invested" onPress={() => setAll(false)} />
        <Chip on={all} label="Invest all savings" onPress={() => setAll(true)} />
      </View>
      <Text style={styles.statLabel}>RAISE SIPS EVERY YEAR</Text>
      <View style={sheet.chips}>
        {STEP.map((x) => (
          <Chip key={x} on={step === x} label={x ? `+${x}%` : 'No'} onPress={() => setStep(x)} />
        ))}
      </View>
      {idle > 0 && (
        <View style={sheet.chips}>
          <Chip on={useIdle} label={`Invest my idle ${compactINR(idle)} today`} onPress={() => setUseIdle(!useIdle)} />
        </View>
      )}
      <View style={[styles.statRow, { marginTop: 4 }]}>
        {[60, 120, 240].map((m) => {
          const a = at(nowPts, m), b = at(whatPts, m);
          return (
            <View key={m} style={styles.stat}>
              <Text style={styles.statLabel}>{m / 12} YEARS</Text>
              <Text style={styles.statValue}>{compactINR(b)}</Text>
              <Text style={[styles.why, { color: b - a >= 0 ? Corpus.income : Corpus.danger }]}>{changed ? `${b - a >= 0 ? '+' : '−'}${compactINR(Math.abs(b - a))}` : 'today’s habits'}</Text>
            </View>
          );
        })}
      </View>
      {changed ? (
        <Text style={styles.why}>
          {c2 && c2 !== c1 ? `₹1 Cr (today’s value) around ${c2}${c1 ? ` instead of ${c1}` : ''} — ${c1 ? `${c1 - c2} year${c1 - c2 === 1 ? '' : 's'} sooner` : 'within reach now'}. ` : ''}
          {extra ? `${formatINR(extra)} a month is about ${formatINR(Math.round(extra / 30))} a day. ` : ''}
          {all ? 'Investing all savings means your bank balance stops growing — keep the emergency fund aside first. ' : ''}
        </Text>
      ) : (
        <Text style={styles.why}>Pick a change above to see what it does to your future net worth.</Text>
      )}
      <Text style={styles.note}>All in today’s money (6% inflation removed). Same assumptions as “Where you’re heading”.</Text>
    </View>
  );
}
