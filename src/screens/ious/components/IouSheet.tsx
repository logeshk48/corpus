import { Button, Choice, Field, Sheet, Toggle } from '@/components/ui';
import { Corpus } from '@/constants/theme';
import { styles as sheet } from '@/screens/budgets/components/BudgetEditorSheet.styles';
import type { Iou, IouDirection, IouKind, NewIou } from '@/types/iou';
import { formatINR } from '@/utils/format';
import { remaining, repaid as repaidOf } from '@/utils/iou';
import { interestStatus, yearlyRate } from '@/utils/interest';
import { lendingWarnings } from '@/utils/instalments';
import { Ionicons } from '@expo/vector-icons';
import { Font, tabular, Type } from '@/constants/theme';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { styles } from './IouSheet.styles';

export type IouSheetMode =
  | { kind: 'new'; person?: string; direction?: IouDirection }
  | { kind: 'edit'; iou: Iou }
  | { kind: 'repay'; iou: Iou }
  | { kind: 'payPerson'; person: string; direction: IouDirection; open: Iou[] }
  | { kind: 'payInterest'; iou: Iou };

type Props = {
  mode: IouSheetMode;
  people: string[]; // names used before
  ious: Iou[];      // for warnings
  onClose: () => void;
  onSave: (iou: NewIou) => Promise<void>;
  onSaveChain: (borrowed: NewIou, lent: NewIou) => Promise<void>;
  onRepay: (iou: Iou, amount: number) => Promise<void>;
  onPayPerson: (open: Iou[], amount: number) => Promise<void>;
  onPayInterest: (iou: Iou, amount: number) => Promise<void>;
  onUpdate: (id: string, changes: Partial<NewIou>) => Promise<void>;
  onDelete?: (iou: Iou) => void;
};

const DUE = [
  { label: 'No date', days: 0 },
  { label: '1 week', days: 7 },
  { label: '2 weeks', days: 14 },
  { label: '1 month', days: 30 },
];

