import { StyleSheet } from 'react-native';
import { Corpus, Space } from '@/constants/theme';

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
    backgroundColor: '#2E2712',
    borderColor: Corpus.gold,
  },
  label: {
    fontSize: 12,
    color: Corpus.textMuted,
  },
  labelActive: {
    color: Corpus.gold,
    fontWeight: '500',
  },
});
