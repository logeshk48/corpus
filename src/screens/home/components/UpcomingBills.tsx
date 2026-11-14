import { Group, GroupRow } from '@/components/ui';
import { Chip, Corpus } from '@/constants/theme';
import type { Bill } from '@/types/bill';
import { monthlyBillsTotal, needsAmount, upcomingBills } from '@/utils/bills';
import { formatINR } from '@/utils/format';

function whenLabel(daysAway: number) {
  if (daysAway < 0) return { text: 'Overdue', color: Corpus.danger };
  if (daysAway === 0) return { text: 'Due today', color: Corpus.warning };
  if (daysAway === 1) return { text: 'Due tomorrow', color: Corpus.warning };
  return { text: `Due in ${daysAway} days`, color: Corpus.textMuted };
}

// "Up next": the bills due in the next 7 days, then a row into all bills
export default function UpcomingBills({ bills, onPress }: { bills: Bill[]; onPress: () => void }) {
  const active = bills.filter((b) => b.active);
  const upcoming = upcomingBills(bills, 7).slice(0, 3);
  if (active.length === 0) {
    return (
      <Group title="Up next">
        <GroupRow icon="repeat" color={Chip.red} title="Add your recurring bills" subtitle="Rent, EMIs, phone — Corpus reminds you and keeps the money aside" onPress={onPress} />
      </Group>
    );
  }
  return (
    <Group title="Up next">
      {upcoming.map(({ bill, daysAway }) => {
        const w = needsAmount(bill) ? { text: 'Enter this month’s amount', color: Corpus.gold } : whenLabel(daysAway);
        return (
          <GroupRow key={bill.id} icon="receipt" color={Chip.red} title={bill.name} subtitle={w.text} value={`${bill.variable ? '~' : ''}${formatINR(bill.amount)}`} valueColor={Corpus.text} onPress={onPress} chevron={false} />
        );
      })}
      <GroupRow icon="repeat" color={Chip.gray} title="All bills" subtitle={upcoming.length === 0 ? 'Nothing due this week' : undefined} value={`${formatINR(monthlyBillsTotal(bills))}/mo`} onPress={onPress} />
    </Group>
  );
}
