import { Corpus } from '@/constants/theme';
import { savedOf, type VaultWithBalance } from '@/types/vault';
import { compactINR, formatINR } from '@/utils/format';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';
import { jarInsightLine, type InsightContext } from './jarInsightLine';
import JarFill from './JarFill';
import { styles } from './JarCard.styles';

type Props = { jar: VaultWithBalance; context: InsightContext; onOpen: () => void; onAdd: () => void; onTakeOut?: () => void };

// One jar as a row: the measuring jar, how full it is, and a quick + to add money
export default function JarCard({ jar, context, onOpen, onAdd }: Props) {
  const insight = jarInsightLine(jar, context);
  const saved = savedOf(jar);
  const pct = jar.goal ? Math.min(100, Math.round((saved / jar.goal) * 100)) : null;
  const reached = jar.goal !== undefined && saved >= jar.goal;
  const line = jar.goal
    ? reached ? `Goal of ${formatINR(jar.goal)} reached` : `${pct}% of ${compactINR(jar.goal)}, ${compactINR(jar.goal - saved)} to go`
    : jar.addedThisMonth > 0 ? `${formatINR(jar.addedThisMonth)} added this month` : 'No goal';
  return (
    <View style={styles.wrap}>
    <Pressable onPress={onOpen} style={({ pressed }) => [styles.row, pressed && { backgroundColor: Corpus.cardAlt }]} accessibilityRole="button" accessibilityLabel={`${jar.name}, ${formatINR(saved)} saved. ${line}`}>
      <JarFill level={jar.goal ? saved / jar.goal : saved > 0 ? 0.6 : 0} color={jar.color} marks={!!jar.goal} />
      <View style={styles.body}>
        <View style={styles.top}>
          <Text style={styles.name} numberOfLines={2}>{jar.name}</Text>
          <Text style={styles.balance}>{formatINR(saved)}</Text>
        </View>
        <Text style={[styles.line, reached && { color: Corpus.income }]} numberOfLines={2}>{line}</Text>
        {!!jar.invested && (
          <View style={styles.insight}>
            <Ionicons name="trending-up" size={12} color={Corpus.textMuted} />
            <Text style={[styles.insightText, { color: Corpus.textMuted }]}>{jar.balance > 0 ? `${compactINR(jar.balance)} cash, ` : ''}{compactINR(jar.invested ?? 0)} invested</Text>
          </View>
        )}
        {insight && (
          <View style={styles.insight}>
            <Ionicons name={insight.icon as any} size={12} color={insight.color} />
            <Text style={[styles.insightText, { color: insight.color }]} numberOfLines={2}>{insight.text}</Text>
          </View>
        )}
      </View>
    </Pressable>
      <Pressable onPress={onAdd} hitSlop={6} style={({ pressed }) => [styles.add, { backgroundColor: jar.color }, pressed && { opacity: 0.8 }]} accessibilityRole="button" accessibilityLabel={`Add money to ${jar.name}`}>
        <Ionicons name="add" size={20} color="black" />
      </Pressable>
    </View>
  );
}
