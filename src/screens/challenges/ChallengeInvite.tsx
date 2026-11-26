import { Tap } from '@/components/ui';
import { Font, Note, Type } from '@/constants/theme';
import { CATALOG } from '@/utils/challenges';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { Badge } from './ChallengesScreen';

// Today's way into Challenges before you've started one: yellow paper, a short promise,
// and three badges you could earn fanned out on the right
export default function ChallengeInvite({ onPress }: { onPress: () => void }) {
  const fan = [CATALOG[0], CATALOG[3], CATALOG[1]];
  return (
    <Tap onPress={onPress} scaleTo={0.98} style={s.card} accessibilityRole="button" accessibilityLabel="Try a 7-day challenge. Open challenges">
      <View style={{ flex: 1, gap: 6 }}>
        <View style={s.tag}><Ionicons name="trophy" size={12} color={Note.ink} /><Text style={s.tagText}>Challenges</Text></View>
        <Text style={s.title}>Try a 7-day challenge</Text>
        <Text style={s.sub}>Small goals, checked for you. Finish one, keep the badge.</Text>
        <View style={s.cta}>
          <Text style={s.ctaText}>Pick one</Text>
          <Ionicons name="arrow-forward" size={15} color={Note.bg} />
        </View>
      </View>
      <View style={s.fan} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {fan.map((b, i) => (
          <View key={b.kind} style={[s.slot, { top: [0, 38, 78][i], left: [18, 0, 22][i], zIndex: 3 - i }]}>
            <Badge info={b} i={i} size={58} />
          </View>
        ))}
      </View>
    </Tap>
  );
}

const s = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Note.bg, borderRadius: 26, padding: 18, overflow: 'hidden' },
  tag: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: Note.tape },
  tagText: { fontSize: Type.small, fontFamily: Font.displayBold, color: Note.ink },
  title: { fontSize: Type.h2, lineHeight: 26, fontFamily: Font.displayBold, color: Note.ink, letterSpacing: -0.3 },
  sub: { fontSize: Type.body, lineHeight: 18, color: Note.sub },
  cta: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, paddingHorizontal: 15, borderRadius: 18, backgroundColor: Note.ink, marginTop: 4 },
  ctaText: { fontSize: Type.body, fontFamily: Font.displayBold, color: Note.bg },
  fan: { width: 84, height: 140 },
  slot: { position: 'absolute' },
});
