import { Corpus, Radius, Space } from '@/constants/theme';
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  label: {
    fontSize: 12,
    color: Corpus.textMuted,
    letterSpacing: 0.4,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Corpus.card,
    borderRadius: Radius.md,
    borderWidth: 0.5,
    borderColor: Corpus.border,
    paddingHorizontal: Space.md,
    gap: Space.sm,
  },
  inputWrapError: {
    borderColor: Corpus.danger,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 14,
    color: Corpus.text,
  },
  error: {
    fontSize: 11,
    color: Corpus.danger,
  },
});