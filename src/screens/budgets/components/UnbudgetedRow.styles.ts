import { StyleSheet } from 'react-native';
import { Corpus, Space } from '@/constants/theme';

export const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm + 4,
    paddingHorizontal: Space.md,
    paddingVertical: 12,
  },
  divider: {
    borderTopWidth: 0.5,
    borderTopColor: Corpus.border,
  },
  pressed: {
    opacity: 0.7,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Corpus.cardAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  middle: {
    flex: 1,
  },
  name: {
    fontSize: 13,
    color: Corpus.text,
  },
  spent: {
    fontSize: 11,
    color: Corpus.textMuted,
    marginTop: 1,
  },
  setButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderRadius: 999,
    borderWidth: 0.5,
    borderColor: Corpus.gold,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  setText: {
    fontSize: 11,
    fontWeight: '500',
    color: Corpus.gold,
  },
});
