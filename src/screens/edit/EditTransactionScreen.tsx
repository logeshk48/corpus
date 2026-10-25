import { Button, ScreenHeader, SectionLabel } from '@/components/ui';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/constants/categories';
import { Corpus } from '@/constants/theme';
import { styles as form } from '@/screens/add/AddScreen.styles';
import CategoryGrid from '@/screens/add/components/CategoryGrid';
import SaveButton from '@/screens/add/components/SaveButton';
import TypeToggle from '@/screens/add/components/TypeToggle';
import {
  deleteTransaction,
  getTransaction,
  restoreTransaction,
  updateTransaction,
} from '@/services/transactions';
import { useToast } from '@/context/ToastContext';
import type { Transaction, TxType } from '@/types/transaction';
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
import StreamPicker, { NO_STREAM } from '@/components/StreamPicker';
import AccountPicker, { NO_ACCOUNT } from '@/components/AccountPicker';

// Accounts are hidden for now (code kept). Set true to bring the "Paid from" picker back.
const SHOW_ACCOUNTS = false;
import { useAccounts } from '@/hooks/useAccounts';
import type { IncomeStream } from '@/types/incomeStream';
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
  const [streamId, setStreamId] = useState(NO_STREAM);
  const [accountId, setAccountId] = useState(NO_ACCOUNT);
  const { accounts } = useAccounts();
  const [busy, setBusy] = useState(false);
  const [original, setOriginal] = useState<Transaction | null>(null); // for Undo
  const { showToast } = useToast();

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
        setOriginal(tx);
        setAmount(String(tx.amount));
        setType(tx.type);
        setCategory(tx.category);
        setNote(tx.note ?? '');
        setStreamId(tx.streamId ?? NO_STREAM);
        setAccountId(tx.accountId ?? NO_ACCOUNT);
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
    setStreamId(NO_STREAM);
  };

  // Picking a stream also picks the matching income category (ids line up)
  const handleStreamChange = (id: string, stream?: IncomeStream) => {
    setStreamId(id);
    if (stream) setCategory(stream.type);
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
        // switching to expense or None removes the link
        streamId: type === 'income' && streamId !== NO_STREAM ? streamId : undefined,
        accountId: accountId || undefined,
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
        const deleted = original; // the version as it was before any edits
        goBack();
        if (deleted) {
          const { id: deletedId, ...data } = deleted;
          showToast({
            message: 'Transaction deleted',
            actionLabel: 'Undo',
            onAction: () => restoreTransaction(deletedId, data),
          });
        }
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
        <ScreenHeader title="Edit transaction" onBack={goBack} />

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

            {SHOW_ACCOUNTS && accounts.length > 0 && (
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
            <CategoryGrid categories={categories} selected={category} onSelect={setCategory} />

            <SectionLabel>NOTE (OPTIONAL)</SectionLabel>
            <TextInput
              style={form.noteInput}
              value={note}
              onChangeText={setNote}
              placeholder="Add a note"
              placeholderTextColor={Corpus.textFaint}
              maxLength={60}
            />

            <SaveButton enabled={isValid && !busy} onPress={handleSave} />

            <Button variant="danger" icon="trash-outline" label="Delete transaction" onPress={handleDelete} disabled={busy} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
