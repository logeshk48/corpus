// Wealth score: 0–100 from five everyday questions, each worth 20 points.
// Built on the Financial Health Network's four areas (spend, save, borrow, plan & protect) with Indian benchmarks:
//   spend less than you earn, a cushion for surprises (6 months, 9 if income varies), EMIs well under 40% of income,
//   money growing (20% of income invested), and insurance (health cover; term cover ≈ 10× yearly income if others depend on you).
// Every part says what it measured, what that means, and ONE next step you can actually take soon — a milestone,
// not the whole distance — with the points it adds. Parts without data are left out and the rest scaled to 100.
import type { Investment } from '@/types/investment';
import type { Settings } from '@/types/settings';
import type { Transaction } from '@/types/transaction';

export type PillarId = 'spend' | 'safety' | 'debt' | 'grow' | 'protect';
export type Status = 'good' | 'ok' | 'weak' | 'unknown';
export type Pillar = {
  id: PillarId;
  label: string;        // short name: "Spending"
  question: string;     // the plain question it answers
  score: number;        // 0–20
  max: 20;
  status: Status;
  value: string;        // "23% of income left over"
  why: string;          // one line on what this means for you
  full: string;         // what full marks looks like
  fix: string | null;   // the next step (null when already full)
  gain: number;         // points that next step adds to this part
  known: boolean;       // false = not enough data yet
  unlock?: string;      // when unknown: what to do so it can be scored
};
export type Band = 'Strong' | 'Good' | 'Getting there' | 'Needs care';
export type WealthScore = {
  score: number; grade: Band | 'Not enough data yet'; tone: 'good' | 'ok' | 'weak'; meaning: string;
  pillars: Pillar[]; topFix: Pillar | null; known: number;
};

export type MonthFlow = { month: string; income: number; spend: number; invested: number };

const clamp = (n: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, n));
const r = (n: number) => Math.round(n);
const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;
const statusOf = (score: number): Status => (score >= 15 ? 'good' : score >= 8 ? 'ok' : 'weak');
const roundUp = (n: number, to = 500) => Math.ceil(n / to) * to;

// Income, spending and SIP money per calendar month (current month last)
export function monthlyFlows(tx: Transaction[], investments: Investment[], months = 7, now = new Date()): MonthFlow[] {
  const out: MonthFlow[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push({ month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, income: 0, spend: 0, invested: 0 });
  }
  const idx = new Map(out.map((m, i) => [m.month, i]));
  // local month (an entry at 1 AM on the 1st in India is still the 1st, not last month in UTC)
  const key = (iso: string) => {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  };
  for (const t of tx) {
    const i = idx.get(key(t.date));
    if (i == null) continue;
    if (t.type === 'income') out[i].income += t.amount;
    else out[i].spend += t.amount;
  }
  for (const h of investments)
    for (const l of h.sipLog ?? [])
      if (l.status === 'done') {
        const i = idx.get(l.month);
        if (i != null) out[i].invested += l.amount;
      }
  return out;
}

// Average over the last `n` COMPLETE months that have any income or spending
export function recentAverage(flows: MonthFlow[], n = 3) {
  const done = flows.slice(0, -1).filter((m) => m.income > 0 || m.spend > 0).slice(-n);
  if (!done.length) return null;
  const sum = done.reduce((a, m) => ({ income: a.income + m.income, spend: a.spend + m.spend, invested: a.invested + m.invested }), { income: 0, spend: 0, invested: 0 });
  return { income: sum.income / done.length, spend: sum.spend / done.length, invested: sum.invested / done.length, months: done.length };
}

export type ScoreInput = {
  flows: MonthFlow[];
  emergencyMoney: number;   // cash + bank + FD / debt funds you could use in a week (not stocks)
  monthlyEmi: number;       // loan EMIs a month
  monthlyInterest: number;  // interest you pay people a month
  cardDues: number;         // credit card balance now
  debtTotal: number;        // everything you owe
  assetsTotal: number;      // everything you own
  netWorth: number;
  sipMonthly: number;       // active SIPs a month
  sipSkipped12: number;     // SIPs skipped in the last 12 months
  equityShare: number | null; // 0–1 of investments in equity (null = no investments)
  investedTotal: number;    // value of investments
  emergencyKnown?: boolean; // false = no bank/cash balances entered yet
  incomeVaries?: boolean;   // freelance / clients / incentives → a bigger cushion is needed
  lateBills?: number;       // bills past their date and still unpaid
  protection?: Settings['protection'];
};

