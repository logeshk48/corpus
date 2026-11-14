import { Corpus, isDark, Type } from '@/constants/theme';
import { Pressable, StyleSheet, Text, View } from 'react-native';

// iOS segmented control: a grey track with the chosen option on a raised pill
export default function Segmented<T extends string>({ options, value, onChange, tint }: {
  options: readonly { value: T; label: string }[]; value: T; onChange: (v: T) => void; tint?: string;
}) {
  return (
    <View style={s.track} accessibilityRole="tablist">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable key={o.value} style={[s.opt, on && s.on]} onPress={() => onChange(o.value)} accessibilityRole="tab" accessibilityState={{ selected: on }}>
            <Text style={[s.text, on && s.textOn, on && tint ? { color: tint } : null]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  track: { flexDirection: 'row', backgroundColor: Corpus.cardAlt, borderRadius: 12, padding: 3, gap: 3 },
  opt: { flex: 1, height: 36, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  on: {
    backgroundColor: isDark ? Corpus.border : Corpus.card,
    shadowColor: Corpus.shadow, shadowOpacity: 0.5, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  text: { fontSize: Type.bodyLg, fontWeight: '500', color: Corpus.text },
  textOn: { fontWeight: '700' },
});
