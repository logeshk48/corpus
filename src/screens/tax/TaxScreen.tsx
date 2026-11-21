import { Button, Screen, Stepper } from '@/components/ui';
import { Chip, Corpus, Font, tabular, Type } from '@/constants/theme';
import { useToast } from '@/context/ToastContext';
import { useBills } from '@/hooks/useBills';
import { useInvestments } from '@/hooks/useInvestments';
import { useRealized } from '@/hooks/useRealized';
import { getTransactions } from '@/services/transactions';
import type { Transaction } from '@/types/transaction';
import { LTCG_EXEMPTION } from '@/utils/capitalGains';
import { saveCsv } from '@/utils/csv';
import { capitalGainsCsv } from '@/utils/exports';
import { formatINR } from '@/utils/format';
import { HOME_INTEREST_LIMIT, NPS_EXTRA_LIMIT, SEC123_LIMIT, taxYearReport } from '@/utils/taxYear';
import { currentYear, yearLabel, yearRange } from '@/utils/yearReport';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

const sign = (n: number) => `${n < 0 ? '−' : ''}${formatINR(Math.abs(Math.round(n)))}`;

// One figure for the ITR: label on the left, amount on the right, an optional plain note under it
function Line({ label, value, strong, color, note, indent }: { label: string; value: string; strong?: boolean; color?: string; note?: string; indent?: boolean }) {
  return (
    <View style={[s.line, indent && { paddingLeft: 14 }]}>
      <View style={s.lineRow}>
        <Text style={[s.lineLabel, strong && s.strong]}>{label}</Text>
        <Text style={[s.lineValue, strong && s.strongValue, color ? { color } : null]}>{value}</Text>
      </View>
      {note ? <Text style={s.note}>{note}</Text> : null}
    </View>
  );
}
function Card({ title, tag, children }: { title: string; tag?: string; children: React.ReactNode }) {
  return (
    <View style={s.card}>
      <View style={s.cardHead}>
        <Text style={s.cardTitle} accessibilityRole="header">{title}</Text>
        {tag ? <Text style={s.tag}>{tag}</Text> : null}
      </View>
      {children}
    </View>
  );
}

