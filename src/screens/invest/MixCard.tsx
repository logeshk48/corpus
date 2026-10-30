import { Corpus } from '@/constants/theme';
import { styles as sheet } from '@/screens/budgets/components/BudgetEditorSheet.styles';
import { formatINR } from '@/utils/format';
import { Pressable, Text, View } from 'react-native';
import { styles } from './InvestScreen.styles';
import { m } from './Market.styles';

type Alloc = { cls: string; value: number; share: number };
type Snap = { month: string; total: number; byCls: Record<string, number> };
const TARGETS = [40, 50, 60, 70, 80];

// Equity vs the rest, against the split you chose — and how it moved month by month
export default function MixCard({ allocation, total, target, age, history, colors, onTarget }: {
  allocation: Alloc[]; total: number; target?: number; age?: number; history: Snap[];
  colors: Record<string, { label: string; color: string }>; onTarget: (pct: number) => void;
}) {
  const eq = allocation.find((a) => a.cls === 'equity')?.share ?? 0;
  const eqPct = Math.round(eq * 100);
  const drift = target != null ? eqPct - target : 0;
  const ageRule = age ? Math.max(20, Math.min(80, 100 - age)) : null;
  const move = target != null ? Math.round((Math.abs(drift) / 100) * total) : 0;
  return (
    <View style={styles.card}>
      <View style={m.statusRow}>
        <Text style={styles.name}>Your mix</Text>
        <Text style={m.small}>Equity {eqPct}%{target != null ? ` · target ${target}%` : ''}</Text>
      </View>
      <View style={styles.stack}>
        {allocation.map((a) => (
          <View key={a.cls} style={{ flex: Math.max(a.share, 0.02), backgroundColor: colors[a.cls]?.color ?? Corpus.textMuted }} />
        ))}
      </View>
      {target != null && (
        <View style={[m.bar, { marginTop: 0 }]}>
          <View style={[m.barKnob, { left: `${target}%`, backgroundColor: Corpus.text }]} />
        </View>
      )}
      <View style={styles.legend}>
        {allocation.map((a) => (
          <Text key={a.cls} style={styles.meta}>
            <Text style={{ color: colors[a.cls]?.color }}>● </Text>
            {colors[a.cls]?.label ?? a.cls} {Math.round(a.share * 100)}%
          </Text>
        ))}
      </View>
      {target != null && Math.abs(drift) > 5 && (
        <Text style={[m.small, { color: Corpus.warning }]}>
          {drift > 0
            ? `Equity is ${drift} points above your target. To rebalance, move about ${formatINR(move)} to debt/FD, or point new SIPs at debt for a while.`
            : `Equity is ${-drift} points below your target. Point new money at equity funds (about ${formatINR(move)}) to get back.`}
        </Text>
      )}
      {target != null && Math.abs(drift) <= 5 && <Text style={[m.small, { color: Corpus.income }]}>On target (within 5 points). Nothing to do.</Text>}
      <Text style={m.tiny}>EQUITY TARGET{ageRule ? ` · rule of thumb for your age: ~${ageRule}%` : ''}</Text>
      <View style={sheet.chips}>
        {TARGETS.map((t) => (
          <Pressable key={t} style={[sheet.chip, target === t && sheet.chipSuggested]} onPress={() => onTarget(t)}>
            <Text style={[sheet.chipText, target === t && sheet.chipTextSuggested]}>{t}%</Text>
          </Pressable>
        ))}
      </View>
      {history.length > 1 && (
        <View style={{ gap: 4, marginTop: 4 }}>
          <Text style={m.tiny}>MONTH BY MONTH</Text>
          {history.slice(-6).map((h) => (
            <View key={h.month} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={[m.tiny, { width: 54 }]}>{new Date(`${h.month}-01T00:00:00`).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })}</Text>
              <View style={[styles.stack, { flex: 1, height: 8 }]}>
                {Object.entries(h.byCls)
                  .filter(([, v]) => v > 0)
                  .map(([c, v]) => (
                    <View key={c} style={{ flex: v / (h.total || 1), backgroundColor: colors[c]?.color ?? Corpus.textMuted }} />
                  ))}
              </View>
              <Text style={[m.tiny, { width: 60, textAlign: 'right' }]}>{Math.round(((h.byCls.equity ?? 0) / (h.total || 1)) * 100)}% eq</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
