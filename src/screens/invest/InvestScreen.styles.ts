import { Corpus, Radius, Space, Type } from '@/constants/theme';
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Corpus.bg },
  content: { padding: Space.lg, paddingBottom: 120, gap: Space.md },
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heading: { fontSize: Type.title, fontWeight: '600', color: Corpus.text },
  hero: { backgroundColor: Corpus.card, borderRadius: Radius.lg, borderWidth: 0.5, borderColor: Corpus.border, padding: Space.lg, alignItems: 'center', gap: 4 },
  heroLabel: { fontSize: Type.small, color: Corpus.textMuted, letterSpacing: 0.6 },
  heroValue: { fontSize: Type.amount, fontWeight: '600', color: Corpus.text },
  heroSub: { fontSize: Type.small, color: Corpus.textMuted },
  card: { backgroundColor: Corpus.card, borderRadius: Radius.lg, borderWidth: 0.5, borderColor: Corpus.border, padding: Space.md, gap: 8 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { width: 40, height: 40, borderRadius: 20, backgroundColor: Corpus.cardAlt, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: Type.label, fontWeight: '600', color: Corpus.text },
  meta: { fontSize: Type.small, color: Corpus.textMuted },
  value: { fontSize: Type.label, fontWeight: '600', color: Corpus.text, textAlign: 'right' },
  actions: { flexDirection: 'row', gap: Space.sm },
  stack: { flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden', gap: 2 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 12, rowGap: 2 },
  note: { fontSize: Type.small, color: Corpus.textFaint, lineHeight: 17 },
  emptyBox: { alignItems: 'center', gap: Space.sm, paddingVertical: 40, paddingHorizontal: Space.md },
  emptyTitle: { fontSize: Type.title, fontWeight: '600', color: Corpus.text },
  emptyText: { fontSize: Type.body, color: Corpus.textMuted, textAlign: 'center', lineHeight: 19 },
});
