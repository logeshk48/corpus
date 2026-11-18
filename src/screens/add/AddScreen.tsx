import AccountPicker, { NO_ACCOUNT } from '@/components/AccountPicker';
import Aura from '@/components/fx/Aura';
import { celebrate } from '@/components/fx/Celebrate';
import { TAB_BAR_SPACE } from '@/components/GlassTabBar';
import StreamPicker, { NO_STREAM } from '@/components/StreamPicker';
import { DayStepper, Tap } from '@/components/ui';
import { EXPENSE_CATEGORIES, findCategory, INCOME_CATEGORIES } from '@/constants/categories';
import { Spring } from '@/constants/motion';
import { CategoryChip, Chip, Corpus, Font, Type } from '@/constants/theme';
import { useToast } from '@/context/ToastContext';
import { useAccounts } from '@/hooks/useAccounts';
import { useSettings } from '@/hooks/useSettings';
import { useTransactions } from '@/hooks/useTransactions';
import { canScan } from '@/services/scan';
import { addTransaction, deleteTransaction } from '@/services/transactions';
import type { IncomeStream } from '@/types/incomeStream';
import { withTimeOf } from '@/utils/dates';
import { frequentPicks, guessCategory, noteSuggestions } from '@/utils/quickAdd';
import type { ParsedMoney } from '@/utils/receipt';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';

// Typed amount → a clean amount: digits and one dot, up to 9 rupee digits and 2 paise digits, no leading zeros
const clean = (t: string) => {
  const [w = '', ...rest] = t.replace(/[^0-9.]/g, '').split('.');
  const whole = w.replace(/^0+(?=\d)/, '').slice(0, 9);
  return rest.length ? `${whole || '0'}.${rest.join('').slice(0, 2)}` : whole;
};
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeOut, ZoomIn, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AmountDisplay from './components/AmountDisplay';
import CategoryRow from './components/CategoryRow';
import PasteSheet from './components/PasteSheet';
import QuickChips, { type Chip as QuickChip } from './components/QuickChips';
import TypeSwitch from './components/TypeSwitch';
import type { TxType } from './components/TypeToggle';

// Accounts are hidden for now (code kept). Set true to bring the "Paid from" picker back.
const SHOW_ACCOUNTS = false;
const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
const yesterday = () => { const t = new Date(); return new Date(t.getFullYear(), t.getMonth(), t.getDate() - 1, 12); };

