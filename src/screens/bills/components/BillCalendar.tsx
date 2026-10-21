import { Corpus } from '@/constants/theme';
import type { Bill } from '@/types/bill';
import { isSkippedThisMonth, thisMonthBills } from '@/utils/bills';
import { Text, View } from 'react-native';
import { styles } from './BillCalendar.styles';

export const DOT = { paid: Corpus.income, due: Corpus.gold, overdue: Corpus.danger, skipped: Corpus.textFaint };

// A month view: each due day shows one dot per bill (paid / due / overdue / skipped)
export default function BillCalendar({ bills }: { bills: Bill[] }) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7; // Monday = 0

  const byDay = new Map<number, string[]>();
  for (const { bill, date, paid } of thisMonthBills(bills, now)) {
    const color = isSkippedThisMonth(bill, now)
      ? DOT.skipped
      : paid
      ? DOT.paid
      : date.getDate() < now.getDate()
      ? DOT.overdue
      : DOT.due;
    byDay.set(date.getDate(), [...(byDay.get(date.getDate()) ?? []), color]);
  }

  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks = Array.from({ length: cells.length / 7 }, (_, w) => cells.slice(w * 7, w * 7 + 7));

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</Text>
      <View style={styles.week}>
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
          <View key={i} style={styles.cell}>
            <Text style={styles.weekday}>{d}</Text>
          </View>
        ))}
      </View>
      {weeks.map((week, w) => (
        <View key={w} style={styles.week}>
          {week.map((day, i) => {
            const dots = day ? byDay.get(day) ?? [] : [];
            return (
              <View key={i} style={styles.cell}>
                {day && (
                  <>
                    <View style={[styles.dayWrap, day === now.getDate() && styles.today]}>
                      <Text style={[styles.day, dots.length > 0 && styles.dayHasBill]}>{day}</Text>
                    </View>
                    <View style={styles.dots}>
                      {dots.slice(0, 3).map((c, k) => (
                        <View key={k} style={[styles.dot, { backgroundColor: c }]} />
                      ))}
                    </View>
                  </>
                )}
              </View>
            );
          })}
        </View>
      ))}
      <View style={styles.legend}>
        {[
          ['Paid', DOT.paid],
          ['Due', DOT.due],
          ['Overdue', DOT.overdue],
          ['Skipped', DOT.skipped],
        ].map(([label, color]) => (
          <View key={label} style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: color }]} />
            <Text style={styles.legendText}>{label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