// What to put in your ITR, gathered from what you logged: gains you booked, income to declare,
// deductions found, and the papers to collect. A guide, never tax advice.
export default function TaxScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ year?: string }>();
  const [year, setYear] = useState(params.year ? Number(params.year) : currentYear('fy'));
  const { start, end } = yearRange('fy', year);
  const realized = useRealized();
  const { investments } = useInvestments();
  const { bills } = useBills();
  const { showToast } = useToast();
  const [tx, setTx] = useState<Transaction[] | null>(null);
  useEffect(() => {
    let alive = true;
    setTx(null);
    getTransactions(start, end).then((l) => alive && setTx(l)).catch(() => alive && setTx([]));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year]);
  const r = useMemo(() => (tx ? taxYearReport({ start, end, realized, investments, bills, tx }) : null), [tx, realized, investments, bills, start, end]);
  const isNow = year === currentYear('fy');
  const due = new Date(year + 1, 6, 31);
  const days = Math.ceil((due.getTime() - Date.now()) / 86_400_000);

  const download = () =>
    r && saveCsv(`corpus-capital-gains-${year}-${String((year + 1) % 100).padStart(2, '0')}.csv`, capitalGainsCsv(r.sales))
      .then((h) => showToast({ message: h === 'downloaded' ? 'Capital gains file downloaded' : 'Choose where to send it' }))
      .catch(() => showToast({ message: 'Couldn’t export. Try again.' }));

  return (
    <Screen title="Tax summary" tone={Chip.green} onBack={() => (router.canGoBack() ? router.back() : router.replace('/reports' as Href))}>
      <Stepper label="Tax year" value={yearLabel('fy', year).replace('FY ', '')} sub={isNow ? `1 Apr ${year} to today` : `1 Apr ${year} to 31 Mar ${year + 1}`} onPrev={() => setYear(year - 1)} onNext={() => setYear(year + 1)} nextDisabled={isNow} />

      <View style={s.hero}>
        <Text style={s.heroLabel}>ITR usually due by</Text>
        <Text style={s.heroBig}>{due.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
        <Text style={s.heroSub}>{days > 0 ? `In ${days} days, if your accounts need no audit` : 'This date has passed. A late return can still be filed by 31 December, with a fee'}</Text>
        <Text style={s.heroNote}>Everything here comes from what you logged. Check it against your AIS and Form 26AS on the income-tax portal.</Text>
      </View>

      {!r ? (
        <ActivityIndicator color={Corpus.gold} style={{ paddingVertical: 40 }} />
      ) : (
        <>
          <Card title="Capital gains you booked" tag="Schedule CG">
            {r.sales.length === 0 ? (
              <Text style={s.note}>No sales recorded this tax year. Sales you record with Sold in Invest show here.</Text>
            ) : (
              <>
                <Line label="Short-term, shares and equity funds (20%)" value={sign(r.eqShort)} />
                <Line label="Long-term, shares and equity funds" value={sign(r.eqLong)} />
                <Line indent label={`Tax-free part (first ${formatINR(LTCG_EXEMPTION)})`} value={formatINR(r.exemptionUsed)} color={Corpus.income}
                  note={r.taxableLtcg > 0 ? `${formatINR(r.taxableLtcg)} is taxed at 12.5%.` : `${formatINR(LTCG_EXEMPTION - r.exemptionUsed)} of the tax-free limit is unused. Booking gains before 31 March uses it.`} />
                {r.otherLong !== 0 && <Line label="Long-term, gold and other funds (12.5%)" value={sign(r.otherLong)} />}
                {r.slabGains !== 0 && <Line label="Debt funds and short-term gold (your slab rate)" value={sign(r.slabGains)} />}
                {r.crypto !== 0 && <Line label="Crypto (flat 30%, its own schedule)" value={sign(r.crypto)} />}
                <Button size="sm" variant="secondary" icon="download-outline" label="Download for your CA" onPress={download} />
                <Text style={s.note}>
                  {r.sales.length} sale{r.sales.length > 1 ? 's' : ''}. Use the exact figures from your broker's capital gains statement (Zerodha Console, Groww, or CAMS for funds). With capital gains you need ITR-2, or ITR-3 if you also have business income.
                </Text>
              </>
            )}
          </Card>

          <Card title="Income to declare" tag="Other sources">
            <Line label="Dividends received" value={formatINR(r.dividendTotal)} strong
              note={r.dividends.length ? `${r.dividends.length} payout${r.dividends.length > 1 ? 's' : ''}, taxed at your slab rate. Companies deduct 10% TDS above ₹10,000 a year each.` : 'None found. Dividends are found by themselves for NSE and BSE stocks you track.'} />
            <Line label="FD interest earned" value={formatINR(r.fdTotal)} strong
              note={r.fdInterest.length ? `Taxed at your slab rate every year, even when paid only at maturity. ${r.fdInterest.map((f) => `${f.label} ${formatINR(f.amount)}`).join(', ')}.` : 'No FDs with a rate in Invest.'} />
            <Text style={s.note}>Savings account interest is not tracked here. Take it from your bank's interest certificate or your AIS.</Text>
          </Card>

          <Card title="Deductions found" tag="Old regime only">
            <Text style={s.note}>
              The new regime is the default and ignores these. Under it there is no tax up to ₹12 lakh of income (₹12.75 lakh if salaried). They matter only if you choose the old regime, so compare both on the portal's calculator.
            </Text>
            <Line label="Section 123 (was 80C)" value={`${formatINR(r.s123Total)} of ${formatINR(SEC123_LIMIT)}`} strong color={r.s123Total >= SEC123_LIMIT ? Corpus.income : undefined} />
            {r.s123.map((i) => <Line key={i.label} indent label={i.label} value={formatINR(i.amount)} note={i.note} />)}
            {r.s123.length === 0 && <Text style={s.note}>Nothing found. Payments are found by their note (LIC, PPF, tuition), ELSS fund purchases and home loan principal.</Text>}
            {r.s123Total > 0 && r.s123Total < SEC123_LIMIT && <Text style={s.note}>{formatINR(r.s123Room)} of room left. EPF from your salary also counts; it is on your Form 16.</Text>}
            <Line label="Health insurance (was 80D)" value={formatINR(r.healthPremiums)} note={r.healthPremiums ? 'Up to ₹25,000 for you and family (₹50,000 if 60 or over), more for parents.' : 'Found by note, such as health insurance or mediclaim.'} />
            <Line label="NPS extra (was 80CCD(1B))" value={`${formatINR(r.npsExtra)} of ${formatINR(NPS_EXTRA_LIMIT)}`} note={r.npsPut ? `${formatINR(r.npsPut)} put into NPS this year.` : 'From NPS you track in Invest.'} />
            <Line label="Home loan interest (was 24(b))" value={`${formatINR(r.homeInterestAllowed)}${r.homeInterest > HOME_INTEREST_LIMIT ? ` of ${formatINR(r.homeInterest)}` : ''}`}
              note={r.homeInterest ? `Up to ${formatINR(HOME_INTEREST_LIMIT)} for a home you live in, from your home loan schedule.` : 'Add a home loan with its details in Bills to see this.'} />
          </Card>

          <Card title="Before you file">
            {[
              ['briefcase-outline', 'Form 16 from your employer: salary, TDS and EPF'],
              ['document-text-outline', 'AIS and Form 26AS from the income-tax portal: every TDS and income reported about you'],
              ['trending-up-outline', 'Capital gains statement from your broker, CAMS or KFintech'],
              ['business-outline', 'Interest certificates from your bank, for savings and FDs'],
              ['home-outline', 'Rent receipts or a home loan certificate, if you claim them'],
            ].map(([icon, text]) => (
              <View key={text} style={s.check}>
                <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={18} color={Corpus.textMuted} />
                <Text style={s.checkText}>{text}</Text>
              </View>
            ))}
            <Text style={s.note}>A guide to gather your numbers, not tax advice. For business income, foreign assets or large gains, use a CA.</Text>
          </Card>
        </>
      )}
    </Screen>
  );
}

