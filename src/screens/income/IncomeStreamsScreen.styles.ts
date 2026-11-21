import { Corpus, Font, tabular, Type } from '@/constants/theme';
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  skel: { backgroundColor: Corpus.card, borderRadius: 24 },
  hero: { overflow: 'hidden', backgroundColor: Corpus.card, borderRadius: 28, padding: 18, gap: 4 },
  label: { fontSize: Type.body, color: Corpus.textMuted },
  big: { fontSize: Type.hero, fontFamily: Font.displayBold, color: Corpus.text, letterSpacing: -1, ...tabular },
  sub: { fontSize: Type.bodyLg, color: Corpus.textMuted, lineHeight: 20, ...tabular },
  split: { flexDirection: 'row', alignItems: 'center', gap: 18, marginTop: 14, paddingTop: 14, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Corpus.border },
  donutNum: { fontSize: Type.h3, fontFamily: Font.displayBold, color: Corpus.text, ...tabular },
  donutLabel: { fontSize: Type.small, color: Corpus.textMuted },
  legend: { flex: 1, gap: 10 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  legendName: { flex: 1, fontSize: Type.bodyLg, color: Corpus.text },
  legendPct: { fontSize: Type.bodyLg, fontFamily: Font.display, color: Corpus.text, ...tabular },
  chart: { marginTop: 14, paddingTop: 14, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Corpus.border },
  strip: { flexDirection: 'row', marginTop: 14, paddingTop: 14, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Corpus.border },
  stat: { flex: 1, gap: 2 },
  rule: { width: StyleSheet.hairlineWidth, backgroundColor: Corpus.border, marginHorizontal: 12 },
  statLabel: { fontSize: Type.small, color: Corpus.textMuted },
  statValue: { fontSize: Type.title, fontFamily: Font.display, color: Corpus.text, ...tabular },
  foot: { fontSize: Type.small, color: Corpus.textMuted, paddingHorizontal: 4 },
  muted: { fontSize: Type.bodyLg, color: Corpus.textMuted },
  empty: { borderRadius: 28, padding: 22, gap: 10, alignItems: 'flex-start', backgroundColor: Corpus.card },
  emptyTitle: { fontSize: Type.h1, fontFamily: Font.displayBold, letterSpacing: -0.5, color: Corpus.text },
  emptyText: { fontSize: Type.bodyLg, lineHeight: 21, color: Corpus.textMuted },
});
