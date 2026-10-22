import { Corpus, Space, Type } from '@/constants/theme';
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm + 2,
  },
  rowPressed: {
    opacity: 0.6,
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
    fontSize: Type.body,
    color: Corpus.text,
  },
  meta: {
    fontSize: Type.caption,
    color: Corpus.textMuted,
    marginTop: 1,
  },
  amount: {
    fontSize: Type.body,
    fontWeight: '500',
    color: Corpus.text,
  },
  amountIncome: {
    color: Corpus.income,
  },
});