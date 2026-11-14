import { Corpus, Font, Space, Type } from '@/constants/theme';
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Corpus.bg },
  content: { paddingHorizontal: Space.md, paddingTop: Space.sm, paddingBottom: 130, gap: Space.md + 2 },
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heading: { fontSize: Type.amount, fontFamily: Font.display, fontWeight: '700', color: Corpus.text, letterSpacing: 0.3 },
  glassBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, height: 40, paddingHorizontal: 14, borderRadius: 20,
    backgroundColor: Corpus.glass, borderWidth: 0.5, borderColor: Corpus.glassEdge,
    shadowColor: Corpus.shadow, shadowOpacity: 0.5, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  glassText: { fontSize: Type.bodyLg, fontWeight: '600', color: Corpus.gold },
  firstBanner: { backgroundColor: Corpus.goldTint, borderRadius: 18, padding: Space.md, gap: 4 },
  firstTitle: { fontSize: Type.label, fontWeight: '700', color: Corpus.text },
  firstText: { fontSize: Type.body, color: Corpus.textMuted, lineHeight: 19 },
  amountCard: { backgroundColor: Corpus.card, borderRadius: 26, paddingTop: 22, paddingBottom: 16, paddingHorizontal: Space.md, alignItems: 'center', gap: 10 },
  amountRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', alignSelf: 'stretch' },
  rupee: { fontSize: Type.h1 + 6, fontFamily: Font.display, fontWeight: '600', color: Corpus.textFaint, marginRight: 2 },
  amountInput: {
    fontSize: Type.entry + 12, fontFamily: Font.displayBold, fontWeight: '700', color: Corpus.text, letterSpacing: -1.5,
    minWidth: 60, maxWidth: '85%', flexShrink: 1, textAlign: 'center', padding: 0,
  },
  summary: { flexDirection: 'row', alignItems: 'center', gap: 8, maxWidth: '100%', backgroundColor: Corpus.bg, borderRadius: 16, paddingVertical: 6, paddingHorizontal: 10 },
  summaryText: { fontSize: Type.body, color: Corpus.textMuted, flexShrink: 1 },
  block: { gap: 8 },
  blockTitle: { fontSize: Type.h3, fontWeight: '700', color: Corpus.text, paddingHorizontal: 4 },
  guessHint: { fontSize: Type.small, color: Corpus.textMuted, paddingHorizontal: 4 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  stepBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: Corpus.goldTint, alignItems: 'center', justifyContent: 'center' },
  stepText: { fontSize: Type.input, fontWeight: '600', color: Corpus.text, minWidth: 92, textAlign: 'center' },
  noteRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingHorizontal: Space.md },
  noteInput: { flex: 1, fontSize: Type.input, color: Corpus.text, paddingVertical: 12 },
  // used by the Edit screen
  amountSection: { alignItems: 'center', paddingVertical: Space.md, backgroundColor: Corpus.card, borderRadius: 26 },
  amountLabel: { fontSize: Type.small, color: Corpus.textMuted },
  save: { height: 56, borderRadius: 28, backgroundColor: Corpus.gold, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4 },
  saveOff: { backgroundColor: Corpus.cardAlt },
  saveText: { fontSize: Type.input, fontWeight: '700', color: Corpus.onGold },
});
