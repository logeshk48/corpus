import { StyleSheet } from 'react-native';
import { Corpus, Font, Radius, Space, Type } from '@/constants/theme';

// The one loud card in the app: today's number, set in the display face, with the money-month ticks under it
export const styles = StyleSheet.create({
  card: {
    backgroundColor: Corpus.card,
    borderRadius: Radius.xl,
    paddingTop: Space.lg - 4,
    paddingBottom: Space.md,
    paddingHorizontal: Space.lg - 4,
    borderWidth: 0.5,
    borderColor: Corpus.goldLine,
    gap: 2,
  },
  pressed: { opacity: 0.85 },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  label: { fontSize: Type.body, color: Corpus.textMuted },
  amount: { fontSize: Type.hero + 4, fontFamily: Font.displayBold, letterSpacing: -1, marginTop: 2 },
  context: { fontSize: Type.body, color: Corpus.text, marginTop: 2 },
  cycle: { marginTop: Space.md, gap: 6 },
  ticks: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 12 },
  tick: { flex: 1, height: 6, borderRadius: 2, backgroundColor: Corpus.border },
  tickGone: { backgroundColor: Corpus.textFaint },
  cycleText: { fontSize: Type.small, color: Corpus.textMuted },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm, marginTop: Space.sm + 2 },
  chip: { borderRadius: 999, backgroundColor: Corpus.bg, paddingVertical: 4, paddingHorizontal: 10 },
  chipText: { fontSize: Type.caption, color: Corpus.textMuted },
  how: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: Space.sm + 2 },
  howText: { fontSize: Type.small, fontWeight: '500', color: Corpus.gold },
  emptyText: { fontSize: Type.body, color: Corpus.textMuted, marginTop: 6, lineHeight: 19 },
});
