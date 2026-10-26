import { Corpus, Radius, Space, Type } from '@/constants/theme';
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Corpus.bg },
  content: { padding: Space.lg, paddingBottom: 120, gap: Space.md },
  hero: { backgroundColor: Corpus.card, borderRadius: Radius.lg, borderWidth: 0.5, borderColor: Corpus.border, padding: Space.lg, alignItems: 'center', gap: 4 },
  heroLabel: { fontSize: Type.small, color: Corpus.textMuted, letterSpacing: 0.6 },
  heroValue: { fontSize: Type.amount, fontWeight: '600', color: Corpus.text },
  heroSub: { fontSize: Type.small, color: Corpus.textMuted, textAlign: 'center' },
  card: { backgroundColor: Corpus.card, borderRadius: Radius.lg, borderWidth: 0.5, borderColor: Corpus.border, padding: Space.md, gap: 8 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { width: 40, height: 40, borderRadius: 20, backgroundColor: Corpus.cardAlt, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: Type.label, fontWeight: '600', color: Corpus.text },
  meta: { fontSize: Type.small, color: Corpus.textMuted },
  balance: { fontSize: Type.title, fontWeight: '600' },
  bar: { height: 5, borderRadius: 3, backgroundColor: Corpus.cardAlt, overflow: 'hidden' },
  barFill: { height: 5, borderRadius: 3 },
  note: { fontSize: Type.small, color: Corpus.textFaint, lineHeight: 17 },
  trend: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 6, height: 64 },
  trendCol: { alignItems: 'center', gap: 3, width: 18 },
  trendBar: { width: 14, borderRadius: 3 },
  trendLabel: { fontSize: Type.micro, color: Corpus.textFaint },
  emptyBox: { alignItems: 'center', gap: Space.sm, paddingVertical: 50, paddingHorizontal: Space.md },
  emptyTitle: { fontSize: Type.title, fontWeight: '600', color: Corpus.text },
  emptyText: { fontSize: Type.body, color: Corpus.textMuted, textAlign: 'center', lineHeight: 19 },
});
