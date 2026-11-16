import DateStepper from '@/components/DateStepper';
import { Button } from '@/components/ui';
import { askWeb } from '@/services/confirm';
import { EXPENSE_CATEGORIES } from '@/constants/categories';
import { Corpus } from '@/constants/theme';
import CategoryGrid from '@/screens/add/components/CategoryGrid';
import { styles as sheet } from '@/screens/budgets/components/BudgetEditorSheet.styles';
import type { Bill, NewBill } from '@/types/bill';
import { addDays, endLabel, fromIsoDay, isAuto, isDueInMonth, isoDay, ordinal, remainingPayments, yearMonth } from '@/utils/bills';
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
  everyDays?: number; // prepaid plans counted in days
  auto?: boolean; // an auto-debit that records itself
};

// 'YYYY-MM' shifted by n months
function shiftYm(ym: string, n: number): string {
  const d = new Date(Number(ym.slice(0, 4)), Number(ym.slice(5)) - 1 + n, 1);
  return yearMonth(d);
}

export const BILL_TEMPLATES: Template[] = [
  { name: 'Rent', category: 'bills', day: 1, icon: 'home' },
  { name: 'EMI', category: 'bills', day: 5, icon: 'card', hasEnd: true, auto: true },
  { name: 'Mobile recharge', category: 'bills', day: 10, icon: 'phone-portrait', frequency: 'days', everyDays: 28 },
  { name: 'Internet', category: 'bills', day: 10, icon: 'wifi' },
  { name: 'Electricity', category: 'bills', day: 15, icon: 'flash', variable: true },
  { name: 'Netflix', category: 'fun', day: 20, icon: 'tv', auto: true },
  { name: 'Insurance', category: 'health', day: 1, icon: 'shield-checkmark', frequency: 'yearly' },
  { name: 'Amazon Prime', category: 'fun', day: 1, icon: 'pricetag', frequency: 'yearly', auto: true },
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
    askWeb(`Delete bill?\n\n${msg}`, 'Delete').then((y) => { if (y) onYes(); });
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
  const [everyDays, setEveryDays] = useState('28');
  const [lastPaid, setLastPaid] = useState(new Date());
  const [auto, setAuto] = useState(false);
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
      setAuto(isAuto(mode.bill));
      const n = mode.bill.everyDays ?? 28;
      setEveryDays(String(n));
      setLastPaid(mode.bill.lastPaidDate ? fromIsoDay(mode.bill.lastPaidDate) : mode.bill.nextDate ? addDays(fromIsoDay(mode.bill.nextDate), -n) : new Date());
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
      setAuto(!!mode.template?.auto);
      setEveryDays(String(mode.template?.everyDays ?? 28));
      setLastPaid(new Date());
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
  const byDays = frequency === 'days';
  const planDays = Math.round(Number(everyDays));
  const planOk = !byDays || (Number.isFinite(planDays) && planDays >= 1 && planDays <= 730);
  const nextOn = addDays(lastPaid, planOk ? planDays : 28);
  const dueAlreadyPassed = !byDays && draftDueThisMonth && day <= today;
  // End date preview (loans / EMIs)
  const draft = {
    id: '', name, amount: Number(amount) || 0, category: '', dayOfMonth: day, active: true,
    startMonth: editing ? mode.bill.startMonth : yearMonth(now), frequency, dueMonth, endMonth,
    lastLoggedMonth: editing ? mode.bill.lastLoggedMonth : !editing && dueAlreadyPassed && paidThisMonth ? yearMonth(now) : undefined,
  };
  const left = endMonth ? remainingPayments(draft, now) ?? 0 : 0;
  const stepMonths = frequency === 'bimonthly' ? 2 : frequency === 'halfyearly' ? 6 : 3;
  const monthName = (m: number) => new Date(2000, m - 1, 1).toLocaleDateString('en-IN', { month: 'long' });

  const value = Number(amount);
  const amountInvalid = amount.trim() !== '' && (!Number.isFinite(value) || value <= 0);
  const canSave = name.trim().length > 0 && amount.trim() !== '' && !amountInvalid && category !== null && planOk && !busy;

  const save = async () => {
    if (!canSave || !category) return;
    setBusy(true);
    try {
      await onSave(
        {
          name: name.trim(),
          amount: value,
          category,
          dayOfMonth: byDays ? nextOn.getDate() : day,
          active,
          startMonth: editing ? mode.bill.startMonth : yearMonth(new Date()),
          frequency: frequency === 'monthly' ? undefined : frequency,
          dueMonth: frequency === 'monthly' || byDays ? undefined : dueMonth,
          variable: variable ? true : undefined,
          endMonth: byDays ? undefined : endMonth,
          auto: variable ? undefined : auto,
          everyDays: byDays ? planDays : undefined,
          nextDate: byDays ? isoDay(nextOn) : undefined,
          lastPaidDate: byDays ? isoDay(lastPaid) : undefined,
          ...(byDays ? { lastLoggedMonth: yearMonth(lastPaid) } : editing && mode.bill.lastLoggedMonth ? { lastLoggedMonth: mode.bill.lastLoggedMonth } : {}),
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
          <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ gap: 14 }} keyboardShouldPersistTaps="handled">
            <View style={sheet.header}>
              <View style={sheet.iconCircle}>
                <Ionicons name="repeat" size={18} color={Corpus.gold} />
              </View>
              <View style={sheet.titleBlock}>
                <Text style={sheet.title}>{editing ? 'Edit bill' : 'New recurring bill'}</Text>
                <Text style={sheet.subtitle}>Its money is kept aside until it is paid</Text>
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
                      setAuto(!!t.auto);
                      if (t.everyDays) setEveryDays(String(t.everyDays));
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
            <View style={[styles.freqRow, { flexWrap: 'wrap' }]}>
              {(['monthly', 'bimonthly', 'quarterly', 'halfyearly', 'yearly', 'days'] as BillFrequency[]).map((f) => (
                <Pressable
                  key={f}
                  style={[styles.freq, { flexGrow: 1, flexBasis: '30%' }, frequency === f && styles.freqActive]}
                  onPress={() => { setFrequency(f); if (f === 'days') setAuto(false); }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: frequency === f }}
                >
                  <Text style={[styles.freqText, frequency === f && styles.freqTextActive]}>
                    {{ monthly: 'Monthly', bimonthly: '2 months', quarterly: '3 months', halfyearly: '6 months', yearly: 'Yearly', days: 'Count days' }[f]}
                  </Text>
                </Pressable>
              ))}
            </View>
            {byDays && (
              <>
                <Text style={styles.hint}>For prepaid plans like a 28 day recharge. The next date is counted from the day you paid, so it moves earlier each month.</Text>
                <Text style={styles.label}>PLAN LENGTH IN DAYS</Text>
                <View style={[styles.freqRow, { flexWrap: 'wrap' }]}>
                  {['28', '30', '56', '84', '365'].map((d) => (
                    <Pressable key={d} style={[styles.freq, everyDays === d && styles.freqActive]} onPress={() => setEveryDays(d)} accessibilityRole="button" accessibilityState={{ selected: everyDays === d }}>
                      <Text style={[styles.freqText, everyDays === d && styles.freqTextActive]}>{d}</Text>
                    </Pressable>
                  ))}
                </View>
                <TextInput
                  style={styles.input}
                  value={everyDays}
                  onChangeText={(t) => setEveryDays(t.replace(/[^0-9]/g, '').slice(0, 3))}
                  placeholder="Or type the number of days"
                  placeholderTextColor={Corpus.textFaint}
                  keyboardType="number-pad"
                  accessibilityLabel="Plan length in days"
                />
                {!planOk && <Text style={sheet.error}>Enter a number of days from 1 to 730</Text>}
                <Text style={styles.label}>LAST PAID ON</Text>
                <DateStepper value={lastPaid} onChange={setLastPaid} />
                {planOk && <Text style={styles.hint}>Next one is due {nextOn.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}.</Text>}
              </>
            )}
            {frequency !== 'monthly' && !byDays && (
              <>
                <Text style={styles.label}>{frequency === 'yearly' ? 'DUE IN' : 'ONE OF THE MONTHS IT IS DUE'}</Text>
                <View style={styles.dayRow}>
                  <Pressable style={styles.dayArrow} onPress={() => setDueMonth(dueMonth <= 1 ? 12 : dueMonth - 1)}>
                    <Ionicons name="chevron-back" size={18} color={Corpus.text} />
                  </Pressable>
                  <Text style={styles.dayText}>{monthName(dueMonth)}</Text>
                  <Pressable style={styles.dayArrow} onPress={() => setDueMonth(dueMonth >= 12 ? 1 : dueMonth + 1)}>
                    <Ionicons name="chevron-forward" size={18} color={Corpus.text} />
                  </Pressable>
                </View>
                {frequency !== 'yearly' && (
                  <Text style={styles.hint}>
                    Due in {Array.from({ length: 12 / stepMonths }, (_, k) => monthName(((dueMonth - 1 + k * stepMonths) % 12) + 1).slice(0, 3)).join(', ')}
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
                    : 'Off: the amount is the same each time'}
                </Text>
              </View>
              <Switch
                value={variable}
                onValueChange={setVariable}
                trackColor={{ false: Corpus.border, true: Corpus.gold }}
                thumbColor={Corpus.text}
              />
            </View>

            {!variable && (
              <View style={styles.switchRow}>
                <View style={styles.switchBody}>
                  <Text style={styles.switchTitle}>Records itself on the due day</Text>
                  <Text style={styles.switchHint}>
                    {auto ? 'For auto-debits like an EMI or a subscription. Corpus adds the spend on the due day.' : 'Off: Corpus reminds you and waits until you mark it paid.'}
                  </Text>
                </View>
                <Switch value={auto} onValueChange={setAuto} trackColor={{ false: Corpus.border, true: Corpus.gold }} thumbColor={Corpus.text} />
              </View>
            )}

            {!byDays && (
              <>
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
            {day > 28 && <Text style={styles.hint}>In shorter months it is due on the last day.</Text>}
              </>
            )}

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

            {!byDays && (
              <>
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
