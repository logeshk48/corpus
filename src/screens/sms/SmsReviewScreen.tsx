import { Button, Field, Group, IconChip, Screen } from '@/components/ui';
import { findCategory } from '@/constants/categories';
import { CategoryChip, Chip, Corpus, Font, tabular, Type } from '@/constants/theme';
import { useToast } from '@/context/ToastContext';
import { useAccounts } from '@/hooks/useAccounts';
import { useTransactions } from '@/hooks/useTransactions';
import { dropSms, enableSms, inboxSms, pendingSms, shareSupported, smsEnabled, smsSupported, type RawSms } from '@/services/bankSms';
import { addTransaction, deleteTransaction } from '@/services/transactions';
import type { Transaction } from '@/types/transaction';
import { formatINR } from '@/utils/format';
import { guessCategory } from '@/utils/quickAdd';
import { parseMoneyText, type ParsedMoney } from '@/utils/receipt';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

type Item = { raw: RawSms; p: ParsedMoney; shared?: boolean; loggedId?: string };

const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
const whenOf = (it: Item) => (it.shared ? it.p.date ?? new Date() : new Date(it.raw.ts));
const dayTitle = (d: Date) => {
  const now = new Date();
  if (sameDay(d, now)) return 'Today';
  if (sameDay(d, new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1))) return 'Yesterday';
  return d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' });
};
// What Corpus promises about SMS, said once, plainly
const PRIVACY = [
  { icon: 'phone-portrait', text: 'Read on this phone only. Messages are never uploaded.' },
  { icon: 'filter', text: 'Only bank payment messages are used. OTPs and personal messages are skipped.' },
  { icon: 'hand-left', text: 'Nothing is saved until you tap Log. You can turn it off any time.' },
];

