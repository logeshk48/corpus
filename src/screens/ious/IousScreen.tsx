import { Button, ScreenHeader, SectionLabel } from '@/components/ui';
import { Corpus } from '@/constants/theme';
import { useToast } from '@/context/ToastContext';
import { useIous } from '@/hooks/useIous';
import { useBills } from '@/hooks/useBills';
import { addChain } from '@/services/iousChain';
import { chainNudges, debtSummary } from '@/utils/debts';
import type { Href } from 'expo-router';
import { addIou, deleteIou, payInterest, repay, reopen, updateIou } from '@/services/ious';
import { useSettings } from '@/hooks/useSettings';
import { saveSettings } from '@/services/settings';
import { interestStatus, yearlyRate } from '@/utils/interest';
import type { Iou, NewIou } from '@/types/iou';
import { formatINR } from '@/utils/format';
import { allocatePayment, ageLabel, byPerson, givingSummary, personKey, progress, whatsappUrl, isOverdue, knownPeople, reminderText, remaining, totals, type PersonSummary } from '@/utils/iou';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Platform, Pressable, ScrollView, Share, Text, TextInput, View } from 'react-native';
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
  const { bills } = useBills();
  const { settings } = useSettings();
  const phones = settings.phones ?? {};
  const [phoneDraft, setPhoneDraft] = useState<{ key: string; value: string } | null>(null);
  const [upiDraft, setUpiDraft] = useState<string | null>(null);
  const [remindFor, setRemindFor] = useState<string | null>(null);
  const [mode, setMode] = useState<IouSheetMode | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showSettled, setShowSettled] = useState(false);

  const people = useMemo(() => byPerson(ious), [ious]);
  const open = people.filter((p) => p.open.length > 0);
  const settled = people.filter((p) => p.open.length === 0);
  const { toGet, toPay } = totals(people);
  const debts = useMemo(() => debtSummary(ious, bills), [ious, bills]);
  const nudges = useMemo(() => chainNudges(ious), [ious]);
  const giving = useMemo(() => givingSummary(ious), [ious]);
  const byId = useMemo(() => new Map(ious.map((i) => [i.id, i])), [ious]);
  const [showDebts, setShowDebts] = useState(true);

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
  const payPerson = (openList: Iou[], amount: number) => {
    const { parts } = allocatePayment(openList, amount);
    return run(() => Promise.all(parts.map((p) => repay(p.iou, p.amount))), `${formatINR(amount)} recorded`);
  };
  const doPayInterest = (iou: Iou, amount: number) => run(() => payInterest(iou, amount), `Interest ${formatINR(amount)} recorded`);
  const setReminder = (i: Iou, days: number) => {
    setRemindFor(null);
    const at = days ? new Date(Date.now() + days * 86_400_000).toISOString() : undefined;
    return run(() => updateIou(i.id, { remindAt: at }), days ? `I'll remind you on ${shortDate(at!)}` : 'Reminder off');
  };
  const update = (id: string, changes: Partial<NewIou>) => run(() => updateIou(id, changes), 'Updated');
  const savePhone = (key: string, value: string) =>
    run(() => saveSettings({ phones: { ...phones, [key]: value.trim() } }), value.trim() ? 'Number saved' : 'Number removed').then(() => setPhoneDraft(null));
  const saveUpi = (value: string) => run(() => saveSettings({ upiId: value.trim() || undefined }), 'UPI ID saved').then(() => setUpiDraft(null));
  const saveChain = (borrowed: NewIou, lent: NewIou) =>
    run(() => addChain(borrowed, lent), `Linked: ${borrowed.person} → you → ${lent.person}`);
  const doRepay = (iou: Iou, amount: number) =>
    run(() => repay(iou, amount), amount >= remaining(iou) ? 'Settled ✓' : `${formatINR(amount)} recorded`);

  const settleAll = (p: PersonSummary) =>
    confirm(`Settle up with ${p.person}?`, `Marks all ${p.open.length} open entries as paid back.`, () =>
      run(() => Promise.all(p.open.map((i) => repay(i, remaining(i)))), `All settled with ${p.person} ✓`)
    );

  const remind = async (p: PersonSummary) => {
    const message = reminderText(p, settings.upiId);
    const phone = phones[p.key];
    if (phone) {
      Linking.openURL(whatsappUrl(phone, message));
      return;
    }
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
            <View key={i.id}>
            <View style={styles.entry}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.entryText, done && { color: Corpus.textFaint, textDecorationLine: 'line-through' }]}>
                  {i.direction === 'lent' ? 'You lent' : 'You borrowed'}
                  {i.note ? ` · ${i.note}` : ''}
                  {i.linkedId && byId.get(i.linkedId)
                    ? i.direction === 'borrowed'
                      ? ` · gave to ${byId.get(i.linkedId)!.person}`
                      : ` · from ${byId.get(i.linkedId)!.person}’s money`
                    : ''}
                </Text>
                <Text style={[styles.entrySub, isOverdue(i) && { color: Corpus.danger }]}>
                  {shortDate(i.date)}
                  {left !== i.amount && !done ? ` · ${formatINR(i.amount - left)} paid back` : ''}
                  {i.dueDate && !done ? ` · due ${shortDate(i.dueDate)}` : ''}
                </Text>
                {(() => {
                  const st = !done ? interestStatus(i) : null;
                  if (!st) return null;
                  return (
                    <Text style={[styles.entrySub, { color: st.pending > 0 ? Corpus.danger : Corpus.goldSoft }]}>
                      ₹{i.ratePerHundred}/₹100 ({yearlyRate(i.ratePerHundred!)}% a year) · {formatINR(st.monthly)}/month ·{' '}
                      {st.pending > 0 ? `${formatINR(st.pending)} interest due` : `next due ${shortDate(st.nextDue.toISOString())}`}
                    </Text>
                  );
                })()}
                {(i.interestPayments ?? []).map((r, k) => (
                  <Text key={`i${k}`} style={styles.history}>
                    ↳ Interest {i.direction === 'lent' ? 'received' : 'paid'} {formatINR(r.amount)} · {shortDate(r.date)}
                  </Text>
                ))}
                {(() => {
                  const pr = progress(i);
                  if (done || pr.paid === 0) return null;
                  return (
                    <View style={{ marginTop: 4, gap: 3 }}>
                      <View style={styles.bar}>
                        <View style={[styles.barFill, { width: `${pr.pct}%` }]} />
                      </View>
                      <Text style={styles.entrySub}>
                        {formatINR(pr.paid)} of {formatINR(i.amount)} paid · {pr.pct}%
                        {pr.doneBy ? ` · done by ${pr.doneBy.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })} at this pace` : ''}
                      </Text>
                    </View>
                  );
                })()}
                {(i.repayments ?? []).map((r, k) => (
                  <Text key={k} style={styles.history}>
                    ↳ {i.direction === 'lent' ? 'Got' : 'Paid'} {formatINR(r.amount)} · {shortDate(r.date)}
                  </Text>
                ))}
              </View>
              <Text style={[styles.entryAmount, { color: done ? Corpus.textFaint : i.direction === 'lent' ? Corpus.income : Corpus.warning }]}>
                {formatINR(done ? i.amount : left)}
              </Text>
              {done ? (
                <Pressable onPress={() => run(() => reopen(i), 'Reopened')} hitSlop={6}>
                  <Text style={styles.link}>Undo</Text>
                </Pressable>
              ) : (
                <View style={{ alignItems: 'flex-end' }}>
                  {i.ratePerHundred ? (
                    <Pressable onPress={() => setMode({ kind: 'payInterest', iou: i })} hitSlop={6}>
                      <Text style={styles.link}>{i.direction === 'lent' ? 'Got interest' : 'Pay interest'}</Text>
                    </Pressable>
                  ) : null}
                  <Pressable onPress={() => setMode({ kind: 'repay', iou: i })} hitSlop={6}>
                    <Text style={styles.link}>{i.ratePerHundred ? 'Pay principal' : 'Paid back'}</Text>
                  </Pressable>
                </View>
              )}
              {!done && (
                <Pressable onPress={() => setRemindFor(remindFor === i.id ? null : i.id)} hitSlop={6}>
                  <Text style={[styles.link, { color: i.remindAt ? Corpus.gold : Corpus.textMuted }]}>⏰</Text>
                </Pressable>
              )}
              <Pressable onPress={() => setMode({ kind: 'edit', iou: i })} hitSlop={6}>
                <Text style={[styles.link, { color: Corpus.textMuted }]}>✎</Text>
              </Pressable>
              <Pressable onPress={() => remove(i)} hitSlop={6}>
                <Text style={[styles.link, { color: Corpus.textFaint }]}>✕</Text>
              </Pressable>
            </View>
            {remindFor === i.id && (
              <View style={styles.remindRow}>
                <Text style={styles.entrySub}>
                  {i.remindAt ? `Reminding you ${shortDate(i.remindAt)}. Change:` : `Remind me to ${i.direction === 'lent' ? 'ask' : 'pay'}:`}
                </Text>
                {[['Tomorrow', 1], ['3 days', 3], ['1 week', 7], ['2 weeks', 14]].map(([label, d]) => (
                  <Pressable key={label} style={styles.remindChip} onPress={() => setReminder(i, d as number)}>
                    <Text style={styles.remindChipText}>{label}</Text>
                  </Pressable>
                ))}
                {i.remindAt && (
                  <Pressable style={styles.remindChip} onPress={() => setReminder(i, 0)}>
                    <Text style={[styles.remindChipText, { color: Corpus.textMuted }]}>Off</Text>
                  </Pressable>
                )}
              </View>
            )}
            {i.remindAt && remindFor !== i.id && !done && (
              <Text style={[styles.history, { color: Corpus.gold }]}>⏰ Reminder {shortDate(i.remindAt)}</Text>
            )}
            </View>
          );
        })}

        {isOpen && (
          phoneDraft?.key === p.key ? (
            <View style={styles.phoneRow}>
              <TextInput
                style={styles.phoneInput}
                value={phoneDraft.value}
                onChangeText={(t) => setPhoneDraft({ key: p.key, value: t.replace(/[^0-9+ ]/g, '') })}
                placeholder="Mobile number"
                placeholderTextColor={Corpus.textFaint}
                keyboardType="phone-pad"
                autoFocus
              />
              <Button size="sm" label="Save" onPress={() => savePhone(p.key, phoneDraft.value)} />
            </View>
          ) : (
            <Pressable onPress={() => setPhoneDraft({ key: p.key, value: phones[p.key] ?? '' })}>
              <Text style={styles.entrySub}>
                {phones[p.key] ? `📱 ${phones[p.key]} · change` : '📱 Add mobile number to send reminders straight to their WhatsApp'}
              </Text>
            </Pressable>
          )
        )}
        {isOpen && (
          <View style={styles.actions}>
            {p.theyOwe > 0 && (
              <Button size="sm" icon="cash-outline" label="They paid me" onPress={() => setMode({ kind: 'payPerson', person: p.person, direction: 'lent', open: p.open.filter((x) => x.direction === 'lent') })} />
            )}
            {p.youOwe > 0 && (
              <Button size="sm" icon="cash-outline" label={`I paid ${p.person.split(' ')[0]}`} onPress={() => setMode({ kind: 'payPerson', person: p.person, direction: 'borrowed', open: p.open.filter((x) => x.direction === 'borrowed') })} />
            )}
            {p.net > 0 && <Button size="sm" variant="secondary" icon="logo-whatsapp" label={phones[p.key] ? 'Remind on WhatsApp' : 'Send reminder'} onPress={() => remind(p)} />}
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
          title="Lent, borrowed & debts"
          onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          right={<Button size="sm" icon="add" label="Add" onPress={() => setMode({ kind: 'new' })} />}
        />

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={Corpus.gold} />
          </View>
        ) : ious.length === 0 && debts.total === 0 ? (
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
            {nudges.map((n) => (
              <View key={n.borrowed.id} style={styles.nudge}>
                <Text style={styles.nudgeTitle}>🔁 Repay {n.borrowed.person} {formatINR(n.repayNow)}</Text>
                <Text style={styles.nudgeText}>
                  {n.lent.person} has paid you back {formatINR(n.receivedBack)} of the {formatINR(n.lent.amount)} that came from {n.borrowed.person}.
                </Text>
                <View style={styles.actions}>
                  <Button size="sm" icon="checkmark" label={`I repaid ${formatINR(n.repayNow)}`} onPress={() => doRepay(n.borrowed, n.repayNow)} />
                </View>
              </View>
            ))}

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

            {debts.total > 0 && (
              <Pressable style={styles.card} onPress={() => setShowDebts(!showDebts)}>
                <Text style={styles.tileLabel}>Total debt</Text>
                <Text style={[styles.debtTotal]}>{formatINR(debts.total)}</Text>
                <Text style={styles.meta}>
                  {[
                    debts.owedToPeople ? `${formatINR(debts.owedToPeople)} to people` : '',
                    debts.owedOnLoans ? `${formatINR(debts.owedOnLoans)} on loans & EMIs` : '',
                    debts.monthlyEmi ? `${formatINR(debts.monthlyEmi)}/month in EMIs` : '',
                    debts.monthlyInterest ? `${formatINR(debts.monthlyInterest)}/month interest` : '',
                    debts.interestPending ? `${formatINR(debts.interestPending)} interest due now` : '',
                    debts.interestPaid ? `${formatINR(debts.interestPaid)} interest paid so far` : '',
                  ].filter(Boolean).join(' · ')}
                </Text>
                {showDebts && (
                  <>
                    {debts.people.map((d) => (
                      <Pressable
                        key={d.id}
                        style={styles.entry}
                        onPress={() => {
                          const iou = byId.get(d.id);
                          if (iou) setMode({ kind: 'repay', iou });
                        }}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={styles.entryText}>{d.person}{d.note ? ` · ${d.note}` : ''}</Text>
                          <Text style={[styles.entrySub, d.overdue && { color: Corpus.danger }]}>
                            {d.monthlyInterest
                              ? `${formatINR(d.monthlyInterest)}/month interest${d.interestPending ? ` · ${formatINR(d.interestPending)} due now` : d.nextInterestDue ? ` · next ${shortDate(d.nextInterestDue.toISOString())}` : ''}`
                              : d.dueDate ? `${d.overdue ? 'Overdue · was due' : 'Due'} ${shortDate(d.dueDate)}` : 'No due date'}
                          </Text>
                        </View>
                        <Text style={[styles.entryAmount, { color: Corpus.warning }]}>{formatINR(d.amount)}</Text>
                        <Text style={styles.link}>Pay</Text>
                      </Pressable>
                    ))}
                    {debts.emis.map((e) => (
                      <Pressable key={e.billId} style={styles.entry} onPress={() => router.push(`/bill/${e.billId}` as Href)}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.entryText}>{e.name}</Text>
                          <Text style={styles.entrySub}>
                            {formatINR(e.emi)}/month{e.paymentsLeft != null ? ` · ${e.paymentsLeft} EMIs left` : ''}
                            {e.exact ? ' · loan balance' : ' · EMIs left × amount'}
                          </Text>
                        </View>
                        <Text style={[styles.entryAmount, { color: Corpus.warning }]}>{formatINR(e.outstanding)}</Text>
                      </Pressable>
                    ))}
                  </>
                )}
              </Pressable>
            )}

            {open.length > 0 && <SectionLabel right="Tap a name for details">OPEN</SectionLabel>}
            {open.map(renderPerson)}

            {toGet > 0 && (
              upiDraft !== null ? (
                <View style={styles.phoneRow}>
                  <TextInput style={styles.phoneInput} value={upiDraft} onChangeText={setUpiDraft} placeholder="yourname@okaxis" placeholderTextColor={Corpus.textFaint} autoCapitalize="none" autoFocus />
                  <Button size="sm" label="Save" onPress={() => saveUpi(upiDraft)} />
                </View>
              ) : (
                <Pressable onPress={() => setUpiDraft(settings.upiId ?? '')}>
                  <Text style={styles.entrySub}>
                    {settings.upiId ? `Reminders include your UPI: ${settings.upiId} · change` : '💡 Add your UPI ID so reminders include it and people can pay in one step'}
                  </Text>
                </Pressable>
              )
            )}

            {giving.items.length > 0 && (
              <>
                <SectionLabel right={`${formatINR(giving.givenThisYear)} given this year`}>SUPPORT & GIFTS</SectionLabel>
                <View style={styles.card}>
                  {giving.topPeople.length > 0 && (
                    <Text style={styles.meta}>
                      This year: {giving.topPeople.slice(0, 3).map((t) => `${t.person} ${formatINR(t.given)}`).join(' · ')}
                      {giving.receivedThisYear ? ` · received ${formatINR(giving.receivedThisYear)}` : ''}
                    </Text>
                  )}
                  {giving.items.slice(0, 12).map((g) => (
                    <View key={g.id} style={styles.entry}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.entryText}>
                          {g.kind === 'gift' ? '🎁' : '🤲'} {g.direction === 'lent' ? 'To' : 'From'} {g.person}
                          {g.note ? ` · ${g.note}` : ''}
                        </Text>
                        <Text style={styles.entrySub}>{shortDate(g.date)} · {g.kind === 'gift' ? 'Gift' : 'Support'}</Text>
                      </View>
                      <Text style={[styles.entryAmount, { color: Corpus.text }]}>{formatINR(g.amount)}</Text>
                      <Pressable onPress={() => setMode({ kind: 'edit', iou: g })} hitSlop={6}>
                        <Text style={[styles.link, { color: Corpus.textMuted }]}>✎</Text>
                      </Pressable>
                      <Pressable onPress={() => remove(g)} hitSlop={6}>
                        <Text style={[styles.link, { color: Corpus.textFaint }]}>✕</Text>
                      </Pressable>
                    </View>
                  ))}
                </View>
              </>
            )}

            {settled.length > 0 && (
              <Pressable onPress={() => setShowSettled(!showSettled)}>
                <SectionLabel right={showSettled ? 'Hide' : 'Show'}>{`SETTLED (${settled.length})`}</SectionLabel>
              </Pressable>
            )}
            {showSettled && settled.map(renderPerson)}
          </>
        )}
      </ScrollView>

      {mode && <IouSheet mode={mode} people={knownPeople(ious)} onClose={() => setMode(null)} onSave={save} onSaveChain={saveChain} onRepay={doRepay} onPayPerson={payPerson} onPayInterest={doPayInterest} onUpdate={update} />}
    </SafeAreaView>
  );
}
