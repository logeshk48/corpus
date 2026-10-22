import { StyleSheet } from 'react-native';
import { Corpus, Radius, Space, Type } from '@/constants/theme';

export const styles = StyleSheet.create({
  card: {
    backgroundColor: Corpus.card,
    borderRadius: Radius.lg,
    borderWidth: 0.5,
    borderColor: Corpus.border,
    padding: Space.md,
    gap: Space.sm,
  },
  title: { fontSize: Type.body, fontWeight: '500', color: Corpus.text },
  week: { flexDirection: 'row' },
  cell: { width: `${100 / 7}%`, alignItems: 'center', paddingVertical: 4, gap: 3 },
  weekday: { fontSize: Type.micro, color: Corpus.textFaint },
  dayWrap: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  today: { borderWidth: 1, borderColor: Corpus.gold },
  day: { fontSize: Type.small, color: Corpus.textMuted },
  dayHasBill: { color: Corpus.text, fontWeight: '600' },
  dots: { flexDirection: 'row', gap: 2, height: 5 },
  dot: { width: 5, height: 5, borderRadius: 3 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.md, marginTop: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendText: { fontSize: Type.micro, color: Corpus.textMuted },
});
