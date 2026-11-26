import { Tap } from '@/components/ui';
import { Chip, Font, Note, tabular, Type } from '@/constants/theme';
import type { ActiveChallenge } from '@/types/settings';
import { infoOf, type ChallengeState } from '@/utils/challenges';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

// A running challenge as a yellow sticker card: what it is, how far, one mark per day, and what to do.
// compact: the one-line version for Today.
export default function ChallengeCard({ c, st, compact, onPress, onCollect, onRetry, onStop, busy }: {
  c: ActiveChallenge; st: ChallengeState; compact?: boolean; busy?: boolean;
  onPress?: () => void; onCollect?: () => void; onRetry?: () => void; onStop?: () => void;
}) {
  const info = infoOf(c.kind);
  const title = info.title(c.category);
  const body = (
    <>
      <View style={s.top}>
        <View style={s.tag}><Ionicons name={info.icon as keyof typeof Ionicons.glyphMap} size={12} color={Note.ink} /><Text style={s.tagText}>Challenge</Text></View>
        <Text style={s.left}>{st.left}</Text>
      </View>
      <View style={s.mid}>
        <Text style={[s.title, compact && s.titleSm]} numberOfLines={2}>{title}</Text>
        <Text style={[s.count, compact && s.countSm]}>{st.count}</Text>
      </View>
      {st.days.length > 0 ? (
        <View style={s.days} accessibilityLabel={st.days.map((d, i) => `Day ${i + 1} ${d}`).join(', ')}>
          {st.days.map((d, i) => (
            <View key={i} style={[s.day, d === 'pass' && s.dayPass, d === 'fail' && s.dayFail, d === 'today' && s.dayToday]}>
              {d === 'fail' && <Ionicons name="close" size={11} color={Note.bg} />}
              {d === 'pass' && <Ionicons name="checkmark" size={11} color={Note.bg} />}
            </View>
          ))}
        </View>
      ) : (
        <View style={s.track}><View style={[s.fill, { width: `${st.progress * 100}%` }]} /></View>
      )}
      <Text style={s.line}>{st.line}</Text>
      {!compact && (st.status !== 'running' || onStop) && (
        <View style={s.actions}>
          {st.status === 'won' && onCollect && (
            <Pressable onPress={onCollect} disabled={busy} style={[s.btn, s.btnOn]} accessibilityRole="button">
              {busy ? <ActivityIndicator size="small" color={Note.bg} /> : <Text style={[s.btnText, { color: Note.bg }]}>Collect badge</Text>}
            </Pressable>
          )}
          {st.status === 'lost' && onRetry && (
            <Pressable onPress={onRetry} disabled={busy} style={[s.btn, s.btnOn]} accessibilityRole="button"><Text style={[s.btnText, { color: Note.bg }]}>Start again</Text></Pressable>
          )}
          {onStop && st.status !== 'won' && (
            <Pressable onPress={onStop} disabled={busy} style={[s.btn, s.btnOff]} accessibilityRole="button"><Text style={s.btnText}>{st.status === 'lost' ? 'Let it go' : 'Stop'}</Text></Pressable>
          )}
        </View>
      )}
    </>
  );
  if (onPress) return <Tap onPress={onPress} scaleTo={0.98} style={[s.card, compact && s.cardSm]} accessibilityRole="button">{body}</Tap>;
  return <View style={s.card}>{body}</View>;
}

const s = StyleSheet.create({
  card: { backgroundColor: Note.bg, borderRadius: 24, padding: 18, gap: 12, transform: [{ rotate: '-0.8deg' }] },
  cardSm: { padding: 16, gap: 10 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: Note.tape },
  tagText: { fontSize: Type.small, fontFamily: Font.displayBold, color: Note.ink },
  left: { fontSize: Type.small, fontFamily: Font.displayBold, color: Note.label },
  mid: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 },
  title: { flex: 1, fontSize: Type.h2, lineHeight: 26, fontFamily: Font.displayBold, color: Note.ink, letterSpacing: -0.3 },
  titleSm: { fontSize: Type.title, lineHeight: 22 },
  count: { fontSize: Type.amount, fontFamily: Font.brand, color: Note.ink, ...tabular },
  countSm: { fontSize: Type.h1 },
  days: { flexDirection: 'row', gap: 6 },
  day: { flex: 1, height: 22, borderRadius: 11, borderWidth: 2, borderColor: Note.label, opacity: 0.45, alignItems: 'center', justifyContent: 'center' },
  dayPass: { backgroundColor: Note.ink, borderColor: Note.ink, opacity: 1 },
  dayFail: { backgroundColor: Chip.red, borderColor: Chip.red, opacity: 1 },
  dayToday: { borderColor: Note.ink, opacity: 1, borderStyle: 'dashed' },
  track: { height: 10, borderRadius: 5, backgroundColor: Note.tape, overflow: 'hidden' },
  fill: { height: 10, borderRadius: 5, backgroundColor: Note.ink },
  line: { fontSize: Type.bodyLg, lineHeight: 20, color: Note.sub },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  btn: { height: 36, paddingHorizontal: 15, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  btnOn: { backgroundColor: Note.ink },
  btnOff: { borderWidth: 1.5, borderColor: Note.ink },
  btnText: { fontSize: Type.body, fontFamily: Font.displayBold, color: Note.ink },
});
