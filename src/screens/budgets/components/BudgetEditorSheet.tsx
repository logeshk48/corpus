import { Button, Sheet } from '@/components/ui';
import type { Category } from '@/constants/categories';
import { Corpus, Font, tabular, Type } from '@/constants/theme';
import { suggestLimit } from '@/utils/budgets';
import { formatINR } from '@/utils/format';
import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

export const MONTHLY = '__monthly';

type Props = {
  category: Category | null; // null = closed; id MONTHLY = the overall monthly budget
  spent: number;
  currentLimit?: number;
  onClose: () => void;
  onSave: (limit: number) => Promise<void>;
  onRemove: () => Promise<void>;
};

const CATEGORY_PRESETS = [1000, 2000, 3000, 5000, 10000];
const MONTHLY_PRESETS = [20000, 30000, 40000, 50000, 75000];

export default function BudgetEditorSheet({ category, spent, currentLimit, onClose, onSave, onRemove }: Props) {
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [tried, setTried] = useState(false);

  useEffect(() => {
    if (category) { setAmount(currentLimit ? String(currentLimit) : ''); setTried(false); }
  }, [category, currentLimit]);

  if (!category) return null;
  const monthly = category.id === MONTHLY;
  const suggestion = suggestLimit(spent);
  const value = Number(amount);
  const invalid = !Number.isFinite(value) || value <= 0;
  const presets = (monthly ? MONTHLY_PRESETS : CATEGORY_PRESETS).filter((p) => p !== suggestion);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    try { await action(); } finally { setBusy(false); }
  };
  const save = () => {
    setTried(true);
    if (invalid || busy) return;
    if (value === currentLimit) return onClose();
    run(() => onSave(value));
  };

  return (
    <Sheet
      title={monthly ? 'Monthly budget' : `${category.label} limit`}
      subtitle={spent > 0 ? `${formatINR(spent)} spent so far this month` : 'Nothing spent yet this month'}
      onClose={onClose}
      footer={
        <>
          <Button label={currentLimit ? 'Update limit' : 'Set limit'} onPress={save} loading={busy} />
          {currentLimit ? <Button variant="quiet" label="Remove limit" onPress={() => run(onRemove)} disabled={busy} /> : null}
        </>
      }
    >
      <View style={s.amountBox}>
        <View style={s.amountRow}>
          <Text style={s.rupee}>₹</Text>
          <TextInput
            style={[s.amount, { width: Math.max(90, (amount.length || 1) * 30 + 16) }]}
            value={amount}
            onChangeText={(t) => setAmount(t.replace(/[^0-9]/g, ''))}
            placeholder="0"
            placeholderTextColor={Corpus.textFaint}
            keyboardType="number-pad"
            autoFocus
            selectTextOnFocus
            accessibilityLabel={monthly ? 'Monthly budget amount' : `${category.label} limit per month`}
            onSubmitEditing={save}
          />
        </View>
        <Text style={s.per}>a month</Text>
        {tried && invalid && <Text style={s.error}>Enter an amount above ₹0</Text>}
      </View>

      <View style={s.chips}>
        {suggestion ? (
          <Pressable style={({ pressed }) => [s.chip, s.chipOn, pressed && { opacity: 0.7 }]} onPress={() => setAmount(String(suggestion))} accessibilityRole="button">
            <Text style={[s.chipText, { color: Corpus.onGold }]}>Your pace {formatINR(suggestion)}</Text>
          </Pressable>
        ) : null}
        {presets.map((p) => (
          <Pressable key={p} style={({ pressed }) => [s.chip, pressed && { opacity: 0.7 }]} onPress={() => setAmount(String(p))} accessibilityRole="button">
            <Text style={s.chipText}>{formatINR(p)}</Text>
          </Pressable>
        ))}
      </View>
      {suggestion ? <Text style={s.hint}>“Your pace” is this month’s spending so far, stretched to the full month.</Text> : null}
    </Sheet>
  );
}

const s = StyleSheet.create({
  amountBox: { alignItems: 'center', paddingVertical: 8, gap: 2 },
  amountRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  rupee: { fontSize: Type.h1, fontFamily: Font.display, color: Corpus.textMuted, marginRight: 4 },
  amount: { fontSize: Type.entry, fontFamily: Font.displayBold, color: Corpus.text, textAlign: 'center', padding: 0, ...tabular, ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null) },
  per: { fontSize: Type.body, color: Corpus.textMuted },
  error: { fontSize: Type.small, color: Corpus.danger, marginTop: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  chip: { minHeight: 40, paddingHorizontal: 14, borderRadius: 20, backgroundColor: Corpus.bg, justifyContent: 'center' },
  chipOn: { backgroundColor: Corpus.gold },
  chipText: { fontSize: Type.bodyLg, fontFamily: Font.display, color: Corpus.text, ...tabular },
  hint: { fontSize: Type.small, color: Corpus.textMuted, textAlign: 'center' },
});
