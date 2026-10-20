import { StyleSheet } from 'react-native';
import { Corpus, Radius, Space } from '@/constants/theme';

export const styles = StyleSheet.create({
  group: {
    backgroundColor: Corpus.card,
    borderRadius: Radius.lg,
    borderWidth: 0.5,
    borderColor: Corpus.border,
    overflow: 'hidden',
  },
  row: {
    paddingHorizontal: Space.md,
    paddingVertical: 12,
    gap: 6,
  },
  divider: {
    borderTopWidth: 0.5,
    borderTopColor: Corpus.border,
  },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  name: {
    fontSize: 13,
    color: Corpus.text,
    flex: 1,
  },
  amount: {
    fontSize: 13,
    fontWeight: '500',
    color: Corpus.income,
  },
  parts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Space.sm + 4,
  },
  part: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  partText: {
    fontSize: 11,
    color: Corpus.textMuted,
  },
  more: {
    fontSize: 11,
    color: Corpus.textFaint,
    textAlign: 'center',
    paddingVertical: 10,
    borderTopWidth: 0.5,
    borderTopColor: Corpus.border,
  },
});
