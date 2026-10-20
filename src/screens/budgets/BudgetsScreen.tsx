import { EXPENSE_CATEGORIES } from '@/constants/categories';
import { Corpus } from '@/constants/theme';
import { useSettings } from '@/hooks/useSettings';
import { useTransactions } from '@/hooks/useTransactions';
import { saveCategoryBudgets } from '@/services/settings';
import { budgetState, spentByCategory } from '@/utils/budgets';
import { formatINR } from '@/utils/format';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { styles } from './BudgetsScreen.styles';

const STATE_COLOR = {
  ok: Corpus.income,
  warning: Corpus.warning,
  over: Corpus.danger,
};

// Turn the saved map into editable text drafts: { food: "8000", ... }
function toDrafts(budgets: Record<string, number> | undefined): Record<string, string> {
  const drafts: Record<string, string> = {};
  for (const [id, value] of Object.entries(budgets ?? {})) drafts[id] = String(value);
  return drafts;
}

// Same limits, regardless of key order?
function sameBudgets(a: Record<string, number>, b: Record<string, number>): boolean {
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  return keysA.length === keysB.length && keysA.every((k) => a[k] === b[k]);
}

export default function BudgetsScreen() {
  const router = useRouter();
  const { settings, loading: settingsLoading } = useSettings();
  const { transactions, loading: txLoading } = useTransactions('month');

  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refresh drafts whenever the saved budgets change
  const saved = settings.categoryBudgets ?? {};
  const savedKey = Object.keys(saved)
    .sort()
    .map((k) => `${k}:${saved[k]}`)
    .join(',');
  useEffect(() => {
    setDrafts(toDrafts(settings.categoryBudgets));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedKey]);

  const spent = spentByCategory(transactions);

  // Parse drafts → numbers; empty means "no budget"
  const parsed: Record<string, number> = {};
  const invalid = new Set<string>();
  for (const [id, text] of Object.entries(drafts)) {
    if (text.trim() === '') continue;
    const n = Number(text);
    if (!Number.isFinite(n) || n <= 0) invalid.add(id);
    else parsed[id] = n;
  }

  const isDirty = !sameBudgets(parsed, saved);
  const canSave = isDirty && invalid.size === 0 && !saving;
  const limitsTotal = Object.values(parsed).reduce((sum, n) => sum + n, 0);
  const monthly = settings.monthlyBudget;

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      await saveCategoryBudgets(parsed);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2000);
    } catch (e) {
      console.error('Save budgets failed:', e);
      setError('Could not save budgets. Try again.');
    } finally {
      setSaving(false);
    }
  };

  const loading = settingsLoading || txLoading;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerRow}>
          <Pressable onPress={goBack} style={styles.backButton} hitSlop={10}>
            <Ionicons name="chevron-back" size={22} color={Corpus.text} />
          </Pressable>
          <Text style={styles.heading}>Budgets</Text>
        </View>
        <Text style={styles.intro}>
          Set a monthly limit for the categories you want to watch. Leave a field empty for no limit.
        </Text>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={Corpus.gold} />
          </View>
        ) : (
          <>
            <View style={styles.totalCard}>
              <Text style={styles.totalLabel}>CATEGORY LIMITS ADD UP TO</Text>
              <Text style={styles.totalValue}>{formatINR(limitsTotal)}</Text>
              {monthly ? (
                limitsTotal > monthly ? (
                  <Text style={styles.totalWarn}>
                    {formatINR(limitsTotal - monthly)} more than your {formatINR(monthly)} monthly budget
                  </Text>
                ) : (
                  <Text style={styles.totalHint}>
                    Within your {formatINR(monthly)} monthly budget · {formatINR(monthly - limitsTotal)} unassigned
                  </Text>
                )
              ) : (
                <Text style={styles.totalHint}>Set an overall monthly budget in Settings to compare</Text>
              )}
            </View>

            <View style={styles.group}>
              {EXPENSE_CATEGORIES.map((cat, index) => {
                const s = spent.get(cat.id) ?? 0;
                const limit = parsed[cat.id];
                const state = limit ? budgetState(s, limit) : 'ok';
                const percent = limit ? Math.min((s / limit) * 100, 100) : 0;
                const bad = invalid.has(cat.id);
                return (
                  <View key={cat.id} style={[styles.row, index > 0 && styles.rowDivider]}>
                    <View style={styles.rowTop}>
                      <View style={styles.iconCircle}>
                        <Ionicons name={cat.icon as any} size={15} color={Corpus.textMuted} />
                      </View>
                      <View style={styles.rowBody}>
                        <Text style={styles.rowLabel}>{cat.label}</Text>
                        <Text style={styles.rowSpent}>
                          {limit
                            ? `${formatINR(s)} of ${formatINR(limit)} this month`
                            : `${formatINR(s)} spent this month`}
                        </Text>
                      </View>
                      <View style={[styles.limitBox, bad && styles.limitBoxError]}>
                        <Text style={styles.rupee}>₹</Text>
                        <TextInput
                          style={styles.limitInput}
                          value={drafts[cat.id] ?? ''}
                          onChangeText={(text) => setDrafts((d) => ({ ...d, [cat.id]: text }))}
                          placeholder="No limit"
                          placeholderTextColor={Corpus.textFaint}
                          keyboardType="numeric"
                        />
                      </View>
                    </View>
                    {limit ? (
                      <View style={styles.track}>
                        <View
                          style={[
                            styles.fill,
                            { width: `${percent}%`, backgroundColor: STATE_COLOR[state] },
                          ]}
                        />
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </View>

            <Pressable
              style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={!canSave}
            >
              {saving ? (
                <ActivityIndicator color="#0F1115" />
              ) : (
                <Text style={[styles.saveText, !canSave && styles.saveTextDisabled]}>
                  Save budgets
                </Text>
              )}
            </Pressable>
            {invalid.size > 0 && (
              <Text style={styles.errorText}>Limits must be numbers greater than 0</Text>
            )}
            {justSaved && <Text style={styles.savedNote}>Saved ✓</Text>}
            {error && <Text style={styles.errorText}>{error}</Text>}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
