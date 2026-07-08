import { Corpus, Space } from '@/constants/theme';
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm + 2,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Corpus.cardAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  middle: {
    flex: 1,
  },
  note: {
    fontSize: 13,
    color: Corpus.text,
  },
  meta: {
    fontSize: 11,
    color: Corpus.textMuted,
    marginTop: 1,
  },
  amount: {
    fontSize: 13,
    fontWeight: '500',
    color: Corpus.text,
  },
  amountIncome: {
    color: Corpus.income,
  },
});