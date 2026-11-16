import { savedOf, type VaultWithBalance } from '@/types/vault';
import { formatINR } from '@/utils/format';
import { milestoneReached } from '@/utils/jarInsights';

// The toast after money moves: says so when you cross 25/50/75/100% of the goal
export function moneyMovedMessage(jar: VaultWithBalance, type: 'in' | 'out', amount: number): string {
  if (type === 'out') return `${formatINR(amount)} taken out of ${jar.name}`;
  const before = milestoneReached(savedOf(jar), jar.goal);
  const after = milestoneReached(savedOf(jar) + amount, jar.goal);
  if (after > before) {
    return after === 100
      ? `Goal reached. ${jar.name} is full at ${formatINR(jar.goal!)}`
      : `${jar.name} is ${after}% full`;
  }
  return `${formatINR(amount)} added to ${jar.name}`;
}
