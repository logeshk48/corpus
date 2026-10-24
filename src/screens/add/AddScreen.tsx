import { SectionLabel } from '@/components/ui';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/constants/categories';
import { Corpus } from '@/constants/theme';
import { addTransaction } from '@/services/transactions';
import { useTransactions } from '@/hooks/useTransactions';
import { findCategory } from '@/constants/categories';
import { frequentPicks, guessCategory, noteSuggestions } from '@/utils/quickAdd';
import { useEffect, useMemo, useState } from 'react';
import AccountPicker, { NO_ACCOUNT } from '@/components/AccountPicker';
import { useAccounts } from '@/hooks/useAccounts';
import { useSettings } from '@/hooks/useSettings';
import { Alert, Platform, ScrollView, Text, TextInput, View } from 'react-native';
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

export default function AddScreen() {
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<TxType>('expense');
  const [category, setCategory] = useState<string | null>(null);
  const [note, setNote] = useState('');
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
      console.log('Saved to Firestore:', id);

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
        <Text style={styles.heading}>Add transaction</Text>

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

        {accounts.length > 0 && (
          <>
            <SectionLabel>{type === 'expense' ? 'PAID FROM' : 'RECEIVED IN'}</SectionLabel>
            <AccountPicker accounts={accounts} value={accountId} onChange={setAccountId} />
          </>
        )}

        <SectionLabel>DATE</SectionLabel>
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
    </SafeAreaView>
  );
}