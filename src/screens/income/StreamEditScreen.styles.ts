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
    maxWidth: 560,
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
  statsRow: {
    flexDirection: 'row',
    gap: Space.sm + 2,
  },
  statCard: {
    flex: 1,
    backgroundColor: Corpus.card,
    borderRadius: Radius.md,
    borderWidth: 0.5,
    borderColor: Corpus.border,
    paddingVertical: 12,
    paddingHorizontal: Space.md,
  },
  statLabel: {
    fontSize: 11,
    color: Corpus.textMuted,
  },
  statValue: {
    fontSize: 17,
    fontWeight: '500',
    color: Corpus.income,
    marginTop: 2,
  },
  history: {
    backgroundColor: Corpus.card,
    borderRadius: Radius.lg,
    borderWidth: 0.5,
    borderColor: Corpus.border,
    paddingVertical: Space.sm,
    paddingHorizontal: Space.md,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm + 2,
    paddingVertical: 7,
  },
  historyMonth: {
    width: 64,
    fontSize: 12,
    color: Corpus.textMuted,
  },
  historyTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: Corpus.border,
    overflow: 'hidden',
  },
  historyFill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: Corpus.income,
  },
  historyAmount: {
    width: 78,
    textAlign: 'right',
    fontSize: 12,
    fontWeight: '500',
    color: Corpus.text,
  },
  historyNone: {
    color: Corpus.textFaint,
    fontWeight: '400',
  },
  payments: {
    gap: Space.md,
  },
  detailsLabel: {
    marginTop: Space.lg,
  },
  label: {
    fontSize: 12,
    color: Corpus.textMuted,
    letterSpacing: 0.4,
    marginTop: Space.sm,
  },
  input: {
    backgroundColor: Corpus.card,
    borderRadius: Radius.md,
    borderWidth: 0.5,
    borderColor: Corpus.border,
    paddingHorizontal: Space.md,
    paddingVertical: 14,
    fontSize: 14,
    color: Corpus.text,
  },
  inputError: {
    borderColor: Corpus.danger,
  },
  moneyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Corpus.card,
    borderRadius: Radius.md,
    borderWidth: 0.5,
    borderColor: Corpus.border,
    paddingHorizontal: Space.md,
  },
  rupee: {
    fontSize: 14,
    color: Corpus.textMuted,
  },
  moneyInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 14,
    color: Corpus.text,
  },
  hint: {
    fontSize: 11,
    color: Corpus.textFaint,
  },
  error: {
    fontSize: 11,
    color: Corpus.danger,
  },
  saveButton: {
    backgroundColor: Corpus.gold,
    borderRadius: Radius.md,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: Space.sm,
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
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Space.sm,
    borderRadius: Radius.md,
    paddingVertical: 14,
    borderWidth: 0.5,
    borderColor: Corpus.danger,
  },
  deleteText: {
    fontSize: 14,
    fontWeight: '500',
    color: Corpus.danger,
  },
  center: {
    alignItems: 'center',
    paddingVertical: 80,
    gap: Space.sm,
  },
  muted: {
    fontSize: 14,
    color: Corpus.textMuted,
  },
});
