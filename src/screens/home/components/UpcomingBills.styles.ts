import { StyleSheet } from 'react-native';
import { Corpus, Radius, Space, Type } from '@/constants/theme';

export const styles = StyleSheet.create({
  card: {
    backgroundColor: Corpus.card,
    borderRadius: Radius.md,
    borderWidth: 0.5,
    borderColor: Corpus.border,
    paddingVertical: 12,
    paddingHorizontal: Space.md,
    gap: 10,
  },
  pressed: { opacity: 0.75 },
  top: { flexDirection: 'row', alignItems: 'center', gap: Space.sm + 4 },
  icon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Corpus.violetTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { flex: 1, fontSize: Type.body, fontWeight: '500', color: Corpus.text },
  value: { fontSize: Type.small, fontWeight: '500', color: Corpus.textMuted },
  list: {
    gap: 8,
    borderTopWidth: 0.5,
    borderTopColor: Corpus.border,
    paddingTop: 10,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: Space.sm },
  when: { width: 74, fontSize: Type.caption, fontWeight: '500' },
  name: { flex: 1, fontSize: Type.small, color: Corpus.text },
  amount: { fontSize: Type.small, fontWeight: '600', color: Corpus.text },
  none: { fontSize: Type.caption, color: Corpus.textFaint },
});
