import { Button, SectionLabel } from '@/components/ui';
import { ChartColors } from '@/constants/chartColors';
import { Corpus, Type } from '@/constants/theme';
import { useToast } from '@/context/ToastContext';
import { useInvestments } from '@/hooks/useInvestments';
import { addInvestment, addMoney, deleteInvestment, updateInvestment, updateValue } from '@/services/investments';
import { investMeta, type Investment, type NewInvestment } from '@/types/investment';
import { compactINR, formatINR, formatINRLong } from '@/utils/format';
import { currentValue, daysOld, gain, isStale, portfolio, yearlyReturn } from '@/utils/investments';
import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import InvestmentSheet, { type InvSheetMode } from './InvestmentSheet';
import { styles } from './InvestScreen.styles';

const CLASS: Record<string, { label: string; color: string }> = {
  equity: { label: 'Equity (MF, stocks)', color: ChartColors.netWorth.investment },
  debt: { label: 'Fixed income (FD)', color: ChartColors.income },
  retirement: { label: 'Retirement (EPF, PPF, NPS)', color: ChartColors.netWorth.retirement },
  gold: { label: 'Gold', color: Corpus.gold },
  crypto: { label: 'Crypto', color: ChartColors.netWorth.vehicle },
  other: { label: 'Other', color: Corpus.textMuted },
};

