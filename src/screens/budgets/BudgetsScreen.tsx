import { Group, Screen } from '@/components/ui';
import { EXPENSE_CATEGORIES, type Category } from '@/constants/categories';
import { useToast } from '@/context/ToastContext';
import { useEntrance } from '@/hooks/useEntrance';
import { useSettings } from '@/hooks/useSettings';
import { useTransactions } from '@/hooks/useTransactions';
import { saveCategoryBudgets, saveSettings } from '@/services/settings';
import { buildBudgetStatuses, spentByCategory } from '@/utils/budgets';
import { formatINR } from '@/utils/format';
import { useState } from 'react';
import { Text, View } from 'react-native';
import BudgetCard from './components/BudgetCard';
import BudgetEditorSheet, { MONTHLY } from './components/BudgetEditorSheet';
import BudgetSummary from './components/BudgetSummary';
import UnbudgetedRow from './components/UnbudgetedRow';
import { styles } from './BudgetsScreen.styles';

const MONTHLY_CAT: Category = { id: MONTHLY, label: 'Monthly budget', icon: 'wallet' };

export default function BudgetsScreen() {
  const { showToast } = useToast();
  const { settings, loading: settingsLoading } = useSettings();
  const { transactions, loading: txLoading } = useTransactions('month');
  const [editingId, setEditingId] = useState<string | null>(null);
  const loading = settingsLoading || txLoading;
  const t = useEntrance(800, loading);

  const saved = settings.categoryBudgets ?? {};
  const spent = spentByCategory(transactions);
  const active = buildBudgetStatuses(transactions, saved);
  const unbudgeted = EXPENSE_CATEGORIES.filter((c) => !saved[c.id]).sort((a, b) => (spent.get(b.id) ?? 0) - (spent.get(a.id) ?? 0));
  const allSpent = transactions.filter((x) => x.type === 'expense').reduce((sum, x) => sum + x.amount, 0);
  const monthly = settings.monthlyBudget;
  const limitsTotal = active.reduce((sum, b) => sum + b.limit, 0);
  const summary = monthly
    ? { spent: allSpent, limit: monthly }
    : active.length
    ? { spent: active.reduce((sum, b) => sum + b.spent, 0), limit: limitsTotal }
    : { spent: allSpent, limit: null };

  const editing = editingId === MONTHLY ? MONTHLY_CAT : EXPENSE_CATEGORIES.find((c) => c.id === editingId) ?? null;

  const handleSave = async (limit: number) => {
    if (!editing) return;
    try {
      if (editing.id === MONTHLY) await saveSettings({ monthlyBudget: limit });
      else await saveCategoryBudgets({ ...saved, [editing.id]: limit });
      setEditingId(null);
      showToast({ message: `${editing.id === MONTHLY ? 'Monthly budget' : `${editing.label} limit`} set to ${formatINR(limit)}` });
    } catch (e) {
      console.error('Save budget failed:', e);
      showToast({ message: 'Couldn’t save. Check your connection.' });
    }
  };

  const handleRemove = async () => {
    if (!editing) return;
    try {
      if (editing.id === MONTHLY) {
        const before = monthly;
        await saveSettings({ monthlyBudget: undefined });
        showToast({ message: 'Monthly budget removed', actionLabel: 'Undo', onAction: () => saveSettings({ monthlyBudget: before }) });
      } else {
        const before = { ...saved };
        const { [editing.id]: _removed, ...rest } = saved;
        await saveCategoryBudgets(rest);
        showToast({ message: `${editing.label} limit removed`, actionLabel: 'Undo', onAction: () => saveCategoryBudgets(before) });
      }
      setEditingId(null);
    } catch (e) {
      console.error('Remove budget failed:', e);
      showToast({ message: 'Couldn’t remove. Check your connection.' });
    }
  };

  return (
    <>
      <Screen
        title="Budgets"
        subtitle={active.length ? `${active.length} limit${active.length > 1 ? 's' : ''}, ${formatINR(limitsTotal)} a month` : undefined}
      >
        {loading ? (
          <View style={{ gap: 14 }} accessibilityLabel="Loading budgets" accessibilityState={{ busy: true }}>
            <View style={[styles.skel, { height: 230 }]} />
            <View style={[styles.skel, { height: 180 }]} />
          </View>
        ) : (
          <>
            <BudgetSummary spent={summary.spent} limit={summary.limit} monthly={monthly} onEditMonthly={() => setEditingId(MONTHLY)} />

            {active.length === 0 && (
              <Text style={styles.lead}>Set a limit on the categories you want to watch. Corpus tracks them as you spend and tells you what’s left a day.</Text>
            )}

            {active.length > 0 && (
              <Group animate title="Your limits">
                {active.map((b) => (
                  <BudgetCard key={b.categoryId} budget={b} appear={t} onPress={() => setEditingId(b.categoryId)} />
                ))}
              </Group>
            )}

            {unbudgeted.length > 0 && (
              <Group animate title={active.length ? 'No limit yet' : 'Categories'}>
                {unbudgeted.map((c) => (
                  <UnbudgetedRow key={c.id} category={c} spent={spent.get(c.id) ?? 0} onPress={() => setEditingId(c.id)} />
                ))}
              </Group>
            )}
          </>
        )}
      </Screen>

      <BudgetEditorSheet
        category={editing}
        spent={editingId === MONTHLY ? allSpent : editingId ? spent.get(editingId) ?? 0 : 0}
        currentLimit={editingId === MONTHLY ? monthly : editingId ? saved[editingId] : undefined}
        onClose={() => setEditingId(null)}
        onSave={handleSave}
        onRemove={handleRemove}
      />
    </>
  );
}
