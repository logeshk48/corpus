import { Corpus, Radius, Space, Type } from '@/constants/theme';
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  card: {
    backgroundColor: Corpus.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Corpus.border,
    padding: Space.md,
    gap: 12,
  },
  cardOn: { borderColor: Corpus.gold, backgroundColor: Corpus.goldTint },
  top: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Corpus.cardAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconOn: { backgroundColor: Corpus.gold },
  body: { flex: 1, gap: 3 },
  title: { fontSize: Type.input, fontWeight: '600', color: Corpus.text },
  line: { fontSize: Type.body, color: Corpus.textMuted },
  check: {
    width: 24,
    height: 24,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Corpus.textFaint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: { backgroundColor: Corpus.gold, borderColor: Corpus.gold },
  insight: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Corpus.border,
  },
  insightText: { flex: 1, fontSize: Type.body, lineHeight: 18, color: Corpus.goldSoft },
});
