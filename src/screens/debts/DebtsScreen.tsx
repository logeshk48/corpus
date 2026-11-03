import { ScreenHeader, SectionLabel } from '@/components/ui';
import { Corpus } from '@/constants/theme';
import { useWealth } from '@/hooks/useWealth';
import { allDebts, debtTotals, type DebtKind, type DebtLine } from '@/utils/allDebts';
import { formatINR, formatINRLong } from '@/utils/format';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { styles } from './DebtsScreen.styles';

const KIND: Record<DebtKind, { label: string; icon: keyof typeof Ionicons.glyphMap }> = {
  loan: { label: 'Loan', icon: 'business-outline' },
  emi: { label: 'EMI', icon: 'calendar-outline' },
  card: { label: 'Credit card', icon: 'card-outline' },
  person: { label: 'Borrowed', icon: 'person-outline' },
};
// how expensive is this rate?
const heat = (r: number | null) =>
  r == null ? { bg: Corpus.cardAlt, fg: Corpus.textMuted, word: 'rate ?' }
  : r >= 24 ? { bg: Corpus.dangerTint, fg: Corpus.danger, word: 'very costly' }
  : r >= 12 ? { bg: Corpus.warningTint, fg: Corpus.warning, word: 'costly' }
  : r > 0 ? { bg: Corpus.goldTint, fg: Corpus.gold, word: 'moderate' }
  : { bg: Corpus.incomeTint, fg: Corpus.income, word: 'interest-free' };

export default function DebtsScreen() {
  const router = useRouter();
  const w = useWealth();
  const list = useMemo(() => allDebts({ ious: w.ious, bills: w.bills, accounts: w.accounts }), [w.ious, w.bills, w.accounts]);
  const t = debtTotals(list);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenHeader title="All debts" onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
        {w.loading ? (
          <ActivityIndicator color={Corpus.gold} style={{ paddingVertical: 60 }} />
        ) : list.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="happy-outline" size={40} color={Corpus.income} />
            <Text style={styles.emptyTitle}>You’re debt-free</Text>
            <Text style={styles.meta}>No loans, EMIs, card balances or money owed to people.</Text>
          </View>
        ) : (
          <>
            <View style={styles.hero}>
              <Text style={styles.heroLabel}>YOU OWE IN TOTAL</Text>
              <Text style={styles.heroValue}>{formatINRLong(t.total)}</Text>
              <Text style={styles.heroSub}>{list.length} debt{list.length > 1 ? 's' : ''} · costliest first</Text>
            </View>
            <View style={styles.tiles}>
              <View style={styles.tile}>
                <Text style={styles.tileLabel}>Paying a month</Text>
                <Text style={styles.tileValue}>{formatINR(t.monthly)}</Text>
              </View>
              <View style={styles.tile}>
                <Text style={styles.tileLabel}>Interest a month (approx.)</Text>
                <Text style={[styles.tileValue, { color: Corpus.danger }]}>{formatINR(t.interest)}</Text>
              </View>
            </View>

            <SectionLabel right="Highest interest first">YOUR DEBTS</SectionLabel>
            {list.map((d: DebtLine) => {
              const h = heat(d.rate);
              return (
                <Pressable key={d.id} style={styles.card} onPress={() => router.push(d.link as Href)}>
                  <View style={styles.row}>
                    <View style={styles.icon}>
                      <Ionicons name={KIND[d.kind].icon} size={18} color={h.fg} />
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={styles.name} numberOfLines={1}>{d.name}</Text>
                      <Text style={styles.meta}>
                        {KIND[d.kind].label}
                        {d.monthlyPay ? ` · ${formatINR(d.monthlyPay)}/month${d.kind === 'card' ? ' min. due' : d.kind === 'person' ? ' interest' : ''}` : ''}
                        {d.monthsLeft ? ` · ${d.monthsLeft} left` : ''}
                      </Text>
                    </View>
                    <Text style={styles.value}>{formatINR(d.balance)}</Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: h.bg }]}>
                    <Text style={[styles.badgeText, { color: h.fg }]}>
                      {d.rate != null ? `${d.rate}% · ` : ''}{h.word}
                    </Text>
                  </View>
                  <Text style={styles.meta}>
                    {d.rateNote}
                    {d.interestPerMonth ? ` · costs about ${formatINR(d.interestPerMonth)} a month in interest` : ''}
                  </Text>
                </Pressable>
              );
            })}
            {t.unknownRates > 0 && (
              <Text style={styles.note}>
                {t.unknownRates} EMI{t.unknownRates > 1 ? 's have' : ' has'} no interest rate yet. Open it and add the loan details (amount, rate, tenure) — your loan statement or bank app has them — to see the real cost and a payoff plan.
              </Text>
            )}
            <Text style={styles.note}>Card rate assumed at ~42% a year (3.5% a month), what most Indian cards charge when the bill isn’t paid in full. Interest a month is approximate: balance × rate ÷ 12.</Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
