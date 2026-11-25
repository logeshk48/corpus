import { IconChip, Tap } from '@/components/ui';
import { Chip, Corpus, Font, Type } from '@/constants/theme';
import type { CatchUp } from '@/utils/catchUp';
import { StyleSheet, Text, View } from 'react-native';

// Missing a few days is the top reason people quit trackers: they feel behind and delete the app.
// No guilt, no streak, just an easy way back in.
export default function CatchUpCard({ data, onPress }: { data: CatchUp; onPress: () => void }) {
  const since = data.lastLogged
    ? data.missedDays <= 6
      ? data.lastLogged.toLocaleDateString('en-IN', { weekday: 'long' })
      : data.lastLogged.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    : '';
  return (
    <Tap onPress={onPress} scaleTo={0.98} style={needStyles.card} accessibilityRole="button" accessibilityLabel={`Nothing logged since ${since}. Catch up`}>
      <IconChip icon="time" color={Chip.orange} size={38} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={needStyles.title}>Last entry {since}</Text>
        <Text style={needStyles.text}>Add what you remember. A rough amount beats a gap.</Text>
      </View>
      <View style={needStyles.btn}><Text style={needStyles.btnText}>Catch up</Text></View>
    </Tap>
  );
}

// Shared look for the cards under "Needs you": icon, what it is, one action
export const needStyles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Corpus.card, borderRadius: 22, padding: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: Corpus.border },
  title: { fontSize: Type.label, fontFamily: Font.display, color: Corpus.text },
  text: { fontSize: Type.body, color: Corpus.textMuted, lineHeight: 18 },
  btn: { paddingHorizontal: 14, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: Corpus.text },
  btnText: { fontSize: Type.body, fontFamily: Font.display, color: Corpus.bg },
});
