import { Corpus } from '@/constants/theme';
import type { VaultWithBalance } from '@/types/vault';
import { formatINR } from '@/utils/format';
import { formatYearMonth, jarKind, jarPlan, nextAdvanceTax } from '@/utils/jarInsights';

export type InsightContext = {
  avgExpenses: number;       // average monthly spending
  recommendedMonths: number; // emergency-fund target in months
};

export type InsightLine = { icon: string; text: string; color: string };

// The single most useful line for a jar card
export function jarInsightLine(jar: VaultWithBalance, ctx: InsightContext): InsightLine | null {
  const plan = jarPlan(jar);
  if (plan && plan.status !== 'done') {
    if (plan.status === 'overdue') {
      return {
        icon: 'alert-circle',
        color: Corpus.danger,
        text: `Target month passed · ${formatINR(plan.shortThisMonth)} still to go`,
      };
    }
    if (plan.status === 'behind') {
      return {
        icon: 'time-outline',
        color: Corpus.warning,
        text: `Add ${formatINR(plan.shortThisMonth)} more this month to stay on track`,
      };
    }
    return {
      icon: 'checkmark-circle',
      color: Corpus.income,
      text: `On track · ${formatINR(plan.perMonth)}/month until ${formatYearMonth(jar.targetDate!)}`,
    };
  }

  const kind = jarKind(jar);
  if (kind === 'emergency' && ctx.avgExpenses > 0) {
    const months = jar.balance / ctx.avgExpenses;
    return {
      icon: 'umbrella-outline',
      color: months >= ctx.recommendedMonths ? Corpus.income : Corpus.textMuted,
      text:
        months < 0.1
          ? `Not covering any expenses yet · aim for ${ctx.recommendedMonths} months`
          : `Covers ${months < 1 ? months.toFixed(1) : Math.floor(months * 10) / 10} months of expenses · aim for ${ctx.recommendedMonths}`,
    };
  }
  if (kind === 'tax') {
    const t = nextAdvanceTax();
    return {
      icon: 'calendar-outline',
      color: t.daysLeft <= 15 ? Corpus.warning : Corpus.textMuted,
      text: `Next advance tax: ${t.label} (${t.percent}% due) · in ${t.daysLeft} days`,
    };
  }
  return null;
}
