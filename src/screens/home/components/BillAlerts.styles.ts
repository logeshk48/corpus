import { StyleSheet } from 'react-native';
import { Corpus, Radius, Space, Type } from '@/constants/theme';

export const styles = StyleSheet.create({
  list: { gap: Space.sm },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm + 4,
    borderRadius: Radius.lg,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: Space.md,
  },
  pressed: { opacity: 0.8 },
  icon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1 },
  title: { fontSize: Type.bodyLg, fontWeight: '600', color: Corpus.text },
  sub: { fontSize: Type.caption, marginTop: 2 },
  loan: { fontSize: Type.micro, color: Corpus.textMuted, marginTop: 2 },
  button: { borderRadius: 999, paddingVertical: 7, paddingHorizontal: 12 },
  buttonText: { fontSize: Type.small, fontWeight: '700', color: Corpus.onGold },
});
