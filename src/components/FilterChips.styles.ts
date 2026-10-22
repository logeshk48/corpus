import { StyleSheet } from 'react-native';
import { Corpus, Space, Type } from '@/constants/theme';

export const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Space.sm,
  },
  chip: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: Corpus.card,
    borderWidth: 0.5,
    borderColor: Corpus.border,
  },
  chipActive: {
    backgroundColor: Corpus.goldActive,
    borderColor: Corpus.gold,
  },
  label: {
    fontSize: Type.small,
    color: Corpus.textMuted,
  },
  labelActive: {
    color: Corpus.gold,
    fontWeight: '500',
  },
});