// Add: a big amount (your phone's number keyboard opens straight away), what it was, the day,
// a category (often picked for you), and Save. The background takes the colour of
// what you pick, and Save turns into a tick when it is in.
export default function AddScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const reduce = useReducedMotion();
  const { showToast } = useToast();
  const params = useLocalSearchParams<{ amount?: string; note?: string; catchup?: string; first?: string; type?: string; date?: string; category?: string; paste?: string }>();
  const [amount, setAmount] = useState(params.amount ?? '');
  const [type, setType] = useState<TxType>('expense');
  const [category, setCategory] = useState<string | null>(null);
  const [note, setNote] = useState(params.note ?? '');
  const [day, setDay] = useState(() => new Date());
  const [earlier, setEarlier] = useState(false);
  const [streamId, setStreamId] = useState(NO_STREAM);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [noteFocus, setNoteFocus] = useState(false);
  const [shakeAmount, setShakeAmount] = useState(0);
  const [shakeCat, setShakeCat] = useState(0);
  // true once the person picks a category themselves; then we stop guessing
  const [categoryTouched, setCategoryTouched] = useState(false);
  useEffect(() => {
    if (params.amount) setAmount(params.amount);
    if (params.note) setNote(params.note);
  }, [params.amount, params.note]);
  // Coming from "Edit first" on a bank SMS: money in/out, the SMS date and the guessed category
  useEffect(() => {
    if (params.type === 'income' || params.type === 'expense') setType(params.type);
    if (params.date && !isNaN(Date.parse(params.date))) { const d = new Date(params.date); setDay(d); if (!sameDay(d, new Date()) && !sameDay(d, yesterday())) setEarlier(true); }
    if (params.category) { setCategory(params.category); setCategoryTouched(true); }
  }, [params.type, params.date, params.category]);
  useEffect(() => { if (params.catchup) setEarlier(true); }, [params.catchup]);

  const { accounts } = useAccounts();
  const { settings } = useSettings();
  const [accountId, setAccountId] = useState(NO_ACCOUNT);
  useEffect(() => {
    if (accountId !== NO_ACCOUNT) return;
    const def = accounts.find((a) => a.id === settings.defaultAccountId) ?? (accounts.length === 1 ? accounts[0] : undefined);
    if (def) setAccountId(def.id);
  }, [accounts, settings.defaultAccountId, accountId]);

  // ── Quick add: learned from the last 12 months of entries ──
  const { transactions: history } = useTransactions('last12Months');
  const picks = useMemo(() => frequentPicks(history, type), [history, type]);
  const suggestions = useMemo(() => noteSuggestions(history, note, type), [history, note, type]);
  const guess = useMemo(() => guessCategory(note, history, type), [history, note, type]);

  const pickCategory = (id: string) => { setCategory(id); setCategoryTouched(true); };
  const changeNote = (text: string) => {
    setNote(text);
    if (categoryTouched) return;
    const g = guessCategory(text, history, type);
    if (g) setCategory(g.category);
  };
  const applyChip = (c: QuickChip) => {
    setNote(c.note);
    if (!categoryTouched) setCategory(c.category);
    if (c.amount && (amount === '' || Number(amount) === 0)) setAmount(String(c.amount));
  };
  const autoGuessed = !categoryTouched && !!guess && category === guess.category;
  const categories = type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
  const amt = Number(amount) || 0;
  const isValid = amt > 0 && category !== null;

  const handleTypeChange = (t: TxType) => { setType(t); setCategory(null); setCategoryTouched(false); setStreamId(NO_STREAM); };
  const handleStreamChange = (id: string, stream?: IncomeStream) => { setStreamId(id); if (stream) setCategory(stream.type); };
  const amountRef = useRef<TextInput>(null);

  // Pasted bank SMS / receipt → fill the form (you still check and tap Save)
  const [showPaste, setShowPaste] = useState(false);
  useEffect(() => { if (params.paste === '1') setShowPaste(true); }, [params.paste]);
  const fillFrom = (p: ParsedMoney) => {
    setType(p.type);
    setStreamId(NO_STREAM);
    setAmount(p.amount ? String(p.amount) : '');
    setNote(p.merchant ?? '');
    if (p.date) { setDay(p.date); setEarlier(!sameDay(p.date, new Date()) && !sameDay(p.date, yesterday())); }
    const g = p.merchant ? guessCategory(p.merchant, history, p.type) : undefined;
    setCategory(g?.category ?? null);
    setCategoryTouched(false);
    if (p.last4) {
      const acc = accounts.find((a) => !a.archived && a.name.includes(p.last4!));
      if (acc) setAccountId(acc.id);
    }
  };

  const save = async () => {
    // Nudge to what is missing instead of a dead button
    if (amt <= 0) { setShakeAmount((n) => n + 1); amountRef.current?.focus(); return; }
    if (!category) { setShakeCat((n) => n + 1); return; }
    setSaving(true);
    try {
      const id = await addTransaction({
        type, amount: amt, category, note: note.trim() || undefined,
        streamId: type === 'income' && streamId !== NO_STREAM ? streamId : undefined,
        accountId: accountId || undefined,
        date: withTimeOf(day, new Date()).toISOString(), // chosen day, current time
      });
      const label = findCategory(type, category)?.label ?? category;
      setSaved(true);
      if (type === 'income') celebrate();
      showToast({ message: `Saved: ₹${amt.toLocaleString('en-IN')} ${type === 'income' ? 'in from' : 'on'} ${note.trim() || label}`, actionLabel: 'Undo', onAction: () => deleteTransaction(id) });
      setTimeout(() => {
        setSaved(false);
        setAmount(''); setCategory(null); setCategoryTouched(false); setNote('');
        setDay(new Date()); setEarlier(false); setStreamId(NO_STREAM);
      }, 900);
      if (params.first) setTimeout(() => router.replace('/' as Href), 900); // first entry done → straight to Home
    } catch (e) {
      console.error('Save failed:', e);
      showToast({ message: 'Could not save. Check your connection and try again.' });
    } finally {
      setSaving(false);
    }
  };

  // The background takes the colour of what you pick (green for money in)
  const glow = type === 'income' ? Chip.green : category ? CategoryChip[category] ?? Chip.gray : Chip.indigo;
  const btn = useSharedValue(1);
  useEffect(() => { if (saved && !reduce) { btn.value = 0.94; btn.value = withSpring(1, Spring.press); } }, [saved, reduce, btn]);
  const btnStyle = useAnimatedStyle(() => ({ transform: [{ scale: btn.value }] }));

  const isToday = sameDay(day, new Date());
  const isYest = sameDay(day, yesterday());
  const pill = (label: string, on: boolean, go: () => void) => (
    <Pressable key={label} onPress={go} style={({ pressed }) => [s.pill, on && s.pillOn, pressed && { opacity: 0.75 }]} accessibilityRole="radio" accessibilityState={{ selected: on }}>
      <Text style={[s.pillText, on && { color: Corpus.onGold }]}>{label}</Text>
    </Pressable>
  );
  const ready = amt > 0 && !!category;
  const label = saved ? 'Saved' : amt <= 0 ? 'Enter an amount' : !category ? 'Pick a category' : `Save ₹${amt.toLocaleString('en-IN')}`;

  return (
    <View style={s.root}>
      <Animated.View key={glow} entering={FadeIn.duration(500)} exiting={FadeOut.duration(400)} style={s.aura} pointerEvents="none">
        <Aura color={glow} />
      </Animated.View>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.head}>
          <Text style={s.heading} accessibilityRole="header">Add</Text>
          <Tap onPress={() => setShowPaste(true)} style={s.glassBtn} accessibilityRole="button" accessibilityLabel={canScan ? 'Scan a receipt or paste an SMS' : 'Paste a bank SMS'}>
            <Ionicons name={canScan ? 'scan' : 'clipboard-outline'} size={17} color={Corpus.text} />
            <Text style={s.glassText}>{canScan ? 'Scan' : 'Paste SMS'}</Text>
          </Tap>
        </View>
        <View style={{ paddingHorizontal: 16 }}><TypeSwitch value={type} onChange={handleTypeChange} /></View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {params.first && (
            <View style={s.first}>
              <Text style={s.firstTitle}>Last step: log one thing you spent today</Text>
              <Text style={s.small}>Chai, an auto, lunch, anything. A few seconds a day is the whole habit.</Text>
            </View>
          )}
          {/* the digits you see animate; the real input sits invisibly on top, so tapping the amount opens the number keyboard */}
          <View>
            <AmountDisplay amount={amount} income={type === 'income'} shake={shakeAmount} />
            <TextInput
              ref={amountRef} value={amount} onChangeText={(t) => setAmount(clean(t))}
              keyboardType="decimal-pad" autoFocus caretHidden contextMenuHidden
              returnKeyType="done" onSubmitEditing={save}
              style={s.hiddenInput} accessibilityLabel="Amount"
            />
          </View>

          <View style={[s.noteBox, noteFocus && { borderColor: Corpus.text }]}>
            <Ionicons name="create-outline" size={18} color={Corpus.textMuted} />
            <TextInput
              style={s.note} value={note} onChangeText={changeNote}
              placeholder={type === 'income' ? 'Who paid you?' : 'What was it? Swiggy, auto, chai'}
              placeholderTextColor={Corpus.textFaint} maxLength={60} accessibilityLabel="What was it"
              onFocus={() => setNoteFocus(true)} onBlur={() => setNoteFocus(false)} returnKeyType="done"
            />
          </View>
          <View style={s.pills} accessibilityRole="radiogroup">
            {pill('Today', isToday && !earlier, () => { setEarlier(false); setDay(new Date()); })}
            {pill('Yesterday', isYest && !earlier, () => { setEarlier(false); setDay(yesterday()); })}
            {pill('Earlier', earlier, () => { setEarlier(true); if (isToday) setDay(yesterday()); })}
          </View>
          {earlier && <Animated.View entering={FadeIn.duration(200)}><DayStepper label="Day" value={day} onChange={setDay} /></Animated.View>}

          {suggestions.length > 0 ? <QuickChips items={suggestions} type={type} onPick={applyChip} />
            : amount === '' && picks.length > 0 ? <QuickChips items={picks} type={type} onPick={applyChip} /> : null}

          <CategoryRow categories={categories} selected={category} onSelect={pickCategory} shake={shakeCat} />
          {autoGuessed && note.trim() !== '' && (
            <Text style={[s.small, { textAlign: 'center' }]}>Picked {findCategory(type, guess!.category)?.label} {guess!.source === 'history' ? 'from your past entries' : 'from what you typed'}. Tap another to change it.</Text>
          )}
          {type === 'income' && <StreamPicker value={streamId} onChange={handleStreamChange} />}
          {SHOW_ACCOUNTS && accounts.length > 0 && <AccountPicker accounts={accounts} value={accountId} onChange={setAccountId} />}
        </ScrollView>

        <View style={[s.bottom, { paddingBottom: TAB_BAR_SPACE + Math.max(insets.bottom, 10) - 6 }]}>
          <Animated.View style={btnStyle}>
            <Tap onPress={save} disabled={saving || saved} scaleTo={0.97}
              style={[s.save, saved ? { backgroundColor: Corpus.income } : type === 'income' && ready ? { backgroundColor: Corpus.income } : !ready && s.saveOff]}
              accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: !ready }}>
              {saved
                ? <Animated.View key="ok" entering={ZoomIn.springify().damping(12)}><Ionicons name="checkmark-circle" size={22} color={Corpus.onGold} /></Animated.View>
                : <Ionicons name={ready ? 'checkmark' : amt <= 0 ? 'keypad-outline' : 'grid-outline'} size={20} color={ready ? Corpus.onGold : Corpus.textMuted} />}
              <Text style={[s.saveText, !ready && !saved && { color: Corpus.textMuted }]}>{saving ? 'Saving' : label}</Text>
            </Tap>
          </Animated.View>
        </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
      <PasteSheet visible={showPaste} onClose={() => setShowPaste(false)} history={history} onFill={fillFrom} />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Corpus.bg },
  aura: { position: 'absolute', top: 0, left: 0, right: 0, height: 460 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 6, paddingBottom: 10 },
  heading: { fontSize: Type.h1 + 4, fontFamily: Font.displayBold, color: Corpus.text, letterSpacing: -0.6 },
  glassBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 40, paddingHorizontal: 14, borderRadius: 20, backgroundColor: Corpus.glass, borderWidth: 0.5, borderColor: Corpus.glassEdge },
  glassText: { fontSize: Type.body, fontFamily: Font.display, color: Corpus.text },
  content: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 12, gap: 12 },
  first: { backgroundColor: Corpus.card, borderRadius: 18, padding: 14, gap: 4 },
  firstTitle: { fontSize: Type.label, fontFamily: Font.displayBold, color: Corpus.text },
  small: { fontSize: Type.small, color: Corpus.textMuted, lineHeight: 17 },
  noteBox: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 22, backgroundColor: Corpus.card, borderWidth: 1.5, borderColor: Corpus.card, paddingHorizontal: 16 },
  note: { flex: 1, fontSize: Type.input, color: Corpus.text, paddingVertical: 12, ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null) },
  pills: { flexDirection: 'row', gap: 8, justifyContent: 'center' },
  pill: { minHeight: 34, paddingHorizontal: 14, borderRadius: 17, backgroundColor: Corpus.card, justifyContent: 'center' },
  pillOn: { backgroundColor: Corpus.gold },
  pillText: { fontSize: Type.body, fontFamily: Font.display, color: Corpus.text },
  bottom: { paddingHorizontal: 16, paddingTop: 8, gap: 10, backgroundColor: Corpus.bg },
  hiddenInput: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0, color: Corpus.bg, fontSize: Type.h1 },
  save: { height: 56, borderRadius: 28, backgroundColor: Corpus.gold, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  saveOff: { backgroundColor: Corpus.card },
  saveText: { fontSize: Type.input, fontFamily: Font.displayBold, color: Corpus.onGold },
});
