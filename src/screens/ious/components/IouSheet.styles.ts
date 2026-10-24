import { Corpus, Radius, Space, Type } from '@/constants/theme';
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  toggle: { flexDirection: 'row', backgroundColor: Corpus.bg, borderRadius: Radius.md, padding: 4, gap: 4 },
  toggleBtn: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: Radius.sm },
  toggleOn: { backgroundColor: Corpus.goldActive },
  toggleText: { fontSize: Type.bodyLg, color: Corpus.textMuted, fontWeight: '500' },
  toggleTextOn: { color: Corpus.gold },
  input: {
    backgroundColor: Corpus.bg,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Corpus.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: Type.input,
    color: Corpus.text,
  },
  label: { fontSize: Type.caption, color: Corpus.textMuted, letterSpacing: 0.8, fontWeight: '600' },
  field: { gap: 6 },
  body: { gap: Space.md },
  chainToggle: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', backgroundColor: Corpus.bg, borderRadius: Radius.md, padding: 12 },
  chainTitle: { fontSize: Type.bodyLg, color: Corpus.text, fontWeight: '500' },
  chainHint: { fontSize: Type.small, color: Corpus.textMuted, marginTop: 2 },
});
