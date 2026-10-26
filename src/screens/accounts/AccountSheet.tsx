import { Button } from '@/components/ui';
import { Corpus } from '@/constants/theme';
import { styles as sheet } from '@/screens/budgets/components/BudgetEditorSheet.styles';
import { styles as f } from '@/screens/ious/components/IouSheet.styles';
import { ACCOUNT_TYPES, accountTypeMeta, type AccountType, type NewAccount } from '@/types/account';
import type { AccountBalance } from '@/utils/accounts';
import { formatINR } from '@/utils/format';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

type Props = {
  editing?: AccountBalance;
  isDefault: boolean;
  onClose: () => void;
  onSave: (a: NewAccount, makeDefault: boolean, newBalance: number) => Promise<void>;
  onDelete?: () => void;
};

const num = (t: string) => t.replace(/[^0-9.]/g, '');
const day = (t: string) => {
  const n = Number(t.replace(/\D/g, ''));
  return n >= 1 && n <= 31 ? n : undefined;
};

export default function AccountSheet({ editing, isDefault, onClose, onSave, onDelete }: Props) {
  const [type, setType] = useState<AccountType>(editing?.type ?? 'bank');
  const [name, setName] = useState(editing?.name ?? '');
  // When editing, you type the balance RIGHT NOW; we back-calculate the opening amount
  const [balance, setBalance] = useState(editing ? String(editing.balance) : '');
  const [limit, setLimit] = useState(editing?.creditLimit ? String(editing.creditLimit) : '');
  const [stmt, setStmt] = useState(editing?.statementDay ? String(editing.statementDay) : '');
  const [due, setDue] = useState(editing?.dueDay ? String(editing.dueDay) : '');
  const [makeDefault, setMakeDefault] = useState(isDefault);
  const [minBal, setMinBal] = useState(editing?.minBalance ? String(editing.minBalance) : '');
  const [busy, setBusy] = useState(false);

  const credit = type === 'credit';
  const value = balance === '' ? 0 : Number(balance);
  const valid = name.trim().length > 0 && !isNaN(value);

  const save = async () => {
    if (!valid || busy) return;
    setBusy(true);
    try {
      // editing: balance changes are saved as a check-in by the screen (see onSave)
      const opening = editing ? editing.opening : value;
      await onSave(
        {
          name: name.trim(),
          type,
          opening: Math.round(opening * 100) / 100,
          openingDate: editing?.openingDate ?? new Date().toISOString(),
          verifiedAt: editing ? editing.verifiedAt : new Date().toISOString(),
          creditLimit: credit && Number(limit) > 0 ? Number(limit) : undefined,
          statementDay: credit ? day(stmt) : undefined,
          dueDay: credit ? day(due) : undefined,
          minBalance: type === 'bank' && Number(minBal) > 0 ? Number(minBal) : undefined,
        },
        makeDefault,
        value
      );
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
              <Ionicons name={accountTypeMeta(type).icon as keyof typeof Ionicons.glyphMap} size={18} color={Corpus.gold} />
            </View>
            <View style={sheet.titleBlock}>
              <Text style={sheet.title}>{editing ? `Edit ${editing.name}` : 'New account'}</Text>
              <Text style={sheet.subtitle}>{accountTypeMeta(type).hint}</Text>
            </View>
            <Pressable style={sheet.closeButton} onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={18} color={Corpus.textMuted} />
            </Pressable>
          </View>

          <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={f.body} keyboardShouldPersistTaps="handled">
            <View style={sheet.chips}>
              {ACCOUNT_TYPES.map((t) => (
                <Pressable key={t.id} style={[sheet.chip, type === t.id && sheet.chipSuggested]} onPress={() => setType(t.id)}>
                  <Text style={[sheet.chipText, type === t.id && sheet.chipTextSuggested]}>{t.label}</Text>
                </Pressable>
              ))}
            </View>

            <View style={f.field}>
              <Text style={f.label}>NAME</Text>
              <TextInput style={f.input} value={name} onChangeText={setName} placeholder={credit ? 'e.g. SBI Card' : type === 'cash' ? 'Cash' : 'e.g. HDFC Savings'} placeholderTextColor={Corpus.textFaint} maxLength={30} />
            </View>

            <View style={f.field}>
              <Text style={f.label}>{credit ? 'AMOUNT YOU OWE ON IT RIGHT NOW' : 'BALANCE RIGHT NOW'}</Text>
              <TextInput style={f.input} value={balance} onChangeText={(t) => setBalance(t.replace(/[^0-9.-]/g, ''))} placeholder="0" placeholderTextColor={Corpus.textFaint} keyboardType="numeric" />
              <Text style={sheet.hint}>
                {editing
                  ? 'Type what your bank or card app shows today. Saved as a check-in'
                  : 'Check your bank or card app. From now on, Corpus updates it as you add entries'}
              </Text>
            </View>

            {credit && (
              <>
                <View style={f.field}>
                  <Text style={f.label}>CREDIT LIMIT (OPTIONAL)</Text>
                  <TextInput style={f.input} value={limit} onChangeText={(t) => setLimit(num(t))} placeholder="e.g. 50000" placeholderTextColor={Corpus.textFaint} keyboardType="numeric" />
                </View>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={[f.field, { flex: 1 }]}>
                    <Text style={f.label}>BILL GENERATED ON</Text>
                    <TextInput style={f.input} value={stmt} onChangeText={(t) => setStmt(t.replace(/\D/g, '').slice(0, 2))} placeholder="Day, e.g. 15" placeholderTextColor={Corpus.textFaint} keyboardType="number-pad" />
                  </View>
                  <View style={[f.field, { flex: 1 }]}>
                    <Text style={f.label}>PAYMENT DUE ON</Text>
                    <TextInput style={f.input} value={due} onChangeText={(t) => setDue(t.replace(/\D/g, '').slice(0, 2))} placeholder="Day, e.g. 5" placeholderTextColor={Corpus.textFaint} keyboardType="number-pad" />
                  </View>
                </View>
              </>
            )}

            {type === 'bank' && (
              <View style={f.field}>
                <Text style={f.label}>MINIMUM BALANCE (OPTIONAL)</Text>
                <TextInput style={f.input} value={minBal} onChangeText={(t) => setMinBal(num(t))} placeholder="e.g. 10000 · Corpus warns before you go below" placeholderTextColor={Corpus.textFaint} keyboardType="numeric" />
              </View>
            )}

            {!credit && (
              <Pressable style={f.chainToggle} onPress={() => setMakeDefault(!makeDefault)}>
                <Ionicons name={makeDefault ? 'star' : 'star-outline'} size={20} color={makeDefault ? Corpus.gold : Corpus.textMuted} />
                <View style={{ flex: 1 }}>
                  <Text style={f.chainTitle}>Use this by default</Text>
                  <Text style={f.chainHint}>Pre-selected when you add an expense or income</Text>
                </View>
              </Pressable>
            )}

            <Button label={editing ? 'Save changes' : `Add account${balance ? ` · ${formatINR(value)}` : ''}`} onPress={save} loading={busy} disabled={!valid} />
            {editing && onDelete && <Button variant="danger" icon="trash-outline" label="Delete account" onPress={onDelete} />}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
