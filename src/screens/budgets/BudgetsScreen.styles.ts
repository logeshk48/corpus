import { StyleSheet } from 'react-native';
import { Corpus, Radius, Space } from '@/constants/theme';

export const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Corpus.bg,
  },
  content: {
    padding: Space.lg,
    paddingBottom: 120,
    gap: Space.md,
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Corpus.card,
  },
  heading: {
    fontSize: 17,
    fontWeight: '500',
    color: Corpus.text,
  },
  intro: {
    fontSize: 12,
    color: Corpus.textMuted,
    lineHeight: 18,
  },
  totalCard: {
    backgroundColor: Corpus.card,
    borderRadius: Radius.lg,
    borderWidth: 0.5,
    borderColor: Corpus.border,
    padding: Space.md,
    gap: 6,
  },
  totalLabel: {
    fontSize: 11,
    color: Corpus.textMuted,
    letterSpacing: 0.4,
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '500',
    color: Corpus.gold,
  },
  totalHint: {
    fontSize: 11,
    color: Corpus.textMuted,
  },
  totalWarn: {
    fontSize: 11,
    color: Corpus.warning,
  },
  group: {
    backgroundColor: Corpus.card,
    borderRadius: Radius.lg,
    borderWidth: 0.5,
    borderColor: Corpus.border,
    overflow: 'hidden',
  },
  row: {
    paddingHorizontal: Space.md,
    paddingVertical: 12,
    gap: 8,
  },
  rowDivider: {
    borderTopWidth: 0.5,
    borderTopColor: Corpus.border,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm + 2,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Corpus.cardAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: Corpus.text,
  },
  rowSpent: {
    fontSize: 11,
    color: Corpus.textMuted,
    marginTop: 1,
  },
  limitBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    width: 112,
    backgroundColor: Corpus.bg,
    borderRadius: Radius.sm,
    borderWidth: 0.5,
    borderColor: Corpus.border,
    paddingHorizontal: Space.sm,
  },
  limitBoxError: {
    borderColor: Corpus.danger,
  },
  rupee: {
    fontSize: 13,
    color: Corpus.textMuted,
  },
  limitInput: {
    flex: 1,
    paddingVertical: 8,
    fontSize: 13,
    color: Corpus.text,
    textAlign: 'right',
  },
  track: {
    height: 5,
    borderRadius: 3,
    backgroundColor: Corpus.border,
    overflow: 'hidden',
  },
  fill: {
    height: 5,
    borderRadius: 3,
  },
  saveButton: {
    backgroundColor: Corpus.gold,
    borderRadius: Radius.md,
    paddingVertical: 15,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: Corpus.cardAlt,
  },
  saveText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F1115',
  },
  saveTextDisabled: {
    color: Corpus.textFaint,
  },
  savedNote: {
    fontSize: 12,
    color: Corpus.income,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 12,
    color: Corpus.danger,
    textAlign: 'center',
  },
  center: {
    alignItems: 'center',
    paddingVertical: 80,
  },
});
