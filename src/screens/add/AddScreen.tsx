import { Corpus } from '@/constants/theme';
import { useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { styles } from './AddScreen.styles';
import TypeToggle, { TxType } from './components/TypeToggle';

export default function AddScreen() {
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<TxType>('expense');

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.heading}>Add transaction</Text>

        <TypeToggle value={type} onChange={setType} />

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

        {/* Categories and save — next tasks */}
      </ScrollView>
    </SafeAreaView>
  );
}