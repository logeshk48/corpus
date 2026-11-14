import { ScreenHeader, SectionLabel } from '@/components/ui';
import { findCategory } from '@/constants/categories';
import { Corpus, Radius, Space, Type } from '@/constants/theme';
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
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Item = { raw: RawSms; p: ParsedMoney; shared?: boolean; loggedId?: string };

const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
const whenOf = (it: Item) => (it.shared ? it.p.date ?? new Date() : new Date(it.raw.ts));

// Bank SMS waiting to be logged: one tap each. Also: shared text (Messages → Share → Corpus) and a 30-day catch-up.
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

  const toItem = (raw: RawSms, shared = false): Item | null => {
    const p = parseMoneyText(raw.body, new Date(raw.ts || Date.now()));
    return p?.amount ? { raw, p, shared } : null;
  };

  useFocusEffect(useCallback(() => {
    const list = pendingSms().map((r) => toItem(r)).filter(Boolean) as Item[];
    if (params.text) {
      const s = toItem({ id: `share-${params.text.length}-${params.text.slice(0, 20)}`, from: 'Shared', body: params.text, ts: Date.now() }, true);
      if (s) list.unshift(s);
    }
    setItems((old) => {
      const logged = old.filter((o) => o.loggedId);
      return [...logged, ...list.filter((n) => !logged.some((l) => l.raw.id === n.raw.id))];
    });
    setOn(smsEnabled());
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
    setItems((l) => l.map((x) => (x.raw.id === it.raw.id ? { ...x, loggedId: id } : x)));
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

  const open = items.filter((i) => !i.loggedId);
  const ready = open.filter((i) => !dupOf(i));
  const logAll = async () => {
    setBusy(true);
    try {
      for (const it of ready) await log(it);
      showToast({ message: `${ready.length} logged` });
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
      setFound(fresh.length === 0 ? 'No bank payments found in the last 30 days.' : `Found ${fresh.length} bank payments — ${fresh.length - newOnes.length} were already in Corpus, ${newOnes.length} are new.`);
    } finally { setBusy(false); }
  };

  const turnOn = async () => {
    const ok = await enableSms();
    setOn(ok);
    showToast({ message: ok ? 'Bank SMS on — Corpus will ask after each payment' : 'SMS permission was not given' });
  };

  const sorted = useMemo(() => [...items].sort((a, b) => whenOf(b).getTime() - whenOf(a).getTime()), [items]);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={s.content}>
        <ScreenHeader title="From your bank" icon="chatbox-ellipses-outline" />

        {!smsSupported ? (
          <View style={s.card}>
            <Text style={s.title}>{shareSupported ? 'Share bank SMS to Corpus' : 'Paste a bank SMS'}</Text>
            <Text style={s.body}>
              {shareSupported
                ? 'In your Messages app, long-press a bank SMS → Share → Corpus. It lands here, ready to log with one tap.'
                : 'This phone or browser can’t share SMS to apps. Copy the bank SMS and paste it on the Add screen.'}
            </Text>
            <Pressable onPress={() => router.push('/add' as Href)}><Text style={s.link}>Or paste one on Add →</Text></Pressable>
          </View>
        ) : !on ? (
          <View style={s.card}>
            <Text style={s.title}>Log payments the moment your bank texts you</Text>
            <Text style={s.body}>
              Pay with GPay, PhonePe, card or ATM → your bank sends an SMS → Corpus asks “₹450 to Swiggy — log it?”. One tap and it’s in.
            </Text>
            <Text style={s.small}>Read only on this phone. Corpus looks at bank transaction SMS only — never OTPs or personal messages — and never uploads them.</Text>
            <Pressable style={s.btn} onPress={turnOn} accessibilityRole="button"><Text style={s.btnText}>Turn on bank SMS</Text></Pressable>
          </View>
        ) : null}

        {smsSupported && on && (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable style={[s.ghost, { flex: 1 }]} onPress={catchUp} disabled={busy} accessibilityRole="button">
              <Ionicons name="time-outline" size={16} color={Corpus.gold} />
              <Text style={s.ghostText}>Catch up last 30 days</Text>
            </Pressable>
            {ready.length > 1 && (
              <Pressable style={[s.btnSm, { flex: 1 }]} onPress={logAll} disabled={busy} accessibilityRole="button">
                <Text style={s.btnText}>Log all {ready.length}</Text>
              </Pressable>
            )}
          </View>
        )}
        {busy && <ActivityIndicator color={Corpus.gold} />}
        {!!found && <Text style={s.small}>{found}</Text>}

        {sorted.length > 0 && <SectionLabel>{`${open.length} TO LOG`}</SectionLabel>}
        {sorted.map((it) => {
          const dup = !it.loggedId ? dupOf(it) : undefined;
          const cat = findCategory(it.p.type, categoryOf(it))?.label;
          return (
            <View key={it.raw.id} style={[s.card, it.loggedId && { opacity: 0.6 }]}>
              <View style={s.row}>
                <Text style={[s.amount, it.p.type === 'income' && { color: Corpus.income }]}>
                  {it.p.type === 'income' ? '+' : '−'}{formatINR(it.p.amount!)}
                </Text>
                <Text style={s.when}>{whenOf(it).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}{it.shared ? ' · shared' : ''}</Text>
              </View>
              <Text style={s.body}>{[it.p.merchant ?? 'No name in the SMS', cat, it.p.last4 && `A/c ··${it.p.last4}`].filter(Boolean).join('  ·  ')}</Text>
              <Text style={s.sms} numberOfLines={2}>{it.raw.body}</Text>
              {dup && <Text style={[s.small, { color: Corpus.warning }]}>Already logged {formatINR(dup.amount)}{dup.note ? ` (${dup.note})` : ''} that day — probably the same one.</Text>}
              {it.loggedId ? (
                <View style={s.row}>
                  <Text style={[s.small, { color: Corpus.income }]}>Logged ✓</Text>
                  <Pressable onPress={() => undo(it)} hitSlop={8}><Text style={s.link}>Undo</Text></Pressable>
                </View>
              ) : (
                <View style={s.actions}>
                  <Pressable style={s.btnSm} onPress={() => log(it).catch(() => showToast({ message: 'Could not save — check your connection' }))} accessibilityRole="button">
                    <Text style={s.btnText}>{dup ? 'Log anyway' : 'Log'}</Text>
                  </Pressable>
                  <Pressable style={s.ghost} onPress={() => edit(it)} accessibilityRole="button"><Text style={s.ghostText}>Edit</Text></Pressable>
                  <Pressable style={s.ghost} onPress={() => skip(it)} accessibilityRole="button"><Text style={s.ghostText}>{dup ? 'Skip' : 'Not mine'}</Text></Pressable>
                </View>
              )}
            </View>
          );
        })}
        {smsSupported && on && sorted.length === 0 && !busy && (
          <Text style={s.small}>Nothing waiting. After your next UPI or card payment, Corpus will ask here and in a notification.</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Corpus.bg },
  content: { padding: Space.lg, gap: Space.md, paddingBottom: 80 },
  card: { backgroundColor: Corpus.card, borderRadius: Radius.lg, borderWidth: 0.5, borderColor: Corpus.border, padding: Space.md, gap: 6 },
  title: { fontSize: Type.bodyLg, fontWeight: '700', color: Corpus.text },
  body: { fontSize: Type.body, color: Corpus.text, lineHeight: 20 },
  small: { fontSize: Type.small, color: Corpus.textMuted, lineHeight: 18 },
  sms: { fontSize: Type.small, color: Corpus.textFaint, lineHeight: 17 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  amount: { fontSize: Type.title, fontWeight: '700', color: Corpus.text },
  when: { fontSize: Type.small, color: Corpus.textMuted },
  actions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  btn: { marginTop: 6, backgroundColor: Corpus.gold, borderRadius: Radius.md, paddingVertical: 12, alignItems: 'center' },
  btnSm: { backgroundColor: Corpus.gold, borderRadius: Radius.md, paddingVertical: 10, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  btnText: { fontSize: Type.body, fontWeight: '600', color: Corpus.onGold },
  ghost: { flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.md, borderWidth: 0.5, borderColor: Corpus.goldLine, backgroundColor: Corpus.goldTint, paddingVertical: 10, paddingHorizontal: 14 },
  ghostText: { fontSize: Type.body, fontWeight: '600', color: Corpus.gold },
  link: { fontSize: Type.small, color: Corpus.gold, fontWeight: '600' },
});
