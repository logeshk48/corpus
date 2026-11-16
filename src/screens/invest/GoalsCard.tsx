import { Button } from '@/components/ui';
import { Corpus } from '@/constants/theme';
import type { Investment } from '@/types/investment';
import { savedOf, type VaultWithBalance } from '@/types/vault';
import { compactINR } from '@/utils/format';
import { investForecast } from '@/utils/jarFunds';
import { Pressable, Text, View } from 'react-native';
import { styles } from './InvestScreen.styles';
import { m } from './Market.styles';

// Goals live in Jars (one goal = one jar: cash + linked investments). Here: the jars your investments save for.
export default function GoalsCard({ jars, list, onOpenJar, onOpenJars }: {
  jars: VaultWithBalance[]; list: Investment[]; onOpenJar: (id: string) => void; onOpenJars: () => void;
}) {
  const withHoldings = jars.filter((j) => (j.invested ?? 0) > 0);
  return (
    <View style={styles.card}>
      <View style={m.statusRow}>
        <Text style={styles.name}>Goals</Text>
        <Button size="sm" variant="ghost" icon="flag-outline" label="Jars" onPress={onOpenJars} />
      </View>
      {withHoldings.length === 0 && (
        <Text style={m.small}>Each goal is a jar. Open a jar (house, child’s education, retiring early) and link the funds saving for it to see if you’ll get there.</Text>
      )}
      {withHoldings.map((j) => {
        const f = investForecast(j, list);
        const saved = savedOf(j);
        return (
          <Pressable key={j.id} style={[m.position, { gap: 6 }]} onPress={() => onOpenJar(j.id)} accessibilityRole="button">
            <View style={m.posRow}>
              <Text style={m.rowName}>{j.name}</Text>
              <Text style={m.small}>{compactINR(saved)}{j.goal ? ` of ${compactINR(j.goal)}` : ''}</Text>
            </View>
            {j.goal ? (
              <View style={{ height: 6, borderRadius: 3, backgroundColor: Corpus.cardAlt, overflow: 'hidden' }}>
                <View style={{ height: 6, width: `${Math.min(100, (saved / j.goal) * 100)}%`, backgroundColor: j.color }} />
              </View>
            ) : null}
            {f && (
              <Text style={[m.small, { color: f.onTrack ? Corpus.income : Corpus.warning }]}>
                {f.onTrack ? `On track: about ${compactINR(f.projected)} by then` : `Short: SIPs of ${compactINR(f.need)} a month in total get you there`}
              </Text>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}
