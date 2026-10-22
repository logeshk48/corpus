import { Button } from '@/components/ui';
import type { Category } from '@/constants/categories';
import { Corpus } from '@/constants/theme';
import { suggestLimit } from '@/utils/budgets';
import { formatINR } from '@/utils/format';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, Text, TextInput, View } from 'react-native';
import { styles } from './BudgetEditorSheet.styles';

type BudgetEditorSheetProps = {
  category: Category | null; // null = closed
  spent: number;
  currentLimit?: number;
  onClose: () => void;
  onSave: (limit: number) => Promise<void>;
  onRemove: () => Promise<void>;
};

const PRESETS = [1000, 2000, 3000, 5000, 10000];

export default function BudgetEditorSheet({
  category,
  spent,
  currentLimit,
  onClose,
  onSave,
  onRemove,
}: BudgetEditorSheetProps) {
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);

  // Each time the sheet opens for a category, start from its current limit
  useEffect(() => {
    if (category) setAmount(currentLimit ? String(currentLimit) : '');
  }, [category, currentLimit]);

  if (!category) return null;

  const suggestion = suggestLimit(spent);
  const value = Number(amount);
  const invalid = amount.trim() !== '' && (!Number.isFinite(value) || value <= 0);
  const canSave = amount.trim() !== '' && !invalid && value !== currentLimit && !busy;

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    try {
      await action();
    } finally {
      setBusy(false);
    }
  };

  const presets = PRESETS.filter((p) => p !== suggestion);

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Ionicons name={category.icon as any} size={18} color={Corpus.gold} />
            </View>
            <View style={styles.titleBlock}>
              <Text style={styles.title}>{category.label} budget</Text>
              <Text style={styles.subtitle}>
                {spent > 0 ? `${formatINR(spent)} spent so far this month` : 'Nothing spent yet this month'}
              </Text>
            </View>
            <Pressable style={styles.closeButton} onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={18} color={Corpus.textMuted} />
            </Pressable>
          </View>

          <View style={styles.amountRow}>
            <Text style={styles.rupee}>₹</Text>
            <TextInput
              style={styles.amountInput}
              value={amount}
              onChangeText={setAmount}
              placeholder="0"
              placeholderTextColor={Corpus.textFaint}
              keyboardType="numeric"
              autoFocus
              onSubmitEditing={() => canSave && run(() => onSave(value))}
            />
          </View>
          <Text style={styles.perMonth}>per month</Text>

          <View style={styles.chips}>
            {suggestion && (
              <Pressable
                style={[styles.chip, styles.chipSuggested]}
                onPress={() => setAmount(String(suggestion))}
              >
                <Ionicons name="sparkles" size={12} color={Corpus.gold} />
                <Text style={[styles.chipText, styles.chipTextSuggested]}>
                  Suggested {formatINR(suggestion)}
                </Text>
              </Pressable>
            )}
            {presets.map((p) => (
              <Pressable key={p} style={styles.chip} onPress={() => setAmount(String(p))}>
                <Text style={styles.chipText}>{formatINR(p)}</Text>
              </Pressable>
            ))}
          </View>

          {invalid ? (
            <Text style={styles.error}>Enter an amount greater than 0</Text>
          ) : suggestion ? (
            <Text style={styles.hint}>Suggestion = your spending pace so far, projected to the full month</Text>
          ) : null}

          <Button label={currentLimit ? 'Update budget' : 'Set budget'} onPress={() => run(() => onSave(value))} loading={busy} disabled={!canSave} />

          {currentLimit ? (
            <Button variant="danger" icon="trash-outline" label="Remove limit" onPress={() => run(onRemove)} disabled={busy} />
          ) : null}
        </View>
      </View>
    </Modal>
  );
}
