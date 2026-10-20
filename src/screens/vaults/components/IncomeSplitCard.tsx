import { Corpus } from '@/constants/theme';
import { formatINR } from '@/utils/format';
import type { VaultTotals } from '@/utils/vaults';
import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { styles } from './IncomeSplitCard.styles';

export const VAULT_COLORS = {
  tax: Corpus.gold,
  savings: '#7FB7E0',
  yours: Corpus.income,
};

type IncomeSplitCardProps = {
  totals: VaultTotals;
  taxPct: number;
  savingsPct: number;
};

export default function IncomeSplitCard({ totals, taxPct, savingsPct }: IncomeSplitCardProps) {
  if (totals.totalIncome === 0) {
    return (
      <View style={styles.card}>
        <Text style={styles.label}>THIS MONTH'S INCOME</Text>
        <View style={styles.empty}>
          <Ionicons name="arrow-down-circle-outline" size={30} color={Corpus.textFaint} />
          <Text style={styles.emptyText}>
            No income yet this month. When income arrives, you'll see exactly how it splits between
            tax, savings and you.
          </Text>
        </View>
      </View>
    );
  }

  const share = (n: number) => (n / totals.totalIncome) * 100;
  const yoursPct = Math.round(share(totals.spendableIncome));

  const tiles = [
    { key: 'tax', label: 'Tax', icon: 'shield-checkmark', amount: totals.tax, sub: `${taxPct}% of taxable`, color: VAULT_COLORS.tax, bg: '#2E2712' },
    { key: 'savings', label: 'Savings', icon: 'leaf', amount: totals.savings, sub: `${savingsPct}% of all`, color: VAULT_COLORS.savings, bg: '#1A2530' },
    { key: 'yours', label: 'Yours', icon: 'wallet', amount: totals.spendableIncome, sub: `${yoursPct}% to use`, color: VAULT_COLORS.yours, bg: '#1D2A22' },
  ] as const;

  return (
    <View style={styles.card}>
      <Text style={styles.label}>THIS MONTH'S INCOME</Text>
      <Text style={styles.income}>{formatINR(totals.totalIncome)}</Text>
      <View style={styles.arrowRow}>
        <Ionicons name="git-network-outline" size={12} color={Corpus.textFaint} />
        <Text style={styles.arrowText}>splits automatically into</Text>
      </View>

      <View style={styles.tiles}>
        {tiles.map((t) => (
          <View key={t.key} style={[styles.tile, { borderColor: t.amount > 0 ? t.color : Corpus.border }]}>
            <View style={[styles.tileIcon, { backgroundColor: t.bg }]}>
              <Ionicons name={t.icon} size={15} color={t.color} />
            </View>
            <Text style={styles.tileLabel}>{t.label}</Text>
            <Text style={[styles.tileAmount, { color: t.color }]}>{formatINR(t.amount)}</Text>
            <Text style={styles.tileSub}>{t.sub}</Text>
          </View>
        ))}
      </View>

      <View style={styles.bar}>
        <View style={{ width: `${share(totals.tax)}%`, backgroundColor: VAULT_COLORS.tax }} />
        <View style={{ width: `${share(totals.savings)}%`, backgroundColor: VAULT_COLORS.savings }} />
        <View style={{ flex: 1, backgroundColor: VAULT_COLORS.yours }} />
      </View>
    </View>
  );
}
