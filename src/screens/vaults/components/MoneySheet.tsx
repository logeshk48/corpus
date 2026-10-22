import { Button } from '@/components/ui';
import { Corpus } from '@/constants/theme';
import { styles as sheet } from '@/screens/budgets/components/BudgetEditorSheet.styles';
import type { VaultEntryType, VaultWithBalance } from '@/types/vault';
import { formatINR } from '@/utils/format';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, Text, TextInput, View } from 'react-native';
import { styles } from './MoneySheet.styles';

type MoneySheetProps = {
  jar: VaultWithBalance | null; // null = closed
  type: VaultEntryType;
  initialAmount?: number;       // e.g. from a smart tip
  onClose: () => void;
  onSubmit: (amount: number, note?: string) => Promise<void>;
};

export default function MoneySheet({ jar, type, initialAmount, onClose, onSubmit }: MoneySheetProps) {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (jar) {
      setAmount(initialAmount ? String(initialAmount) : '');
      setNote('');
    }
  }, [jar, type, initialAmount]);

  if (!jar) return null;

  const isIn = type === 'in';
  const value = Number(amount);
  const entered = amount.trim() !== '';
  const notNumber = entered && (!Number.isFinite(value) || value <= 0);
  const tooMuch = !isIn && entered && !notNumber && value > jar.balance;
  const canSubmit = entered && !notNumber && !tooMuch && !busy;
  const newBalance = jar.balance + (isIn ? value : -value);

  // Helpful one-tap amounts
  const chips: { label: string; value: number }[] = [];
  if (isIn && jar.goal && jar.goal > jar.balance) {
    chips.push({ label: `Fill goal ${formatINR(jar.goal - jar.balance)}`, value: jar.goal - jar.balance });
  }
  for (const v of [500, 1000, 2000, 5000]) {
    if (isIn || v < jar.balance) chips.push({ label: formatINR(v), value: v });
  }
  if (!isIn && jar.balance > 0) chips.push({ label: `All ${formatINR(jar.balance)}`, value: jar.balance });

  const submit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    try {
      await onSubmit(value, note.trim() || undefined);
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
            <View style={[sheet.iconCircle, { backgroundColor: `${jar.color}26` }]}>
              <Ionicons name={jar.icon as any} size={18} color={jar.color} />
            </View>
            <View style={sheet.titleBlock}>
              <Text style={sheet.title}>
                {isIn ? `Add money to ${jar.name}` : `Take out from ${jar.name}`}
              </Text>
              <Text style={sheet.subtitle}>Balance now: {formatINR(jar.balance)}</Text>
            </View>
            <Pressable style={sheet.closeButton} onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={18} color={Corpus.textMuted} />
            </Pressable>
          </View>

          <View style={sheet.amountRow}>
            <Text style={sheet.rupee}>₹</Text>
            <TextInput
              style={[sheet.amountInput, { color: isIn ? jar.color : Corpus.text }]}
              value={amount}
              onChangeText={setAmount}
              placeholder="0"
              placeholderTextColor={Corpus.textFaint}
              keyboardType="numeric"
              autoFocus
              onSubmitEditing={submit}
            />
          </View>

          <View style={sheet.chips}>
            {chips.map((c) => (
              <Pressable
                key={c.label}
                style={[sheet.chip, value === c.value && sheet.chipSuggested]}
                onPress={() => setAmount(String(c.value))}
              >
                <Text style={[sheet.chipText, value === c.value && sheet.chipTextSuggested]}>{c.label}</Text>
              </Pressable>
            ))}
          </View>

          <TextInput
            style={styles.noteInput}
            value={note}
            onChangeText={setNote}
            placeholder={isIn ? 'Note (optional) — e.g. From Zenith payment' : 'Note (optional) — e.g. Paid advance tax'}
            placeholderTextColor={Corpus.textFaint}
            maxLength={60}
          />

          {notNumber ? (
            <Text style={sheet.error}>Enter an amount greater than 0</Text>
          ) : tooMuch ? (
            <Text style={sheet.error}>This jar only has {formatINR(jar.balance)}</Text>
          ) : entered ? (
            <View style={styles.preview}>
              <Text style={styles.previewLabel}>New balance</Text>
              <Text style={[styles.previewValue, { color: jar.color }]}>{formatINR(newBalance)}</Text>
            </View>
          ) : null}

          <Button
            label={`${isIn ? 'Add' : 'Take out'} ${entered && !notNumber ? formatINR(value) : 'money'}`}
            tint={isIn ? jar.color : Corpus.text}
            onPress={submit}
            loading={busy}
            disabled={!canSubmit}
          />
        </View>
      </View>
    </Modal>
  );
}
