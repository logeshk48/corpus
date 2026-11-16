import { investMeta, type Investment } from '@/types/investment';
import type { VaultWithBalance } from '@/types/vault';
import { EXPECTED, futureValue, sipNeeded } from '@/utils/returns';
import { sipAmount } from '@/utils/sip';

// One goal = one jar. A jar holds cash you put in, and can also have investments linked to it
// (a fund for the house, a liquid fund for emergencies). Each holding links to one jar at most,
// so nothing is counted twice.
export const linkedTo = (jarId: string, list: Investment[]) => list.filter((h) => h.goalId === jarId);

export function jarsWithInvestments(jars: VaultWithBalance[], list: Investment[], now = new Date()): VaultWithBalance[] {
  return jars.map((j) => {
    const linked = linkedTo(j.id, list);
    if (!linked.length) return j;
    return {
      ...j,
      invested: Math.round(linked.reduce((a, h) => a + h.value, 0)),
      sipMonthly: Math.round(linked.reduce((a, h) => (h.sip?.active ? a + sipAmount(h.sip, now) : a), 0)),
      growthRate: expectedRate(linked),
    };
  });
}

const expectedRate = (linked: Investment[]) => {
  const pv = linked.reduce((a, h) => a + h.value, 0);
  return pv > 0 ? linked.reduce((a, h) => a + h.value * (EXPECTED[investMeta(h.type).cls] ?? 8), 0) / pv : 10;
};

// Where the linked investments are heading by the jar's target month (value-weighted expected return)
export function investForecast(jar: VaultWithBalance, list: Investment[], now = new Date()) {
  const linked = linkedTo(jar.id, list);
  const pv = linked.reduce((a, h) => a + h.value, 0);
  if (!linked.length || !jar.goal || !jar.targetDate) return null;
  const rate = expectedRate(linked);
  const [y, m] = jar.targetDate.split('-').map(Number);
  const months = (y - now.getFullYear()) * 12 + (m - 1 - now.getMonth()) + 1;
  const monthly = jar.sipMonthly ?? 0;
  const projected = futureValue(pv, monthly, rate, months) + jar.balance; // cash stays as it is
  const need = sipNeeded(Math.max(0, jar.goal - jar.balance), pv, rate, months);
  return { pv, rate, months, projected: Math.round(projected), need: Math.round(need), onTrack: projected >= jar.goal };
}

// Investments not saving for any jar yet (or linked to a jar that no longer exists)
export const unlinkedOf = (list: Investment[], jars: { id: string }[]) => list.filter((h) => !h.goalId || !jars.some((j) => j.id === h.goalId));

// A sensible jar for a holding, by what kind of money it is:
// safe + easy to withdraw (liquid, gilt, debt, FD) → Emergency fund; gold/silver → Savings;
// equity/retirement → the goal furthest away (long money for long goals). Always just a suggestion.
export function suggestJar<J extends { id: string; name: string; kind?: string; goal?: number; targetDate?: string }>(h: Investment, jars: J[]): { jar: J; why: string } | null {
  if (!jars.length) return null;
  const n = h.name.toLowerCase();
  const kindOf = (j: J) => j.kind ?? (/emergenc/i.test(j.name) ? 'emergency' : /tax/i.test(j.name) ? 'tax' : /saving/i.test(j.name) ? 'savings' : 'goal');
  const by = (k: string) => jars.find((j) => kindOf(j) === k);
  const cls = investMeta(h.type).cls;
  const safe = cls === 'debt' || h.type === 'fd' || h.fundClass === 'debt' || /liquid|overnight|gilt|money market|arbitrage|ultra short|savings fund/.test(n);
  const metal = cls === 'gold' || h.fundClass === 'gold' || /gold|silver/.test(n);
  const goals = jars.filter((j) => kindOf(j) === 'goal').sort((a, b) => (b.targetDate ?? '9999').localeCompare(a.targetDate ?? '9999') || (b.goal ?? 0) - (a.goal ?? 0));
  if (safe && by('emergency')) return { jar: by('emergency')!, why: 'Safe and quick to withdraw, right for emergencies' };
  if (metal && by('savings')) return { jar: by('savings')!, why: 'Gold and silver suit long-term savings' };
  if ((cls === 'equity' || cls === 'retirement') && goals[0]) return { jar: goals[0], why: 'Shares grow best over years, so a long goal suits it' };
  if (by('savings')) return { jar: by('savings')!, why: 'General savings' };
  return { jar: goals[0] ?? jars[0], why: 'Your closest match' };
}
