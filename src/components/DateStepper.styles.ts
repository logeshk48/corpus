import { StyleSheet } from 'react-native';
import { Corpus, Radius, Space, Type } from '@/constants/theme';

export const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Corpus.card,
    borderRadius: Radius.md,
    borderWidth: 0.5,
    borderColor: Corpus.border,
    padding: 4,
  },
  arrow: {
    width: 40,
    height: 40,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  middle: {
    alignItems: 'center',
    gap: 2,
  },
  label: {
    fontSize: Type.bodyLg,
    fontWeight: '500',
    color: Corpus.text,
  },
  sub: {
    fontSize: Type.caption,
    color: Corpus.textMuted,
  },
  todayLink: {
    fontSize: Type.caption,
    color: Corpus.gold,
    fontWeight: '500',
  },
  gap: {
    gap: Space.xs,
  },
});
