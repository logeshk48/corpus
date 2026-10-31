import { Corpus, Radius, Space, Type } from '@/constants/theme';
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Corpus.bg },
  content: { padding: Space.lg, paddingBottom: 120, gap: Space.md },
  hero: { backgroundColor: Corpus.card, borderRadius: Radius.lg, borderWidth: 0.5, borderColor: Corpus.border, padding: Space.lg, gap: 6, alignItems: 'center' },
  ring: { width: 120, height: 120, borderRadius: 60, borderWidth: 6, alignItems: 'center', justifyContent: 'center' },
  ringNum: { fontSize: Type.entry, fontWeight: '700' },
  ringOf: { fontSize: Type.caption, color: Corpus.textMuted, marginTop: -4 },
  grade: { fontSize: Type.h3, fontWeight: '700' },
  sub: { fontSize: Type.small, color: Corpus.textMuted, textAlign: 'center', lineHeight: 17 },
  fixCard: { backgroundColor: Corpus.goldTint, borderRadius: Radius.lg, borderWidth: 0.5, borderColor: Corpus.goldLine, padding: Space.md, gap: 6 },
  fixLabel: { fontSize: Type.caption, color: Corpus.gold, fontWeight: '700', letterSpacing: 0.6 },
  fixText: { fontSize: Type.bodyLg, color: Corpus.text, fontWeight: '600', lineHeight: 20 },
  card: { backgroundColor: Corpus.card, borderRadius: Radius.lg, borderWidth: 0.5, borderColor: Corpus.border, padding: Space.md, gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  icon: { width: 34, height: 34, borderRadius: 17, backgroundColor: Corpus.cardAlt, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: Type.label, fontWeight: '600', color: Corpus.text },
  pts: { fontSize: Type.label, fontWeight: '700' },
  value: { fontSize: Type.body, color: Corpus.text },
  why: { fontSize: Type.small, color: Corpus.textMuted, lineHeight: 17 },
  fix: { fontSize: Type.small, color: Corpus.gold, lineHeight: 17 },
  barBg: { height: 6, borderRadius: 3, backgroundColor: Corpus.cardAlt, overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3 },
  note: { fontSize: Type.small, color: Corpus.textFaint, lineHeight: 17 },
});
