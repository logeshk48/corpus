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
  | { kind: 'repay'; iou: Iou };

type Props = {
  mode: IouSheetMode;
  people: string[]; // names used before
  onClose: () => void;
  onSave: (iou: NewIou) => Promise<void>;
  onRepay: (iou: Iou, amount: number) => Promise<void>;
};

const DUE = [
  { label: 'No date', days: 0 },
  { label: '1 week', days: 7 },
  { label: '2 weeks', days: 14 },
  { label: '1 month', days: 30 },
];

export default function IouSheet({ mode, people, onClose, onSave, onRepay }: Props) {
  const repaying = mode.kind === 'repay';
  const left = repaying ? remaining(mode.iou) : 0;
  const [direction, setDirection] = useState<IouDirection>(mode.kind === 'new' ? mode.direction ?? 'lent' : mode.iou.direction);
  const [person, setPerson] = useState(mode.kind === 'new' ? mode.person ?? '' : mode.iou.person);
  const [amount, setAmount] = useState(repaying ? String(left) : '');
  const [note, setNote] = useState('');
  const [dueDays, setDueDays] = useState(0);
  const [busy, setBusy] = useState(false);

  const value = Number(amount);
  const valid = value > 0 && (repaying ? value <= left : person.trim().length > 0);
  const matches = person.trim() ? people.filter((p) => p.toLowerCase().startsWith(person.trim().toLowerCase()) && p !== person) : people;

  const submit = async () => {
    if (!valid || busy) return;
    setBusy(true);
    try {
      if (mode.kind === 'repay') await onRepay(mode.iou, value);
      else {
        const now = new Date();
        await onSave({
          person: person.trim(),
          direction,
          amount: value,
          note: note.trim() || undefined,
          date: now.toISOString(),
          dueDate: dueDays ? new Date(now.getTime() + dueDays * 86_400_000).toISOString() : undefined,
        });
      }
    } finally {
      setBusy(false);
    }
  };

  const title = repaying
    ? mode.iou.direction === 'lent'
      ? `${mode.iou.person} paid you back`
      : `You paid ${mode.iou.person} back`
    : 'Lent or borrowed';
  const subtitle = repaying ? `${formatINR(left)} still open${mode.iou.note ? ` · ${mode.iou.note}` : ''}` : 'Keep track of money between you and others';

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
                autoFocus={!repaying}
              />
            </View>
            {repaying && value > left && <Text style={sheet.error}>That's more than the {formatINR(left)} still open</Text>}

            {!repaying && (
              <>
                <View style={styles.field}>
                  <Text style={styles.label}>WHAT FOR? (OPTIONAL)</Text>
                  <TextInput style={styles.input} value={note} onChangeText={setNote} placeholder="e.g. Dinner, movie tickets" placeholderTextColor={Corpus.textFaint} maxLength={40} />
                </View>
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
