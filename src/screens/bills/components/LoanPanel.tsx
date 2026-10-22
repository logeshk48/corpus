import { Corpus } from '@/constants/theme';
import type { Bill } from '@/types/bill';
import { isPaidThisMonth, isSkippedThisMonth } from '@/utils/bills';
import { formatINR } from '@/utils/format';
import { buildSchedule, loanStatus, prepaymentImpact, yearlySummary } from '@/utils/loan';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { INTEREST, styles } from './LoanPanel.styles';

const ymLabel = (ym: string) =>
  new Date(Number(ym.slice(0, 4)), Number(ym.slice(5)) - 1, 1).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
const rupees = (n: number) => formatINR(Math.round(n));
const PREPAY_CHIPS = [25000, 50000, 100000, 200000];

type Props = {
  bill: Bill;
  onEditLoan: () => void;
  onRecordPrepayment: (amount: number, mode: 'tenure' | 'emi') => Promise<void>;
};

export default function LoanPanel({ bill, onEditLoan, onRecordPrepayment }: Props) {
  const [extra, setExtra] = useState('');
  const [mode, setMode] = useState<'tenure' | 'emi'>('tenure');
  const [showYears, setShowYears] = useState(false);
  const [busy, setBusy] = useState(false);

  // No loan details yet → invite the user to add them
  if (!bill.loan) {
    return (
      <Pressable onPress={onEditLoan} style={[styles.card, styles.goldCard]}>
        <View style={styles.titleRow}>
          <Ionicons name="calculator-outline" size={16} color={Corpus.gold} />
          <Text style={styles.title}>Is this a loan EMI?</Text>
          <Text style={styles.link}>Add details →</Text>
        </View>
        <Text style={styles.text}>
          Add the loan amount, interest rate and tenure to see how much you still owe, how much of
          each EMI is interest, and how much a prepayment would save you.
        </Text>
      </Pressable>
    );
  }

  const loan = bill.loan;
  const paid = isPaidThisMonth(bill) && !isSkippedThisMonth(bill);
  const st = loanStatus(loan, paid);
  const repaidPct = Math.min((st.principalRepaid / loan.principal) * 100, 100);
  const cur = st.current;
  const extraAmt = Number(extra);
  const validExtra = extraAmt > 0 && Number.isFinite(extraAmt) && !st.finished;
  const impact = validExtra ? prepaymentImpact(loan, extraAmt, mode) : null;
  const years = showYears ? yearlySummary(buildSchedule(loan)) : [];

  const record = async () => {
    if (!validExtra) return;
    setBusy(true);
    try {
      await onRecordPrepayment(extraAmt, mode);
      setExtra('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {/* ── Balance ── */}
      <View style={[styles.card, styles.goldCard]}>
        <View style={styles.titleRow}>
          <Ionicons name="business-outline" size={15} color={Corpus.gold} />
          <Text style={styles.title}>
            {st.finished ? 'Loan closed 🎉' : 'Still owed'}
            {loan.lender ? ` · ${loan.lender}` : ''}
          </Text>
          <Pressable onPress={onEditLoan} hitSlop={8}>
            <Text style={styles.link}>Edit</Text>
          </Pressable>
        </View>
        <Text style={styles.big}>{rupees(st.outstanding)}</Text>
        <Text style={styles.sub}>
          of {rupees(loan.principal)} at {loan.annualRate}% · {Math.round(repaidPct)}% repaid
        </Text>
        <View style={styles.track}>
          <View style={{ width: `${repaidPct}%`, backgroundColor: Corpus.gold }} />
        </View>
        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>EMI</Text>
            <Text style={styles.statValue}>{rupees(st.emi || bill.amount)}</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>EMIs paid</Text>
            <Text style={styles.statValue}>
              {st.paidCount} of {st.totalCount}
            </Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Last EMI</Text>
            <Text style={styles.statValue}>{ymLabel(st.endMonth)}</Text>
          </View>
        </View>
        {st.totalPrepaid > 0 && (
          <Text style={styles.text}>Prepaid so far: <Text style={styles.strong}>{rupees(st.totalPrepaid)}</Text></Text>
        )}
      </View>

      {/* ── This month's split ── */}
      {cur && !st.finished && (
        <View style={styles.card}>
          <Text style={styles.title}>Where this month's {rupees(cur.emi)} goes</Text>
          <View style={styles.track}>
            <View style={{ width: `${(cur.principal / cur.emi) * 100}%`, backgroundColor: Corpus.gold }} />
            <View style={{ flex: 1, backgroundColor: INTEREST }} />
          </View>
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: Corpus.gold }]} />
              <Text style={styles.legendText}>Principal {rupees(cur.principal)}</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: INTEREST }]} />
              <Text style={styles.legendText}>Interest {rupees(cur.interest)}</Text>
            </View>
          </View>
          <Text style={styles.text}>
            Early EMIs are mostly interest; over time more goes to principal. That's why prepaying
            early saves the most.
          </Text>
        </View>
      )}

      {/* ── Interest picture ── */}
      <View style={styles.card}>
        <Text style={styles.title}>Interest over the whole loan</Text>
        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Total</Text>
            <Text style={[styles.statValue, { color: INTEREST }]}>{rupees(st.totalInterest)}</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Paid so far</Text>
            <Text style={styles.statValue}>{rupees(st.interestPaid)}</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Still ahead</Text>
            <Text style={styles.statValue}>{rupees(st.interestRemaining)}</Text>
          </View>
        </View>
      </View>

      {/* ── Prepayment calculator ── */}
      {!st.finished && (
        <View style={styles.card}>
          <View style={styles.titleRow}>
            <Ionicons name="flash-outline" size={15} color={Corpus.income} />
            <Text style={styles.title}>What if I prepay?</Text>
          </View>
          <TextInput
            style={styles.input}
            value={extra}
            onChangeText={setExtra}
            placeholder="Extra amount, e.g. 50000"
            placeholderTextColor={Corpus.textFaint}
            keyboardType="numeric"
          />
          <View style={styles.chips}>
            {PREPAY_CHIPS.map((c) => (
              <Pressable key={c} style={[styles.chip, extraAmt === c && styles.chipActive]} onPress={() => setExtra(String(c))}>
                <Text style={[styles.chipText, extraAmt === c && styles.chipTextActive]}>{rupees(c)}</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.modeRow}>
            {(['tenure', 'emi'] as const).map((m) => (
              <Pressable key={m} style={[styles.mode, mode === m && styles.chipActive]} onPress={() => setMode(m)}>
                <Text style={[styles.chipText, mode === m && styles.chipTextActive]}>
                  {m === 'tenure' ? 'Finish sooner' : 'Lower my EMI'}
                </Text>
              </Pressable>
            ))}
          </View>

          {impact && (
            <View style={styles.result}>
              <Text style={styles.resultBig}>Save {rupees(impact.interestSaved)} in interest</Text>
              <Text style={styles.resultText}>
                {mode === 'tenure'
                  ? impact.monthsSaved > 0
                    ? `Finish ${impact.monthsSaved} month${impact.monthsSaved === 1 ? '' : 's'} earlier — last EMI in ${ymLabel(impact.newEndMonth)} instead of ${ymLabel(st.endMonth)}.`
                    : 'This closes the loan.'
                  : `Your EMI drops from ${rupees(st.emi || bill.amount)} to ${rupees(impact.newEmi)}; the end date stays ${ymLabel(st.endMonth)}.`}
              </Text>
              {mode === 'emi' && (
                <Text style={[styles.resultText, { color: Corpus.textMuted }]}>
                  Tip: "Finish sooner" usually saves far more interest.
                </Text>
              )}
            </View>
          )}

          {impact && (
            <Pressable style={styles.button} onPress={record} disabled={busy}>
              <Text style={styles.buttonText}>{busy ? 'Saving…' : `I made this ${rupees(extraAmt)} prepayment`}</Text>
            </Pressable>
          )}
          <Text style={styles.text}>
            Estimates use the standard reducing-balance method. Your lender may charge prepayment
            fees or round differently — check your loan statement.
          </Text>
        </View>
      )}

      {/* ── Year-by-year schedule ── */}
      <View style={styles.card}>
        <Pressable style={styles.titleRow} onPress={() => setShowYears(!showYears)}>
          <Ionicons name="calendar-outline" size={15} color={Corpus.textMuted} />
          <Text style={styles.title}>Year-by-year schedule</Text>
          <Ionicons name={showYears ? 'chevron-up' : 'chevron-down'} size={16} color={Corpus.textMuted} />
        </Pressable>
        {showYears && (
          <View>
            <View style={styles.yearHead}>
              <Text style={styles.cellHeadYear}>Year</Text>
              <Text style={styles.cellHead}>Principal</Text>
              <Text style={styles.cellHead}>Interest</Text>
              <Text style={styles.cellHead}>Balance</Text>
            </View>
            {years.map((y) => (
              <View key={y.year} style={styles.yearRow}>
                <Text style={styles.cellYear}>{y.year}</Text>
                <Text style={styles.cell}>{rupees(y.principal + y.prepayment)}</Text>
                <Text style={[styles.cell, { color: INTEREST }]}>{rupees(y.interest)}</Text>
                <Text style={styles.cell}>{rupees(y.balance)}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </>
  );
}
