import { ScreenHeader, SectionLabel } from '@/components/ui';
import { Corpus } from '@/constants/theme';
import { useBills } from '@/hooks/useBills';
import { useInvestments } from '@/hooks/useInvestments';
import { useRealized } from '@/hooks/useRealized';
import { getTransactions } from '@/services/transactions';
import type { Transaction } from '@/types/transaction';
import { LTCG_EXEMPTION } from '@/utils/capitalGains';
import { formatINR } from '@/utils/format';
import { HOME_INTEREST_LIMIT, NPS_EXTRA_LIMIT, SEC123_LIMIT, taxYearReport } from '@/utils/taxYear';
import { currentYear, yearLabel, yearRange } from '@/utils/yearReport';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { styles } from '../reports/ReportsScreen.styles';

const sign = (n: number) => `${n < 0 ? '−' : ''}${formatINR(Math.abs(Math.round(n)))}`;
function Line({ label, value, strong, color, note }: { label: string; value: string; strong?: boolean; color?: string; note?: string }) {
  return (
    <View style={{ gap: 1 }}>
      <View style={styles.row}>
        <Text style={[styles.meta, { flex: 1, color: strong ? Corpus.text : Corpus.textMuted, fontWeight: strong ? '600' : '400' }]}>{label}</Text>
        <Text style={[styles.col, { fontWeight: strong ? '700' : '500', color: color ?? Corpus.text }]}>{value}</Text>
      </View>
      {note ? <Text style={styles.note}>{note}</Text> : null}
    </View>
  );
}

