import { Corpus, Font, Space, Type } from '@/constants/theme';
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Corpus.bg },
  aura: { position: 'absolute', top: 0, left: 0, right: 0, height: 380 },
  column: { flex: 1, width: '100%', maxWidth: 480, alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: Space.lg, paddingTop: Space.sm, height: 56 },
  headSide: { minWidth: 44, alignItems: 'flex-end' },
  track: { flex: 1, height: 6, borderRadius: 3, backgroundColor: Corpus.cardAlt, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3, backgroundColor: Corpus.gold },
  count: { fontSize: Type.small, color: Corpus.textMuted, textAlign: 'right' },
  skipText: { fontSize: Type.bodyLg, fontFamily: Font.display, color: Corpus.textMuted },
  content: { padding: Space.lg, paddingTop: Space.md, paddingBottom: Space.xl },
  footer: { paddingHorizontal: Space.lg, paddingTop: 12, paddingBottom: Space.md, gap: 10, backgroundColor: Corpus.bg },
  footerHint: { fontSize: Type.small, color: Corpus.textMuted, textAlign: 'center' },
  error: { fontSize: Type.body, color: Corpus.danger, textAlign: 'center' },
});
