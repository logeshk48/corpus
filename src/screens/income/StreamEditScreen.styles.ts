import { StyleSheet } from 'react-native';
import { Corpus, Radius, Space, Type } from '@/constants/theme';

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
    fontSize: Type.caption,
    color: Corpus.textMuted,
  },
  statValue: {
    fontSize: Type.title,
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
    fontSize: Type.small,
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
    fontSize: Type.small,
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
    fontSize: Type.small,
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
    fontSize: Type.bodyLg,
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
    fontSize: Type.bodyLg,
    color: Corpus.textMuted,
  },
  moneyInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: Type.bodyLg,
    color: Corpus.text,
  },
  hint: {
    fontSize: Type.caption,
    color: Corpus.textFaint,
  },
  error: {
    fontSize: Type.caption,
    color: Corpus.danger,
  },
  center: {
    alignItems: 'center',
    paddingVertical: 80,
    gap: Space.sm,
  },
  muted: {
    fontSize: Type.bodyLg,
    color: Corpus.textMuted,
  },
});
