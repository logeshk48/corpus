import { Corpus, Font, Radius, Space, Type } from '@/constants/theme';
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Corpus.bg,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Space.md,
    paddingTop: Space.sm,
    paddingBottom: 130, // room for the floating tab bar
    gap: Space.md + 2,
  },
  actions: { gap: 10 },
  primary: { height: 58, borderRadius: 29, backgroundColor: Corpus.gold, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  primaryText: { fontSize: Type.title, fontFamily: Font.display, color: Corpus.onGold },
  secondaryRow: { flexDirection: 'row', gap: 10 },
  secondary: { flex: 1, minHeight: 48, borderRadius: 24, backgroundColor: Corpus.card, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 10 },
  secondaryText: { fontSize: Type.bodyLg, fontFamily: Font.display, color: Corpus.text },
  compact: { position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: Corpus.glass, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Corpus.border },
  compactText: { fontSize: Type.title, fontWeight: '600', color: Corpus.text },
  statsRow: {
    flexDirection: 'row',
    gap: Space.sm + 2,
  },
  needsHead: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4, marginBottom: -4 },
  needsTitle: { fontSize: Type.h3, fontFamily: Font.displayBold, color: Corpus.text },
  needsBadge: { minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 6, backgroundColor: Corpus.gold, alignItems: 'center', justifyContent: 'center' },
  needsBadgeText: { fontSize: Type.small, fontFamily: Font.displayBold, color: Corpus.onGold },
  pausedCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Corpus.card, borderRadius: 22, padding: 14, borderWidth: 1.5, borderColor: Corpus.warning },
  pausedTitle: { fontSize: Type.label, fontFamily: Font.display, color: Corpus.text },
  pausedText: { fontSize: Type.body, color: Corpus.textMuted, lineHeight: 18 },
  pausedBtn: { minHeight: 36, paddingHorizontal: 16, borderRadius: 18, backgroundColor: Corpus.gold, justifyContent: 'center' },
  pausedBtnText: { fontSize: Type.body, fontFamily: Font.display, color: Corpus.onGold },
  linkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm + 4,
    backgroundColor: Corpus.card,
    borderRadius: 22,
    paddingVertical: 12,
    paddingHorizontal: Space.md,
  },
  linkIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Corpus.incomeTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkIconGold: {
    backgroundColor: Corpus.goldActive,
  },
  linkValue: {
    fontSize: Type.small,
    fontWeight: '500',
    color: Corpus.gold,
  },
  linkText: {
    flex: 1,
    fontSize: Type.body,
    fontWeight: '500',
    color: Corpus.text,
  },
  sectionTitle: {
    fontSize: Type.body,
    fontWeight: '500',
    color: Corpus.text,
    marginTop: Space.sm,
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Space.sm,
  },
  sectionTitleInline: {
    fontSize: Type.body,
    fontWeight: '500',
    color: Corpus.text,
  },
  viewAll: {
    fontSize: Type.small,
    fontWeight: '500',
    color: Corpus.gold,
  },
  budgets: {
    gap: Space.sm + 4,
  },
  recentList: {
    gap: Space.md,
  },
  loader: {
    paddingVertical: Space.lg,
  },
  emptyText: {
    fontSize: Type.small,
    color: Corpus.textMuted,
    paddingVertical: Space.md,
  },
  errorText: {
    fontSize: Type.small,
    color: Corpus.danger,
    paddingVertical: Space.md,
  },
});