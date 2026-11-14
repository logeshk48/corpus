import { Group, GroupRow, IconChip, Segmented } from '@/components/ui';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/constants/categories';
import { CategoryChip, Chip, Corpus } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { addTransaction } from '@/services/transactions';
import { useTransactions } from '@/hooks/useTransactions';
import { findCategory } from '@/constants/categories';
import { frequentPicks, guessCategory, noteSuggestions } from '@/utils/quickAdd';
import { useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import AccountPicker, { NO_ACCOUNT } from '@/components/AccountPicker';

// Accounts are hidden for now (code kept). Set true to bring the "Paid from" picker back.
const SHOW_ACCOUNTS = false;
import { useAccounts } from '@/hooks/useAccounts';
import { useSettings } from '@/hooks/useSettings';
import { Alert, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { withTimeOf } from '@/utils/dates';
import StreamPicker, { NO_STREAM } from '@/components/StreamPicker';
import type { IncomeStream } from '@/types/incomeStream';
import { styles } from './AddScreen.styles';
import CategoryGrid from './components/CategoryGrid';
import QuickChips, { type Chip as QuickChip } from './components/QuickChips';
import type { TxType } from './components/TypeToggle';

function notify(title: string, message: string) {
  if (Platform.OS === 'web') {
    window.alert(message);
  } else {
    Alert.alert(title, message);
  }
}

import PasteSheet from './components/PasteSheet';
import { canScan } from '@/services/scan';
import type { ParsedMoney } from '@/utils/receipt';

export default function AddScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ amount?: string; note?: string; catchup?: string; first?: string; type?: string; date?: string; category?: string; paste?: string }>();
  const [amount, setAmount] = useState(params.amount ?? '');
  const [type, setType] = useState<TxType>('expense');
  const [category, setCategory] = useState<string | null>(null);
  const [note, setNote] = useState(params.note ?? '');
  useEffect(() => {
    if (params.amount) setAmount(params.amount);
    if (params.note) setNote(params.note);
  }, [params.amount, params.note]);
  // Coming from "Edit" on a bank SMS: money in/out, the SMS date and the guessed category
  useEffect(() => {
    if (params.type === 'income' || params.type === 'expense') setType(params.type);
    if (params.date && !isNaN(Date.parse(params.date))) setDay(new Date(params.date));
    if (params.category) { setCategory(params.category); setCategoryTouched(true); }
  }, [params.type, params.date, params.category]);
  const [day, setDay] = useState(() => new Date());
  const [streamId, setStreamId] = useState(NO_STREAM);
  const [saving, setSaving] = useState(false);
  // true once the person picks a category themselves — then we stop guessing
  const [categoryTouched, setCategoryTouched] = useState(false);
  const { accounts } = useAccounts();
  const { settings } = useSettings();
  const [accountId, setAccountId] = useState(NO_ACCOUNT);
  // default: your chosen default account, or the only one you have
  useEffect(() => {
    if (accountId !== NO_ACCOUNT) return;
    const def = accounts.find((a) => a.id === settings.defaultAccountId) ?? (accounts.length === 1 ? accounts[0] : undefined);
    if (def) setAccountId(def.id);
  }, [accounts, settings.defaultAccountId]);

  // ── Quick add: learned from the last 12 months of entries ──
  const { transactions: history } = useTransactions('last12Months');
  const picks = useMemo(() => frequentPicks(history, type), [history, type]);
  const suggestions = useMemo(() => noteSuggestions(history, note, type), [history, note, type]);
  const guess = useMemo(() => guessCategory(note, history, type), [history, note, type]);

  const pickCategory = (id: string) => {
    setCategory(id);
    setCategoryTouched(true);
  };
  const changeNote = (text: string) => {
    setNote(text);
    if (categoryTouched) return;
    const g = guessCategory(text, history, type);
    if (g) setCategory(g.category);
  };
  // Tapping a chip fills whatever is still empty (and the note)
  const applyChip = (c: QuickChip) => {
    setNote(c.note);
    if (!categoryTouched) setCategory(c.category);
    if (c.amount && (amount === '' || Number(amount) === 0)) setAmount(String(c.amount));
  };
  const autoGuessed = !categoryTouched && !!guess && category === guess.category;

  const categories = type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
  const isValid = Number(amount) > 0 && category !== null;

  const handleTypeChange = (newType: TxType) => {
    setType(newType);
    setCategory(null);
    setCategoryTouched(false);
    setStreamId(NO_STREAM);
  };

  // Picking a stream also picks the matching income category (ids line up)
  const handleStreamChange = (id: string, stream?: IncomeStream) => {
    setStreamId(id);
    if (stream) setCategory(stream.type);
  };


  // Pasted bank SMS / receipt → fill the form (you still check and tap Save)
  const [showPaste, setShowPaste] = useState(false);
  useEffect(() => { if (params.paste === '1') setShowPaste(true); }, [params.paste]);
  const fillFrom = (p: ParsedMoney) => {
    setType(p.type);
    setStreamId(NO_STREAM);
    setAmount(p.amount ? String(p.amount) : '');
    setNote(p.merchant ?? '');
    if (p.date) setDay(p.date);
    const g = p.merchant ? guessCategory(p.merchant, history, p.type) : undefined;
    setCategory(g?.category ?? null);
    setCategoryTouched(false);
    if (p.last4) {
      const acc = accounts.find((a) => !a.archived && a.name.includes(p.last4!));
      if (acc) setAccountId(acc.id);
    }
  };

  const handleSave = async () => {
    if (!isValid || !category) return;

    setSaving(true);
    try {
      const id = await addTransaction({
        type,
        amount: Number(amount),
        category,
        note: note.trim() || undefined,
        streamId: type === 'income' && streamId !== NO_STREAM ? streamId : undefined,
        accountId: accountId || undefined,
        date: withTimeOf(day, new Date()).toISOString(), // chosen day, current time
      });

      notify(
        'Saved',
        `${type === 'expense' ? 'Expense' : 'Income'} of ₹${Number(amount).toLocaleString('en-IN')} saved`
      );
      setAmount('');
      setCategory(null);
      setCategoryTouched(false);
      setNote('');
      setDay(new Date()); // next entry defaults to today again
      setStreamId(NO_STREAM);
      if (params.first) router.replace('/' as Href); // first expense done → straight to Home
    } catch (e: any) {
      console.error('Save failed:', e);
      notify('Could not save', 'Something went wrong. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  const today = new Date();
  const isToday = day.toDateString() === today.toDateString();
  const dayLabel = isToday ? 'Today'
    : day.toDateString() === new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1).toDateString() ? 'Yesterday'
    : day.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
  const stepDay = (d: number) => {
    const n = new Date(day.getFullYear(), day.getMonth(), day.getDate() + d);
    if (n <= today) setDay(n);
  };
  const catNow = category ? findCategory(type, category) : undefined;
  const amt = Number(amount) || 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.headRow}>
          <Text style={styles.heading} accessibilityRole="header">Add</Text>
          <Pressable style={styles.glassBtn} onPress={() => setShowPaste(true)} accessibilityRole="button">
            <Ionicons name={canScan ? 'scan' : 'clipboard-outline'} size={17} color={Corpus.gold} />
            <Text style={styles.glassText}>{canScan ? 'Scan or paste' : 'Paste SMS'}</Text>
          </Pressable>
        </View>

        {params.first && (
          <View style={styles.firstBanner}>
            <Text style={styles.firstTitle}>Last step: log one thing you spent today</Text>
            <Text style={styles.firstText}>
              Chai, auto, lunch — anything. That’s the whole habit: a few seconds a day. Things you log twice become one-tap buttons on Home.
            </Text>
          </View>
        )}

        <Segmented
          options={[{ value: 'expense', label: 'Expense' }, { value: 'income', label: 'Income' }] as const}
          value={type}
          onChange={handleTypeChange}
          tint={type === 'income' ? Corpus.income : undefined}
        />

        <View style={styles.amountCard}>
          <View style={styles.amountRow}>
            <Text style={[styles.rupee, amt > 0 && { color: type === 'income' ? Corpus.income : Corpus.text }]}>₹</Text>
            <TextInput
              style={[styles.amountInput, type === 'income' && { color: Corpus.income }]}
              value={amount}
              onChangeText={(t) => setAmount(t.replace(/[^0-9.]/g, ''))}
              placeholder="0"
              placeholderTextColor={Corpus.textFaint}
              keyboardType="decimal-pad"
              autoFocus
              accessibilityLabel="Amount"
            />
          </View>
          <View style={styles.summary}>
            {catNow ? <IconChip icon={catNow.icon} color={CategoryChip[catNow.id] ?? Chip.gray} size={22} /> : null}
            <Text style={styles.summaryText} numberOfLines={1}>
              {[catNow?.label ?? 'Pick a category', note.trim() || null, dayLabel].filter(Boolean).join(' · ')}
            </Text>
          </View>
        </View>

        {amount === '' && picks.length > 0 && (
          <View style={styles.block}>
            <Text style={styles.blockTitle}>Your usuals</Text>
            <QuickChips items={picks} type={type} onPick={applyChip} />
          </View>
        )}

        <View style={styles.block}>
          <Text style={styles.blockTitle}>Category</Text>
          <CategoryGrid categories={categories} selected={category} onSelect={pickCategory} />
          {autoGuessed && note.trim() !== '' && (
            <Text style={styles.guessHint}>
              Picked {findCategory(type, guess!.category)?.label} {guess!.source === 'history' ? 'from your past entries' : 'from the note'} — tap another to change it
            </Text>
          )}
        </View>

        {type === 'income' && (
          <View style={styles.block}>
            <Text style={styles.blockTitle}>From</Text>
            <StreamPicker value={streamId} onChange={handleStreamChange} />
          </View>
        )}

        {SHOW_ACCOUNTS && accounts.length > 0 && (
          <View style={styles.block}>
            <Text style={styles.blockTitle}>{type === 'expense' ? 'Paid from' : 'Received in'}</Text>
            <AccountPicker accounts={accounts} value={accountId} onChange={setAccountId} />
          </View>
        )}

        <Group title="Details">
          <GroupRow
            icon="calendar" color={Chip.red} title="Date"
            right={
              <View style={styles.stepper}>
                <Pressable style={styles.stepBtn} onPress={() => stepDay(-1)} accessibilityLabel="Day before" hitSlop={6}>
                  <Ionicons name="chevron-back" size={18} color={Corpus.gold} />
                </Pressable>
                <Pressable onPress={() => setDay(new Date())} accessibilityLabel={`${dayLabel}, tap for today`}>
                  <Text style={styles.stepText}>{dayLabel}</Text>
                </Pressable>
                <Pressable style={[styles.stepBtn, isToday && { opacity: 0.3 }]} onPress={() => stepDay(1)} disabled={isToday} accessibilityLabel="Day after" hitSlop={6}>
                  <Ionicons name="chevron-forward" size={18} color={Corpus.gold} />
                </Pressable>
              </View>
            }
          />
          <View style={styles.noteRow}>
            <IconChip icon="create" color={Chip.gray} />
            <TextInput
              style={styles.noteInput}
              value={note}
              onChangeText={changeNote}
              placeholder={type === 'expense' ? 'Note — e.g. Filter coffee' : 'Note — e.g. Client payment'}
              placeholderTextColor={Corpus.textFaint}
              maxLength={60}
              accessibilityLabel="Note"
            />
          </View>
        </Group>
        <QuickChips items={suggestions} type={type} onPick={applyChip} />
        {params.catchup ? <Text style={styles.guessHint}>Filling in missed days — use the arrows to pick the day</Text> : null}

        <Pressable
          style={({ pressed }) => [styles.save, !(isValid && !saving) && styles.saveOff, pressed && { opacity: 0.85 }]}
          onPress={handleSave}
          disabled={!(isValid && !saving)}
          accessibilityRole="button"
        >
          <Ionicons name="checkmark-circle" size={20} color={isValid ? Corpus.onGold : Corpus.textFaint} />
          <Text style={[styles.saveText, !isValid && { color: Corpus.textFaint }]}>
            {saving ? 'Saving…' : amt > 0 ? `Save ${type === 'income' ? 'income' : 'expense'} · ₹${amt.toLocaleString('en-IN')}` : 'Enter an amount'}
          </Text>
        </Pressable>
      </ScrollView>
      <PasteSheet visible={showPaste} onClose={() => setShowPaste(false)} history={history} onFill={fillFrom} />
    </SafeAreaView>
  );
}