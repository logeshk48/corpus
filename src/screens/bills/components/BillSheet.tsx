import { Button } from '@/components/ui';
import { EXPENSE_CATEGORIES } from '@/constants/categories';
import { Corpus } from '@/constants/theme';
import CategoryGrid from '@/screens/add/components/CategoryGrid';
import { styles as sheet } from '@/screens/budgets/components/BudgetEditorSheet.styles';
import type { Bill, NewBill } from '@/types/bill';
import { endLabel, isDueInMonth, ordinal, remainingPayments, yearMonth } from '@/utils/bills';
import type { BillFrequency } from '@/types/bill';
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

export type Template = {
  name: string;
  category: string;
  day: number;
  icon: string;
  frequency?: BillFrequency;
  variable?: boolean;
  hasEnd?: boolean; // loans / EMIs
};

// 'YYYY-MM' shifted by n months
function shiftYm(ym: string, n: number): string {
  const d = new Date(Number(ym.slice(0, 4)), Number(ym.slice(5)) - 1 + n, 1);
  return yearMonth(d);
}

export const BILL_TEMPLATES: Template[] = [
  { name: 'Rent', category: 'bills', day: 1, icon: 'home' },
  { name: 'EMI', category: 'bills', day: 5, icon: 'card', hasEnd: true },
  { name: 'Mobile recharge', category: 'bills', day: 10, icon: 'phone-portrait' },
  { name: 'Internet', category: 'bills', day: 10, icon: 'wifi' },
  { name: 'Electricity', category: 'bills', day: 15, icon: 'flash', variable: true },
  { name: 'Netflix', category: 'fun', day: 20, icon: 'tv' },
  { name: 'Insurance', category: 'health', day: 1, icon: 'shield-checkmark', frequency: 'yearly' },
  { name: 'Amazon Prime', category: 'fun', day: 1, icon: 'pricetag', frequency: 'yearly' },
  { name: 'Water', category: 'bills', day: 10, icon: 'water', variable: true },
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
  const [paidThisMonth, setPaidThisMonth] = useState(false);
  const [frequency, setFrequency] = useState<BillFrequency>('monthly');
  const [dueMonth, setDueMonth] = useState(new Date().getMonth() + 1);
  const [variable, setVariable] = useState(false);
  const [endMonth, setEndMonth] = useState<string | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!mode) return;
    if (mode.kind === 'edit') {
      setName(mode.bill.name);
      setAmount(String(mode.bill.amount));
      setDay(mode.bill.dayOfMonth);
      setCategory(mode.bill.category);
      setActive(mode.bill.active);
      setFrequency(mode.bill.frequency ?? 'monthly');
      setDueMonth(mode.bill.dueMonth ?? new Date().getMonth() + 1);
      setVariable(!!mode.bill.variable);
      setEndMonth(mode.bill.endMonth);
    } else {
      setName(mode.template?.name ?? '');
      setAmount('');
      setDay(mode.template?.day ?? new Date().getDate());
      setCategory(mode.template?.category ?? 'bills');
      setActive(true);
      setFrequency(mode.template?.frequency ?? 'monthly');
      setDueMonth(new Date().getMonth() + 1);
      setVariable(!!mode.template?.variable);
      setEndMonth(mode.template?.hasEnd ? shiftYm(yearMonth(new Date()), 11) : undefined);
      setPaidThisMonth(false);
    }
  }, [mode]);

  if (!mode) return null;
  const editing = mode.kind === 'edit';
  const today = new Date().getDate();
  // "Already paid this month?" only makes sense if the bill is due THIS month and its day has passed
  const now = new Date();
  const draftDueThisMonth = isDueInMonth(
    { id: '', name, amount: 0, category: '', dayOfMonth: day, active: true, startMonth: yearMonth(now), frequency, dueMonth },
    now.getFullYear(),
    now.getMonth()
  );
  const dueAlreadyPassed = draftDueThisMonth && day <= today;
  // End date preview (loans / EMIs)
  const draft = {
    id: '', name, amount: Number(amount) || 0, category: '', dayOfMonth: day, active: true,
    startMonth: editing ? mode.bill.startMonth : yearMonth(now), frequency, dueMonth, endMonth,
    lastLoggedMonth: editing ? mode.bill.lastLoggedMonth : !editing && dueAlreadyPassed && paidThisMonth ? yearMonth(now) : undefined,
  };
  const left = endMonth ? remainingPayments(draft, now) ?? 0 : 0;
  const monthName = (m: number) => new Date(2000, m - 1, 1).toLocaleDateString('en-IN', { month: 'long' });

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
          frequency: frequency === 'monthly' ? undefined : frequency,
          dueMonth: frequency === 'monthly' ? undefined : dueMonth,
          variable: variable ? true : undefined,
          endMonth,
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
                      setFrequency(t.frequency ?? 'monthly');
                      setVariable(!!t.variable);
                      setEndMonth(t.hasEnd ? shiftYm(yearMonth(new Date()), 11) : undefined);
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

            <Text style={styles.label}>HOW OFTEN</Text>
            <View style={styles.freqRow}>
              {(['monthly', 'quarterly', 'yearly'] as BillFrequency[]).map((f) => (
                <Pressable
                  key={f}
                  style={[styles.freq, frequency === f && styles.freqActive]}
                  onPress={() => setFrequency(f)}
                >
                  <Text style={[styles.freqText, frequency === f && styles.freqTextActive]}>
                    {f === 'monthly' ? 'Monthly' : f === 'quarterly' ? 'Every 3 months' : 'Yearly'}
                  </Text>
                </Pressable>
              ))}
            </View>
            {frequency !== 'monthly' && (
              <>
                <Text style={styles.label}>{frequency === 'yearly' ? 'DUE IN' : 'FIRST MONTH OF THE CYCLE'}</Text>
                <View style={styles.dayRow}>
                  <Pressable style={styles.dayArrow} onPress={() => setDueMonth(dueMonth <= 1 ? 12 : dueMonth - 1)}>
                    <Ionicons name="chevron-back" size={18} color={Corpus.text} />
                  </Pressable>
                  <Text style={styles.dayText}>{monthName(dueMonth)}</Text>
                  <Pressable style={styles.dayArrow} onPress={() => setDueMonth(dueMonth >= 12 ? 1 : dueMonth + 1)}>
                    <Ionicons name="chevron-forward" size={18} color={Corpus.text} />
                  </Pressable>
                </View>
                {frequency === 'quarterly' && (
                  <Text style={styles.hint}>
                    Due in {[0, 3, 6, 9].map((k) => monthName(((dueMonth - 1 + k) % 12) + 1).slice(0, 3)).join(', ')}
                  </Text>
                )}
              </>
            )}

            <Text style={styles.label}>{variable ? 'USUAL AMOUNT (USED AS AN ESTIMATE)' : frequency === 'monthly' ? 'AMOUNT PER MONTH' : 'AMOUNT EACH TIME'}</Text>
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

            <View style={styles.switchRow}>
              <View style={styles.switchBody}>
                <Text style={styles.switchTitle}>Amount changes each time</Text>
                <Text style={styles.switchHint}>
                  {variable
                    ? "Corpus will ask for the real amount when it's due (great for electricity, water)"
                    : 'Off: the same amount is logged automatically'}
                </Text>
              </View>
              <Switch
                value={variable}
                onValueChange={setVariable}
                trackColor={{ false: Corpus.border, true: Corpus.gold }}
                thumbColor={Corpus.text}
              />
            </View>

            <Text style={styles.label}>{frequency === 'monthly' ? 'DUE EVERY MONTH ON THE' : 'DUE ON THE'}</Text>
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
                  <Text style={styles.switchTitle}>Already logged this month’s payment?</Text>
                  <Text style={styles.switchHint}>
                    {paidThisMonth
                      ? `It won’t be logged again. Corpus starts from next month`
                      : `Corpus will log ${amount && !amountInvalid ? formatINR(value) : 'it'} as this month’s payment, so your spending stays accurate`}
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

            <View style={styles.switchRow}>
              <View style={styles.switchBody}>
                <Text style={styles.switchTitle}>Has an end date (loan / EMI)</Text>
                <Text style={styles.switchHint}>
                  {endMonth ? 'Corpus stops after the last payment' : 'Off: repeats until you delete or pause it'}
                </Text>
              </View>
              <Switch
                value={!!endMonth}
                onValueChange={(on) => setEndMonth(on ? shiftYm(yearMonth(now), 11) : undefined)}
                trackColor={{ false: Corpus.border, true: Corpus.gold }}
                thumbColor={Corpus.text}
              />
            </View>
            {endMonth && (
              <>
                <Text style={styles.label}>LAST PAYMENT IN</Text>
                <View style={styles.dayRow}>
                  <Pressable
                    style={styles.dayArrow}
                    onPress={() => setEndMonth(shiftYm(endMonth, -1))}
                    disabled={endMonth <= yearMonth(now)}
                  >
                    <Ionicons name="chevron-back" size={18} color={endMonth <= yearMonth(now) ? Corpus.textFaint : Corpus.text} />
                  </Pressable>
                  <Text style={styles.dayText}>{endLabel({ ...draft, endMonth })}</Text>
                  <Pressable style={styles.dayArrow} onPress={() => setEndMonth(shiftYm(endMonth, 1))}>
                    <Ionicons name="chevron-forward" size={18} color={Corpus.text} />
                  </Pressable>
                  <Pressable onPress={() => setEndMonth(shiftYm(endMonth, 12))} hitSlop={6}>
                    <Text style={styles.yearJump}>+1 yr</Text>
                  </Pressable>
                </View>
                <Text style={[styles.hint, { color: Corpus.gold }]}>
                  {left} payment{left === 1 ? '' : 's'} left
                  {Number(amount) > 0 ? ` · ${formatINR(left * Number(amount))} still to pay` : ''}
                </Text>
              </>
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

            <Button label={editing ? 'Save changes' : 'Add bill'} onPress={save} loading={busy} disabled={!canSave} />

            {editing && (
              <Button variant="danger" icon="trash-outline" label="Delete bill" onPress={() => confirmDelete(mode.bill, () => onDelete(mode.bill))} />
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
