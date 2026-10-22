import { Corpus, Type } from '@/constants/theme';
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    gap: 4,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: Type.small,
    color: Corpus.textMuted,
  },
  amounts: {
    fontSize: Type.small,
    color: Corpus.textMuted,
  },
  amountsOver: {
    fontSize: Type.small,
    color: Corpus.danger,
    fontWeight: '500',
  },
  track: {
    height: 5,
    borderRadius: 3,
    backgroundColor: Corpus.border,
    overflow: 'hidden',
  },
  fill: {
    height: 5,
    borderRadius: 3,
  },
});