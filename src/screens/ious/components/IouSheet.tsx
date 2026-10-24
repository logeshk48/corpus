import { Button } from '@/components/ui';
import { Corpus } from '@/constants/theme';
import { styles as sheet } from '@/screens/budgets/components/BudgetEditorSheet.styles';
import type { Iou, IouDirection, IouKind, NewIou } from '@/types/iou';
import { formatINR } from '@/utils/format';
import { remaining, repaid as repaidOf } from '@/utils/iou';
import { interestStatus, yearlyRate } from '@/utils/interest';
import { lendingWarnings } from '@/utils/instalments';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
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
};

const DUE = [
  { label: 'No date', days: 0 },
  { label: '1 week', days: 7 },
  { label: '2 weeks', days: 14 },
  { label: '1 month', days: 30 },
];

export default function IouSheet({ mode, people, ious, onClose, onSave, onSaveChain, onRepay, onPayPerson, onPayInterest, onUpdate }: Props) {
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
    ? `${formatINR(ist.monthly)}/month${ist.pending ? ` · ${formatINR(ist.pending)} due now` : ' · nothing due now'}. This doesn’t reduce the ${formatINR(remaining(mode.iou))}`
    : repaying
    ? `${formatINR(left)} still open${mode.kind === 'repay' && mode.iou.note ? ` · ${mode.iou.note}` : ''}. Enter any amount, it’s taken off`
    : editing ? (minAmount > 0 ? `${formatINR(minAmount)} already paid back, so the amount can’t go below that` : 'Fix any detail') : 'Keep track of money between you and others';
  const quick: { label: string; v: number }[] = [];
  if (isInterest && ist) {
    quick.push({ label: `1 month ${formatINR(ist.monthly)}`, v: ist.monthly });
    if (ist.pending > ist.monthly) quick.push({ label: `All due ${formatINR(ist.pending)}`, v: ist.pending });
  } else {
    [500, 1000, 2000].filter((q) => q < left).forEach((q) => quick.push({ label: formatINR(q), v: q }));
    if (left >= 2) quick.push({ label: 'Half', v: Math.round(left / 2) });
    quick.push({ label: `All ${formatINR(left)}`, v: left });
  }

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={sheet.overlay}>
        <Pressable style={sheet.backdrop} onPress={onClose} />
        <View style={sheet.sheet}>
          <View style={sheet.handle} />
          <View style={sheet.header}>
            <View style={[sheet.iconCircle, { backgroundColor: Corpus.goldTint }]}>
              <Ionicons name="swap-horizontal" size={18} color={Corpus.gold} />
            </View>
            <View style={sheet.titleBlock}>
              <Text style={sheet.title}>{title}</Text>
              <Text style={sheet.subtitle}>{subtitle}</Text>
            </View>
            <Pressable style={sheet.closeButton} onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={18} color={Corpus.textMuted} />
            </Pressable>
          </View>

          <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            {!repaying && (
              <View style={styles.toggle}>
                {(['lent', 'borrowed'] as const).map((d) => (
                  <Pressable key={d} style={[styles.toggleBtn, direction === d && styles.toggleOn]} onPress={() => setDirection(d)}>
                    <Text style={[styles.toggleText, direction === d && styles.toggleTextOn]}>
                      {kind !== 'loan' ? (d === 'lent' ? 'I gave' : 'I received') : d === 'lent' ? 'I lent / paid for them' : 'I borrowed'}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}

            {!repaying && (
              <View style={sheet.chips}>
                {(['loan', 'support', 'gift'] as const).map((k) => (
                  <Pressable key={k} style={[sheet.chip, kind === k && sheet.chipSuggested]} onPress={() => setKind(k)}>
                    <Text style={[sheet.chipText, kind === k && sheet.chipTextSuggested]}>
                      {k === 'loan' ? 'Loan · expect it back' : k === 'support' ? 'Family support' : 'Gift / shagun'}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
            {!repaying && kind !== 'loan' && (
              <Text style={sheet.hint}>Tracked so you know what you {direction === 'lent' ? 'gave' : 'received'}, but never counted as owed.</Text>
            )}

            {!repaying && (
              <View style={styles.field}>
                <Text style={styles.label}>{kind !== 'loan' ? (direction === 'lent' ? 'GIVEN TO' : 'RECEIVED FROM') : direction === 'lent' ? 'WHO OWES YOU?' : 'WHO DO YOU OWE?'}</Text>
                <TextInput style={styles.input} value={person} onChangeText={setPerson} placeholder="Name" placeholderTextColor={Corpus.textFaint} maxLength={30} />
                {matches.length > 0 && (
                  <View style={sheet.chips}>
                    {matches.slice(0, 5).map((p) => (
                      <Pressable key={p} style={sheet.chip} onPress={() => setPerson(p)}>
                        <Text style={sheet.chipText}>{p}</Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>
            )}

            <View style={sheet.amountRow}>
              <Text style={sheet.rupee}>₹</Text>
              <TextInput
                style={sheet.amountInput}
                value={amount}
                onChangeText={(t) => setAmount(t.replace(/[^0-9.]/g, ''))}
                placeholder="0"
                placeholderTextColor={Corpus.textFaint}
                keyboardType="numeric"
                autoFocus
              />
            </View>
            {repaying && (
              <View style={sheet.chips}>
                {quick.map((q) => (
                  <Pressable key={q.label} style={[sheet.chip, value === q.v && sheet.chipSuggested]} onPress={() => setAmount(String(q.v))}>
                    <Text style={[sheet.chipText, value === q.v && sheet.chipTextSuggested]}>{q.label}</Text>
                  </Pressable>
                ))}
              </View>
            )}
            {!isInterest && repaying && value > 0 && value <= left && (
              <Text style={sheet.hint}>{value === left ? 'This settles it fully ✓' : `${formatINR(left - value)} will still be open after this`}</Text>
            )}
            {repaying && value > left && <Text style={sheet.error}>That's more than the {formatINR(left)} still open</Text>}

            {!repaying && (
              <>
                <View style={styles.field}>
                  <Text style={styles.label}>WHAT FOR? (OPTIONAL)</Text>
                  <TextInput style={styles.input} value={note} onChangeText={setNote} placeholder="e.g. Dinner, movie tickets" placeholderTextColor={Corpus.textFaint} maxLength={40} />
                </View>
                {kind === 'loan' && !editing && (
                <Pressable style={styles.chainToggle} onPress={() => setChained(!chained)}>
                  <Ionicons name={chained ? 'checkbox' : 'square-outline'} size={20} color={chained ? Corpus.gold : Corpus.textMuted} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.chainTitle}>
                      {direction === 'borrowed' ? 'I gave this money to someone else' : 'I borrowed this money from someone'}
                    </Text>
                    <Text style={styles.chainHint}>
                      {direction === 'borrowed'
                        ? 'When they pay you back, Corpus reminds you to repay ' + (person.trim() || 'the lender')
                        : 'When ' + (person.trim() || 'they') + ' pay you back, Corpus reminds you to repay that person'}
                    </Text>
                  </View>
                </Pressable>
                )}
                {chained && kind === 'loan' && !editing && (
                  <>
                    <View style={styles.field}>
                      <Text style={styles.label}>{direction === 'borrowed' ? 'GAVE IT TO' : 'BORROWED IT FROM'}</Text>
                      <TextInput style={styles.input} value={other} onChangeText={setOther} placeholder="Name" placeholderTextColor={Corpus.textFaint} maxLength={30} />
                      {people.filter((p) => p !== person && (!other || p.toLowerCase().startsWith(other.toLowerCase())) && p !== other).length > 0 && (
                        <View style={sheet.chips}>
                          {people.filter((p) => p !== person && (!other || p.toLowerCase().startsWith(other.toLowerCase())) && p !== other).slice(0, 5).map((p) => (
                            <Pressable key={p} style={sheet.chip} onPress={() => setOther(p)}>
                              <Text style={sheet.chipText}>{p}</Text>
                            </Pressable>
                          ))}
                        </View>
                      )}
                    </View>
                    <View style={styles.field}>
                      <Text style={styles.label}>HOW MUCH OF IT? (DEFAULT: ALL)</Text>
                      <TextInput style={styles.input} value={otherAmount} onChangeText={(t) => setOtherAmount(t.replace(/[^0-9.]/g, ''))} placeholder={value > 0 ? String(value) : 'Same amount'} placeholderTextColor={Corpus.textFaint} keyboardType="numeric" />
                      {otherValue > value && <Text style={sheet.error}>Can’t be more than {formatINR(value)}</Text>}
                    </View>
                  </>
                )}
                {kind === 'loan' && (<>
                <View style={styles.field}>
                  <Text style={styles.label}>INTEREST (₹ PER ₹100 PER MONTH)</Text>
                  <View style={sheet.chips}>
                    {['', '1', '1.5', '2', '3'].map((r) => (
                      <Pressable key={r || 'none'} style={[sheet.chip, rate === r && sheet.chipSuggested]} onPress={() => setRate(r)}>
                        <Text style={[sheet.chipText, rate === r && sheet.chipTextSuggested]}>{r ? `₹${r}` : 'No interest'}</Text>
                      </Pressable>
                    ))}
                  </View>
                  <TextInput style={styles.input} value={rate} onChangeText={(t) => setRate(t.replace(/[^0-9.]/g, ''))} placeholder="Or type a rate, e.g. 2.5" placeholderTextColor={Corpus.textFaint} keyboardType="numeric" />
                  {Number(rate) > 0 && (
                    <Text style={sheet.hint}>
                      = {yearlyRate(Number(rate))}% a year{value > 0 ? ` · ${formatINR(Math.round((value * Number(rate)) / 100))} interest every month on ${formatINR(value)}` : ''}. Paying interest doesn’t reduce the amount, only paying principal does
                    </Text>
                  )}
                </View>
                <View style={styles.field}>
                  <Text style={styles.label}>PAID BACK MONTHLY? (OPTIONAL)</Text>
                  <TextInput style={styles.input} value={instalment} onChangeText={(t) => setInstalment(t.replace(/[^0-9]/g, ''))} placeholder="₹ per month, e.g. 2000" placeholderTextColor={Corpus.textFaint} keyboardType="numeric" />
                  {Number(instalment) > 0 && value > 0 && (
                    <Text style={sheet.hint}>{Math.ceil(value / Number(instalment))} instalments, monthly from next month. Corpus reminds you each time</Text>
                  )}
                  {Number(instalment) > 0 && direction === 'lent' && (
                    <Pressable style={styles.chainToggle} onPress={() => setOnCard(!onCard)}>
                      <Ionicons name={onCard ? 'checkbox' : 'square-outline'} size={20} color={onCard ? Corpus.gold : Corpus.textMuted} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.chainTitle}>It’s an EMI on my credit card</Text>
                        <Text style={styles.chainHint}>You pay the bank, they pay you. Make sure their ₹{instalment} reaches you before your card bill</Text>
                      </View>
                    </Pressable>
                  )}
                </View>
                <View style={styles.field}>
                  <Text style={styles.label}>PAY BACK BY</Text>
                  <View style={sheet.chips}>
                    {DUE.map((d) => (
                      <Pressable key={d.label} style={[sheet.chip, dueDays === d.days && sheet.chipSuggested]} onPress={() => { setDueDays(d.days); setClearDue(d.days === 0); }}>
                        <Text style={[sheet.chipText, dueDays === d.days && sheet.chipTextSuggested]}>{d.label}</Text>
                      </Pressable>
                    ))}
                  </View>
                  {editing && ed?.dueDate && !clearDue && dueDays === 0 && (
                    <Text style={sheet.hint}>Currently due {new Date(ed.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}. Pick a new date or “No date” to remove it</Text>
                  )}
                </View>
                </>)}
              </>
            )}

            {!repaying && (
              <View style={styles.field}>
                <Text style={styles.label}>PROOF (OPTIONAL)</Text>
                <TextInput style={styles.input} value={proofRef} onChangeText={setProofRef} placeholder="UPI ref no., cheque no., or a note" placeholderTextColor={Corpus.textFaint} maxLength={60} />
              </View>
            )}
            {!repaying && !editing && kind === 'loan' && lendingWarnings(ious, person, value, direction).map((w) => (
              <View key={w} style={styles.warn}>
                <Ionicons name="alert-circle" size={16} color={Corpus.warning} />
                <Text style={styles.warnText}>{w}</Text>
              </View>
            ))}
            <Button
              label={editing ? 'Save changes' : kind !== 'loan' && !repaying ? 'Save' : isInterest ? `Record interest ${value > 0 ? formatINR(value) : ''}` : repaying ? `Record ${value > 0 ? formatINR(value) : 'payback'}` : direction === 'lent' ? 'Save · they owe you' : 'Save · you owe them'}
              onPress={submit}
              loading={busy}
              disabled={!valid}
            />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
