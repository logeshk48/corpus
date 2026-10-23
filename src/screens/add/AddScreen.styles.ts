import { Corpus, Radius, Space, Type } from '@/constants/theme';
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Corpus.bg,
  },
  content: {
    padding: Space.lg,
    paddingBottom: 120,
    gap: Space.md,
  },
  heading: {
    fontSize: Type.title,
    fontWeight: '500',
    color: Corpus.text,
  },
  amountSection: {
    alignItems: 'center',
    paddingVertical: Space.md,
  },
  amountLabel: {
    fontSize: Type.small,
    color: Corpus.textMuted,
    letterSpacing: 0.4,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Space.sm,
  },
  rupee: {
    fontSize: Type.h1,
    color: Corpus.textMuted,
    marginRight: 4,
  },
  amountInput: {
    fontSize: Type.entry,
    fontWeight: '500',
    color: Corpus.gold,
    minWidth: 120,
    textAlign: 'center',
    padding: 0,
  },
  noteInput: {
    backgroundColor: Corpus.card,
    borderRadius: Radius.md,
    borderWidth: 0.5,
    borderColor: Corpus.border,
    paddingHorizontal: Space.md,
    paddingVertical: 14,
    fontSize: Type.bodyLg,
    color: Corpus.text,
  },
});