const s = StyleSheet.create({
  hero: { backgroundColor: Corpus.card, borderRadius: 28, padding: 18, gap: 4 },
  heroLabel: { fontSize: Type.body, color: Corpus.textMuted },
  heroBig: { fontSize: Type.amount, fontFamily: Font.displayBold, color: Corpus.text, letterSpacing: -0.8, ...tabular },
  heroSub: { fontSize: Type.bodyLg, color: Corpus.text },
  heroNote: { fontSize: Type.body, lineHeight: 19, color: Corpus.textMuted, marginTop: 8 },
  card: { backgroundColor: Corpus.card, borderRadius: 24, padding: 16, gap: 14 },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  cardTitle: { fontSize: Type.title, fontFamily: Font.displayBold, color: Corpus.text, flexShrink: 1 },
  tag: { fontSize: Type.small, fontFamily: Font.display, color: Corpus.textMuted, backgroundColor: Corpus.cardAlt, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3, overflow: 'hidden' },
  line: { gap: 3 },
  lineRow: { flexDirection: 'row', alignItems: 'baseline', gap: 12 },
  lineLabel: { flex: 1, fontSize: Type.bodyLg, color: Corpus.textMuted, lineHeight: 20 },
  lineValue: { fontSize: Type.bodyLg, fontFamily: Font.display, color: Corpus.text, ...tabular },
  strong: { color: Corpus.text, fontFamily: Font.display },
  strongValue: { fontFamily: Font.displayBold },
  note: { fontSize: Type.body, lineHeight: 19, color: Corpus.textMuted },
  check: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  checkText: { flex: 1, fontSize: Type.bodyLg, lineHeight: 20, color: Corpus.text },
});
