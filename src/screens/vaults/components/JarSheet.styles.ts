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
  moneyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Corpus.bg,
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
    paddingVertical: 12,
    fontSize: 14,
    color: Corpus.text,
  },
  templates: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  hint: {
    fontSize: 12,
    color: Corpus.textMuted,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
    backgroundColor: Corpus.bg,
    borderRadius: Radius.md,
    borderWidth: 0.5,
    borderColor: Corpus.border,
    padding: 4,
  },
  dateArrow: {
    width: 36,
    height: 36,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500',
    color: Corpus.text,
  },
  clearDate: {
    fontSize: 12,
    color: Corpus.textMuted,
    paddingHorizontal: Space.sm,
    textDecorationLine: 'underline',
  },
  colors: {
    flexDirection: 'row',
    gap: Space.sm + 2,
  },
  colorDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorSelected: {
    borderWidth: 2,
    borderColor: Corpus.text,
  },
  icons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Space.sm,
  },
  iconChoice: {
    width: 40,
    height: 40,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Corpus.bg,
    borderWidth: 0.5,
    borderColor: Corpus.border,
  },
});
