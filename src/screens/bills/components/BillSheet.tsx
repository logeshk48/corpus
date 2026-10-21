import { EXPENSE_CATEGORIES } from '@/constants/categories';
import { Corpus } from '@/constants/theme';
import CategoryGrid from '@/screens/add/components/CategoryGrid';
import { styles as sheet } from '@/screens/budgets/components/BudgetEditorSheet.styles';
import type { Bill, NewBill } from '@/types/bill';
import { ordinal, yearMonth } from '@/utils/bills';
import { formatINR } from '@/utils/format';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { styles } from './BillSheet.styles';

export type BillSheetMode = { kind: 'new'; template?: Template } | { kind: 'edit'; bill: Bill } | null;

export type Template = { name: string; category: string; day: number; icon: string };

export const BILL_TEMPLATES: Template[] = [
  { name: 'Rent', category: 'bills', day: 1, icon: 'home' },
  { name: 'EMI', category: 'bills', day: 5, icon: 'card' },
  { name: 'Mobile recharge', category: 'bills', day: 10, icon: 'phone-portrait' },
  { name: 'Internet', category: 'bills', day: 10, icon: 'wifi' },
  { name: 'Electricity', category: 'bills', day: 15, icon: 'flash' },
  { name: 'Netflix', category: 'fun', day: 20, icon: 'tv' },
  { name: 'Insurance', category: 'health', day: 1, icon: 'shield-checkmark' },
  { name: 'Gym', category: 'health', day: 1, icon: 'barbell' },
];

type Props = {
  mode: BillSheetMode;
  onClose: () => void;
  onSave: (bill: NewBill, paidThisMonth: boolean) => Promise<void>;
  onDelete: (bill: Bill) => Promise<void>;
};

function confirmDelete(bill: Bill, onYes: () => void) {
  const msg = `Delete "${bill.name}"? Expenses already logged from it stay in your history.`;
  if (Platform.OS === 'web') {
    if (window.confirm(msg)) onYes();
  } else {
    Alert.alert('Delete bill', msg, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: onYes },
    ]);
  }
}

