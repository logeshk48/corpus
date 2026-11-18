import { Button, Screen, Segmented } from '@/components/ui';
import { askWeb } from '@/services/confirm';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/constants/categories';
import { Corpus } from '@/constants/theme';
import { styles as form } from '@/screens/add/AddScreen.styles';
import CategoryGrid from '@/screens/add/components/CategoryGrid';
import AmountCard from '@/screens/add/components/AmountCard';
import { withTimeOf } from '@/utils/dates';
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
import { Alert, Platform, Text, View } from 'react-native';
import StreamPicker, { NO_STREAM } from '@/components/StreamPicker';
import AccountPicker, { NO_ACCOUNT } from '@/components/AccountPicker';

// Accounts are hidden for now (code kept). Set true to bring the "Paid from" picker back.
const SHOW_ACCOUNTS = false;
import { useAccounts } from '@/hooks/useAccounts';
import type { IncomeStream } from '@/types/incomeStream';
import { styles } from './EditTransactionScreen.styles';


function confirmDelete(onConfirm: () => void) {
  const message = 'Delete this entry? You can undo it right after.';
  if (Platform.OS === 'web') {
    askWeb(`Delete this entry?\n\n${message}`, 'Delete').then((y) => { if (y) onConfirm(); });
  } else {
    Alert.alert('Delete this entry', message, [
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
      showToast({ message: 'Changes saved' });
    } catch (e) {
      console.error('Update failed:', e);
      showToast({ message: 'Could not save changes. Try again.' });
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
            message: 'Entry deleted',
            actionLabel: 'Undo',
            onAction: () => restoreTransaction(deletedId, data),
          });
        }
      } catch (e) {
        console.error('Delete failed:', e);
        showToast({ message: 'Could not delete. Try again.' });
      } finally {
        setBusy(false);
      }
    });
  };

  const amt = Number(amount) || 0;
  const why = amt <= 0 ? 'Enter an amount' : !category ? 'Pick a category' : null;

  return (
    <Screen title="Edit" onBack={goBack} keyboard>
      {loading ? (
        <View style={{ height: 260, borderRadius: 26, backgroundColor: Corpus.card }} accessibilityLabel="Loading" accessibilityState={{ busy: true }} />
      ) : notFound ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={32} color={Corpus.textFaint} />
          <Text style={styles.notFound}>This entry no longer exists</Text>
        </View>
      ) : (
        <>
          <Segmented
            options={[{ value: 'expense', label: 'Spent' }, { value: 'income', label: 'Money in' }] as const}
            value={type} onChange={handleTypeChange} tint={type === 'income' ? Corpus.income : undefined}
          />
          <AmountCard type={type} amount={amount} onAmount={setAmount} note={note} onNote={setNote} day={day} onDay={(d) => setDay(withTimeOf(d, day))} notePlaceholder="Add a note" />

          <View style={form.block}>
            <Text style={form.blockTitle}>Category</Text>
            <CategoryGrid categories={categories} selected={category} onSelect={setCategory} />
          </View>

          {type === 'income' && (
            <View style={form.block}>
              <Text style={form.blockTitle}>From</Text>
              <StreamPicker value={streamId} onChange={handleStreamChange} />
            </View>
          )}

          {SHOW_ACCOUNTS && accounts.length > 0 && (
            <View style={form.block}>
              <Text style={form.blockTitle}>{type === 'expense' ? 'Paid from' : 'Received in'}</Text>
              <AccountPicker accounts={accounts} value={accountId} onChange={setAccountId} />
            </View>
          )}

          <View style={{ gap: 8 }}>
            <Button icon="checkmark" label={why ?? 'Save changes'} onPress={handleSave} loading={busy} disabled={!!why || busy} />
            <Button variant="danger" icon="trash-outline" label="Delete" onPress={handleDelete} disabled={busy} />
          </View>
        </>
      )}
    </Screen>
  );
}
