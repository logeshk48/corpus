import { Corpus, Space } from '@/constants/theme';
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Corpus.bg,
  },
  content: {
    padding: Space.lg,
    paddingBottom: 120,
    gap: Space.lg,
  },
  heading: {
    fontSize: 17,
    fontWeight: '500',
    color: Corpus.text,
  },
  amountSection: {
    alignItems: 'center',
    paddingVertical: Space.lg,
  },
  amountLabel: {
    fontSize: 12,
    color: Corpus.textMuted,
    letterSpacing: 0.4,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Space.sm,
  },
  rupee: {
    fontSize: 32,
    color: Corpus.textMuted,
    marginRight: 4,
  },
  amountInput: {
    fontSize: 44,
    fontWeight: '500',
    color: Corpus.gold,
    minWidth: 120,
    textAlign: 'center',
    padding: 0,
  },
  sectionLabel: {
    fontSize: 12,
    color: Corpus.textMuted,
    letterSpacing: 0.4,
  },
});