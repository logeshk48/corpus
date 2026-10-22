import { StyleSheet } from 'react-native';
import { Corpus, Space, Type } from '@/constants/theme';

export const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm + 4,
    paddingHorizontal: Space.md,
    paddingVertical: 12,
  },
  divider: { borderTopWidth: 0.5, borderTopColor: Corpus.border },
  pressed: { opacity: 0.7 },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Corpus.cardAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontSize: Type.bodyLg, color: Corpus.text },
  tag: {
    fontSize: Type.micro,
    fontWeight: '600',
    color: Corpus.textMuted,
    borderWidth: 0.5,
    borderColor: Corpus.border,
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
    overflow: 'hidden',
  },
  meta: { fontSize: Type.caption, marginTop: 2 },
  loan: { fontSize: Type.micro, color: Corpus.gold, marginTop: 2 },
  right: { alignItems: 'flex-end', gap: 5 },
  amount: { fontSize: Type.bodyLg, fontWeight: '600', color: Corpus.text },
  action: {
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  actionText: { fontSize: Type.caption, fontWeight: '600' },
});
