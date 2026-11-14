import { Corpus, Space, Type } from '@/constants/theme';
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 58, paddingVertical: 8, paddingHorizontal: Space.md, backgroundColor: Corpus.card },
  rowPressed: { backgroundColor: Corpus.cardAlt },
  middle: { flex: 1, gap: 1 },
  note: { fontSize: Type.input, color: Corpus.text },
  meta: { fontSize: Type.body, color: Corpus.textMuted },
  amount: { fontSize: Type.input, color: Corpus.text },
  amountIncome: { color: Corpus.income },
});
