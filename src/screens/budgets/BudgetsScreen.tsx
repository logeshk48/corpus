import { EXPENSE_CATEGORIES } from '@/constants/categories';
import { Corpus } from '@/constants/theme';
import { useToast } from '@/context/ToastContext';
import { useSettings } from '@/hooks/useSettings';
import { useTransactions } from '@/hooks/useTransactions';
import { saveCategoryBudgets } from '@/services/settings';
import { buildBudgetStatuses, spentByCategory } from '@/utils/budgets';
import { formatINR } from '@/utils/format';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BudgetCard from './components/BudgetCard';
import BudgetEditorSheet from './components/BudgetEditorSheet';
import BudgetSummary from './components/BudgetSummary';
import UnbudgetedRow from './components/UnbudgetedRow';
import { styles } from './BudgetsScreen.styles';

export default function BudgetsScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const { settings, loading: settingsLoading } = useSettings();
  const { transactions, loading: txLoading } = useTransactions('month');
  const [editingId, setEditingId] = useState<string | null>(null);

  const saved = settings.categoryBudgets ?? {};
  const spent = spentByCategory(transactions);
  const active = buildBudgetStatuses(transactions, saved);
  const unbudgeted = EXPENSE_CATEGORIES.filter((c) => !saved[c.id]).sort(
    (a, b) => (spent.get(b.id) ?? 0) - (spent.get(a.id) ?? 0)
  );

  // Summary: the overall monthly budget if set, otherwise the budgeted categories combined
  const monthly = settings.monthlyBudget;
  const allSpent = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
  const summary = monthly
    ? { title: 'This month', spent: allSpent, limit: monthly }
    : active.length > 0
    ? {
        title: 'Budgeted categories',
        spent: active.reduce((sum, b) => sum + b.spent, 0),
        limit: active.reduce((sum, b) => sum + b.limit, 0),
      }
    : null;

  const editingCategory = EXPENSE_CATEGORIES.find((c) => c.id === editingId) ?? null;

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const openSettings = () => router.push('/settings' as Href);

  const handleSave = async (limit: number) => {
    if (!editingCategory) return;
    try {
      await saveCategoryBudgets({ ...saved, [editingCategory.id]: limit });
      setEditingId(null);
      showToast({ message: `${editingCategory.label} budget set to ${formatINR(limit)}` });
    } catch (e) {
      console.error('Save budget failed:', e);
      showToast({ message: 'Could not save. Check your connection.' });
    }
  };

  const handleRemove = async () => {
    if (!editingCategory) return;
    const before = { ...saved };
    const { [editingCategory.id]: _removed, ...rest } = saved;
    try {
      await saveCategoryBudgets(rest);
      setEditingId(null);
      showToast({
        message: `${editingCategory.label} limit removed`,
        actionLabel: 'Undo',
        onAction: () => saveCategoryBudgets(before),
      });
    } catch (e) {
      console.error('Remove budget failed:', e);
      showToast({ message: 'Could not remove. Check your connection.' });
    }
  };

  const loading = settingsLoading || txLoading;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Pressable onPress={goBack} style={styles.backButton} hitSlop={10}>
            <Ionicons name="chevron-back" size={22} color={Corpus.text} />
          </Pressable>
          <Text style={styles.heading}>Budgets</Text>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={Corpus.gold} />
          </View>
        ) : (
          <>
            {summary ? (
              <BudgetSummary title={summary.title} spent={summary.spent} limit={summary.limit} />
            ) : (
              <View style={styles.welcome}>
                <View style={styles.welcomeIcon}>
                  <Ionicons name="pie-chart-outline" size={24} color={Corpus.gold} />
                </View>
                <Text style={styles.welcomeTitle}>Take control of your month</Text>
                <Text style={styles.welcomeText}>
                  Pick a category below and set a monthly limit. Corpus will track it live and
                  tell you how much you can spend per day.
                </Text>
              </View>
            )}

            <Pressable style={styles.monthlyLink} onPress={openSettings}>
              <Ionicons name="wallet-outline" size={14} color={Corpus.textMuted} />
              <Text style={styles.monthlyText}>
                {monthly
                  ? `Overall monthly budget: ${formatINR(monthly)}`
                  : 'No overall monthly budget set'}
              </Text>
              <Text style={styles.monthlyAction}>{monthly ? 'Change' : 'Set'}</Text>
            </Pressable>

            {active.length > 0 && (
              <>
                <View style={styles.sectionRow}>
                  <Text style={styles.sectionLabel}>ACTIVE BUDGETS</Text>
                  <Text style={styles.sectionMeta}>Tap to edit</Text>
                </View>
                <View style={styles.list}>
                  {active.map((b) => (
                    <BudgetCard key={b.categoryId} budget={b} onPress={() => setEditingId(b.categoryId)} />
                  ))}
                </View>
              </>
            )}

            {unbudgeted.length > 0 && (
              <>
                <View style={styles.sectionRow}>
                  <Text style={styles.sectionLabel}>NOT BUDGETED</Text>
                  <Text style={styles.sectionMeta}>Sorted by spending</Text>
                </View>
                <View style={styles.group}>
                  {unbudgeted.map((c, i) => (
                    <UnbudgetedRow
                      key={c.id}
                      category={c}
                      spent={spent.get(c.id) ?? 0}
                      first={i === 0}
                      onPress={() => setEditingId(c.id)}
                    />
                  ))}
                </View>
              </>
            )}
          </>
        )}
      </ScrollView>

      <BudgetEditorSheet
        category={editingCategory}
        spent={editingId ? spent.get(editingId) ?? 0 : 0}
        currentLimit={editingId ? saved[editingId] : undefined}
        onClose={() => setEditingId(null)}
        onSave={handleSave}
        onRemove={handleRemove}
      />
    </SafeAreaView>
  );
}
