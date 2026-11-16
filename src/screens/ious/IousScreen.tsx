import { Button, Group, GroupRow, IconChip, Screen } from '@/components/ui';
import { Chip, Corpus } from '@/constants/theme';
import { useToast } from '@/context/ToastContext';
import { useBills } from '@/hooks/useBills';
import { useEntrance } from '@/hooks/useEntrance';
import { useIous } from '@/hooks/useIous';
import { useSettings } from '@/hooks/useSettings';
import { useTween } from '@/hooks/useTween';
import { addIou, deleteIou, payInterest, repay, reopen, updateIou } from '@/services/ious';
import { addChain } from '@/services/iousChain';
import type { Iou, NewIou } from '@/types/iou';
import { chainNudges, debtSummary } from '@/utils/debts';
import { formatINR } from '@/utils/format';
import { ageLabel, allocatePayment, byPerson, givingSummary, knownPeople, reminderText, remaining, totals, whatsappUrl, type PersonSummary } from '@/utils/iou';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Linking, Platform, Pressable, Share, Text, View } from 'react-native';
import Avatar from './components/Avatar';
import IouSheet, { type IouSheetMode } from './components/IouSheet';
import PersonSheet from './components/PersonSheet';
import { styles } from './IousScreen.styles';

const shortDate = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

function confirm(title: string, message: string, onYes: () => void) {
  if (Platform.OS === 'web') { if (window.confirm(`${title}\n\n${message}`)) onYes(); }
  else Alert.alert(title, message, [{ text: 'Cancel', style: 'cancel' }, { text: 'Yes', style: 'destructive', onPress: onYes }]);
}

