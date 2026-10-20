import { StyleSheet } from 'react-native';
import { Corpus, Radius, Space } from '@/constants/theme';

export const styles = StyleSheet.create({
  card: {
    backgroundColor: Corpus.card,
    borderRadius: Radius.lg,
    borderWidth: 0.5,
    borderColor: Corpus.border,
    padding: Space.md,
    gap: Space.sm + 2,
  },
  pressed: {
    opacity: 0.7,
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
    backgroundColor: '#1D2A22',
    alignItems: 'center',
    justifyContent: 'center',
  },
  middle: {
    flex: 1,
  },
  name: {
    fontSize: 14,
    fontWeight: '500',
    color: Corpus.text,
  },
  type: {
    fontSize: 11,
    color: Corpus.textMuted,
    marginTop: 2,
  },
  received: {
    fontSize: 15,
    fontWeight: '500',
    color: Corpus.income,
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
    backgroundColor: Corpus.income,
  },
  progressText: {
    fontSize: 11,
    color: Corpus.textMuted,
  },
});
