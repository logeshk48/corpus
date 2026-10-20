import { StyleSheet } from 'react-native';
import { Corpus, Radius, Space } from '@/constants/theme';

export const styles = StyleSheet.create({
  card: {
    backgroundColor: Corpus.card,
    borderRadius: Radius.xl,
    borderWidth: 0.5,
    borderColor: Corpus.border,
    padding: Space.lg,
    gap: Space.md,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  label: {
    fontSize: 12,
    color: Corpus.textMuted,
    letterSpacing: 0.4,
  },
  bigNumber: {
    fontSize: 32,
    fontWeight: '500',
    color: Corpus.text,
    marginTop: 4,
  },
  ofLimit: {
    fontSize: 13,
    color: Corpus.textMuted,
    marginTop: 2,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  barWrap: {
    gap: 6,
  },
  track: {
    height: 10,
    borderRadius: 5,
    backgroundColor: Corpus.bg,
    overflow: 'hidden',
  },
  fill: {
    height: 10,
    borderRadius: 5,
  },
  marker: {
    position: 'absolute',
    top: -3,
    width: 2,
    height: 16,
    borderRadius: 1,
    backgroundColor: Corpus.goldSoft,
  },
  markerRow: {
    position: 'relative',
  },
  markerHint: {
    fontSize: 10,
    color: Corpus.textFaint,
  },
  stats: {
    flexDirection: 'row',
    borderTopWidth: 0.5,
    borderTopColor: Corpus.border,
    paddingTop: Space.md,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statDivider: {
    borderLeftWidth: 0.5,
    borderLeftColor: Corpus.border,
  },
  statLabel: {
    fontSize: 11,
    color: Corpus.textMuted,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '500',
    color: Corpus.text,
  },
  statGold: {
    color: Corpus.gold,
  },
});
