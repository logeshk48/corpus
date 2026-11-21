import { Corpus, Font, tabular, Type } from '@/constants/theme';
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  hero: { backgroundColor: Corpus.card, borderRadius: 28, padding: 18, gap: 4 },
  label: { fontSize: Type.body, color: Corpus.textMuted },
  big: { fontSize: Type.hero, fontFamily: Font.displayBold, color: Corpus.text, letterSpacing: -1, ...tabular },
  sub: { fontSize: Type.bodyLg, color: Corpus.textMuted, ...tabular },
  stats: { flexDirection: 'row', marginTop: 14, paddingTop: 14, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Corpus.border },
  stat: { flex: 1, gap: 2 },
  rule: { width: StyleSheet.hairlineWidth, backgroundColor: Corpus.border, marginHorizontal: 12 },
  statLabel: { fontSize: Type.small, color: Corpus.textMuted },
  statValue: { fontSize: Type.title, fontFamily: Font.display, color: Corpus.text, ...tabular },
  card: { backgroundColor: Corpus.card, borderRadius: 24, padding: 16, gap: 12 },
  cardTitle: { fontSize: Type.title, fontFamily: Font.displayBold, color: Corpus.text },
  foot: { fontSize: Type.body, lineHeight: 19, color: Corpus.textMuted, marginTop: 10, ...tabular },
  split: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  donutNum: { fontSize: Type.title, fontFamily: Font.displayBold, color: Corpus.text, ...tabular },
  donutLabel: { fontSize: Type.small, color: Corpus.textMuted },
  legend: { flex: 1, gap: 10 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  legendName: { flex: 1, fontSize: Type.bodyLg, color: Corpus.text },
  legendPct: { fontSize: Type.bodyLg, fontFamily: Font.display, color: Corpus.text, ...tabular },
  csv: { fontSize: Type.small, fontFamily: Font.display, color: Corpus.textMuted, borderWidth: 1, borderColor: Corpus.border, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, overflow: 'hidden' },
  note: { fontSize: Type.small, lineHeight: 18, color: Corpus.textMuted, paddingHorizontal: 4 },
});
