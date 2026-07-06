import { Corpus, Radius, Space } from '@/constants/theme';
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  card: {
    backgroundColor: Corpus.card,
    borderRadius: Radius.lg,
    paddingVertical: Space.lg,
    paddingHorizontal: Space.md,
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: Corpus.border,
  },
  label: {
    fontSize: 12,
    color: Corpus.textMuted,
    letterSpacing: 0.4,
  },
  amount: {
    fontSize: 36,
    fontWeight: '500',
    color: Corpus.gold,
    marginTop: 4,
  },
  context: {
    fontSize: 11,
    color: Corpus.textMuted,
    marginTop: 8,
    textAlign: 'center',
  },
});