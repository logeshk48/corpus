import { Button } from '@/components/ui';
import { Corpus } from '@/constants/theme';
import { styles as sheet } from '@/screens/budgets/components/BudgetEditorSheet.styles';
import type { Iou, IouDirection, NewIou } from '@/types/iou';
import { formatINR } from '@/utils/format';
import { remaining } from '@/utils/iou';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { styles } from './IouSheet.styles';

export type IouSheetMode =
  | { kind: 'new'; person?: string; direction?: IouDirection }
  | { kind: 'repay'; iou: Iou }
  | { kind: 'payPerson'; person: string; direction: IouDirection; open: Iou[] };

type Props = {
  mode: IouSheetMode;
  people: string[]; // names used before
  onClose: () => void;
  onSave: (iou: NewIou) => Promise<void>;
  onSaveChain: (borrowed: NewIou, lent: NewIou) => Promise<void>;
  onRepay: (iou: Iou, amount: number) => Promise<void>;
  onPayPerson: (open: Iou[], amount: number) => Promise<void>;
};

const DUE = [
  { label: 'No date', days: 0 },
  { label: '1 week', days: 7 },
  { label: '2 weeks', days: 14 },
  { label: '1 month', days: 30 },
];

export default function IouSheet({ mode, people, onClose, onSave, onSaveChain, onRepay, onPayPerson }: Props) {
  const repaying = mode.kind !== 'new';
  const left = mode.kind === 'repay' ? remaining(mode.iou) : mode.kind === 'payPerson' ? mode.open.reduce((s, i) => s + remaining(i), 0) : 0;
  const payDir: IouDirection = mode.kind === 'repay' ? mode.iou.direction : mode.kind === 'payPerson' ? mode.direction : 'lent';
  const payWho = mode.kind === 'repay' ? mode.iou.person : mode.kind === 'payPerson' ? mode.person : '';
  const [direction, setDirection] = useState<IouDirection>(mode.kind === 'new' ? mode.direction ?? 'lent' : payDir);
  const [person, setPerson] = useState(mode.kind === 'new' ? mode.person ?? '' : payWho);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [dueDays, setDueDays] = useState(0);
  const [busy, setBusy] = useState(false);
  // Chain: the same money came from one person and went to another
  const [chained, setChained] = useState(false);
  const [other, setOther] = useState('');
  const [otherAmount, setOtherAmount] = useState('');

  const value = Number(amount);
  const otherValue = otherAmount === '' ? value : Number(otherAmount);
  const chainValid = !chained || (other.trim().length > 0 && otherValue > 0 && otherValue <= value);
  const valid = value > 0 && (repaying ? value <= left : person.trim().length > 0 && chainValid);
  const matches = person.trim() ? people.filter((p) => p.toLowerCase().startsWith(person.trim().toLowerCase()) && p !== person) : people;

  const submit = async () => {
    if (!valid || busy) return;
    setBusy(true);
    try {
      if (mode.kind === 'repay') await onRepay(mode.iou, value);
      else if (mode.kind === 'payPerson') await onPayPerson(mode.open, value);
      else {
        const now = new Date();
        const base: NewIou = {
          person: person.trim(),
          direction,
          amount: value,
          note: note.trim() || undefined,
          date: now.toISOString(),
          dueDate: dueDays ? new Date(now.getTime() + dueDays * 86_400_000).toISOString() : undefined,
        };
        if (!chained) await onSave(base);
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

  const title = repaying ? (payDir === 'lent' ? `${payWho} paid you` : `You paid ${payWho}`) : 'Lent or borrowed';
  const subtitle = repaying
    ? `${formatINR(left)} still open${mode.kind === 'repay' && mode.iou.note ? ` · ${mode.iou.note}` : ''}. Enter any amount, it’s taken off`
    : 'Keep track of money between you and others';
  const quick = [500, 1000, 2000].filter((q) => q < left).map((q) => ({ label: formatINR(q), v: q }));
  if (left >= 2) quick.push({ label: 'Half', v: Math.round(left / 2) });
  quick.push({ label: `All ${formatINR(left)}`, v: left });

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

          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            {!repaying && (
              <View style={styles.toggle}>
                {(['lent', 'borrowed'] as const).map((d) => (
                  <Pressable key={d} style={[styles.toggleBtn, direction === d && styles.toggleOn]} onPress={() => setDirection(d)}>
                    <Text style={[styles.toggleText, direction === d && styles.toggleTextOn]}>
                      {d === 'lent' ? 'I lent / paid for them' : 'I borrowed'}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}

            {!repaying && (
              <View style={styles.field}>
                <Text style={styles.label}>{direction === 'lent' ? 'WHO OWES YOU?' : 'WHO DO YOU OWE?'}</Text>
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
            {repaying && value > 0 && value <= left && (
              <Text style={sheet.hint}>{value === left ? 'This settles it fully ✓' : `${formatINR(left - value)} will still be open after this`}</Text>
            )}
            {repaying && value > left && <Text style={sheet.error}>That's more than the {formatINR(left)} still open</Text>}

            {!repaying && (
              <>
                <View style={styles.field}>
                  <Text style={styles.label}>WHAT FOR? (OPTIONAL)</Text>
                  <TextInput style={styles.input} value={note} onChangeText={setNote} placeholder="e.g. Dinner, movie tickets" placeholderTextColor={Corpus.textFaint} maxLength={40} />
                </View>
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
                {chained && (
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
                <View style={styles.field}>
                  <Text style={styles.label}>PAY BACK BY</Text>
                  <View style={sheet.chips}>
                    {DUE.map((d) => (
                      <Pressable key={d.label} style={[sheet.chip, dueDays === d.days && sheet.chipSuggested]} onPress={() => setDueDays(d.days)}>
                        <Text style={[sheet.chipText, dueDays === d.days && sheet.chipTextSuggested]}>{d.label}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              </>
            )}

            <Button
              label={repaying ? `Record ${value > 0 ? formatINR(value) : 'payback'}` : direction === 'lent' ? 'Save · they owe you' : 'Save · you owe them'}
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
