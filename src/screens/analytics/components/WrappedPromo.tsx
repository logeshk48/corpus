import { Tap } from '@/components/ui';
import { Chip, Font, Note, Pastel, Type } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, Path, Text as SvgText, TextPath } from 'react-native-svg';

// The way into a month's story: a lilac card with a round "open me" badge, tilted like a sticker
export default function WrappedPromo({ month, onPress }: { month: string; onPress: () => void }) {
  const t = Pastel.lilac;
  return (
    <Tap onPress={onPress} scaleTo={0.98} style={[s.card, { backgroundColor: t.bg }]} accessibilityRole="button" accessibilityLabel={`Play your ${month} story`}>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={[s.kicker, { color: t.icon }]}>Ready to play</Text>
        <Text style={[s.title, { color: t.fg }]}>Your {month} story</Text>
        <Text style={[s.sub, { color: t.fg }]}>Nine cards, about a minute. Share your badge, never your amounts.</Text>
      </View>
      <View style={s.badge} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Svg width={92} height={92} viewBox="0 0 100 100">
          <Defs><Path id="ring" d="M50 50 m-36 0 a36 36 0 1 1 72 0 a36 36 0 1 1 -72 0" /></Defs>
          <Circle cx={50} cy={50} r={48} fill={Chip.yellow} />
          <SvgText fill={Note.ink} fontSize={10.5} fontWeight="700" letterSpacing={1.4}>
            <TextPath href="#ring">open me, your month in a minute, open me,</TextPath>
          </SvgText>
        </Svg>
        <View style={s.gift}><Ionicons name="gift" size={26} color={Note.ink} /></View>
      </View>
    </Tap>
  );
}

const s = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 24, padding: 18 },
  kicker: { fontSize: Type.small, fontFamily: Font.displayBold },
  title: { fontSize: Type.h3, fontFamily: Font.displayBold },
  sub: { fontSize: Type.body, lineHeight: 18, opacity: 0.85 },
  badge: { width: 92, height: 92, transform: [{ rotate: '-12deg' }] },
  gift: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
});