export default function TaxScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ year?: string }>();
  const [year, setYear] = useState(params.year ? Number(params.year) : currentYear('fy'));
  const { start, end } = yearRange('fy', year);
  const realized = useRealized();
  const { investments } = useInvestments();
  const { bills } = useBills();
  const [tx, setTx] = useState<Transaction[] | null>(null);
  useEffect(() => {
    let alive = true;
    setTx(null);
    getTransactions(start, end).then((l) => alive && setTx(l)).catch(() => alive && setTx([]));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year]);
  const r = useMemo(() => (tx ? taxYearReport({ start, end, realized, investments, bills, tx }) : null), [tx, realized, investments, bills, start, end]);
  const isNow = year === currentYear('fy');
  const dueBy = `31 Jul ${year + 1}`;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenHeader title="Tax summary" onBack={() => (router.canGoBack() ? router.back() : router.replace('/reports' as Href))} />
        <View style={styles.stepper}>
          <Pressable style={styles.arrow} onPress={() => setYear(year - 1)} accessibilityLabel="Previous tax year">
            <Ionicons name="chevron-back" size={18} color={Corpus.text} />
          </Pressable>
          <Text style={styles.stepperText}>Tax year {yearLabel('fy', year).replace('FY ', '')}{isNow ? ' · so far' : ''}</Text>
          <Pressable style={styles.arrow} onPress={() => !isNow && setYear(year + 1)} disabled={isNow}>
            <Ionicons name="chevron-forward" size={18} color={isNow ? Corpus.textFaint : Corpus.text} />
          </Pressable>
        </View>
        <Text style={styles.meta}>
          1 Apr {year} – 31 Mar {year + 1}. ITR usually due by <Text style={{ color: Corpus.text, fontWeight: '600' }}>{dueBy}</Text> (if no audit). Everything below comes from what you’ve logged — check it against your AIS / Form 26AS on the income-tax portal.
        </Text>

        {!r ? (
          <ActivityIndicator color={Corpus.gold} style={{ paddingVertical: 40 }} />
        ) : (
          <>
            {/* Capital gains */}
            <SectionLabel right="Schedule CG">CAPITAL GAINS BOOKED</SectionLabel>
            <View style={styles.card}>
              {r.sales.length === 0 ? (
                <Text style={styles.meta}>No sales recorded this tax year. (Sales you record with “Sold” in Invest show here.)</Text>
              ) : (
                <>
                  <Line label="Short-term on shares & equity funds (20%)" value={sign(r.eqShort)} />
                  <Line label="Long-term on shares & equity funds" value={sign(r.eqLong)} />
                  <Line
                    label={`  tax-free part (first ${formatINR(LTCG_EXEMPTION)})`}
                    value={formatINR(r.exemptionUsed)}
                    color={Corpus.income}
                    note={r.taxableLtcg > 0 ? `${formatINR(r.taxableLtcg)} is taxed at 12.5%.` : `${formatINR(LTCG_EXEMPTION - r.exemptionUsed)} of the tax-free limit is still unused — booking gains before 31 March uses it.`}
                  />
                  {r.otherLong !== 0 && <Line label="Long-term on gold / other funds (12.5%)" value={sign(r.otherLong)} />}
                  {r.slabGains !== 0 && <Line label="Debt funds & short-term gold (your slab rate)" value={sign(r.slabGains)} />}
                  {r.crypto !== 0 && <Line label="Crypto (flat 30%, separate schedule)" value={sign(r.crypto)} />}
                  <Text style={styles.note}>
                    {r.sales.length} sale{r.sales.length > 1 ? 's' : ''}. Your broker’s “capital gains statement” (Zerodha Console, Groww, CAMS for funds) has the exact figures — use those in the ITR. You need ITR-2 (or ITR-3 with business income) when you have capital gains.
                  </Text>
                </>
              )}
            </View>

            {/* Other income */}
            <SectionLabel right="Other sources">INCOME TO DECLARE</SectionLabel>
            <View style={styles.card}>
              <Line label="Dividends received" value={formatINR(r.dividendTotal)} strong note={r.dividends.length ? `${r.dividends.length} payout${r.dividends.length > 1 ? 's' : ''} — taxed at your slab. Companies deduct 10% TDS above ₹10,000 a year each.` : 'None found (found automatically for NSE/BSE stocks you track).'} />
              <Line label="FD interest earned" value={formatINR(r.fdTotal)} strong note={r.fdInterest.length ? `Taxed at your slab every year, even if paid only at maturity. ${r.fdInterest.map((f) => `${f.label} ${formatINR(f.amount)}`).join(' · ')}` : 'No FDs with a rate in Invest.'} />
              <Text style={styles.note}>Savings-account interest isn’t tracked here — take it from your bank’s interest certificate or AIS.</Text>
            </View>

            {/* Deductions */}
            <SectionLabel right="old regime only">DEDUCTIONS FOUND</SectionLabel>
            <View style={styles.card}>
              <Text style={styles.meta}>
                The <Text style={{ color: Corpus.text, fontWeight: '600' }}>new regime is the default</Text> and ignores these. Under it there’s no tax up to ₹12 lakh of income (₹12.75 lakh if salaried). They matter only if you pick the old regime — compare both on the income-tax portal’s calculator.
              </Text>
              <Line label="Section 123 (was 80C)" value={`${formatINR(r.s123Total)} / ${formatINR(SEC123_LIMIT)}`} strong color={r.s123Total >= SEC123_LIMIT ? Corpus.income : Corpus.text} />
              {r.s123.map((i) => (
                <Line key={i.label} label={`  ${i.label}`} value={formatINR(i.amount)} note={i.note} />
              ))}
              {r.s123.length === 0 && <Text style={styles.note}>Nothing found. Payments are found by their note (“LIC”, “PPF”, “tuition”), ELSS fund purchases, and home-loan principal.</Text>}
              {r.s123Total > 0 && r.s123Total < SEC123_LIMIT && <Text style={styles.note}>{formatINR(r.s123Room)} of room left. EPF from your salary also counts — it’s on your Form 16.</Text>}
              <Line label="Health insurance (was 80D)" value={formatINR(r.healthPremiums)} note={r.healthPremiums ? 'Up to ₹25,000 for you & family (₹50,000 if 60+); more for parents.' : 'Found by note: “health insurance”, “mediclaim”…'} />
              <Line label="NPS extra (was 80CCD(1B))" value={`${formatINR(r.npsExtra)} / ${formatINR(NPS_EXTRA_LIMIT)}`} note={r.npsPut ? `${formatINR(r.npsPut)} put into NPS this year.` : 'NPS contributions you track in Invest.'} />
              <Line label="Home loan interest (was 24(b))" value={`${formatINR(r.homeInterestAllowed)}${r.homeInterest > HOME_INTEREST_LIMIT ? ` of ${formatINR(r.homeInterest)}` : ''}`} note={r.homeInterest ? `Up to ${formatINR(HOME_INTEREST_LIMIT)} for a self-occupied home. From your home-loan schedule.` : 'Add a home loan (type: Home) with loan details in Bills to see this.'} />
            </View>

            <SectionLabel>BEFORE YOU FILE</SectionLabel>
            <View style={styles.card}>
              {[
                'Form 16 from your employer (salary, TDS, EPF)',
                'AIS & Form 26AS from the income-tax portal — every TDS and income reported about you',
                'Capital gains statement from your broker / CAMS / KFintech',
                'Interest certificates from your bank (savings & FD)',
                'Rent receipts / home-loan certificate, if claiming',
              ].map((t) => (
                <Text key={t} style={styles.meta}>• {t}</Text>
              ))}
              <Text style={styles.note}>A guide to gather your numbers — not tax advice. For complex cases (business income, foreign assets, big gains) use a CA.</Text>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
