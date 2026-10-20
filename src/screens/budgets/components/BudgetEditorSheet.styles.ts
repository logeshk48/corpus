import { StyleSheet } from 'react-native';
import { Corpus, Radius, Space } from '@/constants/theme';

export const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  sheet: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: Corpus.card,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    borderWidth: 0.5,
    borderColor: Corpus.border,
    padding: Space.lg,
    paddingBottom: Space.xl,
    gap: Space.md,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Corpus.border,
    marginBottom: Space.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm + 4,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2E2712',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleBlock: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '500',
    color: Corpus.text,
  },
  subtitle: {
    fontSize: 12,
    color: Corpus.textMuted,
    marginTop: 2,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Corpus.cardAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Space.md,
  },
  rupee: {
    fontSize: 30,
    color: Corpus.textMuted,
    marginRight: 4,
  },
  amountInput: {
    fontSize: 42,
    fontWeight: '500',
    color: Corpus.gold,
    minWidth: 140,
    textAlign: 'center',
    padding: 0,
  },
  perMonth: {
    textAlign: 'center',
    fontSize: 12,
    color: Corpus.textMuted,
    marginTop: -Space.sm,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Space.sm,
    justifyContent: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    borderWidth: 0.5,
    borderColor: Corpus.border,
    backgroundColor: Corpus.bg,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  chipSuggested: {
    borderColor: Corpus.gold,
    backgroundColor: '#2E2712',
  },
  chipText: {
    fontSize: 12,
    color: Corpus.textMuted,
  },
  chipTextSuggested: {
    color: Corpus.gold,
    fontWeight: '500',
  },
  hint: {
    fontSize: 11,
    color: Corpus.textFaint,
    textAlign: 'center',
  },
  error: {
    fontSize: 11,
    color: Corpus.danger,
    textAlign: 'center',
  },
  saveButton: {
    backgroundColor: Corpus.gold,
    borderRadius: Radius.md,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: Space.xs,
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
  removeButton: {
    alignItems: 'center',
    paddingVertical: Space.sm,
  },
  removeText: {
    fontSize: 13,
    fontWeight: '500',
    color: Corpus.danger,
  },
});
