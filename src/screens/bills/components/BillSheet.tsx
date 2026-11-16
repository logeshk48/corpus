import { Button, Choice, DayStepper, Field, Sheet, Stepper, Toggle } from '@/components/ui';
import { EXPENSE_CATEGORIES } from '@/constants/categories';
import { Corpus, Font, Type } from '@/constants/theme';
import CategoryGrid from '@/screens/add/components/CategoryGrid';
import { askWeb } from '@/services/confirm';
import type { Bill, BillFrequency, NewBill } from '@/types/bill';
import { addDays, endLabel, fromIsoDay, isAuto, isDueInMonth, isoDay, ordinal, remainingPayments, yearMonth } from '@/utils/bills';
import { formatINR } from '@/utils/format';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

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

  const FREQ: { value: BillFrequency; label: string }[] = [
    { value: 'monthly', label: 'Monthly' }, { value: 'bimonthly', label: '2 months' }, { value: 'quarterly', label: '3 months' },
    { value: 'halfyearly', label: '6 months' }, { value: 'yearly', label: 'Yearly' }, { value: 'days', label: 'Count days' },
  ];
  const pick = (t: Template) => {
    setName(t.name); setDay(t.day); setCategory(t.category); setFrequency(t.frequency ?? 'monthly'); setVariable(!!t.variable);
    setAuto(!!t.auto); if (t.everyDays) setEveryDays(String(t.everyDays));
    setEndMonth(t.hasEnd ? shiftYm(yearMonth(new Date()), 11) : undefined);
  };
  const dueMonths = Array.from({ length: 12 / stepMonths }, (_, k) => monthName(((dueMonth - 1 + k * stepMonths) % 12) + 1).slice(0, 3)).join(', ');

  return (
    <Sheet
      title={editing ? 'Edit bill' : 'New bill'}
      subtitle="Its money is kept aside until it is paid"
      onClose={onClose}
      footer={
        <>
          <Button label={editing ? 'Save changes' : 'Add bill'} onPress={save} loading={busy} disabled={!canSave} />
          {editing && <Button variant="danger" icon="trash-outline" label="Delete bill" onPress={() => confirmDelete(mode.bill, () => onDelete(mode.bill))} />}
        </>
      }
    >
      {!editing && (
        <View style={st.templates}>
          {BILL_TEMPLATES.map((t) => {
            const on = name === t.name;
            return (
              <Pressable key={t.name} style={({ pressed }) => [st.template, on && st.templateOn, pressed && { opacity: 0.7 }]} onPress={() => pick(t)} accessibilityRole="button" accessibilityState={{ selected: on }}>
                <Ionicons name={t.icon as keyof typeof Ionicons.glyphMap} size={14} color={on ? Corpus.onGold : Corpus.text} />
                <Text style={[st.templateText, on && { color: Corpus.onGold }]}>{t.name}</Text>
              </Pressable>
            );
          })}
        </View>
      )}

      <Field label="Name" value={name} onChangeText={setName} placeholder="Rent, bike EMI, Netflix" maxLength={30} />
      <Field
        label={variable ? 'Usual amount' : frequency === 'monthly' ? 'Amount each month' : 'Amount each time'}
        money value={amount} onChangeText={(t) => setAmount(t.replace(/[^0-9.]/g, ''))} placeholder="0"
        error={amountInvalid ? 'Enter an amount above 0' : undefined}
        hint={variable ? 'Used as an estimate until you enter the real one' : undefined}
      />

      <Choice label="Repeats" options={FREQ} value={frequency} onChange={(f) => { setFrequency(f); if (f === 'days') setAuto(false); }} />

      {byDays ? (
        <>
          <Choice label="Plan length in days" options={['28', '30', '56', '84', '365'].map((d) => ({ value: d, label: d }))} value={everyDays} onChange={setEveryDays} />
          <Field label="Or type the days" value={everyDays} onChangeText={(t) => setEveryDays(t.replace(/[^0-9]/g, '').slice(0, 3))} keyboardType="number-pad"
            error={!planOk ? 'Enter a number from 1 to 730' : undefined}
            hint="For prepaid plans like a 28 day recharge. The date moves earlier each month." />
          <DayStepper label="Last paid on" value={lastPaid} onChange={setLastPaid}
            hint={planOk ? `Next one is due ${nextOn.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}` : undefined} />
        </>
      ) : (
        <>
          {frequency !== 'monthly' && (
            <Stepper label={frequency === 'yearly' ? 'Due in' : 'One of the months it is due'} value={monthName(dueMonth)}
              onPrev={() => setDueMonth(dueMonth <= 1 ? 12 : dueMonth - 1)} onNext={() => setDueMonth(dueMonth >= 12 ? 1 : dueMonth + 1)}
              hint={frequency !== 'yearly' ? `Due in ${dueMonths}` : undefined} />
          )}
          <Stepper label="Due on the" value={ordinal(day)} onPrev={() => setDay(day <= 1 ? 31 : day - 1)} onNext={() => setDay(day >= 31 ? 1 : day + 1)}
            hint={day > 28 ? 'In shorter months it is due on the last day' : undefined} />
        </>
      )}

      <Toggle icon="flash" title="Amount changes each time" value={variable} onChange={setVariable}
        hint={variable ? 'Corpus asks for the real amount when it is due. Good for electricity and water.' : 'Off: the amount is the same each time'} />
      {!variable && (
        <Toggle icon="sync-circle" title="Records itself on the due day" value={auto} onChange={setAuto}
          hint={auto ? 'For auto-debits like an EMI or a subscription' : 'Off: Corpus reminds you and waits until you mark it paid'} />
      )}
      {!editing && dueAlreadyPassed && (
        <Toggle icon="checkmark-circle" title="Already paid this month" value={paidThisMonth} onChange={setPaidThisMonth}
          hint={paidThisMonth ? 'It starts from the next payment' : `The ${ordinal(day)} has passed, so it will show as due now`} />
      )}
      {!byDays && (
        <>
          <Toggle icon="flag" title="Has an end date" value={!!endMonth} onChange={(on) => setEndMonth(on ? shiftYm(yearMonth(now), 11) : undefined)}
            hint={endMonth ? 'Corpus stops after the last payment' : 'For loans and EMIs. Off: it repeats until you pause or delete it'} />
          {endMonth && (
            <Stepper label="Last payment in" value={endLabel({ ...draft, endMonth }) ?? ''}
              onPrev={() => setEndMonth(shiftYm(endMonth, -1))} prevDisabled={endMonth <= yearMonth(now)} onNext={() => setEndMonth(shiftYm(endMonth, 1))}
              extra={{ label: '+1 year', onPress: () => setEndMonth(shiftYm(endMonth, 12)) }}
              hint={`${left} payment${left === 1 ? '' : 's'} left${Number(amount) > 0 ? `, ${formatINR(left * Number(amount))} still to pay` : ''}`} />
          )}
        </>
      )}

      <View style={{ gap: 8 }}>
        <Text style={st.label}>Category</Text>
        <CategoryGrid categories={EXPENSE_CATEGORIES} selected={category} onSelect={setCategory} />
      </View>

      {editing && <Toggle icon="play-circle" title="Active" value={active} onChange={setActive} hint={active ? 'Turn off to pause it without deleting' : 'Paused. Nothing is recorded or kept aside'} />}
    </Sheet>
  );
}

const st = StyleSheet.create({
  templates: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  template: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 40, paddingHorizontal: 14, borderRadius: 20, backgroundColor: Corpus.bg },
  templateOn: { backgroundColor: Corpus.gold },
  templateText: { fontSize: Type.body, fontFamily: Font.display, color: Corpus.text },
  label: { fontSize: Type.body, fontFamily: Font.display, color: Corpus.text },
});
