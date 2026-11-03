// Debt payoff plan, month by month.
// Each month: interest is added, every debt gets its usual payment (EMI / card minimum / interest),
// and the EXTRA money goes to one target debt. When a debt is cleared, its payment rolls into the extra
// (the "snowball" of freed-up money).
//   avalanche = highest interest first → least interest paid overall
//   snowball  = smallest balance first → quickest wins, keeps you motivated
export type PayoffDebt = { id: string; name: string; balance: number; rate: number | null; minPay: number };
export type Strategy = 'avalanche' | 'snowball';
export type PayoffResult = {
  order: { id: string; name: string; month: number | null }[]; // when each is cleared (months from now)
  months: number | null;   // debt-free after this many months (null = not within 50 years)
  interest: number;        // total interest paid
  firstTarget: string | null; // the debt to put extra money on now
  stuck: string[];         // debts that never shrink at this pace
};

const MAX = 600;

export function payoffOrder(debts: PayoffDebt[], s: Strategy) {
  return [...debts].sort((a, b) =>
    s === 'avalanche' ? (b.rate ?? 0) - (a.rate ?? 0) || a.balance - b.balance : a.balance - b.balance || (b.rate ?? 0) - (a.rate ?? 0)
  );
}

export function simulatePayoff(debts: PayoffDebt[], extra: number, s: Strategy): PayoffResult {
  const ds = payoffOrder(debts, s).map((d) => ({ ...d, bal: d.balance, done: null as number | null }));
  let interest = 0;
  let m = 0;
  while (ds.some((d) => d.bal > 0.5) && m < MAX) {
    m++;
    let pool = extra;
    // interest + usual payments
    for (const d of ds) {
      if (d.bal <= 0.5) continue;
      const i = (d.bal * (d.rate ?? 0)) / 1200;
      interest += i;
      d.bal += i;
      const pay = Math.min(d.bal, d.minPay);
      d.bal -= pay;
    }
    // payments of debts already cleared roll into the extra
    for (const d of ds) if (d.done != null) pool += d.minPay;
    // extra → targets in plan order
    for (const d of ds) {
      if (pool <= 0) break;
      if (d.bal <= 0.5) continue;
      const pay = Math.min(d.bal, pool);
      d.bal -= pay;
      pool -= pay;
    }
    for (const d of ds) if (d.bal <= 0.5 && d.done == null) (d.done = m), (d.bal = 0);
  }
  const left = ds.filter((d) => d.done == null);
  return {
    order: ds.map((d) => ({ id: d.id, name: d.name, month: d.done })),
    months: left.length ? null : m,
    interest: Math.round(interest),
    firstTarget: ds.find((d) => d.balance > 0)?.id ?? null,
    stuck: left.map((d) => d.name),
  };
}