export default function IousScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const { ious, loading } = useIous();
  const { bills } = useBills();
  const { settings } = useSettings();
  const phones = settings.phones ?? {};
  const [mode, setMode] = useState<IouSheetMode | null>(null);
  const [personKey, setPersonKey] = useState<string | null>(null);
  const [showSettled, setShowSettled] = useState(false);
  const [allGifts, setAllGifts] = useState(false);

  const people = useMemo(() => byPerson(ious), [ious]);
  const owesYou = people.filter((p) => p.open.length > 0 && p.net >= 0);
  const youOwe = people.filter((p) => p.open.length > 0 && p.net < 0);
  const settled = people.filter((p) => p.open.length === 0);
  const { toGet, toPay } = totals(people);
  const debts = useMemo(() => debtSummary(ious, bills), [ious, bills]);
  const nudges = useMemo(() => chainNudges(ious), [ious]);
  const giving = useMemo(() => givingSummary(ious), [ious]);
  const byId = useMemo(() => new Map(ious.map((i) => [i.id, i])), [ious]);
  const person = personKey ? people.find((p) => p.key === personKey) : undefined;
  const t = useEntrance(800, loading);
  const getV = useTween(loading ? 0 : toGet);
  const payV = useTween(loading ? 0 : toPay);

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    try { await fn(); showToast({ message: ok }); setMode(null); }
    catch (e) { console.error(e); showToast({ message: 'That didn’t save. Try again.' }); }
  };
  const save = (iou: NewIou) => run(() => addIou(iou), iou.direction === 'lent' ? `${iou.person} owes you ${formatINR(iou.amount)}` : `You owe ${iou.person} ${formatINR(iou.amount)}`);
  const payPerson = (openList: Iou[], amount: number) => {
    const { parts } = allocatePayment(openList, amount);
    return run(() => Promise.all(parts.map((x) => repay(x.iou, x.amount))), `${formatINR(amount)} recorded`);
  };
  const doPayInterest = (iou: Iou, amount: number) => run(() => payInterest(iou, amount), `Interest ${formatINR(amount)} recorded`);
  const setReminder = (i: Iou, days: number) => {
    const at = days ? new Date(Date.now() + days * 86_400_000).toISOString() : undefined;
    return run(() => updateIou(i.id, { remindAt: at }), days ? `Reminder set for ${shortDate(at!)}` : 'Reminder off');
  };
  const update = (id: string, changes: Partial<NewIou>) => run(() => updateIou(id, changes), 'Saved');
  const saveChain = (borrowed: NewIou, lent: NewIou) => run(() => addChain(borrowed, lent), `Linked: ${borrowed.person} to you to ${lent.person}`);
  const doRepay = (iou: Iou, amount: number) => run(() => repay(iou, amount), amount >= remaining(iou) ? 'Settled' : `${formatINR(amount)} recorded`);
  const settleAll = (p: PersonSummary) =>
    confirm(`Settle up with ${p.person}?`, `Marks all ${p.open.length} open entries as paid back.`, () =>
      run(() => Promise.all(p.open.map((i) => repay(i, remaining(i)))), `All settled with ${p.person}`));
  const remove = (i: Iou) =>
    confirm('Delete this entry?', `${formatINR(i.amount)}${i.note ? ` for ${i.note}` : ''}. This can’t be undone.`, () => run(() => deleteIou(i.id), 'Deleted'));

  const remind = async (p: PersonSummary) => {
    const message = reminderText(p, settings.upiId);
    const phone = phones[p.key];
    if (phone) return Linking.openURL(whatsappUrl(phone, message));
    try {
      if (Platform.OS === 'web' && navigator.clipboard && !navigator.share) {
        await navigator.clipboard.writeText(message);
        showToast({ message: 'Reminder copied. Paste it in WhatsApp' });
      } else await Share.share({ message });
    } catch { /* share sheet closed */ }
  };

  const personRow = (p: PersonSummary) => {
    const owe = p.net < 0;
    return (
      <Pressable key={p.key} onPress={() => setPersonKey(p.key)} style={({ pressed }) => [styles.row, pressed && { backgroundColor: Corpus.cardAlt }]} accessibilityRole="button"
        accessibilityLabel={`${p.person}, ${p.net > 0 ? `owes you ${formatINR(p.net)}` : owe ? `you owe ${formatINR(-p.net)}` : p.open.length ? 'evens out' : 'settled'}${p.overdue ? ', overdue' : ''}`}>
        <Avatar name={p.person} />
        <View style={styles.rowBody}>
          <Text style={styles.name} numberOfLines={1}>{p.person}</Text>
          {p.overdue ? (
            <View style={styles.metaRow}>
              <Ionicons name="alert-circle" size={13} color={Corpus.danger} />
              <Text style={[styles.meta, { color: Corpus.danger }]}>Overdue</Text>
            </View>
          ) : (
            <Text style={styles.meta}>{p.oldestOpen ? `Opened ${ageLabel(p.oldestOpen)}` : `${p.settled.length} settled`}</Text>
          )}
        </View>
        <Text style={[styles.amount, { color: p.open.length === 0 ? Corpus.textMuted : p.net > 0 ? Corpus.income : owe ? Corpus.warning : Corpus.textMuted }]}>
          {p.open.length === 0 ? 'Settled' : p.net === 0 ? '₹0' : formatINR(Math.abs(p.net))}
        </Text>
        <Ionicons name="chevron-forward" size={16} color={Corpus.textFaint} />
      </Pressable>
    );
  };

  const total = toGet + toPay;
  const net = toGet - toPay;

  return (
    <>
      <Screen title="People" subtitle="Money you lent and borrowed" right={<Button size="sm" icon="add" label="Add" onPress={() => setMode({ kind: 'new' })} />}>
        {loading ? (
          <View style={{ gap: 14 }} accessibilityLabel="Loading" accessibilityState={{ busy: true }}>
            <View style={[styles.skel, { height: 150 }]} />
            <View style={[styles.skel, { height: 200 }]} />
          </View>
        ) : ious.length === 0 && debts.total === 0 ? (
          <View style={styles.empty}>
            <IconChip icon="people" color={Chip.indigo} size={44} />
            <Text style={styles.emptyTitle}>Nobody owes anybody</Text>
            <Text style={styles.emptyText}>Paid for a friend’s dinner or borrowed from a flatmate? Note it here and Corpus reminds you when it’s due.</Text>
            <Button label="Add the first one" icon="add" onPress={() => setMode({ kind: 'new' })} style={{ alignSelf: 'stretch', marginTop: 6 }} />
          </View>
        ) : (
          <>
            {(toGet > 0 || toPay > 0) && (
              <View style={styles.summary} accessible accessibilityLabel={`You'll get back ${formatINR(toGet)}. You owe ${formatINR(toPay)}.`}>
                <View style={styles.sides}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sideLabel}>You’ll get back</Text>
                    <Text style={[styles.sideValue, { color: toGet > 0 ? Corpus.income : Corpus.textMuted }]} numberOfLines={1} adjustsFontSizeToFit>{formatINR(Math.round(getV))}</Text>
                  </View>
                  <View style={{ flex: 1, alignItems: 'flex-end' }}>
                    <Text style={styles.sideLabel}>You owe</Text>
                    <Text style={[styles.sideValue, { color: toPay > 0 ? Corpus.warning : Corpus.textMuted }]} numberOfLines={1} adjustsFontSizeToFit>{formatINR(Math.round(payV))}</Text>
                  </View>
                </View>
                <View style={styles.split}>
                  {toGet > 0 && <View style={[styles.splitSeg, { flex: (toGet / total) * t + 0.001, backgroundColor: Corpus.income }]} />}
                  {toPay > 0 && <View style={[styles.splitSeg, { flex: (toPay / total) * t + 0.001, backgroundColor: Corpus.warning }]} />}
                </View>
                <Text style={styles.net}>
                  {net > 0 ? `${formatINR(net)} more coming in than going out` : net < 0 ? `${formatINR(-net)} more to pay than to get` : 'It evens out'}
                </Text>
              </View>
            )}

            {nudges.map((n) => (
              <View key={n.borrowed.id} style={styles.nudge}>
                <IconChip icon="git-branch" color={Chip.orange} size={34} />
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={styles.nudgeTitle}>Repay {n.borrowed.person} {formatINR(n.repayNow)}</Text>
                  <Text style={styles.nudgeText}>{n.lent.person} paid you back {formatINR(n.receivedBack)} of the {formatINR(n.lent.amount)} that came from {n.borrowed.person}.</Text>
                  <Button size="sm" icon="checkmark" label={`I repaid ${formatINR(n.repayNow)}`} onPress={() => doRepay(n.borrowed, n.repayNow)} style={{ alignSelf: 'flex-start', marginTop: 4 }} />
                </View>
              </View>
            ))}

            {owesYou.length > 0 && <Group animate title="Owes you">{owesYou.map(personRow)}</Group>}
            {youOwe.length > 0 && <Group animate title="You owe">{youOwe.map(personRow)}</Group>}

            {debts.total > 0 && (
              <Group>
                <GroupRow icon="mci:bank-transfer-out" color={Chip.red} title="All your debts" subtitle="Loans, EMIs and cards, with a payoff plan" value={formatINR(debts.total)} onPress={() => router.push('/debts' as Href)} />
              </Group>
            )}

            {giving.items.length > 0 && (
              <View style={{ gap: 6 }}>
                <Group animate title="Support and gifts" action={giving.items.length > 4 ? (allGifts ? 'Less' : 'See all') : undefined} onAction={() => setAllGifts(!allGifts)}>
                  {giving.items.slice(0, allGifts ? 30 : 4).map((g) => (
                    <GroupRow
                      key={g.id}
                      icon={g.kind === 'gift' ? 'gift' : 'heart'}
                      color={g.kind === 'gift' ? Chip.pink : Chip.purple}
                      title={`${g.direction === 'lent' ? 'To' : 'From'} ${g.person}`}
                      subtitle={`${g.note ? `${g.note}, ` : ''}${shortDate(g.date)}`}
                      value={formatINR(g.amount)}
                      valueColor={Corpus.text}
                      onPress={() => setMode({ kind: 'edit', iou: g })}
                    />
                  ))}
                </Group>
                <Text style={styles.foot}>
                  {formatINR(giving.givenThisYear)} given this year{giving.receivedThisYear ? `, ${formatINR(giving.receivedThisYear)} received` : ''}
                </Text>
              </View>
            )}

            {settled.length > 0 && (
              <Group animate title="Settled" action={showSettled ? 'Hide' : `Show ${settled.length}`} onAction={() => setShowSettled(!showSettled)}>
                {showSettled ? settled.map(personRow) : [<GroupRow key="hint" icon="checkmark-done" color={Chip.green} title={`${settled.length} ${settled.length === 1 ? 'person' : 'people'} all square`} onPress={() => setShowSettled(true)} />]}
              </Group>
            )}
          </>
        )}
      </Screen>

      {person && (
        <PersonSheet
          p={person}
          byId={byId}
          onClose={() => setPersonKey(null)}
          onMode={setMode}
          onRepay={doRepay}
          onReopen={(i) => run(() => reopen(i), 'Reopened')}
          onReminder={setReminder}
          onDelete={remove}
          onSettleAll={() => settleAll(person)}
          onRemind={() => remind(person)}
        />
      )}
      {mode && (
        <IouSheet mode={mode} people={knownPeople(ious)} ious={ious} onClose={() => setMode(null)} onSave={save} onSaveChain={saveChain} onRepay={doRepay}
          onPayPerson={payPerson} onPayInterest={doPayInterest} onUpdate={update} onDelete={(i) => { setMode(null); remove(i); }} />
      )}
    </>
  );
}
