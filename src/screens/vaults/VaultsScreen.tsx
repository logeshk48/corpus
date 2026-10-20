import { Corpus } from '@/constants/theme';
import { useToast } from '@/context/ToastContext';
import { useSettings } from '@/hooks/useSettings';
import { useTransactions } from '@/hooks/useTransactions';
import { saveSettings } from '@/services/settings';
import { formatINR } from '@/utils/format';
import { hasVaults, monthKey, movedThisMonth, vaultTotals, VAULT_PROFILES } from '@/utils/vaults';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import IncomeSplitCard, { VAULT_COLORS } from './components/IncomeSplitCard';
import IncomeSplitList from './components/IncomeSplitList';
import QuickSetup from './components/QuickSetup';
import VaultCard from './components/VaultCard';
import VaultEditorSheet, { type VaultKind } from './components/VaultEditorSheet';
import { styles } from './VaultsScreen.styles';

type Profile = (typeof VAULT_PROFILES)[number];

export default function VaultsScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const { settings, loading: settingsLoading } = useSettings();
  const { transactions: monthTx, loading: monthLoading } = useTransactions('month');
  const { transactions: yearTx, loading: yearLoading } = useTransactions('year');
  const [editing, setEditing] = useState<VaultKind | null>(null);
  const [showHelp, setShowHelp] = useState<boolean | null>(null); // null = automatic

  const month = vaultTotals(monthTx, settings);
  const year = vaultTotals(yearTx, settings);
  const taxPct = settings.taxVaultPercent ?? 0;
  const savingsPct = settings.savingsVaultPercent ?? 0;
  const includeSalary = settings.taxIncludesSalary ?? false;
  const active = hasVaults(settings);
  const incomes = monthTx.filter((t) => t.type === 'income');
  const helpOpen = showHelp ?? !active; // open by default until vaults are set up

  // Worked example on a ₹10,000 payment, using your % (or freelancer defaults)
  const exTax = active ? taxPct : 15;
  const exSav = active ? savingsPct : 20;
  const example = { tax: 10000 * (exTax / 100), savings: 10000 * (exSav / 100) };

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));

  const handleSave = async (percent: number, salary: boolean) => {
    if (!editing) return;
    const name = editing === 'tax' ? 'Tax vault' : 'Savings vault';
    try {
      if (editing === 'tax') {
        await saveSettings({
          taxVaultPercent: percent > 0 ? percent : undefined,
          taxIncludesSalary: salary ? true : undefined,
        });
      } else {
        await saveSettings({ savingsVaultPercent: percent > 0 ? percent : undefined });
      }
      setEditing(null);
      showToast({ message: percent > 0 ? `${name} set to ${percent}%` : `${name} turned off` });
    } catch (e) {
      console.error('Save vault failed:', e);
      showToast({ message: 'Could not save. Check your connection.' });
    }
  };

  const applyProfile = async (p: Profile) => {
    const before = { taxVaultPercent: settings.taxVaultPercent, savingsVaultPercent: settings.savingsVaultPercent };
    try {
      await saveSettings({
        taxVaultPercent: p.tax > 0 ? p.tax : undefined,
        savingsVaultPercent: p.savings > 0 ? p.savings : undefined,
      });
      showToast({
        message: `${p.label} setup applied`,
        actionLabel: 'Undo',
        onAction: () => saveSettings(before),
      });
    } catch (e) {
      console.error('Apply profile failed:', e);
      showToast({ message: 'Could not apply. Check your connection.' });
    }
  };

  const markMoved = async (vault: VaultKind, amount: number) => {
    const key = monthKey();
    const previous = movedThisMonth(settings, vault);
    try {
      // merge:true deep-merges, so other months and the other vault are kept
      await saveSettings({ vaultMoved: { [key]: { [vault]: amount } } });
      const label = vault === 'tax' ? 'tax' : 'savings';
      showToast(
        amount > 0
          ? {
              message: `${formatINR(amount)} marked as moved to ${label}`,
              actionLabel: 'Undo',
              onAction: () => saveSettings({ vaultMoved: { [key]: { [vault]: previous } } }),
            }
          : { message: 'Marked as not moved' }
      );
    } catch (e) {
      console.error('Mark moved failed:', e);
      showToast({ message: 'Could not update. Check your connection.' });
    }
  };

  const loading = settingsLoading || monthLoading || yearLoading;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Pressable onPress={goBack} style={styles.backButton} hitSlop={10}>
            <Ionicons name="chevron-back" size={22} color={Corpus.text} />
          </Pressable>
          <Text style={styles.heading}>Vaults</Text>
          <Pressable style={styles.helpButton} onPress={() => setShowHelp(!helpOpen)}>
            <Ionicons name={helpOpen ? 'close' : 'help-circle-outline'} size={14} color={Corpus.textMuted} />
            <Text style={styles.helpText}>{helpOpen ? 'Hide guide' : 'How it works'}</Text>
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={Corpus.gold} />
          </View>
        ) : (
          <>
            {helpOpen && (
              <View style={styles.explainer}>
                <Text style={styles.explainerTitle}>Vaults protect money before you spend it</Text>
                {[
                  {
                    title: 'Income arrives',
                    text: 'Say a client pays you ₹10,000.',
                  },
                  {
                    title: 'Corpus splits it instantly',
                    text: `${exTax}% → Tax ${formatINR(example.tax)} · ${exSav}% → Savings ${formatINR(example.savings)}. Salary skips the tax vault (TDS is already deducted).`,
                  },
                  {
                    title: 'You move it, then spend freely',
                    text: `Transfer those amounts to a separate account or SIP and tap "Mark moved". The remaining ${formatINR(10000 - example.tax - example.savings)} is truly yours.`,
                  },
                ].map((s, i) => (
                  <View key={s.title} style={styles.step}>
                    <View style={styles.stepNumber}>
                      <Text style={styles.stepNumberText}>{i + 1}</Text>
                    </View>
                    <View style={styles.stepBody}>
                      <Text style={styles.stepTitle}>{s.title}</Text>
                      <Text style={styles.stepText}>{s.text}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {active ? (
              <IncomeSplitCard totals={month} taxPct={taxPct} savingsPct={savingsPct} />
            ) : (
              <QuickSetup onPick={applyProfile} />
            )}

            <View style={styles.sectionRow}>
              <Text style={styles.sectionLabel}>YOUR VAULTS</Text>
              <Text style={styles.sectionMeta}>Tap to change %</Text>
            </View>
            <View style={styles.list}>
              <VaultCard
                icon="shield-checkmark-outline"
                name="Tax vault"
                color={VAULT_COLORS.tax}
                tint="#2E2712"
                percent={taxPct}
                baseLabel={includeSalary ? 'income' : 'client & business income'}
                baseAmount={month.taxableIncome}
                thisMonth={month.tax}
                thisYear={year.tax}
                moved={movedThisMonth(settings, 'tax')}
                onEdit={() => setEditing('tax')}
                onMarkMoved={(amount) => markMoved('tax', amount)}
              />
              <VaultCard
                icon="leaf-outline"
                name="Savings vault"
                color={VAULT_COLORS.savings}
                tint="#1A2530"
                percent={savingsPct}
                baseLabel="income"
                baseAmount={month.totalIncome}
                thisMonth={month.savings}
                thisYear={year.savings}
                moved={movedThisMonth(settings, 'savings')}
                onEdit={() => setEditing('savings')}
                onMarkMoved={(amount) => markMoved('savings', amount)}
              />
            </View>

            {active && incomes.length > 0 && (
              <>
                <View style={styles.sectionRow}>
                  <Text style={styles.sectionLabel}>HOW EACH INCOME WAS SPLIT</Text>
                  <Text style={styles.sectionMeta}>This month</Text>
                </View>
                <IncomeSplitList incomes={incomes} settings={settings} />
              </>
            )}

            {active && (
              <View style={styles.reminder}>
                <Ionicons name="information-circle-outline" size={18} color={VAULT_COLORS.savings} />
                <Text style={styles.reminderText}>
                  <Text style={styles.reminderStrong}>Corpus plans, your bank holds the money. </Text>
                  Move each vault's amount to a separate account, FD or SIP, then tap "Mark moved" so
                  you always know what's done.
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      <VaultEditorSheet
        kind={editing}
        settings={settings}
        monthTransactions={monthTx}
        onClose={() => setEditing(null)}
        onSave={handleSave}
      />
    </SafeAreaView>
  );
}
