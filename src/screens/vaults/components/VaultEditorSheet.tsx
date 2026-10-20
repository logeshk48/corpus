import { Corpus } from '@/constants/theme';
import { styles as sheet } from '@/screens/budgets/components/BudgetEditorSheet.styles';
import type { Settings } from '@/types/settings';
import type { Transaction } from '@/types/transaction';
import { formatINR } from '@/utils/format';
import { vaultTotals } from '@/utils/vaults';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, Switch, Text, TextInput, View } from 'react-native';
import { styles } from './VaultEditorSheet.styles';

export type VaultKind = 'tax' | 'savings';

const CONFIG = {
  tax: {
    title: 'Tax vault',
    icon: 'shield-checkmark-outline',
    max: 50,
    presets: [5, 10, 15, 20, 30],
    blurb: 'Reserve a share of income for income tax and advance tax.',
  },
  savings: {
    title: 'Savings vault',
    icon: 'leaf-outline',
    max: 80,
    presets: [10, 15, 20, 25, 30],
    blurb: 'Pay yourself first: reserve a share of every income for savings.',
  },
} as const;

type VaultEditorSheetProps = {
  kind: VaultKind | null; // null = closed
  settings: Settings;
  monthTransactions: Transaction[];
  onClose: () => void;
  onSave: (percent: number, includeSalary: boolean) => Promise<void>;
};

export default function VaultEditorSheet({
  kind,
  settings,
  monthTransactions,
  onClose,
  onSave,
}: VaultEditorSheetProps) {
  const [percent, setPercent] = useState('');
  const [includeSalary, setIncludeSalary] = useState(false);
  const [busy, setBusy] = useState(false);

  const current =
    kind === 'tax' ? settings.taxVaultPercent ?? 0 : settings.savingsVaultPercent ?? 0;
  const currentSalary = settings.taxIncludesSalary ?? false;

  // Start from the saved values each time the sheet opens
  useEffect(() => {
    if (kind) {
      setPercent(current > 0 ? String(current) : '');
      setIncludeSalary(currentSalary);
    }
  }, [kind, current, currentSalary]);

  if (!kind) return null;
  const cfg = CONFIG[kind];

  const value = percent.trim() === '' ? 0 : Number(percent);
  const invalid = !Number.isFinite(value) || value < 0 || value > cfg.max;
  const changed = value !== current || (kind === 'tax' && includeSalary !== currentSalary);
  const canSave = !invalid && changed && !busy;

  // Live preview with the DRAFT values, using the same math as the app
  const preview = vaultTotals(monthTransactions, {
    ...settings,
    ...(kind === 'tax'
      ? { taxVaultPercent: invalid ? 0 : value, taxIncludesSalary: includeSalary }
      : { savingsVaultPercent: invalid ? 0 : value }),
  });
  const previewAmount = kind === 'tax' ? preview.tax : preview.savings;

  const run = async (p: number) => {
    setBusy(true);
    try {
      await onSave(p, includeSalary);
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
              <Ionicons name={cfg.icon} size={18} color={Corpus.gold} />
            </View>
            <View style={sheet.titleBlock}>
              <Text style={sheet.title}>{cfg.title}</Text>
              <Text style={sheet.subtitle}>{cfg.blurb}</Text>
            </View>
            <Pressable style={sheet.closeButton} onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={18} color={Corpus.textMuted} />
            </Pressable>
          </View>

          <View style={sheet.amountRow}>
            <TextInput
              style={sheet.amountInput}
              value={percent}
              onChangeText={setPercent}
              placeholder="0"
              placeholderTextColor={Corpus.textFaint}
              keyboardType="numeric"
              autoFocus
            />
            <Text style={styles.percentSign}>%</Text>
          </View>

          <View style={sheet.chips}>
            {cfg.presets.map((p) => (
              <Pressable
                key={p}
                style={[sheet.chip, value === p && sheet.chipSuggested]}
                onPress={() => setPercent(String(p))}
              >
                <Text style={[sheet.chipText, value === p && sheet.chipTextSuggested]}>{p}%</Text>
              </Pressable>
            ))}
          </View>

          {kind === 'tax' && (
            <View style={styles.switchRow}>
              <View style={styles.switchBody}>
                <Text style={styles.switchTitle}>Include salary</Text>
                <Text style={styles.switchHint}>
                  Off by default — salary usually has tax (TDS) deducted already
                </Text>
              </View>
              <Switch
                value={includeSalary}
                onValueChange={setIncludeSalary}
                trackColor={{ false: Corpus.border, true: Corpus.gold }}
                thumbColor={Corpus.text}
              />
            </View>
          )}

          {invalid ? (
            <Text style={sheet.error}>Enter a percentage between 0 and {cfg.max}</Text>
          ) : (
            <View style={styles.preview}>
              <Text style={styles.previewLabel}>On this month's income, that sets aside</Text>
              <Text style={styles.previewValue}>{formatINR(previewAmount)}</Text>
            </View>
          )}

          <Pressable
            style={[sheet.saveButton, !canSave && sheet.saveButtonDisabled]}
            onPress={() => run(value)}
            disabled={!canSave}
          >
            {busy ? (
              <ActivityIndicator color="#0F1115" />
            ) : (
              <Text style={[sheet.saveText, !canSave && sheet.saveTextDisabled]}>
                {current > 0 ? 'Update vault' : 'Turn on vault'}
              </Text>
            )}
          </Pressable>

          {current > 0 && (
            <Pressable style={sheet.removeButton} onPress={() => run(0)} disabled={busy}>
              <Text style={sheet.removeText}>Turn off</Text>
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
}
