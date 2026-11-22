import { Button, IconChip, Segmented, useNavChrome } from '@/components/ui';
import { findCategory } from '@/constants/categories';
import { Chip, Corpus } from '@/constants/theme';
import { useTransactions } from '@/hooks/useTransactions';
import TransactionRow from '@/screens/home/components/TransactionRow';
import { formatINR } from '@/utils/format';
import { groupByDay } from '@/utils/groupTransactions';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Animated, Pressable, Text, TextInput, View } from 'react-native';
import type { Transaction } from '@/types/transaction';
import { styles } from './TransactionsScreen.styles';

type Filter = 'all' | 'expense' | 'income';

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'expense', label: 'Spent' },
  { value: 'income', label: 'Money in' },
] as const;

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
    return [out ? `${formatINR(out)} spent` : '', inc ? `+${formatINR(inc)}` : ''].filter(Boolean).join(', ');
  };

  const summary =
    filter === 'all'
      ? `${visible.length} this year`
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

  const chrome = useNavChrome({ title: 'Transactions', subtitle: loading ? undefined : summary, onBack: goBack });

  const header = (
    <View style={styles.head}>
      {chrome.title}
      <View style={styles.searchBox}>
        <Ionicons name="search" size={17} color={Corpus.textFaint} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search notes, categories, amounts"
          placeholderTextColor={Corpus.textFaint}
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel="Search transactions"
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch('')} hitSlop={12} accessibilityLabel="Clear search">
            <Ionicons name="close-circle" size={18} color={Corpus.textMuted} />
          </Pressable>
        )}
      </View>
      <Segmented options={FILTERS} value={filter} onChange={setFilter} />
    </View>
  );

  const empty = loading ? (
    <View style={styles.empty} accessibilityLabel="Loading transactions" accessibilityState={{ busy: true }}><ActivityIndicator color={Corpus.gold} /></View>
  ) : error ? (
    <View style={styles.empty}><Text style={styles.emptyTitle}>{error}</Text></View>
  ) : (
    <View style={styles.empty}>
      <IconChip icon={q ? 'search' : 'receipt'} color={Chip.gray} size={48} />
      <Text style={styles.emptyTitle}>{emptyTitle}</Text>
      <Text style={styles.emptyText}>{q ? 'Try a different word, or clear the search.' : 'Log your first one. It takes 3 seconds.'}</Text>
      {q ? (
        <Button size="sm" variant="secondary" label="Clear search" onPress={() => setSearch('')} />
      ) : (
        <Button label="Add a transaction" icon="add" onPress={() => router.push('/add' as Href)} />
      )}
    </View>
  );

  return (
    <View style={styles.safe}>
      <Animated.SectionList
        {...chrome.scrollProps}
        sections={loading || error ? [] : sections}
        keyExtractor={(t) => t.id}
        stickySectionHeadersEnabled={false}
        initialNumToRender={20}
        windowSize={11}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.content, { paddingTop: chrome.padTop, paddingBottom: chrome.padBottom }]}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        renderSectionHeader={({ section }) => (
          <View style={styles.dayHead}>
            <Text style={styles.dayTitle} accessibilityRole="header">{section.title}</Text>
            <Text style={styles.dayMeta}>{dayTotal(section.data)}</Text>
          </View>
        )}
        renderItem={({ item, index, section }) => {
          const first = index === 0, last = index === section.data.length - 1;
          return (
            <View style={[styles.cell, first && styles.cellFirst, last && styles.cellLast]}>
              <TransactionRow tx={item} onPress={() => router.push({ pathname: '/edit/[id]', params: { id: item.id } })} />
              {!last && <View style={styles.sep} />}
            </View>
          );
        }}
      />
      {chrome.bar}
    </View>
  );
}
