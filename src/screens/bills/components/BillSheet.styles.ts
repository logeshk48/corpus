import { StyleSheet } from 'react-native';
import { Corpus, Radius, Space } from '@/constants/theme';

export const styles = StyleSheet.create({
  label: {
    fontSize: 11,
    color: Corpus.textMuted,
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: Corpus.bg,
    borderRadius: Radius.md,
    borderWidth: 0.5,
    borderColor: Corpus.border,
    paddingHorizontal: Space.md,
    paddingVertical: 12,
    fontSize: 14,
    color: Corpus.text,
  },
  templates: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
    backgroundColor: Corpus.bg,
    borderRadius: Radius.md,
    borderWidth: 0.5,
    borderColor: Corpus.border,
    padding: 4,
  },
  dayArrow: {
    width: 36,
    height: 36,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500',
    color: Corpus.text,
  },
  hint: {
    fontSize: 11,
    color: Corpus.textFaint,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
    backgroundColor: Corpus.bg,
    borderRadius: Radius.md,
    borderWidth: 0.5,
    borderColor: Corpus.border,
    paddingVertical: 10,
    paddingHorizontal: Space.md,
  },
  switchBody: {
    flex: 1,
  },
  switchTitle: {
    fontSize: 13,
    color: Corpus.text,
  },
  switchHint: {
    fontSize: 11,
    color: Corpus.textMuted,
    marginTop: 2,
  },
});
