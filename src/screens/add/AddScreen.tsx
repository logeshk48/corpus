import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/constants/categories';
import { Corpus } from '@/constants/theme';
import { addTransaction } from '@/services/transactions';
import { useState } from 'react';
import { Alert, Platform, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateStepper from '@/components/DateStepper';
import { withTimeOf } from '@/utils/dates';
import StreamPicker, { NO_STREAM } from '@/components/StreamPicker';
import type { IncomeStream } from '@/types/incomeStream';
import { styles } from './AddScreen.styles';
import CategoryGrid from './components/CategoryGrid';
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

  const categories = type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
  const isValid = Number(amount) > 0 && category !== null;

  const handleTypeChange = (newType: TxType) => {
    setType(newType);
    setCategory(null);
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
        date: withTimeOf(day, new Date()).toISOString(), // chosen day, current time
      });
      console.log('Saved to Firestore:', id);

      notify(
        'Saved',
        `${type === 'expense' ? 'Expense' : 'Income'} of ₹${Number(amount).toLocaleString('en-IN')} saved`
      );
      setAmount('');
      setCategory(null);
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

        <Text style={styles.sectionLabel}>DATE</Text>
        <DateStepper value={day} onChange={setDay} />

        {type === 'income' && (
          <>
            <Text style={styles.sectionLabel}>FROM</Text>
            <StreamPicker value={streamId} onChange={handleStreamChange} />
          </>
        )}

        <Text style={styles.sectionLabel}>CATEGORY</Text>
        <CategoryGrid
          categories={categories}
          selected={category}
          onSelect={setCategory}
        />

        <Text style={styles.sectionLabel}>NOTE (OPTIONAL)</Text>
        <TextInput
          style={styles.noteInput}
          value={note}
          onChangeText={setNote}
          placeholder={type === 'expense' ? 'e.g. Filter coffee' : 'e.g. Client payment'}
          placeholderTextColor={Corpus.textFaint}
          maxLength={60}
        />

        <SaveButton enabled={isValid && !saving} onPress={handleSave} />
      </ScrollView>
    </SafeAreaView>
  );
}