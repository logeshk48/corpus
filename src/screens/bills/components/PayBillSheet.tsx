import { Corpus } from '@/constants/theme';
import { styles as sheet } from '@/screens/budgets/components/BudgetEditorSheet.styles';
import type { Bill } from '@/types/bill';
import { formatINR } from '@/utils/format';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, Text, TextInput, View } from 'react-native';

type Props = {
  bill: Bill | null; // null = closed
  onClose: () => void;
  onPay: (bill: Bill, amount: number) => Promise<void>;
  onSkip: (bill: Bill) => Promise<void>;
};

export default function PayBillSheet({ bill, onClose, onPay, onSkip }: Props) {
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (bill) setAmount(bill.variable ? '' : String(bill.amount));
  }, [bill]);

  if (!bill) return null;
  const value = Number(amount);
  const valid = amount.trim() !== '' && Number.isFinite(value) && value > 0;
  const month = new Date().toLocaleDateString('en-IN', { month: 'long' });

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
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
            <View style={sheet.iconCircle}>
              <Ionicons name={bill.variable ? 'flash' : 'checkmark-done'} size={18} color={Corpus.gold} />
            </View>
            <View style={sheet.titleBlock}>
              <Text style={sheet.title}>{bill.name} · {month}</Text>
              <Text style={sheet.subtitle}>
                {bill.variable
                  ? `How much was it this time? Usually about ${formatINR(bill.amount)}`
                  : 'Record this payment now'}
              </Text>
            </View>
            <Pressable style={sheet.closeButton} onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={18} color={Corpus.textMuted} />
            </Pressable>
          </View>

          <View style={sheet.amountRow}>
            <Text style={sheet.rupee}>₹</Text>
            <TextInput
              style={sheet.amountInput}
              value={amount}
              onChangeText={setAmount}
              placeholder={String(bill.amount)}
              placeholderTextColor={Corpus.textFaint}
              keyboardType="numeric"
              autoFocus
            />
          </View>
          {bill.variable && (
            <View style={sheet.chips}>
              <Pressable style={sheet.chip} onPress={() => setAmount(String(bill.amount))}>
                <Text style={sheet.chipText}>Same as usual {formatINR(bill.amount)}</Text>
              </Pressable>
            </View>
          )}

          <Pressable
            style={[sheet.saveButton, !valid && sheet.saveButtonDisabled]}
            onPress={() => valid && run(() => onPay(bill, value))}
            disabled={!valid || busy}
          >
            {busy ? (
              <ActivityIndicator color="#0F1115" />
            ) : (
              <Text style={[sheet.saveText, !valid && sheet.saveTextDisabled]}>
                Record payment{valid ? ` · ${formatINR(value)}` : ''}
              </Text>
            )}
          </Pressable>
          <Pressable style={sheet.removeButton} onPress={() => run(() => onSkip(bill))} disabled={busy}>
            <Text style={[sheet.removeText, { color: Corpus.textMuted }]}>Skip this month</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
