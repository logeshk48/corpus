import { ScreenHeader, SectionLabel } from '@/components/ui';
import FilterChips, { ChipOption } from '@/components/FilterChips';
import { findCategory } from '@/constants/categories';
import { Corpus } from '@/constants/theme';
import { useTransactions } from '@/hooks/useTransactions';
import TransactionRow from '@/screens/home/components/TransactionRow';
import { formatINR } from '@/utils/format';
import { groupByDay } from '@/utils/groupTransactions';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Transaction } from '@/types/transaction';
import { styles } from './TransactionsScreen.styles';

type Filter = 'all' | 'expense' | 'income';

const FILTERS: ChipOption<Filter>[] = [
  { id: 'all', label: 'All' },
  { id: 'expense', label: 'Expenses' },
  { id: 'income', label: 'Income' },
];

// Does a transaction match the search text? (note, category name, or amount)
function matchesSearch(tx: Transaction, q: string): boolean {
  if (!q) return true;
  const note = tx.note?.toLowerCase() ?? '';
  const category = findCategory(tx.type, tx.category)?.label.toLowerCase() ?? '';
  return note.includes(q) || category.includes(q) || String(tx.amount).includes(q);
}

export default function TransactionsScreen() {
  const router = useRouter();
  const { transactions, loading, error } = useTransactions('year');
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  const q = search.trim().toLowerCase();
  const visible = transactions
    .filter((t) => filter === 'all' || t.type === filter)
    .filter((t) => matchesSearch(t, q));
  const total = visible.reduce((sum, t) => sum + t.amount, 0);
  const sections = groupByDay(visible);
  // "₹620 spent · +₹16,500" — the day's money in and out, shown beside the date
  const dayTotal = (txs: typeof visible) => {
    const out = txs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const inc = txs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    return [out ? `${formatINR(out)} spent` : '', inc ? `+${formatINR(inc)}` : ''].filter(Boolean).join(' · ');
  };

  const summary =
    filter === 'all'
      ? `${visible.length} transaction${visible.length === 1 ? '' : 's'} this year`
      : filter === 'expense'
      ? `${formatINR(total)} spent this year`
      : `${formatINR(total)} earned this year`;

  const emptyTitle =
    transactions.length === 0
      ? 'No transactions yet'
      : q
      ? `No results for "${search.trim()}"`
      : filter === 'income'
      ? 'No income this year'
      : 'No expenses this year';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenHeader title="Transactions" onBack={goBack} />

        <View style={styles.searchBox}>
          <Ionicons name="search" size={16} color={Corpus.textFaint} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search notes, categories, amounts"
            placeholderTextColor={Corpus.textFaint}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')} hitSlop={10}>
              <Ionicons name="close-circle" size={16} color={Corpus.textMuted} />
            </Pressable>
          )}
        </View>

        <FilterChips options={FILTERS} value={filter} onChange={setFilter} />

        {loading ? (
          <View style={styles.empty}>
            <ActivityIndicator color={Corpus.gold} />
          </View>
        ) : error ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>{error}</Text>
          </View>
        ) : sections.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="receipt-outline" size={32} color={Corpus.textFaint} />
            <Text style={styles.emptyTitle}>{emptyTitle}</Text>
            <Text style={styles.emptyText}>
              {q ? 'Try a different word or clear the search' : 'Add one from the gold + tab'}
            </Text>
          </View>
        ) : (
          <>
            <Text style={styles.summary}>{summary}</Text>
            {sections.map((section) => (
              <View key={section.title}>
                <SectionLabel right={dayTotal(section.data)}>{section.title}</SectionLabel>
                <View style={styles.list}>
                  {section.data.map((tx) => (
                    <TransactionRow
                      key={tx.id}
                      tx={tx}
                      onPress={() => router.push({ pathname: '/edit/[id]', params: { id: tx.id } })}
                    />
                  ))}
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
