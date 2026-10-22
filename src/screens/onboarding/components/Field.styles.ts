import { Corpus, Radius, Type } from '@/constants/theme';
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  wrap: { gap: 6 },
  label: { fontSize: Type.caption, letterSpacing: 0.8, color: Corpus.textMuted, fontWeight: '500' },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Corpus.bg,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Corpus.border,
    paddingHorizontal: 14,
  },
  boxFocused: { borderColor: Corpus.gold },
  prefix: { fontSize: Type.title, color: Corpus.gold, fontWeight: '500' },
  input: { flex: 1, paddingVertical: 13, fontSize: Type.input, color: Corpus.text, outlineStyle: 'none' } as any,
  hint: { fontSize: Type.small, color: Corpus.textFaint, lineHeight: 17 },
});
