import { Corpus, Font, Space, tabular, Type } from '@/constants/theme';
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  // summary: what you have + where it sits
  summary: { overflow: 'hidden', backgroundColor: Corpus.card, borderRadius: 28, padding: 18, gap: 4 },
  label: { fontSize: Type.body, color: Corpus.textMuted },
  big: { fontFamily: Font.displayBold, color: Corpus.text, letterSpacing: -1, ...tabular },
  stack: { flexDirection: 'row', height: 18, gap: 3, marginBottom: 4 },
  seg: { height: 18, borderRadius: 6 },
  change: { flexDirection: 'row', alignSelf: 'flex-start', alignItems: 'center', gap: 5, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, marginTop: 4 },
  changeText: { fontSize: Type.body, fontFamily: Font.display, ...tabular },
  ranges: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  rangePill: { minHeight: 36, paddingHorizontal: 14, borderRadius: 18, backgroundColor: Corpus.cardAlt, justifyContent: 'center' },
  rangeOn: { backgroundColor: Corpus.gold },
  rangeText: { fontSize: Type.body, fontFamily: Font.display, color: Corpus.text },
  chartNote: { fontSize: Type.small, color: Corpus.textMuted, lineHeight: 16 },
  chartEmpty: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12, padding: 12, borderRadius: 16, backgroundColor: Corpus.bg },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 28 },
  dot: { width: 10, height: 10, borderRadius: 3 },
  legendName: { flex: 1, fontSize: Type.bodyLg, color: Corpus.text },
  legendAmt: { fontSize: Type.bodyLg, fontFamily: Font.display, color: Corpus.text, ...tabular },
  legendPct: { width: 40, textAlign: 'right', fontSize: Type.body, color: Corpus.textMuted, ...tabular },

  // card dues | lasts
  strip: { flexDirection: 'row', backgroundColor: Corpus.card, borderRadius: 24, paddingVertical: 14 },
  stat: { flex: 1, paddingHorizontal: 16, gap: 2 },
  stripRule: { width: StyleSheet.hairlineWidth, backgroundColor: Corpus.border },
  statLabel: { fontSize: Type.body, color: Corpus.textMuted },
  statValue: { fontSize: Type.h2, fontFamily: Font.displayBold, color: Corpus.text, letterSpacing: -0.4, ...tabular },
  statSub: { fontSize: Type.small, color: Corpus.textMuted, lineHeight: 16 },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  swatch: { width: 10, height: 14, borderRadius: 2, marginLeft: 4 },
  legendText: { fontSize: Type.small, color: Corpus.textMuted, marginRight: 8 },

  // next 30 days, read like a receipt
  card: { backgroundColor: Corpus.card, borderRadius: 24, padding: 16, gap: 10 },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  cardTitle: { fontSize: Type.title, fontFamily: Font.display, color: Corpus.text },
  line: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  lineName: { fontSize: Type.bodyLg, color: Corpus.textMuted },
  lineAmt: { fontSize: Type.bodyLg, color: Corpus.text, ...tabular },
  rule: { height: StyleSheet.hairlineWidth, backgroundColor: Corpus.border, marginVertical: 2 },
  totalName: { fontSize: Type.label, fontFamily: Font.display, color: Corpus.text },
  totalAmt: { fontSize: Type.h3, fontFamily: Font.displayBold, color: Corpus.text, ...tabular },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  pillText: { fontSize: Type.small, fontFamily: Font.display },
  tip: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', paddingTop: 4 },
  tipText: { flex: 1, fontSize: Type.body, color: Corpus.text, lineHeight: 19 },
  strong: { fontFamily: Font.display },

  // stale balances prompt
  nudge: { borderRadius: 20, minHeight: 52, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Corpus.card },
  nudgeTitle: { flex: 1, fontSize: Type.bodyLg, color: Corpus.text },
  nudgeAction: { fontSize: Type.bodyLg, fontFamily: Font.display, color: Corpus.text },

  // check-in trend
  trend: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 70 },
  trendCol: { flex: 1, alignItems: 'center', gap: 4, maxWidth: 26 },
  trendBar: { width: '100%', borderRadius: 4 },
  trendLabel: { fontSize: Type.micro, color: Corpus.textMuted },

  // account rows
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, paddingVertical: 10, paddingHorizontal: Space.md },
  rowBody: { flex: 1, gap: 2 },
  nameLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontSize: Type.label, color: Corpus.text, flexShrink: 1 },
  badge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1, backgroundColor: Corpus.cardAlt },
  badgeText: { fontSize: Type.micro, fontFamily: Font.display, color: Corpus.textMuted },
  meta: { fontSize: Type.small, color: Corpus.textMuted },
  metaWarn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  amount: { fontSize: Type.label, fontFamily: Font.displayBold, color: Corpus.text, textAlign: 'right', ...tabular },
  amountSub: { fontSize: Type.small, color: Corpus.textMuted, textAlign: 'right' },
  extras: { paddingLeft: 62, paddingRight: Space.md, paddingBottom: 12, gap: 8, marginTop: -4 },
  bar: { height: 6, borderRadius: 3, backgroundColor: Corpus.cardAlt, overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3 },
  extra: { flexDirection: 'row', gap: 6, alignItems: 'flex-start' },
  extraText: { flex: 1, fontSize: Type.small, color: Corpus.textMuted, lineHeight: 17 },

  footnote: { fontSize: Type.small, color: Corpus.textMuted, lineHeight: 17, paddingHorizontal: 4, textAlign: 'center' },

  // empty + loading
  empty: { borderRadius: 28, padding: 22, gap: 10, alignItems: 'flex-start', backgroundColor: Corpus.card },
  emptyTitle: { fontSize: Type.h1, fontFamily: Font.displayBold, letterSpacing: -0.5, color: Corpus.text },
  emptyText: { fontSize: Type.bodyLg, lineHeight: 21, color: Corpus.textMuted },
  skel: { backgroundColor: Corpus.card, borderRadius: 24 },
  skelLine: { backgroundColor: Corpus.cardAlt, borderRadius: 6 },
});