// One bank message turned into a payment you can check and log
function SmsRow({ it, dup, cat, onLog, onEdit, onSkip, onUndo }: {
  it: Item; dup?: Transaction; cat: string;
  onLog: () => void; onEdit: () => void; onSkip: () => void; onUndo: () => void;
}) {
  const [show, setShow] = useState(false);
  const c = findCategory(it.p.type, cat);
  const income = it.p.type === 'income';
  const logged = !!it.loggedId;
  const time = whenOf(it).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
  return (
    <View style={[s.item, logged && { opacity: 0.6 }]}>
      <View style={s.row}>
        <IconChip icon={c?.icon ?? 'help'} color={CategoryChip[cat] ?? Chip.gray} size={40} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={s.name} numberOfLines={1}>{it.p.merchant ?? (income ? 'Money in' : 'No name in the SMS')}</Text>
          <Text style={s.small} numberOfLines={1}>
            {[c?.label ?? 'Other', it.p.last4 ? `Account ending ${it.p.last4}` : null, it.shared ? whenOf(it).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : time].filter(Boolean).join('. ')}
          </Text>
        </View>
        <Text style={[s.amount, income && { color: Corpus.income }]}>{income ? '+' : '−'}{formatINR(it.p.amount!)}</Text>
      </View>
      {!it.p.sure && !logged && <Text style={[s.small, { color: Corpus.warning }]}>Could not read everything in this message. Check the amount before logging.</Text>}
      {dup && !logged && (
        <View style={s.warn}>
          <Ionicons name="copy" size={14} color={Corpus.warning} />
          <Text style={[s.small, { flex: 1, color: Corpus.text }]}>Probably already logged: {formatINR(dup.amount)}{dup.note ? ` for ${dup.note}` : ''} the same day.</Text>
        </View>
      )}
      <Pressable onPress={() => setShow(!show)} hitSlop={6} accessibilityRole="button" accessibilityState={{ expanded: show }} style={s.showRow}>
        <Text style={s.link}>{show ? 'Hide the message' : 'Show the message'}</Text>
        <Ionicons name={show ? 'chevron-up' : 'chevron-down'} size={13} color={Corpus.textMuted} />
      </Pressable>
      {show && <Animated.View entering={FadeIn.duration(160)} style={s.sms}><Text style={s.smsText}>{it.raw.body}</Text></Animated.View>}
      {logged ? (
        <View style={s.actions}>
          <Ionicons name="checkmark-circle" size={18} color={Corpus.income} />
          <Text style={[s.small, { color: Corpus.income, fontFamily: Font.display, flex: 1 }]}>Logged</Text>
          <Pressable onPress={onUndo} style={({ pressed }) => [s.pill, pressed && { opacity: 0.7 }]} accessibilityRole="button"><Text style={s.pillText}>Undo</Text></Pressable>
        </View>
      ) : (
        <View style={s.actions}>
          <Pressable onPress={onLog} style={({ pressed }) => [s.pill, !dup && s.pillMain, pressed && { opacity: 0.8 }]} accessibilityRole="button">
            <Ionicons name="checkmark" size={15} color={dup ? Corpus.text : Corpus.onGold} />
            <Text style={[s.pillText, !dup && { color: Corpus.onGold }]}>{dup ? 'Log anyway' : 'Log'}</Text>
          </Pressable>
          <Pressable onPress={onEdit} style={({ pressed }) => [s.pill, pressed && { opacity: 0.7 }]} accessibilityRole="button"><Text style={s.pillText}>Edit first</Text></Pressable>
          <Pressable onPress={onSkip} style={({ pressed }) => [s.pill, dup && s.pillMain, pressed && { opacity: 0.7 }]} accessibilityRole="button">
            <Text style={[s.pillText, dup && { color: Corpus.onGold }]}>{dup ? 'Skip, it is the same' : 'Not mine'}</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

// Bank SMS waiting to be logged: one tap each. Also: shared or pasted text, and a 30-day catch-up.
export default function SmsReviewScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const params = useLocalSearchParams<{ text?: string }>();
  const { transactions: history } = useTransactions('last12Months');
  const { accounts } = useAccounts();
  const [items, setItems] = useState<Item[]>([]);
  const [on, setOn] = useState(smsEnabled());
  const [busy, setBusy] = useState(false);
  const [found, setFound] = useState<string | null>(null);
  const [paste, setPaste] = useState('');

  const toItem = (raw: RawSms, shared = false): Item | null => {
    const p = parseMoneyText(raw.body, new Date(raw.ts || Date.now()));
    return p?.amount ? { raw, p, shared } : null;
  };
  const sharedItem = (text: string) => toItem({ id: `share-${text.length}-${text.slice(0, 20)}`, from: 'Shared', body: text, ts: Date.now() }, true);

  useFocusEffect(useCallback(() => {
    const list = pendingSms().map((r) => toItem(r)).filter(Boolean) as Item[];
    if (params.text) {
      const sh = sharedItem(params.text);
      if (sh) list.unshift(sh);
    }
    setItems((old) => {
      const logged = old.filter((o) => o.loggedId);
      return [...logged, ...list.filter((n) => !logged.some((l) => l.raw.id === n.raw.id))];
    });
    setOn(smsEnabled());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.text]));

  const dupOf = useCallback((it: Item): Transaction | undefined =>
    history.find((t) => t.type === it.p.type && t.amount === it.p.amount && sameDay(new Date(t.date), whenOf(it)) && t.id !== it.loggedId),
  [history]);

  const categoryOf = (it: Item) => {
    const g = it.p.merchant ? guessCategory(it.p.merchant, history, it.p.type) : undefined;
    if (g) return g.category;
    if (it.p.type === 'income') return /salary|payroll|neft|sal\b/i.test(it.raw.body) ? 'salary' : 'other';
    return 'other';
  };

  const log = async (it: Item) => {
    const accountId = it.p.last4 ? accounts.find((a) => !a.archived && a.name.includes(it.p.last4!))?.id : undefined;
    const id = await addTransaction({
      type: it.p.type, amount: it.p.amount!, category: categoryOf(it), note: it.p.merchant ?? undefined,
      accountId, date: whenOf(it).toISOString(),
    });
    if (!it.shared) dropSms([it.raw.id]);
    setItems((l) => (l.some((x) => x.raw.id === it.raw.id) ? l.map((x) => (x.raw.id === it.raw.id ? { ...x, loggedId: id } : x)) : [{ ...it, loggedId: id }, ...l]));
    return id;
  };
  const undo = async (it: Item) => {
    if (!it.loggedId) return;
    await deleteTransaction(it.loggedId);
    setItems((l) => l.map((x) => (x.raw.id === it.raw.id ? { ...x, loggedId: undefined } : x)));
  };
  const skip = (it: Item) => {
    if (!it.shared) dropSms([it.raw.id]);
    setItems((l) => l.filter((x) => x.raw.id !== it.raw.id));
  };
  const edit = (it: Item) => {
    skip(it);
    const q = new URLSearchParams({ amount: String(it.p.amount), type: it.p.type, date: whenOf(it).toISOString(), category: categoryOf(it), ...(it.p.merchant ? { note: it.p.merchant } : {}) });
    router.push(`/add?${q.toString()}` as Href);
  };
  const tryLog = (it: Item) => log(it).catch(() => showToast({ message: 'Could not save. Check your connection and try again.' }));

  const open = items.filter((i) => !i.loggedId);
  const ready = open.filter((i) => !dupOf(i));
  const logAll = async () => {
    setBusy(true);
    try {
      for (const it of ready) await log(it);
      showToast({ message: `${ready.length} payments logged` });
    } finally { setBusy(false); }
  };
  const catchUp = async () => {
    setBusy(true);
    try {
      const raw = await inboxSms(30);
      const have = new Set(items.map((i) => i.raw.id));
      const fresh = raw.map((r) => toItem(r)).filter((x): x is Item => !!x && !have.has(x.raw.id));
      const newOnes = fresh.filter((x) => !dupOf(x));
      setItems((l) => [...l, ...newOnes].sort((a, b) => b.raw.ts - a.raw.ts));
      setFound(fresh.length === 0 ? 'No bank payments found in the last 30 days.' : `Found ${fresh.length} bank payments. ${fresh.length - newOnes.length} were already in Corpus, ${newOnes.length} are new.`);
    } finally { setBusy(false); }
  };
  const turnOn = async () => {
    const ok = await enableSms();
    setOn(ok);
    showToast({ message: ok ? 'Bank SMS is on. Corpus will ask after each payment' : 'SMS permission was not given' });
  };

  // Pasted text: read it as you type, log it from the preview
  const pasted = paste.trim().length > 10 ? sharedItem(paste.trim()) : null;
  const sorted = useMemo(() => [...items].sort((a, b) => whenOf(b).getTime() - whenOf(a).getTime()), [items]);
  const days = useMemo(() => {
    const m = new Map<string, Item[]>();
    for (const it of sorted) { const k = whenOf(it).toDateString(); m.set(k, [...(m.get(k) ?? []), it]); }
    return [...m.entries()];
  }, [sorted]);
  const waitingTotal = open.reduce((a, i) => a + (i.p.type === 'expense' ? i.p.amount ?? 0 : 0), 0);
  const row = (it: Item) => (
    <SmsRow key={it.raw.id} it={it} dup={!it.loggedId ? dupOf(it) : undefined} cat={categoryOf(it)}
      onLog={() => tryLog(it)} onEdit={() => edit(it)} onSkip={() => skip(it)} onUndo={() => undo(it)} />
  );

  return (
    <Screen title="From your bank" tone={Chip.blue} keyboard onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))}>
      {/* 1. Where things stand: on and waiting, off, or not possible on this device */}
      {smsSupported && on ? (
        <View style={s.card}>
          <View style={s.row}>
            <View style={s.dot} />
            <Text style={[s.small, { flex: 1 }]}>Bank SMS is on</Text>
          </View>
          <Text style={s.big}>{open.length === 0 ? 'All caught up' : `${open.length} payment${open.length === 1 ? '' : 's'} to log`}</Text>
          <Text style={s.line}>
            {open.length === 0 ? 'After your next UPI or card payment, Corpus asks here and in a notification.'
              : `${formatINR(waitingTotal)} spent that is not in Corpus yet${open.length > ready.length ? `. ${open.length - ready.length} look already logged` : ''}.`}
          </Text>
          {ready.length > 1 && <Button label={`Log all ${ready.length}`} icon="checkmark-done" onPress={logAll} loading={busy} />}
          <Button variant="secondary" icon="time" label="Look back 30 days" onPress={catchUp} disabled={busy} />
          {!!found && <Text style={s.small}>{found}</Text>}
        </View>
      ) : smsSupported ? (
        <View style={s.card}>
          <IconChip icon="chatbox-ellipses" color={Chip.blue} size={44} />
          <Text style={s.big}>Log payments when your bank texts you</Text>
          <Text style={s.line}>Pay with GPay, PhonePe, a card or at an ATM. Your bank sends an SMS, and Corpus asks "₹450 to Swiggy, log it?". One tap and it is in.</Text>
          <View style={{ gap: 10 }}>
            {PRIVACY.map((p) => (
              <View key={p.text} style={s.row}>
                <Ionicons name={p.icon as keyof typeof Ionicons.glyphMap} size={16} color={Corpus.income} />
                <Text style={[s.small, { flex: 1, color: Corpus.text }]}>{p.text}</Text>
              </View>
            ))}
          </View>
          <Button label="Turn on bank SMS" onPress={turnOn} />
        </View>
      ) : (
        <View style={s.card}>
          <Text style={s.big}>Paste a bank SMS</Text>
          <Text style={s.line}>
            {shareSupported ? 'In Messages, long-press a bank SMS, then Share, then Corpus. Or copy it and paste it here.' : 'This device cannot read SMS, so copy a bank message and paste it here. Corpus reads the amount, who it went to and the date.'}
          </Text>
          <Field label="Bank message" value={paste} onChangeText={setPaste} multiline placeholder="Rs.450.00 debited from A/c XX1234 to SWIGGY on 18-11-26..." style={{ minHeight: 84, textAlignVertical: 'top' }} />
          {paste.trim().length > 10 && !pasted && <Text style={[s.small, { color: Corpus.warning }]}>Could not find an amount in this. Check it is a bank payment message.</Text>}
        </View>
      )}

      {pasted && (
        <Group title="From what you pasted">
          <SmsRow it={pasted} dup={dupOf(pasted)} cat={categoryOf(pasted)}
            onLog={() => { tryLog(pasted); setPaste(''); }} onEdit={() => { edit(pasted); setPaste(''); }} onSkip={() => setPaste('')} onUndo={() => {}} />
        </Group>
      )}

      {/* 2. Payments by day, newest first */}
      {days.map(([k, list]) => (
        <Group key={k} title={dayTitle(new Date(k))} animate>
          {list.map(row)}
        </Group>
      ))}

      {(smsSupported && on) && (
        <View style={{ gap: 10 }}>
          {PRIVACY.slice(0, 2).map((p) => (
            <View key={p.text} style={s.row}>
              <Ionicons name={p.icon as keyof typeof Ionicons.glyphMap} size={14} color={Corpus.textMuted} />
              <Text style={[s.note, { flex: 1 }]}>{p.text}</Text>
            </View>
          ))}
        </View>
      )}
    </Screen>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: Corpus.card, borderRadius: 24, padding: 18, gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Corpus.income },
  big: { fontSize: Type.h2, fontFamily: Font.displayBold, color: Corpus.text, letterSpacing: -0.4 },
  line: { fontSize: Type.body, color: Corpus.text, lineHeight: 19, ...tabular },
  small: { fontSize: Type.small, color: Corpus.textMuted, lineHeight: 17, ...tabular },
  note: { fontSize: Type.small, color: Corpus.textMuted, lineHeight: 17 },
  item: { padding: 16, gap: 10 },
  name: { fontSize: Type.label, fontFamily: Font.display, color: Corpus.text },
  amount: { fontSize: Type.input, fontFamily: Font.displayBold, color: Corpus.text, ...tabular },
  warn: { flexDirection: 'row', gap: 6, alignItems: 'flex-start', backgroundColor: Corpus.warningTint, borderRadius: 12, padding: 10 },
  showRow: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', minHeight: 24 },
  link: { fontSize: Type.small, fontFamily: Font.display, color: Corpus.textMuted },
  sms: { backgroundColor: Corpus.bg, borderRadius: 12, padding: 12 },
  smsText: { fontSize: Type.small, color: Corpus.textMuted, lineHeight: 17 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 40, paddingHorizontal: 14, borderRadius: 20, backgroundColor: Corpus.bg },
  pillMain: { backgroundColor: Corpus.gold },
  pillText: { fontSize: Type.body, fontFamily: Font.display, color: Corpus.text },
});
