import { Corpus, Radius, Space, Type } from '@/constants/theme';
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Corpus.bg },
  content: { padding: Space.lg, paddingBottom: 120, gap: Space.md },
  hero: { backgroundColor: Corpus.card, borderRadius: Radius.lg, borderWidth: 0.5, borderColor: Corpus.border, padding: Space.lg, gap: 4, alignItems: 'center' },
  heroLabel: { fontSize: Type.small, color: Corpus.textMuted, letterSpacing: 0.6 },
  heroValue: { fontSize: Type.amount, fontWeight: '600', color: Corpus.danger },
  heroSub: { fontSize: Type.small, color: Corpus.textMuted, textAlign: 'center' },
  tiles: { flexDirection: 'row', gap: Space.sm },
  tile: { flex: 1, backgroundColor: Corpus.card, borderRadius: Radius.md, borderWidth: 0.5, borderColor: Corpus.border, padding: 10, gap: 2 },
  tileLabel: { fontSize: Type.caption, color: Corpus.textMuted },
  tileValue: { fontSize: Type.bodyLg, fontWeight: '600', color: Corpus.text },
  card: { backgroundColor: Corpus.card, borderRadius: Radius.lg, borderWidth: 0.5, borderColor: Corpus.border, padding: Space.md, gap: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { width: 36, height: 36, borderRadius: 18, backgroundColor: Corpus.cardAlt, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: Type.label, fontWeight: '600', color: Corpus.text },
  meta: { fontSize: Type.small, color: Corpus.textMuted },
  value: { fontSize: Type.label, fontWeight: '600', color: Corpus.text, textAlign: 'right' },
  badge: { alignSelf: 'flex-start', borderRadius: Radius.sm, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: Type.caption, fontWeight: '700' },
  note: { fontSize: Type.small, color: Corpus.textFaint, lineHeight: 17 },
  empty: { alignItems: 'center', gap: Space.sm, paddingVertical: 40 },
  emptyTitle: { fontSize: Type.title, fontWeight: '600', color: Corpus.text },
});
