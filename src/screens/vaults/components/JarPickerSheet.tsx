import { Button, IconChip, Sheet } from '@/components/ui';
import { Chip, Corpus, Font, tabular, Type } from '@/constants/theme';
import { investMeta, type Investment } from '@/types/investment';
import type { Vault } from '@/types/vault';
import { compactINR } from '@/utils/format';
import { suggestJar } from '@/utils/jarFunds';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

// "What is this money for?" Put one or more investments into jars. Each starts on a suggested jar
// (with the reason in words); tap another jar to change it, or "Not now" to leave it out.
export default function JarPickerSheet({ holdings, jars, onClose, onSave, onNewJar }: {
  holdings: Investment[]; jars: Vault[]; onClose: () => void;
  onSave: (picks: { id: string; jarId: string | null }[]) => Promise<void>; onNewJar?: () => void;
}) {
  const [picks, setPicks] = useState<Record<string, string | null>>(() =>
    Object.fromEntries(holdings.map((h) => [h.id, h.goalId && jars.some((j) => j.id === h.goalId) ? h.goalId : suggestJar(h, jars)?.jar.id ?? null]))
  );
  const [busy, setBusy] = useState(false);
  const chosen = Object.values(picks).filter(Boolean).length;
  const single = holdings.length === 1;

  return (
    <Sheet
      title={single ? `What is ${holdings[0].name.split(' - ')[0]} for?` : 'Put your investments in jars'}
      subtitle={single ? "Its value then counts towards that goal. It stays in Invest, counted once." : "Each one’s value then counts towards its goal. They stay in Invest, counted once."}
      onClose={onClose}
      footer={
        jars.length ? (
          <Button label={chosen ? (single ? 'Save' : `Move ${chosen} into jars`) : 'Save'} loading={busy}
            onPress={async () => { setBusy(true); try { await onSave(holdings.map((h) => ({ id: h.id, jarId: picks[h.id] ?? null }))); } finally { setBusy(false); } }} />
        ) : onNewJar ? <Button icon="add" label="Create a jar first" onPress={onNewJar} /> : undefined
      }
    >
      {holdings.map((h) => {
        const sug = suggestJar(h, jars);
        const pick = picks[h.id] ?? null;
        return (
          <View key={h.id} style={s.item}>
            <View style={s.head}>
              <IconChip icon={investMeta(h.type).icon.replace('-outline', '')} color={Chip.indigo} />
              <View style={{ flex: 1, gap: 1 }}>
                <Text style={s.name} numberOfLines={2}>{h.name}</Text>
                <Text style={s.meta}>{compactINR(h.value)}{pick ? ` → ${jars.find((j) => j.id === pick)?.name}` : ', not in a jar'}{sug && pick === sug.jar.id ? `. ${sug.why}` : ''}</Text>
              </View>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
              {[...jars].sort((a, b) => (a.id === sug?.jar.id ? -1 : b.id === sug?.jar.id ? 1 : 0)).map((j) => {
                const on = pick === j.id;
                return (
                  <Pressable key={j.id} onPress={() => setPicks((p) => ({ ...p, [h.id]: j.id }))} style={({ pressed }) => [s.chip, on && s.chipOn, pressed && { opacity: 0.7 }]} accessibilityRole="radio" accessibilityState={{ selected: on }}>
                    {on && <Ionicons name="checkmark" size={14} color={Corpus.onGold} />}
                    <Text style={[s.chipText, on && { color: Corpus.onGold }]}>{j.name}{sug?.jar.id === j.id && !on ? ' (suggested)' : ''}</Text>
                  </Pressable>
                );
              })}
              <Pressable onPress={() => setPicks((p) => ({ ...p, [h.id]: null }))} style={({ pressed }) => [s.chip, pick === null && s.chipOn, pressed && { opacity: 0.7 }]} accessibilityRole="radio" accessibilityState={{ selected: pick === null }}>
                <Text style={[s.chipText, pick === null && { color: Corpus.onGold }]}>Not now</Text>
              </Pressable>
            </ScrollView>
          </View>
        );
      })}
      {!jars.length && <Text style={s.meta}>You don’t have any jars yet. Create one for a goal (a car, an emergency fund), then put investments in it.</Text>}
    </Sheet>
  );
}

const s = StyleSheet.create({
  item: { backgroundColor: Corpus.bg, borderRadius: 18, padding: 12, gap: 10 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  name: { fontSize: Type.input, color: Corpus.text },
  meta: { fontSize: Type.body, color: Corpus.textMuted, lineHeight: 18, ...tabular },
  chips: { gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 38, paddingHorizontal: 14, borderRadius: 19, backgroundColor: Corpus.card },
  chipOn: { backgroundColor: Corpus.gold },
  chipText: { fontSize: Type.body, fontFamily: Font.display, color: Corpus.text },
});
