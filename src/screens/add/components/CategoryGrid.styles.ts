import { Corpus, Radius, Space } from '@/constants/theme';
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Space.sm + 2,
  },
  item: {
    width: '22.5%',
    alignItems: 'center',
    gap: 6,
    paddingVertical: Space.sm,
    borderRadius: Radius.md,
    borderWidth: 0.5,
    borderColor: 'transparent',
  },
  itemSelected: {
    backgroundColor: Corpus.card,
    borderColor: Corpus.gold,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Corpus.cardAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleSelected: {
    backgroundColor: '#2E2712',
  },
  label: {
    fontSize: 11,
    color: Corpus.textMuted,
  },
  labelSelected: {
    color: Corpus.gold,
    fontWeight: '500',
  },
});