import { StyleSheet } from 'react-native';
import { Corpus, Radius, Space } from '@/constants/theme';

// Extras on top of the shared sheet look (BudgetEditorSheet.styles)
export const styles = StyleSheet.create({
  noteInput: {
    backgroundColor: Corpus.bg,
    borderRadius: Radius.md,
    borderWidth: 0.5,
    borderColor: Corpus.border,
    paddingHorizontal: Space.md,
    paddingVertical: 12,
    fontSize: 13,
    color: Corpus.text,
  },
  preview: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  previewLabel: {
    fontSize: 12,
    color: Corpus.textMuted,
  },
  previewValue: {
    fontSize: 12,
    fontWeight: '600',
  },
});
