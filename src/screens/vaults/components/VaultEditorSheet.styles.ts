import { StyleSheet } from 'react-native';
import { Corpus, Radius, Space } from '@/constants/theme';

// Extra styles on top of the shared sheet look (BudgetEditorSheet.styles)
export const styles = StyleSheet.create({
  percentSign: {
    fontSize: 30,
    color: Corpus.textMuted,
    marginLeft: 4,
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
  preview: {
    alignItems: 'center',
    gap: 2,
  },
  previewLabel: {
    fontSize: 11,
    color: Corpus.textMuted,
  },
  previewValue: {
    fontSize: 18,
    fontWeight: '500',
    color: Corpus.gold,
  },
});
