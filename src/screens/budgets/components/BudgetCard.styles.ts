import { StyleSheet } from 'react-native';
import { Corpus, Radius, Space, Type } from '@/constants/theme';

export const styles = StyleSheet.create({
  card: {
    backgroundColor: Corpus.card,
    borderRadius: Radius.lg,
    borderWidth: 0.5,
    borderColor: Corpus.border,
    padding: Space.md,
    gap: 10,
  },
  pressed: {
    opacity: 0.75,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm + 4,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  middle: {
    flex: 1,
  },
  name: {
    fontSize: Type.bodyLg,
    fontWeight: '500',
    color: Corpus.text,
  },
  amounts: {
    fontSize: Type.small,
    color: Corpus.textMuted,
    marginTop: 2,
  },
  percent: {
    fontSize: Type.label,
    fontWeight: '600',
  },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: Corpus.bg,
    overflow: 'hidden',
  },
  fill: {
    height: 6,
    borderRadius: 3,
  },
  bottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  status: {
    fontSize: Type.caption,
  },
  editHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  editText: {
    fontSize: Type.caption,
    color: Corpus.textFaint,
  },
});