export default function IouSheet({ mode, people, ious, onClose, onSave, onSaveChain, onRepay, onPayPerson, onPayInterest, onUpdate, onDelete }: Props) {
  const editing = mode.kind === 'edit';
  const ed = mode.kind === 'edit' ? mode.iou : undefined;
  const repaying = mode.kind !== 'new' && mode.kind !== 'edit';
  const isInterest = mode.kind === 'payInterest';
  const ist = mode.kind === 'payInterest' ? interestStatus(mode.iou) : null;
  const left =
    mode.kind === 'repay' ? remaining(mode.iou)
    : mode.kind === 'payPerson' ? mode.open.reduce((s, i) => s + remaining(i), 0)
    : ist ? Math.max(ist.pending, ist.monthly) * 12 // interest: allow paying ahead up to a year
    : 0;
  const payDir: IouDirection = mode.kind === 'new' ? 'lent' : mode.kind === 'payPerson' ? mode.direction : mode.iou.direction;
  const minAmount = ed ? repaidOf(ed) : 0;
  const payWho = mode.kind === 'new' ? '' : mode.kind === 'payPerson' ? mode.person : mode.iou.person;
  const [rate, setRate] = useState(ed?.ratePerHundred ? String(ed.ratePerHundred) : '');
  const [kind, setKind] = useState<IouKind>(ed?.kind ?? 'loan');
  const [direction, setDirection] = useState<IouDirection>(mode.kind === 'new' ? mode.direction ?? 'lent' : payDir);
  const [person, setPerson] = useState(mode.kind === 'new' ? mode.person ?? '' : payWho);
  const [amount, setAmount] = useState(ed ? String(ed.amount) : '');
  const [note, setNote] = useState(ed?.note ?? '');
  const [dueDays, setDueDays] = useState(0);
  const [clearDue, setClearDue] = useState(false);
  const [instalment, setInstalment] = useState(ed?.instalment ? String(ed.instalment) : '');
  const [onCard, setOnCard] = useState(!!ed?.onCard);
  const [proofRef, setProofRef] = useState(ed?.proofRef ?? '');
  const [busy, setBusy] = useState(false);
  // Chain: the same money came from one person and went to another
  const [chained, setChained] = useState(false);
  const [other, setOther] = useState('');
  const [otherAmount, setOtherAmount] = useState('');

  const value = Number(amount);
  const otherValue = otherAmount === '' ? value : Number(otherAmount);
  const chainValid = !chained || (other.trim().length > 0 && otherValue > 0 && otherValue <= value);
  const valid = value > 0 && (repaying ? value <= left : person.trim().length > 0 && chainValid && value >= minAmount);
  const matches = person.trim() ? people.filter((p) => p.toLowerCase().startsWith(person.trim().toLowerCase()) && p !== person) : people;

  const submit = async () => {
    if (!valid || busy) return;
    setBusy(true);
    try {
      if (mode.kind === 'repay') await onRepay(mode.iou, value);
      else if (mode.kind === 'payPerson') await onPayPerson(mode.open, value);
      else if (mode.kind === 'payInterest') await onPayInterest(mode.iou, value);
      else if (mode.kind === 'edit') {
        const isLoanKind = kind === 'loan';
        await onUpdate(mode.iou.id, {
          person: person.trim(),
          direction,
          kind: isLoanKind ? undefined : kind,
          amount: value,
          note: note.trim() || undefined,
          ratePerHundred: isLoanKind && Number(rate) > 0 ? Number(rate) : undefined,
          instalment: isLoanKind && Number(instalment) > 0 ? Number(instalment) : undefined,
          onCard: isLoanKind && Number(instalment) > 0 && onCard ? true : undefined,
          proofRef: proofRef.trim() || undefined,
          dueDate: !isLoanKind || clearDue ? undefined : dueDays ? new Date(Date.now() + dueDays * 86_400_000).toISOString() : mode.iou.dueDate,
        });
      }
      else {
        const now = new Date();
        const base: NewIou = {
          person: person.trim(),
          direction,
          kind: kind === 'loan' ? undefined : kind,
          amount: value,
          note: note.trim() || undefined,
          date: now.toISOString(),
          dueDate: dueDays ? new Date(now.getTime() + dueDays * 86_400_000).toISOString() : undefined,
          ratePerHundred: kind === 'loan' && Number(rate) > 0 ? Number(rate) : undefined,
          instalment: kind === 'loan' && Number(instalment) > 0 ? Number(instalment) : undefined,
          onCard: kind === 'loan' && Number(instalment) > 0 && onCard ? true : undefined,
          proofRef: proofRef.trim() || undefined,
        };
        if (kind !== 'loan') base.dueDate = undefined;
        if (!chained || kind !== 'loan') await onSave(base);
        else {
          const partner: NewIou = {
            person: other.trim(),
            direction: direction === 'lent' ? 'borrowed' : 'lent',
            amount: otherValue,
            note: base.note,
            date: base.date,
          };
          // always pass (borrowed, lent)
          if (direction === 'borrowed') await onSaveChain(base, partner);
          else await onSaveChain(partner, base);
        }
      }
    } finally {
      setBusy(false);
    }
  };

  const title = isInterest
    ? payDir === 'lent' ? `Interest from ${payWho}` : `Interest to ${payWho}`
    : repaying ? (payDir === 'lent' ? `${payWho} paid you` : `You paid ${payWho}`) : editing ? 'Edit entry' : 'Lent or borrowed';
  const subtitle = isInterest && ist
    ? `${formatINR(ist.monthly)} a month, ${ist.pending ? `${formatINR(ist.pending)} due now` : 'nothing due now'}. This doesn’t reduce the ${formatINR(remaining(mode.iou))}.`
    : repaying
    ? `${formatINR(left)} still open${mode.kind === 'repay' && mode.iou.note ? ` for ${mode.iou.note}` : ''}. Any amount is taken off.`
    : editing ? (minAmount > 0 ? `${formatINR(minAmount)} already paid back, so the amount can’t go below that` : 'Fix any detail') : 'Money between you and someone else';
  const quick: { label: string; v: number }[] = [];
  if (isInterest && ist) {
    quick.push({ label: `1 month ${formatINR(ist.monthly)}`, v: ist.monthly });
    if (ist.pending > ist.monthly) quick.push({ label: `All due ${formatINR(ist.pending)}`, v: ist.pending });
  } else {
    [500, 1000, 2000].filter((q) => q < left).forEach((q) => quick.push({ label: formatINR(q), v: q }));
    if (left >= 2) quick.push({ label: 'Half', v: Math.round(left / 2) });
    quick.push({ label: `All ${formatINR(left)}`, v: left });
  }

  const chips = (items: { key: string; label: string; on?: boolean; onPress: () => void }[]) => (
    <View style={sheet.chips}>
      {items.map((c) => (
        <Pressable key={c.key} style={({ pressed }) => [x.chip, c.on && x.chipOn, pressed && { opacity: 0.7 }]} onPress={c.onPress} accessibilityRole="button" accessibilityState={{ selected: !!c.on }}>
          <Text style={[x.chipText, c.on && { color: Corpus.onGold }]}>{c.label}</Text>
        </Pressable>
      ))}
    </View>
  );
  const otherPeople = people.filter((p) => p !== person && (!other || p.toLowerCase().startsWith(other.toLowerCase())) && p !== other);
  const saveLabel = editing ? 'Save changes'
    : kind !== 'loan' && !repaying ? 'Save'
    : isInterest ? `Record interest${value > 0 ? ` ${formatINR(value)}` : ''}`
    : repaying ? (value > 0 ? `Record ${formatINR(value)}` : 'Record payback')
    : direction === 'lent' ? 'Save, they owe me' : 'Save, I owe them';

  return (
    <Sheet title={title} subtitle={subtitle} onClose={onClose} footer={<><Button label={saveLabel} onPress={submit} loading={busy} disabled={!valid} />{ed && onDelete ? <Button variant="quiet" icon="trash-outline" label="Delete entry" onPress={() => onDelete(ed)} /> : null}</>}>
      {!repaying && (
        <Choice
          options={[
            { value: 'lent' as IouDirection, label: kind !== 'loan' ? 'I gave' : 'I lent or paid' },
            { value: 'borrowed' as IouDirection, label: kind !== 'loan' ? 'I received' : 'I borrowed' },
          ]}
          value={direction}
          onChange={setDirection}
          tiles
        />
      )}
      {!repaying && (
        <Choice
          label="Kind"
          options={[
            { value: 'loan' as IouKind, label: 'Loan' },
            { value: 'support' as IouKind, label: 'Family support' },
            { value: 'gift' as IouKind, label: 'Gift or shagun' },
          ]}
          value={kind}
          onChange={setKind}
        />
      )}
      {!repaying && kind !== 'loan' && (
        <Text style={x.hint}>Kept so you know what you {direction === 'lent' ? 'gave' : 'received'}. Never counted as owed.</Text>
      )}

      {!repaying && (
        <View style={{ gap: 8 }}>
          <Field
            label={kind !== 'loan' ? (direction === 'lent' ? 'Given to' : 'Received from') : direction === 'lent' ? 'Who owes you?' : 'Who do you owe?'}
            value={person}
            onChangeText={setPerson}
            placeholder="Name"
            maxLength={30}
            autoCapitalize="words"
          />
          {matches.length > 0 && chips(matches.slice(0, 5).map((p) => ({ key: p, label: p, onPress: () => setPerson(p) })))}
        </View>
      )}

      <View style={x.amountBox}>
        <View style={x.amountRow}>
          <Text style={x.rupee}>₹</Text>
          <TextInput
            style={[x.amount, { width: Math.max(90, (amount.length || 1) * 30 + 16) }]}
            value={amount}
            onChangeText={(t) => setAmount(t.replace(/[^0-9.]/g, ''))}
            placeholder="0"
            placeholderTextColor={Corpus.textFaint}
            keyboardType="decimal-pad"
            autoFocus
            accessibilityLabel="Amount"
          />
        </View>
        {!isInterest && repaying && value > 0 && value <= left && (
          <Text style={x.hint}>{value === left ? 'This settles it fully' : `${formatINR(left - value)} stays open after this`}</Text>
        )}
        {repaying && value > left && <Text style={x.error}>That’s more than the {formatINR(left)} still open</Text>}
      </View>
      {repaying && chips(quick.map((q) => ({ key: q.label, label: q.label, on: value === q.v, onPress: () => setAmount(String(q.v)) })))}

      {!repaying && (
        <>
          <Field label="What for" hint="Optional" value={note} onChangeText={setNote} placeholder="Dinner, movie tickets" maxLength={40} />
          {kind === 'loan' && !editing && (
            <Toggle
              icon="git-branch"
              title={direction === 'borrowed' ? 'I gave this money to someone else' : 'I borrowed this money from someone'}
              hint={direction === 'borrowed'
                ? `When they pay you back, Corpus reminds you to repay ${person.trim() || 'the lender'}`
                : `When ${person.trim() || 'they'} pay you back, Corpus reminds you to repay that person`}
              value={chained}
              onChange={setChained}
            />
          )}
          {chained && kind === 'loan' && !editing && (
            <>
              <View style={{ gap: 8 }}>
                <Field label={direction === 'borrowed' ? 'Gave it to' : 'Borrowed it from'} value={other} onChangeText={setOther} placeholder="Name" maxLength={30} autoCapitalize="words" />
                {otherPeople.length > 0 && chips(otherPeople.slice(0, 5).map((p) => ({ key: p, label: p, onPress: () => setOther(p) })))}
              </View>
              <Field
                money
                label="How much of it"
                hint="Leave empty for all of it"
                value={otherAmount}
                onChangeText={(t) => setOtherAmount(t.replace(/[^0-9.]/g, ''))}
                placeholder={value > 0 ? String(value) : 'Same amount'}
                error={otherValue > value ? `Can’t be more than ${formatINR(value)}` : undefined}
              />
            </>
          )}
          {kind === 'loan' && (
            <>
              <View style={{ gap: 8 }}>
                <Text style={x.label}>Interest, ₹ per ₹100 a month</Text>
                {chips(['', '1', '1.5', '2', '3'].map((r) => ({ key: r || 'none', label: r ? `₹${r}` : 'No interest', on: rate === r, onPress: () => setRate(r) })))}
                <Field
                  label="Or type a rate"
                  value={rate}
                  onChangeText={(t) => setRate(t.replace(/[^0-9.]/g, ''))}
                  placeholder="2.5"
                  keyboardType="decimal-pad"
                  hint={Number(rate) > 0
                    ? `${yearlyRate(Number(rate))}% a year${value > 0 ? `, ${formatINR(Math.round((value * Number(rate)) / 100))} interest a month on ${formatINR(value)}` : ''}. Interest doesn’t reduce the amount, only principal does.`
                    : undefined}
                />
              </View>
              <Field
                money
                label="Paid back monthly"
                value={instalment}
                onChangeText={(t) => setInstalment(t.replace(/[^0-9]/g, ''))}
                placeholder="2,000"
                hint={Number(instalment) > 0 && value > 0 ? `${Math.ceil(value / Number(instalment))} monthly instalments from next month. Corpus reminds you each time.` : 'Optional'}
              />
              {Number(instalment) > 0 && direction === 'lent' && (
                <Toggle
                  icon="card"
                  title="It’s an EMI on my credit card"
                  hint={`You pay the bank, they pay you. Make sure their ₹${instalment} reaches you before your card bill.`}
                  value={onCard}
                  onChange={setOnCard}
                />
              )}
              <View style={{ gap: 8 }}>
                <Text style={x.label}>Pay back by</Text>
                {chips(DUE.map((d) => ({ key: d.label, label: d.label, on: dueDays === d.days, onPress: () => { setDueDays(d.days); setClearDue(d.days === 0); } })))}
                {editing && ed?.dueDate && !clearDue && dueDays === 0 && (
                  <Text style={x.hint}>Due {new Date(ed.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} now. Pick a new date or “No date” to remove it.</Text>
                )}
              </View>
            </>
          )}
          <Field label="Proof" hint="Optional" value={proofRef} onChangeText={setProofRef} placeholder="UPI ref, cheque no. or a note" maxLength={60} />
        </>
      )}
      {!repaying && !editing && kind === 'loan' && lendingWarnings(ious, person, value, direction).map((w) => (
        <View key={w} style={styles.warn}>
          <Ionicons name="alert-circle" size={16} color={Corpus.warning} />
          <Text style={styles.warnText}>{w}</Text>
        </View>
      ))}
    </Sheet>
  );
}

const x = StyleSheet.create({
  label: { fontSize: Type.body, fontFamily: Font.display, color: Corpus.text },
  hint: { fontSize: Type.small, color: Corpus.textMuted, lineHeight: 17, textAlign: 'center' },
  error: { fontSize: Type.small, color: Corpus.danger, marginTop: 4 },
  chip: { minHeight: 40, paddingHorizontal: 14, borderRadius: 20, backgroundColor: Corpus.bg, justifyContent: 'center' },
  chipOn: { backgroundColor: Corpus.gold },
  chipText: { fontSize: Type.bodyLg, fontFamily: Font.display, color: Corpus.text, ...tabular },
  amountBox: { alignItems: 'center', gap: 4, paddingVertical: 4 },
  amountRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  rupee: { fontSize: Type.h1, fontFamily: Font.display, color: Corpus.textMuted, marginRight: 4 },
  amount: { fontSize: Type.entry, fontFamily: Font.displayBold, color: Corpus.text, textAlign: 'center', padding: 0, ...tabular, ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null) },
});
