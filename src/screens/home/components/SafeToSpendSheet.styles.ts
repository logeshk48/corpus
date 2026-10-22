import { StyleSheet } from 'react-native';
import { Corpus, Radius, Space, Type } from '@/constants/theme';

export const styles = StyleSheet.create({
  table: {
    backgroundColor: Corpus.bg,
    borderRadius: Radius.md,
    borderWidth: 0.5,
    borderColor: Corpus.border,
    paddingVertical: Space.sm,
    paddingHorizontal: Space.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    gap: Space.sm,
  },
  rowLabel: {
    flex: 1,
    fontSize: Type.body,
    color: Corpus.textMuted,
  },
  rowValue: {
    fontSize: Type.body,
    fontWeight: '500',
    color: Corpus.text,
  },
  divider: {
    height: 0.5,
    backgroundColor: Corpus.border,
    marginVertical: 4,
  },
  totalLabel: {
    flex: 1,
    fontSize: Type.body,
    fontWeight: '600',
    color: Corpus.text,
  },
  totalValue: {
    fontSize: Type.label,
    fontWeight: '600',
  },
  note: {
    fontSize: Type.caption,
    color: Corpus.textFaint,
    lineHeight: 17,
  },
  tomorrow: {
    flexDirection: 'row',
    gap: Space.sm,
    alignItems: 'center',
    backgroundColor: Corpus.goldTint,
    borderRadius: Radius.md,
    padding: Space.md,
  },
  tomorrowText: {
    flex: 1,
    fontSize: Type.small,
    color: Corpus.text,
    lineHeight: 18,
  },
  steps: {
    gap: Space.sm,
  },
  step: {
    fontSize: Type.small,
    color: Corpus.textMuted,
    lineHeight: 18,
  },
});