export default function InvestScreen() {
  const { showToast } = useToast();
  const { investments, loading } = useInvestments();
  const [mode, setMode] = useState<InvSheetMode | null>(null);
  const pf = useMemo(() => portfolio(investments), [investments]);
  const stale = investments.filter((h) => isStale(h));

  const run = async (fn: () => Promise<unknown>, msg: string) => {
    try {
      await fn();
      showToast({ message: msg });
      setMode(null);
    } catch (e) {
      console.error(e);
      showToast({ message: 'Could not save. Try again.' });
    }
  };
  const save = (h: NewInvestment) =>
    run(() => (mode?.kind === 'edit' ? updateInvestment(mode.h.id, h) : addInvestment(h)), mode?.kind === 'edit' ? 'Updated' : `${h.name} added`);
  const remove = (h: Investment) => {
    const go = () => run(() => deleteInvestment(h.id), `${h.name} removed`);
    if (Platform.OS === 'web') window.confirm(`Remove ${h.name}?`) && go();
    else Alert.alert(`Remove ${h.name}?`, '', [{ text: 'Cancel', style: 'cancel' }, { text: 'Remove', style: 'destructive', onPress: go }]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headRow}>
          <Text style={styles.heading}>Invest</Text>
          {investments.length > 0 && <Button size="sm" icon="add" label="Add" onPress={() => setMode({ kind: 'new' })} />}
        </View>

        {loading ? (
          <ActivityIndicator color={Corpus.gold} style={{ paddingVertical: 60 }} />
        ) : investments.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={{ fontSize: Type.hero }}>🌱</Text>
            <Text style={styles.emptyTitle}>All your investments in one place</Text>
            <Text style={styles.emptyText}>
              Mutual funds, stocks, FDs, EPF, PPF, NPS, gold bonds. Add what you have and see what it's worth, what you've gained, and how it's split. Nothing is linked to your bank or demat.
            </Text>
            <Button label="Add your first investment" icon="add" onPress={() => setMode({ kind: 'new' })} style={{ alignSelf: 'stretch', marginTop: 12 }} />
          </View>
        ) : (
          <>
            <View style={styles.hero}>
              <Text style={styles.heroLabel}>YOUR INVESTMENTS ARE WORTH</Text>
              <Text style={styles.heroValue}>{formatINRLong(pf.value)}</Text>
              <Text style={styles.heroSub}>{formatINR(pf.invested)} invested</Text>
              <Text style={[styles.heroSub, { color: pf.gain >= 0 ? Corpus.income : Corpus.danger, fontWeight: '600' }]}>
                {pf.gain >= 0 ? '▲' : '▼'} {formatINR(Math.abs(pf.gain))} ({pf.gain >= 0 ? '+' : '−'}{Math.abs(pf.pct).toFixed(1)}%) overall
              </Text>
            </View>

            {pf.allocation.length > 1 && (
              <View style={styles.card}>
                <Text style={styles.name}>How it's split</Text>
                <View style={styles.stack}>
                  {pf.allocation.map((a) => (
                    <View key={a.cls} style={{ flex: Math.max(a.share, 0.02), backgroundColor: CLASS[a.cls].color }} />
                  ))}
                </View>
                <View style={styles.legend}>
                  {pf.allocation.map((a) => (
                    <Text key={a.cls} style={styles.meta}>
                      <Text style={{ color: CLASS[a.cls].color }}>● </Text>
                      {CLASS[a.cls].label} {Math.round(a.share * 100)}%
                    </Text>
                  ))}
                </View>
              </View>
            )}

            {stale.length > 0 && (
              <Text style={[styles.note, { color: Corpus.warning }]}>
                ⏳ {stale.map((s) => s.name).join(', ')} {stale.length > 1 ? 'have' : 'has'}n’t been updated in over 45 days. Tap “Update value”.
              </Text>
            )}

            <SectionLabel right="Tap to edit">HOLDINGS</SectionLabel>
            {[...investments]
              .sort((a, b) => currentValue(b).value - currentValue(a).value)
              .map((h) => {
                const meta = investMeta(h.type);
                const g = gain(h);
                const cagr = yearlyReturn(h);
                const auto = currentValue(h).auto;
                const old = isStale(h);
                return (
                  <Pressable key={h.id} style={styles.card} onPress={() => setMode({ kind: 'edit', h })}>
                    <View style={styles.top}>
                      <View style={styles.icon}>
                        <Ionicons name={meta.icon as keyof typeof Ionicons.glyphMap} size={18} color={Corpus.gold} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.name}>{h.name}</Text>
                        <Text style={[styles.meta, old && { color: Corpus.warning }]}>
                          {meta.label} · {auto ? `grows at ${h.rate}%` : daysOld(h) <= 0 ? 'updated today' : `updated ${daysOld(h)}d ago`}
                        </Text>
                      </View>
                      <View>
                        <Text style={styles.value}>{compactINR(g.value)}</Text>
                        <Text style={[styles.meta, { textAlign: 'right', color: g.gain >= 0 ? Corpus.income : Corpus.danger }]}>
                          {g.gain >= 0 ? '+' : '−'}{compactINR(Math.abs(g.gain)).replace('−', '')} ({Math.abs(g.pct).toFixed(1)}%)
                        </Text>
                      </View>
                    </View>
                    {cagr !== null && <Text style={styles.note}>About {cagr.toFixed(1)}% a year since {new Date(h.startDate).getFullYear()} (rough, ignores SIP timing)</Text>}
                    <View style={styles.actions}>
                      {h.type !== 'fd' && <Button size="sm" variant="secondary" icon="add" label="Add money" onPress={() => setMode({ kind: 'add', h })} />}
                      {!auto && <Button size="sm" variant={old ? 'primary' : 'secondary'} icon="refresh" label="Update value" onPress={() => setMode({ kind: 'value', h })} />}
                      {(h.type === 'epf' || h.type === 'ppf') && <Button size="sm" variant="secondary" icon="refresh" label="New passbook balance" onPress={() => setMode({ kind: 'value', h })} />}
                    </View>
                  </Pressable>
                );
              })}

            <Text style={styles.note}>
              ℹ️ Values are what you enter, except FD, EPF and PPF, which grow on their own at their interest rate. "Add money" is new savings; "Update value" is a gain or loss. All of this counts in your net worth.
            </Text>
          </>
        )}
      </ScrollView>
      {mode && (
        <InvestmentSheet
          mode={mode}
          onClose={() => setMode(null)}
          onSave={save}
          onAddMoney={(h, n) => run(() => addMoney(h, n, currentValue(h).value), `${formatINR(n)} added to ${h.name}`)}
          onUpdateValue={(h, v) => run(() => updateValue(h, v), `${h.name} updated`)}
          onDelete={mode.kind === 'edit' ? () => remove(mode.h) : undefined}
        />
      )}
    </SafeAreaView>
  );
}
