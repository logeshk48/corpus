import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/constants/categories';
import { Corpus } from '@/constants/theme';
import { useState } from 'react';
import { Alert, Platform, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { styles } from './AddScreen.styles';
import CategoryGrid from './components/CategoryGrid';
import SaveButton from './components/SaveButton';
import TypeToggle, { TxType } from './components/TypeToggle';

export default function AddScreen() {
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<TxType>('expense');
  const [category, setCategory] = useState<string | null>(null);

  const categories = type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  const isValid = Number(amount) > 0 && category !== null;

  const handleTypeChange = (newType: TxType) => {
    setType(newType);
    setCategory(null);
  };

  const handleSave = () => {
    const transaction = {
      type,
      amount: Number(amount),
      category,
      date: new Date().toISOString(),
    };
    console.log('SAVED:', transaction);

    const message = `${type === 'expense' ? 'Expense' : 'Income'} of ₹${Number(
      amount
    ).toLocaleString('en-IN')} saved`;
    if (Platform.OS === 'web') {
      window.alert(message);
    } else {
      Alert.alert('Saved', message);
    }

    // reset the form
    setAmount('');
    setCategory(null);
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

        <Text style={styles.sectionLabel}>CATEGORY</Text>
        <CategoryGrid
          categories={categories}
          selected={category}
          onSelect={setCategory}
        />

        <SaveButton enabled={isValid} onPress={handleSave} />
      </ScrollView>
    </SafeAreaView>
  );
}