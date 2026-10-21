import { StyleSheet } from 'react-native';
import { Corpus, Space } from '@/constants/theme';

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
  name: { fontSize: 14, color: Corpus.text },
  tag: {
    fontSize: 9,
    fontWeight: '600',
    color: Corpus.textMuted,
    borderWidth: 0.5,
    borderColor: Corpus.border,
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
    overflow: 'hidden',
  },
  meta: { fontSize: 11, marginTop: 2 },
  loan: { fontSize: 10, color: Corpus.gold, marginTop: 2 },
  right: { alignItems: 'flex-end', gap: 5 },
  amount: { fontSize: 14, fontWeight: '600', color: Corpus.text },
  action: {
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  actionText: { fontSize: 11, fontWeight: '600' },
});
