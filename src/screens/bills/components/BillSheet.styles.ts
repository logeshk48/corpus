import { StyleSheet } from 'react-native';
import { Corpus, Radius, Space, Type } from '@/constants/theme';

export const styles = StyleSheet.create({
  label: {
    fontSize: Type.caption,
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
    fontSize: Type.bodyLg,
    color: Corpus.text,
  },
  templates: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  freqRow: {
    flexDirection: 'row',
    gap: 6,
  },
  freq: {
    flex: 1,
    alignItems: 'center',
    borderRadius: Radius.md,
    borderWidth: 0.5,
    borderColor: Corpus.border,
    backgroundColor: Corpus.bg,
    paddingVertical: 10,
  },
  freqActive: {
    borderColor: Corpus.gold,
    backgroundColor: Corpus.goldActive,
  },
  freqText: {
    fontSize: Type.small,
    color: Corpus.textMuted,
  },
  freqTextActive: {
    color: Corpus.gold,
    fontWeight: '600',
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
    fontSize: Type.bodyLg,
    fontWeight: '500',
    color: Corpus.text,
  },
  yearJump: {
    fontSize: Type.small,
    color: Corpus.gold,
    paddingHorizontal: 8,
    fontWeight: '500',
  },
  hint: {
    fontSize: Type.caption,
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
    fontSize: Type.body,
    color: Corpus.text,
  },
  switchHint: {
    fontSize: Type.caption,
    color: Corpus.textMuted,
    marginTop: 2,
  },
});
