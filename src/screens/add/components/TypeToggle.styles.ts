import { Corpus, Radius, Type } from '@/constants/theme';
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
    backgroundColor: Corpus.dangerTint,
  },
  optionActiveIncome: {
    backgroundColor: Corpus.incomeTint,
  },
  label: {
    fontSize: Type.body,
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