import { StyleSheet } from 'react-native';
import { Corpus, Radius, Space, Type } from '@/constants/theme';

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
    borderRadius: Radius.lg,
    backgroundColor: Corpus.cardAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  middle: {
    flex: 1,
  },
  name: {
    fontSize: Type.body,
    color: Corpus.text,
  },
  spent: {
    fontSize: Type.caption,
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
    fontSize: Type.caption,
    fontWeight: '500',
    color: Corpus.gold,
  },
});