export function wealthScore(d: ScoreInput): WealthScore {
  const avg = recentAverage(d.flows);
  const income = avg?.income ?? 0;
  const spend = avg?.spend ?? 0;
  const monthlyNeed = spend + d.monthlyEmi; // what a month of life costs
  const P: Pillar[] = [];

  // 1) Spending — is money left over each month, every month, with bills paid on time?
  {
    const base = { id: 'spend' as const, label: 'Spending', question: 'Do you spend less than you earn?', max: 20 as const, full: '25% of income left over, no month in the red, no late bills' };
    if (income > 0) {
      const rate = (income - spend) / income;
      const recent = d.flows.slice(0, -1).filter((m) => m.income > 0 || m.spend > 0).slice(-6);
      const red = recent.filter((m) => m.spend > m.income).length;
      const late = d.lateBills ?? 0;
      let score = clamp(rate / 0.25) * 16 + clamp(1 - red / 2) * 4;
      score = Math.max(0, score - late * 3);
      const nextRate = rate < 0 ? 0 : rate < 0.1 ? 0.1 : rate < 0.2 ? 0.2 : 0.25;
      const cut = Math.max(0, nextRate * income - (income - spend));
      const fix = late > 0
        ? `Pay the ${late} late bill${late > 1 ? 's' : ''}: each late one costs 3 points and usually a fee`
        : rate >= 0.25 && red === 0 ? null
        : rate >= 0.25 ? 'Keep every month in the green. One month over costs points'
        : rate < 0 ? `Spend ${inr(roundUp(cut, 100))} less a month to stop spending more than you earn`
        : `Spend ${inr(roundUp(cut, 100))} less a month to keep ${r(nextRate * 100)}% of your income`;
      const after = late > 0 ? score + late * 3 : clamp(Math.max(rate, nextRate) / 0.25) * 16 + clamp(1 - red / 2) * 4;
      P.push({
        ...base, score, known: true, status: statusOf(score),
        value: rate < 0 ? `${inr(spend - income)} a month more than you earn` : `${r(rate * 100)}% of income left over`,
        why: rate >= 0.25 ? 'Plenty left over each month. This is what builds wealth.'
          : rate >= 0.2 ? '20% left over is the usual target. You are there.'
          : rate > 0 ? 'Something is left over, but less than the 20% people aim for.'
          : 'On average you spent more than you earned. That gap ends up on a card or a loan.',
        fix, gain: Math.max(0, Math.min(20, after) - score),
      });
    } else P.push({ ...base, score: 0, known: false, status: 'unknown', value: 'No income logged yet', why: 'Needs a full month of income and spending.', fix: null, gain: 0, unlock: 'Log your income when it comes in' });
  }

  // 2) Safety cushion — months of life covered by money you can reach in a few days
  {
    const target = d.incomeVaries ? 9 : 6;
    const base = { id: 'safety' as const, label: 'Safety cushion', question: 'Could you handle a surprise?', max: 20 as const, full: `${target} months of spending and EMIs in bank, FD or a liquid fund${d.incomeVaries ? ' (9, because your income varies)' : ''}` };
    if (d.emergencyKnown === false) P.push({ ...base, score: 0, known: false, status: 'unknown', value: 'Bank balance not added', why: 'Needs your bank and cash balances.', fix: null, gain: 0, unlock: 'Add your balances in Accounts' });
    else if (monthlyNeed > 0) {
      const months = d.emergencyMoney / monthlyNeed;
      const score = clamp(months / target) * 20;
      // the next milestone, not the whole way: 1 month, then 3, then 6, then 9
      const next = [1, 3, 6, 9].find((m) => m > months + 0.05 && m <= target) ?? target;
      const add = Math.max(0, next * monthlyNeed - d.emergencyMoney);
      P.push({
        ...base, score, known: true, status: statusOf(score),
        value: `${months >= 10 ? r(months) : months.toFixed(1)} month${months >= 0.95 && months < 1.05 ? '' : 's'} covered`,
        why: months >= target ? 'A job gap or a hospital bill would not push you into debt.'
          : months >= 3 ? 'A good start. A longer gap in work would still hurt.'
          : months >= 1 ? 'One surprise bill could still end up on your card.'
          : 'Less than a month of cover. Any surprise lands on a card or a loan.',
        fix: months >= target ? null : `Build it to ${next} month${next > 1 ? 's' : ''}: put ${inr(roundUp(add))} aside${next === 1 ? '' : ` (a little each month works)`}`,
        gain: months >= target ? 0 : clamp(next / target) * 20 - score,
      });
    } else P.push({ ...base, score: 0, known: false, status: 'unknown', value: 'Spending not known yet', why: 'Needs a few weeks of spending.', fix: null, gain: 0, unlock: 'Log what you spend for a few weeks' });
  }

  // 3) Debt — EMIs + interest as a share of income (Indian lenders worry above 40%), card balance carried
  {
    const base = { id: 'debt' as const, label: 'Debt', question: 'Is your debt easy to carry?', max: 20 as const, full: 'EMIs and interest under 15% of income, nothing carried on cards' };
    const pay = d.monthlyEmi + d.monthlyInterest;
    if (income > 0 || d.debtTotal === 0) {
      const burden = income > 0 ? pay / income : 0;
      let score = 20 * (1 - clamp((burden - 0.15) / 0.3)); // ≤15% → 20, ≥45% → 0
      const bigCard = income > 0 && d.cardDues > income * 0.3;
      if (bigCard) score = Math.max(0, score - 5);
      const underwater = d.assetsTotal > 0 && d.debtTotal > d.assetsTotal;
      if (underwater) score = Math.max(0, score - 3);
      const status = statusOf(score);
      P.push({
        ...base, score, known: true, status,
        value: d.debtTotal === 0 ? 'No debt' : income > 0 ? `${r(burden * 100)}% of income goes to EMIs and interest` : `${inr(d.debtTotal)} owed`,
        why: d.debtTotal === 0 ? 'Every rupee you earn is yours to use.'
          : bigCard ? `Your card balance of ${inr(d.cardDues)} is large next to your income. Cards charge about 36–42% a year.`
          : burden <= 0.2 ? 'Comfortable. Lenders start to worry above 40%.'
          : burden <= 0.4 ? 'Heavy. Little room if income drops for a month.'
          : 'Very heavy. Most lenders would refuse another loan.',
        fix: score >= 19.5 ? null : bigCard ? `Pay your card down by ${inr(roundUp(d.cardDues - income * 0.3))}. At about 36–42% a year, card interest costs more than anything else` : `Bring EMIs and interest under ${inr(roundUp(0.15 * income))} a month by prepaying the costliest loan`,
        gain: bigCard ? Math.min(5, 20 - score) : 20 - score,
      });
    } else P.push({ ...base, score: 0, known: false, status: 'unknown', value: `${inr(d.debtTotal)} owed`, why: 'Needs your income to judge how heavy it is.', fix: null, gain: 0, unlock: 'Log your income when it comes in' });
  }

  // 4) Growing — share of income invested every month, kept up, and wealth built so far
  {
    const base = { id: 'grow' as const, label: 'Growing', question: 'Is your money growing?', max: 20 as const, full: '20% of income invested every month, no SIP skipped, and net worth worth 10 years of spending' };
    if (income > 0) {
      const monthlyInvest = Math.max(d.sipMonthly, avg?.invested ?? 0);
      const share = monthlyInvest / income;
      const years = monthlyNeed > 0 ? d.netWorth / (monthlyNeed * 12) : 0;
      const habit = clamp(share / 0.2) * 15;
      const steady = d.sipMonthly > 0 ? clamp(1 - d.sipSkipped12 / 3) * 2 : 0;
      const built = clamp(years / 10) * 3;
      const score = habit + steady + built;
      const nextShare = share < 0.05 ? 0.05 : share < 0.1 ? 0.1 : 0.2;
      const step = roundUp(nextShare * income - monthlyInvest, 100);
      P.push({
        ...base, score, known: true, status: statusOf(score),
        value: monthlyInvest > 0 ? `${r(share * 100)}% of income invested a month` : 'Nothing invested each month yet',
        why: share >= 0.2 ? 'Strong. Twenty percent a month compounds into real wealth.'
          : monthlyInvest > 0 ? 'Started. Raising it a little each year makes the biggest difference.'
          : 'Money that only sits in a bank loses to prices rising about 5–6% a year.',
        fix: share >= 0.2 ? (d.sipSkipped12 > 0 ? 'Keep SIPs going every month. Skipped ones cost the most' : null)
          : `${monthlyInvest > 0 ? 'Raise your SIPs' : 'Start a SIP'} by ${inr(step)} a month to invest ${r(nextShare * 100)}% of income`,
        gain: share >= 0.2 ? Math.min(2, 2 - steady) : clamp(nextShare / 0.2) * 15 - habit,
      });
    } else P.push({ ...base, score: 0, known: false, status: 'unknown', value: d.sipMonthly ? `${inr(d.sipMonthly)} a month in SIPs` : 'No income logged yet', why: 'Needs your income to see what share you invest.', fix: null, gain: 0, unlock: 'Log your income when it comes in' });
  }

  // 5) Covered — health insurance, and term life cover when others depend on your income
  {
    const base = { id: 'protect' as const, label: 'Insurance', question: 'Are you covered if something goes wrong?', max: 20 as const, full: 'Health cover of ₹5 lakh or more, and term cover of about 10× your yearly income if someone depends on you' };
    const pr = d.protection;
    if (!pr?.answeredAt) P.push({ ...base, score: 0, known: false, status: 'unknown', value: 'Not answered yet', why: 'A hospital stay is the most common reason savings in India get wiped out.', fix: null, gain: 0, unlock: 'Answer 2 quick questions' });
    else {
      const healthPts = !pr.health ? 0 : pr.healthCover && pr.healthCover < 500000 ? 6 : 10;
      const need = income * 12 * 10;
      const termPts = !pr.dependents ? 10 : !pr.term ? 0 : need > 0 && pr.termCover ? clamp(pr.termCover / need) * 10 : 6;
      const score = healthPts + termPts;
      const fix = !pr.health ? 'Get health insurance for yourself (and family). Even ₹5 lakh of cover helps'
        : healthPts < 10 ? 'Raise health cover to at least ₹5 lakh. A super top-up is a cheap way'
        : pr.dependents && !pr.term ? `Get term life cover of about ${inr(roundUp(need, 100000))} so your family is safe`
        : pr.dependents && termPts < 9.5 ? `Raise term cover towards ${inr(roundUp(need, 100000))} (10× yearly income)`
        : null;
      P.push({
        ...base, score, known: true, status: statusOf(score),
        value: [pr.health ? `Health cover${pr.healthCover ? ` ${inr(pr.healthCover)}` : ''}` : 'No health cover', pr.dependents ? (pr.term ? `term cover${pr.termCover ? ` ${inr(pr.termCover)}` : ''}` : 'no term cover') : null].filter(Boolean).join(', '),
        why: score >= 19 ? 'A hospital bill or the worst case would not undo your savings.'
          : !pr.health ? 'Without it, one hospital stay can take years of savings.'
          : 'Partly covered. A big bill could still go beyond it.',
        fix, gain: !pr.health || healthPts < 10 ? 10 - healthPts : 10 - termPts,
      });
    }
  }

  const known = P.filter((p) => p.known);
  const raw = known.reduce((a, p) => a + p.score, 0);
  const score = known.length >= 2 ? r((raw / (known.length * 20)) * 100) : 0; // one part alone isn't a score
  const grade: WealthScore['grade'] = known.length < 2 ? 'Not enough data yet' : score >= 80 ? 'Strong' : score >= 60 ? 'Good' : score >= 40 ? 'Getting there' : 'Needs care';
  const meaning = known.length < 2 ? 'Log your income and a few weeks of spending, and add your bank balance. The score needs at least two parts to mean anything.'
    : score >= 80 ? 'Your money is in good shape. Keep the habits that got you here.'
    : score >= 60 ? 'Solid. One or two steps below would make you very secure.'
    : score >= 40 ? 'You are building. The next step below moves the score the most.'
    : 'A few basics need attention. Start with the one step below.';
  const topFix = known.filter((p) => p.fix && p.gain > 0.5).sort((a, b) => b.gain - a.gain)[0] ?? null;
  return {
    score, grade, meaning, tone: known.length < 2 ? 'ok' : score >= 60 ? 'good' : score >= 40 ? 'ok' : 'weak',
    pillars: P.map((p) => ({ ...p, score: Math.round(p.score * 10) / 10, gain: Math.round(p.gain * 10) / 10 })), topFix, known: known.length,
  };
}

// Points on the 0–100 score that a part's next step adds
export const pointsFor = (s: WealthScore, p: Pillar) => Math.max(1, Math.round((p.gain / (Math.max(s.known, 1) * 20)) * 100));
