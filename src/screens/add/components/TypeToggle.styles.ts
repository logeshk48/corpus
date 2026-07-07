import { Corpus, Radius } from '@/constants/theme';
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    backgroundColor: Corpus.card,
    borderRadius: Radius.md,
    borderWidth: 0.5,
    borderColor: Corpus.border,
    padding: 4,
  },
  option: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: Radius.sm,
    alignItems: 'center',
  },
  optionActiveExpense: {
    backgroundColor: '#2A1D1D',
  },
  optionActiveIncome: {
    backgroundColor: '#1D2A22',
  },
  label: {
    fontSize: 13,
    color: Corpus.textMuted,
  },
  labelActiveExpense: {
    color: Corpus.danger,
    fontWeight: '500',
  },
  labelActiveIncome: {
    color: Corpus.income,
    fontWeight: '500',
  },
});