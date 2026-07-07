import { Corpus } from '@/constants/theme';
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
    fontSize: 12,
    color: Corpus.textMuted,
  },
  amounts: {
    fontSize: 12,
    color: Corpus.textMuted,
  },
  amountsOver: {
    fontSize: 12,
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