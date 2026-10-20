import type { VaultWithBalance } from '@/types/vault';
import { formatINR } from '@/utils/format';
import { milestoneReached } from '@/utils/jarInsights';

// The toast message after money moves — celebrates crossing 25/50/75/100%
export function moneyMovedMessage(jar: VaultWithBalance, type: 'in' | 'out', amount: number): string {
  if (type === 'out') return `${formatINR(amount)} taken out of ${jar.name}`;
  const before = milestoneReached(jar.balance, jar.goal);
  const after = milestoneReached(jar.balance + amount, jar.goal);
  if (after > before) {
    return after === 100
      ? `🏆 Goal reached! ${jar.name} is full at ${formatINR(jar.goal!)}`
      : `🎉 ${after}% of your ${jar.name} goal — keep going!`;
  }
  return `${formatINR(amount)} added to ${jar.name}`;
}
