import { Button, IconChip, Sheet } from '@/components/ui';
import { Chip, Corpus, Font, tabular, Type } from '@/constants/theme';
import { investMeta, type Investment } from '@/types/investment';
import type { VaultWithBalance } from '@/types/vault';
import { compactINR } from '@/utils/format';
import { sipAmount } from '@/utils/sip';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

// Pick which investments are saving for this jar's goal. A holding belongs to one jar at most.
export default function LinkInvestmentsSheet({ jar, jars, list, onClose, onSave }: {
  jar: VaultWithBalance; jars: VaultWithBalance[]; list: Investment[];
  onClose: () => void; onSave: (ids: string[]) => Promise<void>;
}) {
  const [picked, setPicked] = useState<string[]>(list.filter((h) => h.goalId === jar.id).map((h) => h.id));
  const [busy, setBusy] = useState(false);
  const nameOf = (id?: string) => jars.find((j) => j.id === id)?.name;
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const total = list.filter((h) => picked.includes(h.id)).reduce((a, h) => a + h.value, 0);

  return (
    <Sheet
      title={`Investments for ${jar.name}`}
      subtitle="Their value counts towards this goal. They stay in Invest, counted once."
      onClose={onClose}
      footer={<Button label={picked.length ? `Save, ${compactINR(total)} linked` : 'Save'} loading={busy} onPress={async () => { setBusy(true); try { await onSave(picked); } finally { setBusy(false); } }} />}
    >
      {list.length === 0 ? (
        <Text style={s.empty}>You haven’t added any investments yet. Add them in the Invest tab, then link them here.</Text>
      ) : (
        <View style={s.list}>
          {list.map((h, i) => {
            const on = picked.includes(h.id);
            const other = h.goalId && h.goalId !== jar.id ? nameOf(h.goalId) : undefined;
            return (
              <Pressable key={h.id} onPress={() => toggle(h.id)} style={({ pressed }) => [s.row, i > 0 && s.sep, pressed && { backgroundColor: Corpus.cardAlt }]} accessibilityRole="checkbox" accessibilityState={{ checked: on }}>
                <IconChip icon={investMeta(h.type).icon.replace('-outline', '')} color={Chip.indigo} />
                <View style={{ flex: 1, gap: 1 }}>
                  <Text style={s.name} numberOfLines={1}>{h.name}</Text>
                  <Text style={s.meta} numberOfLines={1}>
                    {compactINR(h.value)}{h.sip?.active ? `, SIP ${compactINR(sipAmount(h.sip, new Date()))} a month` : ''}
                    {other ? (on ? `. Moves from ${other}` : `. In ${other}`) : ''}
                  </Text>
                </View>
                <Ionicons name={on ? 'checkmark-circle' : 'ellipse-outline'} size={24} color={on ? Corpus.text : Corpus.textFaint} />
              </Pressable>
            );
          })}
        </View>
      )}
    </Sheet>
  );
}

const s = StyleSheet.create({
  empty: { fontSize: Type.bodyLg, color: Corpus.textMuted, lineHeight: 21 },
  list: { backgroundColor: Corpus.bg, borderRadius: 18, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 60, paddingVertical: 8, paddingHorizontal: 14 },
  sep: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Corpus.border },
  name: { fontSize: Type.input, color: Corpus.text },
  meta: { fontSize: Type.body, color: Corpus.textMuted, ...tabular },
  bold: { fontFamily: Font.display },
});
