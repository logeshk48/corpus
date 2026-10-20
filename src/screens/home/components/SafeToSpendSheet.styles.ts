import { StyleSheet } from 'react-native';
import { Corpus, Radius, Space } from '@/constants/theme';

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
    fontSize: 13,
    color: Corpus.textMuted,
  },
  rowValue: {
    fontSize: 13,
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
    fontSize: 13,
    fontWeight: '600',
    color: Corpus.text,
  },
  totalValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  note: {
    fontSize: 11,
    color: Corpus.textFaint,
    lineHeight: 17,
  },
  tomorrow: {
    flexDirection: 'row',
    gap: Space.sm,
    alignItems: 'center',
    backgroundColor: '#1E1A0F',
    borderRadius: Radius.md,
    padding: Space.md,
  },
  tomorrowText: {
    flex: 1,
    fontSize: 12,
    color: Corpus.text,
    lineHeight: 18,
  },
  steps: {
    gap: Space.sm,
  },
  step: {
    fontSize: 12,
    color: Corpus.textMuted,
    lineHeight: 18,
  },
});
