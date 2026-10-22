import { Corpus, Radius, Type } from '@/constants/theme';
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  base: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },

  // Sizes
  lg: { height: 52, borderRadius: Radius.md, paddingHorizontal: 20 },
  sm: { height: 32, borderRadius: 999, paddingHorizontal: 12, gap: 4 },
  labelLg: { fontSize: Type.input, fontWeight: '600' },
  labelSm: { fontSize: Type.body, fontWeight: '600' },

  // Variants
  primary: { backgroundColor: Corpus.gold },
  secondary: { backgroundColor: Corpus.card, borderWidth: 1, borderColor: Corpus.border },
  ghost: { backgroundColor: 'transparent' },
  quiet: { backgroundColor: 'transparent' },
  danger: { backgroundColor: Corpus.dangerTint, borderWidth: 1, borderColor: Corpus.dangerLine },
  disabled: { backgroundColor: Corpus.cardAlt, borderWidth: 0 },

  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
});
