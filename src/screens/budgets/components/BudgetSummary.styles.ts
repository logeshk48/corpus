import { Corpus, Font, tabular, Type } from '@/constants/theme';
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  card: { backgroundColor: Corpus.card, borderRadius: 28, padding: 18, gap: 4 },
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  label: { fontSize: Type.body, color: Corpus.textMuted },
  big: { fontSize: Type.hero, fontFamily: Font.displayBold, color: Corpus.text, letterSpacing: -1, ...tabular },
  of: { fontSize: Type.bodyLg, color: Corpus.textMuted },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  pillText: { fontSize: Type.small, fontFamily: Font.display },
  paceRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  tick: { width: 2, height: 12, borderRadius: 1, backgroundColor: Corpus.text },
  paceText: { fontSize: Type.small, color: Corpus.textMuted },
  strip: { flexDirection: 'row', marginTop: 14, paddingTop: 14, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Corpus.border },
  stat: { flex: 1, gap: 2 },
  rule: { width: StyleSheet.hairlineWidth, backgroundColor: Corpus.border, marginHorizontal: 12 },
  statLabel: { fontSize: Type.small, color: Corpus.textMuted },
  statValue: { fontSize: Type.title, fontFamily: Font.display, color: Corpus.text, ...tabular },
  monthly: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, minHeight: 44, borderRadius: 14, backgroundColor: Corpus.bg, paddingHorizontal: 14 },
  monthlyLabel: { flex: 1, fontSize: Type.bodyLg, color: Corpus.text },
  monthlyValue: { fontSize: Type.bodyLg, fontFamily: Font.display, color: Corpus.text, ...tabular },
  monthlyAction: { fontSize: Type.bodyLg, color: Corpus.textMuted },
});
