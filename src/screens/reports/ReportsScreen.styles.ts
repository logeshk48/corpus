import { Corpus, Font, Radius, Space, Type } from '@/constants/theme';
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Corpus.bg },
  content: { padding: Space.lg, paddingBottom: 120, gap: Space.md },
  tabs: { flexDirection: 'row', gap: Space.sm },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: Radius.md, borderWidth: 0.5, borderColor: Corpus.border, backgroundColor: Corpus.card },
  tabOn: { borderColor: Corpus.gold, backgroundColor: Corpus.goldTint },
  tabText: { fontSize: Type.small, fontWeight: '600', color: Corpus.textMuted },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  arrow: { padding: 8 },
  stepperText: { fontSize: Type.title, fontFamily: Font.display, color: Corpus.text },
  card: { backgroundColor: Corpus.card, borderRadius: Radius.lg, borderWidth: 0.5, borderColor: Corpus.border, padding: Space.md, gap: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 12 },
  cell: { width: '50%', gap: 2 },
  cellLabel: { fontSize: Type.caption, color: Corpus.textFaint, letterSpacing: 0.4 },
  cellValue: { fontSize: Type.h3, fontFamily: Font.display, color: Corpus.text },
  name: { fontSize: Type.label, fontWeight: '600', color: Corpus.text },
  meta: { fontSize: Type.small, color: Corpus.textMuted, lineHeight: 17 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 5 },
  col: { fontSize: Type.small, color: Corpus.text, textAlign: 'right' },
  head: { fontSize: Type.caption, color: Corpus.textFaint, textAlign: 'right', letterSpacing: 0.4 },
  barBg: { height: 6, borderRadius: 3, backgroundColor: Corpus.cardAlt, overflow: 'hidden', flex: 1 },
  barFill: { height: 6, borderRadius: 3, backgroundColor: Corpus.gold },
  note: { fontSize: Type.small, color: Corpus.textFaint, lineHeight: 17 },
});
