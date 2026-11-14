import { Corpus, Font, Type } from '@/constants/theme';
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  wrap: { gap: 2 },
  container: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  greeting: { flex: 1, fontSize: Type.body, fontWeight: '500', color: Corpus.textMuted },
  name: { fontSize: Type.amount, fontFamily: Font.display, fontWeight: '700', color: Corpus.text, letterSpacing: 0.3 },
  actions: { flexDirection: 'row', gap: 8 },
  round: {
    width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
    backgroundColor: Corpus.glass, borderWidth: 0.5, borderColor: Corpus.glassEdge,
    shadowColor: Corpus.shadow, shadowOpacity: 0.6, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  dot: { position: 'absolute', top: 8, right: 9, width: 9, height: 9, borderRadius: 5, backgroundColor: Corpus.danger, borderWidth: 1.5, borderColor: Corpus.card },
  avatar: { backgroundColor: Corpus.gold, borderColor: Corpus.gold },
  avatarText: { fontSize: Type.input, fontWeight: '700', color: Corpus.onGold },
  // kept for older imports
  badge: { position: 'absolute', top: -6, right: -8, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: Corpus.danger, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  badgeText: { fontSize: Type.micro, fontWeight: '700', color: Corpus.card },
});
