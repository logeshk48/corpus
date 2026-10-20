import { Corpus } from '@/constants/theme';
import type { VaultWithBalance } from '@/types/vault';
import { formatINR } from '@/utils/format';
import { milestoneReached } from '@/utils/jarInsights';
import { jarInsightLine, type InsightContext } from './jarInsightLine';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';
import { styles } from './JarCard.styles';

type JarCardProps = {
  jar: VaultWithBalance;
  context: InsightContext;
  onOpen: () => void;
  onAdd: () => void;
  onTakeOut: () => void;
};

export default function JarCard({ jar, context, onOpen, onAdd, onTakeOut }: JarCardProps) {
  const insight = jarInsightLine(jar, context);
  const milestone = milestoneReached(jar.balance, jar.goal);
  const goalPercent = jar.goal ? Math.min((jar.balance / jar.goal) * 100, 100) : 0;
  const reached = jar.goal !== undefined && jar.balance >= jar.goal;

  let monthText = 'Nothing added this month';
  if (jar.addedThisMonth > 0 && jar.takenThisMonth > 0) {
    monthText = `+${formatINR(jar.addedThisMonth)} added · ${formatINR(jar.takenThisMonth)} taken this month`;
  } else if (jar.addedThisMonth > 0) {
    monthText = `+${formatINR(jar.addedThisMonth)} added this month`;
  } else if (jar.takenThisMonth > 0) {
    monthText = `${formatINR(jar.takenThisMonth)} taken out this month`;
  }

  return (
    <Pressable onPress={onOpen} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.top}>
        <View style={[styles.iconCircle, { backgroundColor: `${jar.color}26` }]}>
          <Ionicons name={jar.icon as any} size={20} color={jar.color} />
        </View>
        <View style={styles.middle}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{jar.name}</Text>
            {milestone > 0 && (
              <View style={[styles.milestone, { borderColor: jar.color }]}>
                <Ionicons name={milestone === 100 ? 'trophy' : 'medal-outline'} size={10} color={jar.color} />
                <Text style={[styles.milestoneText, { color: jar.color }]}>{milestone}%</Text>
              </View>
            )}
          </View>
          <Text style={styles.month}>{monthText}</Text>
        </View>
        <Text style={[styles.balance, { color: jar.color }]}>{formatINR(jar.balance)}</Text>
      </View>

      {jar.goal ? (
        <View style={styles.goalWrap}>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${goalPercent}%`, backgroundColor: jar.color }]} />
          </View>
          <Text style={[styles.goalText, reached && { color: Corpus.income }]}>
            {reached
              ? `🎉 Goal reached · ${formatINR(jar.goal)}`
              : `${Math.round(goalPercent)}% of ${formatINR(jar.goal)} goal · ${formatINR(jar.goal - jar.balance)} to go`}
          </Text>
        </View>
      ) : null}

      {insight && (
        <View style={styles.insight}>
          <Ionicons name={insight.icon as any} size={13} color={insight.color} />
          <Text style={[styles.insightText, { color: insight.color }]}>{insight.text}</Text>
        </View>
      )}

      <View style={styles.actions}>
        <Pressable style={[styles.addButton, { backgroundColor: jar.color }]} onPress={onAdd}>
          <Ionicons name="add" size={16} color="#0F1115" />
          <Text style={styles.addText}>Add money</Text>
        </Pressable>
        <Pressable
          style={[styles.outButton, jar.balance <= 0 && { opacity: 0.4 }]}
          onPress={onTakeOut}
          disabled={jar.balance <= 0}
        >
          <Ionicons name="remove" size={16} color={Corpus.text} />
          <Text style={styles.outText}>Take out</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}
