// Wealth Builder Score: 0–100 from five parts, each worth 20.
// Every part says what it measured, why it scored that, and the one thing that would raise it.
// Parts without enough data are left out and the rest scaled to 100 (never a fake zero).
import type { Transaction } from '@/types/transaction';
import type { Investment } from '@/types/investment';

export type PillarId = 'saving' | 'emergency' | 'debt' | 'investing' | 'wealth';
export type Pillar = {
  id: PillarId;
  label: string;
  score: number;        // 0–20
  max: 20;
  value: string;        // "23% of income saved"
  why: string;          // one line on what this means
  fix: string | null;   // the one thing that would raise it (null when already full)
  gain: number;         // points the fix would add (for "biggest fix first")
  known: boolean;       // false = not enough data yet
};
export type WealthScore = { score: number; grade: string; tone: 'good' | 'ok' | 'weak'; pillars: Pillar[]; topFix: Pillar | null; known: number };

export type MonthFlow = { month: string; income: number; spend: number; invested: number };

const clamp = (n: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, n));
const r = (n: number) => Math.round(n);
const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

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
};

export function wealthScore(d: ScoreInput): WealthScore {
  const avg = recentAverage(d.flows);
  const income = avg?.income ?? 0;
  const spend = avg?.spend ?? 0;
  const monthlyNeed = spend + d.monthlyEmi; // what a month of life costs
  const P: Pillar[] = [];

  // 1) Saving — share of income not spent (SIPs and jar money count as saved)
  if (income > 0) {
    const rate = (income - spend) / income;
    const score = clamp(rate / 0.3) * 20;
    const need = Math.max(0, 0.2 * income - (income - spend));
    P.push({
      id: 'saving', label: 'Saving', score, max: 20, known: true,
      value: `${r(rate * 100)}% of income saved`,
      why: rate >= 0.3 ? 'Excellent — 30%+ is where wealth builds fast.' : rate >= 0.2 ? 'Good — 20% is the classic target.' : rate > 0 ? 'Below the 20% people usually aim for.' : 'You spent more than you earned on average.',
      fix: rate >= 0.3 ? null : rate < 0.2 ? `Spend ${inr(need)} less a month to save 20%` : `Save ${inr(0.3 * income - (income - spend))} more a month to reach 30%`,
      gain: 20 - score,
    });
  } else P.push({ id: 'saving', label: 'Saving', score: 0, max: 20, known: false, value: 'No income logged yet', why: 'Log your income for a full month to score this.', fix: 'Log your salary or income in Add', gain: 0 });

  // 2) Emergency — months of life covered by money you can reach fast
  if (d.emergencyKnown === false) {
    P.push({ id: 'emergency', label: 'Emergency fund', score: 0, max: 20, known: false, value: 'Bank balance not added', why: 'Add your bank & cash balances to see how many months they cover.', fix: 'Add balances in Accounts', gain: 0 });
  } else if (monthlyNeed > 0) {
    const months = d.emergencyMoney / monthlyNeed;
    const score = clamp(months / 6) * 20;
    P.push({
      id: 'emergency', label: 'Emergency fund', score, max: 20, known: true,
      value: `${months >= 10 ? r(months) : months.toFixed(1)} months covered`,
      why: months >= 6 ? 'Safe — 6 months handles a job loss or hospital bill.' : months >= 3 ? 'Okay — 3 months is the minimum; 6 is safer.' : 'Thin — one surprise could push you into debt.',
      fix: months >= 6 ? null : `Keep ${inr(6 * monthlyNeed - d.emergencyMoney)} more in savings / FD / liquid fund`,
      gain: 20 - score,
    });
  } else P.push({ id: 'emergency', label: 'Emergency fund', score: 0, max: 20, known: false, value: 'Spending not known yet', why: 'Log a few weeks of spending to see how long your savings last.', fix: null, gain: 0 });

  // 3) Debt — EMIs + interest as a share of income; card dues; debt vs what you own
  {
    const pay = d.monthlyEmi + d.monthlyInterest;
    if (income > 0 || d.debtTotal === 0) {
      const burden = income > 0 ? pay / income : 0;
      let score = 20 * (1 - clamp((burden - 0.1) / 0.3)); // ≤10% → 20, ≥40% → 0
      if (income > 0 && d.cardDues > income * 0.5) score = Math.max(0, score - 4); // big card balance
      if (d.assetsTotal > 0 && d.debtTotal > d.assetsTotal) score = Math.max(0, score - 4); // owe more than you own
      P.push({
        id: 'debt', label: 'Debt pressure', score, max: 20, known: true,
        value: d.debtTotal === 0 ? 'No debt' : income > 0 ? `${r(burden * 100)}% of income goes to EMIs & interest` : `${inr(d.debtTotal)} owed`,
        why: d.debtTotal === 0 ? 'Debt-free — every rupee you earn is yours.' : burden <= 0.2 ? 'Comfortable — banks worry above 40%.' : burden <= 0.4 ? 'Heavy — little room if income drops.' : 'Very heavy — most banks would refuse more loans.',
        fix: score >= 19.5 ? null : d.cardDues > income * 0.5 ? `Clear the ${inr(d.cardDues)} card balance first (cards charge ~36–42% a year)` : `Bring EMIs + interest under ${inr(0.2 * income)} a month — prepay the costliest loan first`,
        gain: 20 - score,
      });
    } else P.push({ id: 'debt', label: 'Debt pressure', score: 0, max: 20, known: false, value: `${inr(d.debtTotal)} owed`, why: 'Log your income to see how heavy your debt is.', fix: null, gain: 0 });
  }

  // 4) Investing — share of income going into investments, regularity, sensible mix
  if (income > 0) {
    const monthlyInvest = Math.max(d.sipMonthly, avg?.invested ?? 0);
    const share = monthlyInvest / income;
    let score = clamp(share / 0.2) * 14;
    score += d.sipMonthly > 0 ? clamp(1 - d.sipSkipped12 / 4) * 3 : 0;
    score += d.equityShare != null && d.equityShare > 0.2 && d.equityShare < 0.9 ? 3 : d.equityShare != null ? 1 : 0;
    P.push({
      id: 'investing', label: 'Investing habit', score, max: 20, known: true,
      value: monthlyInvest > 0 ? `${r(share * 100)}% of income invested monthly` : 'No regular investing yet',
      why: share >= 0.2 ? 'Strong — 20% a month compounds into real wealth.' : monthlyInvest > 0 ? 'Started — raise it a little every year.' : 'Money that only sits in a bank loses to inflation (~5–6% a year).',
      fix: score >= 19.5 ? null : share < 0.2 ? `${monthlyInvest > 0 ? 'Raise SIPs' : 'Start a SIP'} to ${inr(0.2 * income)} a month (20% of income)` : d.sipSkipped12 > 0 ? 'Keep SIPs going every month — skipped ones hurt the most' : 'Add some equity or debt so it isn’t all one kind',
      gain: 20 - score,
    });
  } else P.push({ id: 'investing', label: 'Investing habit', score: 0, max: 20, known: false, value: d.sipMonthly ? `${inr(d.sipMonthly)} a month in SIPs` : 'No income logged yet', why: 'Log your income to see what share you invest.', fix: null, gain: 0 });

  // 5) Wealth built — net worth as years of spending (10 years ≈ financially comfortable)
  if (monthlyNeed > 0) {
    const years = d.netWorth / (monthlyNeed * 12);
    const score = clamp(years / 10) * 20;
    P.push({
      id: 'wealth', label: 'Wealth built', score, max: 20, known: true,
      value: years <= 0 ? 'Net worth below zero' : `${years >= 10 ? r(years) : years.toFixed(1)} years of spending saved`,
      why: years >= 25 ? 'Financially independent territory (the 25× rule).' : years >= 10 ? 'Strong base — keep compounding.' : years >= 1 ? 'Building — each year of savings buys freedom.' : 'Early days — the first ₹1 lakh is the hardest.',
      fix: years >= 10 ? null : `Grow net worth to ${inr(Math.max(1, Math.ceil(years + 1)) * monthlyNeed * 12)} (next full year of spending)`,
      gain: Math.min(2, 20 - score), // slow by nature — never the "top fix" over quicker wins
    });
  } else P.push({ id: 'wealth', label: 'Wealth built', score: 0, max: 20, known: false, value: 'Spending not known yet', why: 'Log your spending to compare it with what you own.', fix: null, gain: 0 });

  const known = P.filter((p) => p.known);
  const raw = known.reduce((a, p) => a + p.score, 0);
  const score = known.length ? r((raw / (known.length * 20)) * 100) : 0;
  const grade = score >= 80 ? 'Excellent' : score >= 65 ? 'Strong' : score >= 50 ? 'Building' : score >= 35 ? 'Fragile' : 'At risk';
  const topFix = known.filter((p) => p.fix).sort((a, b) => b.gain - a.gain)[0] ?? null;
  return { score, grade, tone: score >= 65 ? 'good' : score >= 45 ? 'ok' : 'weak', pillars: P.map((p) => ({ ...p, score: Math.round(p.score * 10) / 10 })), topFix, known: known.length };
}
