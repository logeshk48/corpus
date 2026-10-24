import { Button, ScreenHeader, SectionLabel } from '@/components/ui';
import { Corpus } from '@/constants/theme';
import { useToast } from '@/context/ToastContext';
import { useIous } from '@/hooks/useIous';
import { addIou, deleteIou, repay, reopen } from '@/services/ious';
import type { Iou, NewIou } from '@/types/iou';
import { formatINR } from '@/utils/format';
import { ageLabel, byPerson, isOverdue, knownPeople, reminderText, remaining, totals, type PersonSummary } from '@/utils/iou';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, Share, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import IouSheet, { type IouSheetMode } from './components/IouSheet';
import { styles } from './IousScreen.styles';

const colorFor = (net: number) => (net > 0 ? Corpus.income : net < 0 ? Corpus.warning : Corpus.textMuted);
const shortDate = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

function confirm(title: string, message: string, onYes: () => void) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) onYes();
  } else {
    Alert.alert(title, message, [{ text: 'Cancel', style: 'cancel' }, { text: 'Yes', style: 'destructive', onPress: onYes }]);
  }
}

export default function IousScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const { ious, loading } = useIous();
  const [mode, setMode] = useState<IouSheetMode | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showSettled, setShowSettled] = useState(false);

  const people = useMemo(() => byPerson(ious), [ious]);
  const open = people.filter((p) => p.open.length > 0);
  const settled = people.filter((p) => p.open.length === 0);
  const { toGet, toPay } = totals(people);

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    try {
      await fn();
      showToast({ message: ok });
      setMode(null);
    } catch (e) {
      console.error(e);
      showToast({ message: 'That did not work. Try again.' });
    }
  };

  const save = (iou: NewIou) =>
    run(() => addIou(iou), iou.direction === 'lent' ? `${iou.person} owes you ${formatINR(iou.amount)}` : `You owe ${iou.person} ${formatINR(iou.amount)}`);
  const doRepay = (iou: Iou, amount: number) =>
    run(() => repay(iou, amount), amount >= remaining(iou) ? 'Settled ✓' : `${formatINR(amount)} recorded`);

  const settleAll = (p: PersonSummary) =>
    confirm(`Settle up with ${p.person}?`, `Marks all ${p.open.length} open entries as paid back.`, () =>
      run(() => Promise.all(p.open.map((i) => repay(i, remaining(i)))), `All settled with ${p.person} ✓`)
    );

  const remind = async (p: PersonSummary) => {
    const message = reminderText(p);
    try {
      if (Platform.OS === 'web' && navigator.clipboard && !navigator.share) {
        await navigator.clipboard.writeText(message);
        showToast({ message: 'Reminder copied. Paste it in WhatsApp' });
      } else {
        await Share.share({ message });
      }
    } catch {
      // user closed the share sheet
    }
  };

  const remove = (i: Iou) =>
    confirm('Delete this entry?', `${formatINR(i.amount)}${i.note ? ` · ${i.note}` : ''}`, () => run(() => deleteIou(i.id), 'Deleted'));

  const renderPerson = (p: PersonSummary) => {
    const isOpen = expanded === p.key;
    const label = p.net > 0 ? `owes you ${formatINR(p.net)}` : p.net < 0 ? `you owe ${formatINR(-p.net)}` : p.open.length ? 'evens out to ₹0' : 'all settled';
    const entries = isOpen ? [...p.open, ...p.settled.slice(0, 5)] : [];
    return (
      <Pressable key={p.key} style={styles.card} onPress={() => setExpanded(isOpen ? null : p.key)}>
        <View style={styles.cardTop}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{p.person.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.name}>{p.person}</Text>
            {p.overdue ? (
              <Text style={styles.overdue}>Overdue</Text>
            ) : p.oldestOpen ? (
              <Text style={styles.meta}>Open since {ageLabel(p.oldestOpen)}</Text>
            ) : (
              <Text style={styles.meta}>{p.settled.length} settled</Text>
            )}
          </View>
          <Text style={[styles.net, { color: colorFor(p.net) }]}>{label}</Text>
        </View>

        {entries.map((i) => {
          const left = remaining(i);
          const done = left === 0 || !!i.settledAt;
          return (
            <View key={i.id} style={styles.entry}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.entryText, done && { color: Corpus.textFaint, textDecorationLine: 'line-through' }]}>
                  {i.direction === 'lent' ? 'You lent' : 'You borrowed'}
                  {i.note ? ` · ${i.note}` : ''}
                </Text>
                <Text style={[styles.entrySub, isOverdue(i) && { color: Corpus.danger }]}>
                  {shortDate(i.date)}
                  {left !== i.amount && !done ? ` · ${formatINR(i.amount - left)} paid back` : ''}
                  {i.dueDate && !done ? ` · due ${shortDate(i.dueDate)}` : ''}
                </Text>
              </View>
              <Text style={[styles.entryAmount, { color: done ? Corpus.textFaint : i.direction === 'lent' ? Corpus.income : Corpus.warning }]}>
                {formatINR(done ? i.amount : left)}
              </Text>
              {done ? (
                <Pressable onPress={() => run(() => reopen(i), 'Reopened')} hitSlop={6}>
                  <Text style={styles.link}>Undo</Text>
                </Pressable>
              ) : (
                <Pressable onPress={() => setMode({ kind: 'repay', iou: i })} hitSlop={6}>
                  <Text style={styles.link}>Paid back</Text>
                </Pressable>
              )}
              <Pressable onPress={() => remove(i)} hitSlop={6}>
                <Text style={[styles.link, { color: Corpus.textFaint }]}>✕</Text>
              </Pressable>
            </View>
          );
        })}

        {isOpen && (
          <View style={styles.actions}>
            {p.net > 0 && <Button size="sm" icon="logo-whatsapp" label="Send reminder" onPress={() => remind(p)} />}
            {p.open.length > 0 && <Button size="sm" variant="secondary" icon="checkmark-done" label="Settle all" onPress={() => settleAll(p)} />}
            <Button size="sm" variant="secondary" icon="add" label="Add" onPress={() => setMode({ kind: 'new', person: p.person })} />
          </View>
        )}
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenHeader
          title="Lent & borrowed"
          onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          right={ious.length > 0 ? <Button size="sm" icon="add" label="Add" onPress={() => setMode({ kind: 'new' })} /> : undefined}
        />

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={Corpus.gold} />
          </View>
        ) : ious.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={{ fontSize: 40 }}>🤝</Text>
            <Text style={styles.emptyTitle}>Nobody owes anybody</Text>
            <Text style={styles.emptyText}>
              Paid for a friend’s dinner? Borrowed from a flatmate? Note it here so nothing is forgotten, and send a polite reminder in one tap.
            </Text>
            <Button label="Add the first one" icon="add" onPress={() => setMode({ kind: 'new' })} style={{ alignSelf: 'stretch', marginTop: 12 }} />
          </View>
        ) : (
          <>
            <View style={styles.summary}>
              <View style={styles.tile}>
                <Text style={styles.tileLabel}>You’ll get back</Text>
                <Text style={[styles.tileValue, { color: Corpus.income }]}>{formatINR(toGet)}</Text>
              </View>
              <View style={styles.tile}>
                <Text style={styles.tileLabel}>You owe</Text>
                <Text style={[styles.tileValue, { color: toPay > 0 ? Corpus.warning : Corpus.textMuted }]}>{formatINR(toPay)}</Text>
              </View>
            </View>

            {open.length > 0 && <SectionLabel right="Tap a name for details">OPEN</SectionLabel>}
            {open.map(renderPerson)}

            {settled.length > 0 && (
              <Pressable onPress={() => setShowSettled(!showSettled)}>
                <SectionLabel right={showSettled ? 'Hide' : 'Show'}>{`SETTLED (${settled.length})`}</SectionLabel>
              </Pressable>
            )}
            {showSettled && settled.map(renderPerson)}
          </>
        )}
      </ScrollView>

      {mode && <IouSheet mode={mode} people={knownPeople(ious)} onClose={() => setMode(null)} onSave={save} onRepay={doRepay} />}
    </SafeAreaView>
  );
}
