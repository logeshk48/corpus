import { Button } from '@/components/ui';
import { Corpus } from '@/constants/theme';
import { styles as sheet } from '@/screens/budgets/components/BudgetEditorSheet.styles';
import { styles as f } from '@/screens/ious/components/IouSheet.styles';
import { accountTypeMeta } from '@/types/account';
import { verifiedAgo, type AccountBalance } from '@/utils/accounts';
import { formatINR } from '@/utils/format';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

// The 30-second weekly check-in: open your bank/card apps, type what they show.
export default function UpdateBalancesSheet({ list, onClose, onSave }: { list: AccountBalance[]; onClose: () => void; onSave: (values: { account: AccountBalance; balance: number }[]) => Promise<void> }) {
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(list.map((a) => [a.id, String(a.balance)])));
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try {
      await onSave(list.map((a) => ({ account: a, balance: Number(values[a.id]) || 0 })));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={sheet.overlay}>
        <Pressable style={sheet.backdrop} onPress={onClose} />
        <View style={sheet.sheet}>
          <View style={sheet.handle} />
          <View style={sheet.header}>
            <View style={[sheet.iconCircle, { backgroundColor: Corpus.goldTint }]}>
              <Ionicons name="checkmark-done" size={18} color={Corpus.gold} />
            </View>
            <View style={sheet.titleBlock}>
              <Text style={sheet.title}>Update balances</Text>
              <Text style={sheet.subtitle}>Type what each app shows right now. Unchanged ones are marked verified too</Text>
            </View>
            <Pressable style={sheet.closeButton} onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={18} color={Corpus.textMuted} />
            </Pressable>
          </View>
          <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={f.body} keyboardShouldPersistTaps="handled">
            {list.map((a) => {
              const v = verifiedAgo(a);
              return (
                <View key={a.id} style={f.field}>
                  <Text style={f.label}>
                    {a.name.toUpperCase()} · {a.type === 'credit' ? 'AMOUNT OWED' : 'BALANCE'}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Ionicons name={accountTypeMeta(a.type).icon as keyof typeof Ionicons.glyphMap} size={18} color={Corpus.gold} />
                    <TextInput
                      style={[f.input, { flex: 1 }]}
                      value={values[a.id]}
                      onChangeText={(t) => setValues((s) => ({ ...s, [a.id]: t.replace(/[^0-9.-]/g, '') }))}
                      keyboardType="numeric"
                      selectTextOnFocus
                    />
                  </View>
                  {(() => {
                    const d = Math.round((Number(values[a.id]) || 0) - a.balance);
                    if (d === 0) return <Text style={[sheet.hint, v.stale && { color: Corpus.warning }]}>Same as last time · {v.label}</Text>;
                    const good = a.type === 'credit' ? d < 0 : d > 0;
                    return (
                      <Text style={[sheet.hint, { color: good ? Corpus.income : Corpus.warning }]}>
                        {d > 0 ? '+' : '−'}{formatINR(Math.abs(d))} since last time ({v.label.replace('verified ', '')})
                      </Text>
                    );
                  })()}
                </View>
              );
            })}
            <Button label="Save · all verified today" icon="checkmark" onPress={save} loading={busy} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
