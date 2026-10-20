import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/constants/categories';
import { Corpus } from '@/constants/theme';
import { styles as form } from '@/screens/add/AddScreen.styles';
import CategoryGrid from '@/screens/add/components/CategoryGrid';
import SaveButton from '@/screens/add/components/SaveButton';
import TypeToggle from '@/screens/add/components/TypeToggle';
import { deleteTransaction, getTransaction, updateTransaction } from '@/services/transactions';
import type { TxType } from '@/types/transaction';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateStepper from '@/components/DateStepper';
import { styles } from './EditTransactionScreen.styles';

function notify(message: string) {
  if (Platform.OS === 'web') window.alert(message);
  else Alert.alert('Corpus', message);
}

function confirmDelete(onConfirm: () => void) {
  const message = 'Delete this transaction? This cannot be undone.';
  if (Platform.OS === 'web') {
    if (window.confirm(message)) onConfirm();
  } else {
    Alert.alert('Delete transaction', message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: onConfirm },
    ]);
  }
}

export default function EditTransactionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<TxType>('expense');
  const [category, setCategory] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [day, setDay] = useState(() => new Date());
  const [busy, setBusy] = useState(false);

  // Load the transaction once and pre-fill the form
  useEffect(() => {
    if (!id) return;
    let active = true;
    getTransaction(id)
      .then((tx) => {
        if (!active) return;
        if (!tx) {
          setNotFound(true);
          return;
        }
        setAmount(String(tx.amount));
        setType(tx.type);
        setCategory(tx.category);
        setNote(tx.note ?? '');
        setDay(new Date(tx.date));
      })
      .catch((e) => {
        console.error('Load failed:', e);
        if (active) setNotFound(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  const categories = type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
  const isValid = Number(amount) > 0 && category !== null;

  const handleTypeChange = (newType: TxType) => {
    setType(newType);
    setCategory(null);
  };

  const handleSave = async () => {
    if (!id || !isValid || !category) return;
    setBusy(true);
    try {
      await updateTransaction(id, {
        type,
        amount: Number(amount),
        category,
        note: note.trim() || undefined, // empty note → field removed
        date: day.toISOString(), // stepper keeps the original time of day
      });
      goBack();
    } catch (e) {
      console.error('Update failed:', e);
      notify('Could not save changes. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = () => {
    if (!id) return;
    confirmDelete(async () => {
      setBusy(true);
      try {
        await deleteTransaction(id);
        goBack();
      } catch (e) {
        console.error('Delete failed:', e);
        notify('Could not delete. Try again.');
      } finally {
        setBusy(false);
      }
    });
  };

  return (
    <SafeAreaView style={form.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={form.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerRow}>
          <Pressable onPress={goBack} style={styles.backButton} hitSlop={10}>
            <Ionicons name="chevron-back" size={22} color={Corpus.text} />
          </Pressable>
          <Text style={form.heading}>Edit transaction</Text>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={Corpus.gold} />
          </View>
        ) : notFound ? (
          <View style={styles.center}>
            <Ionicons name="alert-circle-outline" size={32} color={Corpus.textFaint} />
            <Text style={styles.notFound}>This transaction no longer exists</Text>
          </View>
        ) : (
          <>
            <TypeToggle value={type} onChange={handleTypeChange} />

            <View style={form.amountSection}>
              <Text style={form.amountLabel}>AMOUNT</Text>
              <View style={form.amountRow}>
                <Text style={form.rupee}>₹</Text>
                <TextInput
                  style={[form.amountInput, type === 'income' && { color: Corpus.income }]}
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="0"
                  placeholderTextColor={Corpus.textFaint}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <Text style={form.sectionLabel}>DATE</Text>
            <DateStepper value={day} onChange={setDay} />

            <Text style={form.sectionLabel}>CATEGORY</Text>
            <CategoryGrid categories={categories} selected={category} onSelect={setCategory} />

            <Text style={form.sectionLabel}>NOTE (OPTIONAL)</Text>
            <TextInput
              style={form.noteInput}
              value={note}
              onChangeText={setNote}
              placeholder="Add a note"
              placeholderTextColor={Corpus.textFaint}
              maxLength={60}
            />

            <SaveButton enabled={isValid && !busy} onPress={handleSave} />

            <Pressable style={styles.deleteButton} onPress={handleDelete} disabled={busy}>
              <Ionicons name="trash-outline" size={18} color={Corpus.danger} />
              <Text style={styles.deleteText}>Delete transaction</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