export default function BillSheet({ mode, onClose, onSave, onDelete }: Props) {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [day, setDay] = useState(1);
  const [category, setCategory] = useState<string | null>('bills');
  const [active, setActive] = useState(true);
  const [paidThisMonth, setPaidThisMonth] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!mode) return;
    if (mode.kind === 'edit') {
      setName(mode.bill.name);
      setAmount(String(mode.bill.amount));
      setDay(mode.bill.dayOfMonth);
      setCategory(mode.bill.category);
      setActive(mode.bill.active);
    } else {
      setName(mode.template?.name ?? '');
      setAmount('');
      setDay(mode.template?.day ?? new Date().getDate());
      setCategory(mode.template?.category ?? 'bills');
      setActive(true);
      setPaidThisMonth(true);
    }
  }, [mode]);

  if (!mode) return null;
  const editing = mode.kind === 'edit';
  const today = new Date().getDate();
  const dueAlreadyPassed = day <= today;

  const value = Number(amount);
  const amountInvalid = amount.trim() !== '' && (!Number.isFinite(value) || value <= 0);
  const canSave = name.trim().length > 0 && amount.trim() !== '' && !amountInvalid && category !== null && !busy;

  const save = async () => {
    if (!canSave || !category) return;
    setBusy(true);
    try {
      await onSave(
        {
          name: name.trim(),
          amount: value,
          category,
          dayOfMonth: day,
          active,
          startMonth: editing ? mode.bill.startMonth : yearMonth(new Date()),
          ...(editing && mode.bill.lastLoggedMonth ? { lastLoggedMonth: mode.bill.lastLoggedMonth } : {}),
        },
        !editing && dueAlreadyPassed && paidThisMonth
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={sheet.overlay}>
        <Pressable style={sheet.backdrop} onPress={onClose} />
        <View style={[sheet.sheet, { maxHeight: '92%' }]}>
          <View style={sheet.handle} />
          <ScrollView contentContainerStyle={{ gap: 14 }} keyboardShouldPersistTaps="handled">
            <View style={sheet.header}>
              <View style={sheet.iconCircle}>
                <Ionicons name="repeat" size={18} color={Corpus.gold} />
              </View>
              <View style={sheet.titleBlock}>
                <Text style={sheet.title}>{editing ? 'Edit bill' : 'New recurring bill'}</Text>
                <Text style={sheet.subtitle}>Logged automatically every month on its due day</Text>
              </View>
              <Pressable style={sheet.closeButton} onPress={onClose} hitSlop={8}>
                <Ionicons name="close" size={18} color={Corpus.textMuted} />
              </Pressable>
            </View>

            {!editing && (
              <View style={styles.templates}>
                {BILL_TEMPLATES.map((t) => (
                  <Pressable
                    key={t.name}
                    style={[sheet.chip, name === t.name && sheet.chipSuggested]}
                    onPress={() => {
                      setName(t.name);
                      setDay(t.day);
                      setCategory(t.category);
                    }}
                  >
                    <Ionicons name={t.icon as any} size={12} color={name === t.name ? Corpus.gold : Corpus.textMuted} />
                    <Text style={[sheet.chipText, name === t.name && sheet.chipTextSuggested]}>{t.name}</Text>
                  </Pressable>
                ))}
              </View>
            )}

            <Text style={styles.label}>NAME</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Rent, Bike EMI, Netflix"
              placeholderTextColor={Corpus.textFaint}
              maxLength={30}
            />

            <Text style={styles.label}>AMOUNT PER MONTH</Text>
            <View style={sheet.amountRow}>
              <Text style={sheet.rupee}>₹</Text>
              <TextInput
                style={sheet.amountInput}
                value={amount}
                onChangeText={setAmount}
                placeholder="0"
                placeholderTextColor={Corpus.textFaint}
                keyboardType="numeric"
              />
            </View>
            {amountInvalid && <Text style={sheet.error}>Enter an amount greater than 0</Text>}

            <Text style={styles.label}>DUE EVERY MONTH ON THE</Text>
            <View style={styles.dayRow}>
              <Pressable style={styles.dayArrow} onPress={() => setDay(day <= 1 ? 31 : day - 1)}>
                <Ionicons name="chevron-back" size={18} color={Corpus.text} />
              </Pressable>
              <Text style={styles.dayText}>{ordinal(day)}</Text>
              <Pressable style={styles.dayArrow} onPress={() => setDay(day >= 31 ? 1 : day + 1)}>
                <Ionicons name="chevron-forward" size={18} color={Corpus.text} />
              </Pressable>
            </View>
            {day > 28 && <Text style={styles.hint}>In shorter months it's logged on the last day.</Text>}

            {!editing && dueAlreadyPassed && (
              <View style={styles.switchRow}>
                <View style={styles.switchBody}>
                  <Text style={styles.switchTitle}>Already paid this month?</Text>
                  <Text style={styles.switchHint}>
                    {paidThisMonth
                      ? `Corpus will start logging it from next month`
                      : `Corpus will log ${amount && !amountInvalid ? formatINR(value) : 'it'} for this month now`}
                  </Text>
                </View>
                <Switch
                  value={paidThisMonth}
                  onValueChange={setPaidThisMonth}
                  trackColor={{ false: Corpus.border, true: Corpus.gold }}
                  thumbColor={Corpus.text}
                />
              </View>
            )}

            <Text style={styles.label}>CATEGORY</Text>
            <CategoryGrid categories={EXPENSE_CATEGORIES} selected={category} onSelect={setCategory} />

            {editing && (
              <View style={styles.switchRow}>
                <View style={styles.switchBody}>
                  <Text style={styles.switchTitle}>Active</Text>
                  <Text style={styles.switchHint}>Pause it to stop logging without deleting</Text>
                </View>
                <Switch
                  value={active}
                  onValueChange={setActive}
                  trackColor={{ false: Corpus.border, true: Corpus.gold }}
                  thumbColor={Corpus.text}
                />
              </View>
            )}

            <Pressable
              style={[sheet.saveButton, !canSave && sheet.saveButtonDisabled]}
              onPress={save}
              disabled={!canSave}
            >
              {busy ? (
                <ActivityIndicator color="#0F1115" />
              ) : (
                <Text style={[sheet.saveText, !canSave && sheet.saveTextDisabled]}>
                  {editing ? 'Save changes' : 'Add bill'}
                </Text>
              )}
            </Pressable>

            {editing && (
              <Pressable style={sheet.removeButton} onPress={() => confirmDelete(mode.bill, () => onDelete(mode.bill))}>
                <Text style={sheet.removeText}>Delete bill</Text>
              </Pressable>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
