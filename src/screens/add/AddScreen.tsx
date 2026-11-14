import { SectionLabel } from '@/components/ui';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/constants/categories';
import { Corpus, Type } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { addTransaction } from '@/services/transactions';
import { useTransactions } from '@/hooks/useTransactions';
import { findCategory } from '@/constants/categories';
import { frequentPicks, guessCategory, noteSuggestions } from '@/utils/quickAdd';
import { recentDays } from '@/utils/catchUp';
import { useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import AccountPicker, { NO_ACCOUNT } from '@/components/AccountPicker';

// Accounts are hidden for now (code kept). Set true to bring the "Paid from" picker back.
const SHOW_ACCOUNTS = false;
import { useAccounts } from '@/hooks/useAccounts';
import { useSettings } from '@/hooks/useSettings';
import { Alert, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateStepper from '@/components/DateStepper';
import { withTimeOf } from '@/utils/dates';
import StreamPicker, { NO_STREAM } from '@/components/StreamPicker';
import type { IncomeStream } from '@/types/incomeStream';
import { styles } from './AddScreen.styles';
import CategoryGrid from './components/CategoryGrid';
import QuickChips, { type Chip } from './components/QuickChips';
import SaveButton from './components/SaveButton';
import TypeToggle, { TxType } from './components/TypeToggle';

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
  const applyChip = (c: Chip) => {
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

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={styles.heading}>Add transaction</Text>
          <Pressable onPress={() => setShowPaste(true)} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }} accessibilityRole="button">
            <Ionicons name={canScan ? "scan-outline" : "clipboard-outline"} size={16} color={Corpus.gold} />
            <Text style={{ color: Corpus.gold, fontWeight: '600', fontSize: Type.small }}>{canScan ? 'Scan / paste' : 'Paste SMS'}</Text>
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
        <TypeToggle value={type} onChange={handleTypeChange} />

        <View style={styles.amountSection}>
          <Text style={styles.amountLabel}>AMOUNT</Text>
          <View style={styles.amountRow}>
            <Text style={styles.rupee}>₹</Text>
            <TextInput
              style={[styles.amountInput, type === 'income' && { color: Corpus.income }]}
              value={amount}
              onChangeText={setAmount}
              placeholder="0"
              placeholderTextColor={Corpus.textFaint}
              keyboardType="numeric"
              autoFocus
            />
          </View>
        </View>

        {amount === '' && picks.length > 0 && (
          <>
            <SectionLabel right="Tap to fill">YOUR USUALS</SectionLabel>
            <QuickChips items={picks} type={type} onPick={applyChip} />
          </>
        )}

        {SHOW_ACCOUNTS && accounts.length > 0 && (
          <>
            <SectionLabel>{type === 'expense' ? 'PAID FROM' : 'RECEIVED IN'}</SectionLabel>
            <AccountPicker accounts={accounts} value={accountId} onChange={setAccountId} />
          </>
        )}

        <SectionLabel right={params.catchup ? 'Filling in missed days' : undefined}>DATE</SectionLabel>
        <View style={styles.dayChips}>
          {recentDays(new Date(), 4).map((d) => {
            const on = d.date.toDateString() === day.toDateString();
            return (
              <Pressable key={d.label} style={[styles.dayChip, on && styles.dayChipOn]} onPress={() => setDay(d.date)}>
                <Text style={[styles.dayChipText, on && styles.dayChipTextOn]}>{d.label}</Text>
              </Pressable>
            );
          })}
        </View>
        <DateStepper value={day} onChange={setDay} />

        {type === 'income' && (
          <>
            <SectionLabel>FROM</SectionLabel>
            <StreamPicker value={streamId} onChange={handleStreamChange} />
          </>
        )}

        <SectionLabel>CATEGORY</SectionLabel>
        <CategoryGrid
          categories={categories}
          selected={category}
          onSelect={pickCategory}
        />

        <SectionLabel>NOTE (OPTIONAL)</SectionLabel>
        <TextInput
          style={styles.noteInput}
          value={note}
          onChangeText={changeNote}
          placeholder={type === 'expense' ? 'e.g. Filter coffee' : 'e.g. Client payment'}
          placeholderTextColor={Corpus.textFaint}
          maxLength={60}
        />
        <QuickChips items={suggestions} type={type} onPick={applyChip} />
        {autoGuessed && note.trim() !== '' && (
          <Text style={styles.guessHint}>
            ✨ {findCategory(type, guess!.category)?.label} picked {guess!.source === 'history' ? 'from your past entries' : 'from the note'}. Tap another category to change it
          </Text>
        )}

        <SaveButton enabled={isValid && !saving} onPress={handleSave} />
      </ScrollView>
      <PasteSheet visible={showPaste} onClose={() => setShowPaste(false)} history={history} onFill={fillFrom} />
    </SafeAreaView>
  );
}