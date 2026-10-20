import type { Transaction } from '@/types/transaction';
import type { VaultEntry, VaultWithBalance } from '@/types/vault';

export type JarTip = {
  income: Transaction;
  jar: VaultWithBalance;
  amount: number;
  percent: number;
};

const roundTo100 = (n: number) => Math.max(100, Math.round(n / 100) * 100);
const findJar = (jars: VaultWithBalance[], words: string[]) =>
  jars.find((j) => words.some((w) => j.name.toLowerCase().includes(w)));

// After an income arrives, suggest putting a share of it into the right jar.
// No tip if you've already added money to any jar since that income.
export function suggestJarTip(
  monthTransactions: Transaction[],
  jars: VaultWithBalance[],
  entries: VaultEntry[]
): JarTip | null {
  if (jars.length === 0) return null;
  const latest = monthTransactions.find((t) => t.type === 'income'); // list is newest first
  if (!latest) return null;

  const actedSince = entries.some((e) => e.type === 'in' && e.date >= latest.date);
  if (actedSince) return null;

  const isSalary = latest.category === 'salary';
  const taxJar = findJar(jars, ['tax']);
  const savingsJar = findJar(jars, ['saving', 'emergency']);

  if (!isSalary && taxJar) {
    return { income: latest, jar: taxJar, percent: 15, amount: roundTo100(latest.amount * 0.15) };
  }
  const jar = savingsJar ?? jars[0];
  const percent = savingsJar ? 20 : 10;
  return { income: latest, jar, percent, amount: roundTo100((latest.amount * percent) / 100) };
}
