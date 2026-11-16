import { Group, IconChip } from '@/components/ui';
import { Corpus, Font, Space, Type } from '@/constants/theme';
import { STARTER_VAULTS, type NewVault } from '@/types/vault';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  existingNames: string[]; // hide starters you already created
  onCreate: (vault: NewVault) => void;
  onCustom: () => void;
  compact?: boolean;       // once you have jars: just the list
};

// Ready-made jars, one tap to create
export default function StarterJars({ existingNames, onCreate, onCustom, compact }: Props) {
  const available = STARTER_VAULTS.filter((s) => !existingNames.some((n) => n.toLowerCase() === s.name.toLowerCase()));
  const rows = available.map(({ why, ...vault }) => (
    <Pressable key={vault.name} onPress={() => onCreate(vault)} style={({ pressed }) => [s.row, pressed && { backgroundColor: Corpus.cardAlt }]} accessibilityRole="button" accessibilityLabel={`Create ${vault.name} jar. ${why}`}>
      <IconChip icon={vault.icon} color={vault.color} />
      <View style={s.body}>
        <Text style={s.name}>{vault.name}</Text>
        <Text style={s.why}>{why}</Text>
      </View>
      <View style={s.create}><Text style={s.createText}>Create</Text></View>
    </Pressable>
  ));
  if (!compact) {
    rows.push(
      <Pressable key="own" onPress={onCustom} style={({ pressed }) => [s.row, pressed && { backgroundColor: Corpus.cardAlt }]} accessibilityRole="button">
        <IconChip icon="add" color={Corpus.textMuted} />
        <View style={s.body}>
          <Text style={s.name}>Your own jar</Text>
          <Text style={s.why}>A trip, a gadget, a wedding</Text>
        </View>
      </Pressable>
    );
  }
  return <Group title={compact ? 'Ideas' : 'Start with one'}>{rows}</Group>;
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 62, paddingVertical: 10, paddingHorizontal: Space.md },
  body: { flex: 1, gap: 2 },
  name: { fontSize: Type.input, color: Corpus.text },
  why: { fontSize: Type.body, color: Corpus.textMuted, lineHeight: 18 },
  create: { minHeight: 34, paddingHorizontal: 14, borderRadius: 17, backgroundColor: Corpus.cardAlt, justifyContent: 'center' },
  createText: { fontSize: Type.body, fontFamily: Font.display, color: Corpus.text },
});
