import { ScreenHeader, SectionLabel } from '@/components/ui';
import { Corpus } from '@/constants/theme';
import { useWealth } from '@/hooks/useWealth';
import type { Pillar, PillarId } from '@/utils/wealthScore';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { styles } from './WealthScreen.styles';

const TONE = { good: Corpus.income, ok: Corpus.gold, weak: Corpus.warning };
const META: Record<PillarId, { icon: keyof typeof Ionicons.glyphMap; go: string; goLabel: string; full: string }> = {
  saving: { icon: 'wallet-outline', go: '/analytics', goLabel: 'See spending', full: '30% of income saved' },
  emergency: { icon: 'shield-checkmark-outline', go: '/accounts', goLabel: 'Update balances', full: '6 months of spending + EMIs in bank, FD or debt funds' },
  debt: { icon: 'trending-down-outline', go: '/ious', goLabel: 'See debts', full: 'EMIs + interest under 10% of income, no big card balance' },
  investing: { icon: 'trending-up-outline', go: '/invest', goLabel: 'Open Invest', full: '20% of income invested monthly, SIPs never skipped, a mix of equity and debt' },
  wealth: { icon: 'diamond-outline', go: '/networth', goLabel: 'See net worth', full: 'Net worth = 10 years of spending' },
};
const barColor = (p: Pillar) => (p.score >= 14 ? Corpus.income : p.score >= 8 ? Corpus.gold : Corpus.warning);

export default function WealthScreen() {
  const router = useRouter();
  const { score: s, loading } = useWealth();
  const [how, setHow] = useState(false);
  const c = TONE[s.tone];
  const unknown = s.pillars.filter((p) => !p.known);
  const ordered = [...s.pillars].sort((a, b) => Number(b.known) - Number(a.known) || a.score - b.score); // weakest first

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenHeader title="Wealth score" onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
        {loading ? (
          <ActivityIndicator color={Corpus.gold} style={{ paddingVertical: 60 }} />
        ) : (
          <>
            <View style={styles.hero}>
              <View style={[styles.ring, { borderColor: c }]}>
                <Text style={[styles.ringNum, { color: c }]}>{s.score}</Text>
                <Text style={styles.ringOf}>out of 100</Text>
              </View>
              <Text style={[styles.grade, { color: c }]}>{s.grade}</Text>
              <Text style={styles.sub}>
                {s.score >= 80
                  ? 'Your money is working hard. Keep the habits that got you here.'
                  : s.score >= 65
                    ? 'Solid foundations. A couple of fixes would make you very secure.'
                    : s.score >= 50
                      ? 'You’re building. Fix the weakest part first — it moves the score most.'
                      : 'Some basics need attention. Start with the one fix below.'}
                {unknown.length ? ` Based on ${s.known} of 5 parts.` : ''}
              </Text>
            </View>

            {s.topFix && (
              <Pressable style={styles.fixCard} onPress={() => router.push(META[s.topFix!.id].go as Href)}>
                <Text style={styles.fixLabel}>BIGGEST FIX FIRST · +{Math.round((s.topFix.gain / (s.known * 20)) * 100)} POINTS</Text>
                <Text style={styles.fixText}>{s.topFix.fix}</Text>
                <Text style={styles.why}>
                  {s.topFix.label}: {s.topFix.value}. {META[s.topFix.id].goLabel} →
                </Text>
              </Pressable>
            )}

            <SectionLabel right="Weakest first">THE 5 PARTS</SectionLabel>
            {ordered.map((p) => (
              <Pressable key={p.id} style={styles.card} onPress={() => router.push(META[p.id].go as Href)}>
                <View style={styles.row}>
                  <View style={styles.icon}>
                    <Ionicons name={META[p.id].icon} size={17} color={p.known ? barColor(p) : Corpus.textFaint} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{p.label}</Text>
                    <Text style={styles.value}>{p.value}</Text>
                  </View>
                  <Text style={[styles.pts, { color: p.known ? barColor(p) : Corpus.textFaint }]}>{p.known ? `${Math.round(p.score)}/20` : '—'}</Text>
                </View>
                {p.known && (
                  <View style={styles.barBg}>
                    <View style={[styles.barFill, { width: `${(p.score / 20) * 100}%`, backgroundColor: barColor(p) }]} />
                  </View>
                )}
                <Text style={styles.why}>{p.why}</Text>
                {p.fix && <Text style={styles.fix}>→ {p.fix}</Text>}
                {!p.fix && p.known && <Text style={[styles.fix, { color: Corpus.income }]}>✓ Full marks</Text>}
              </Pressable>
            ))}

            <Pressable onPress={() => setHow(!how)}>
              <SectionLabel right={how ? 'Hide' : 'Show'}>HOW IT’S CALCULATED</SectionLabel>
            </Pressable>
            {how && (
              <View style={styles.card}>
                <Text style={styles.why}>Five parts, 20 points each. Full marks for:</Text>
                {s.pillars.map((p) => (
                  <Text key={p.id} style={styles.why}>
                    • <Text style={{ color: Corpus.text }}>{p.label}</Text>: {META[p.id].full}
                  </Text>
                ))}
                <Text style={styles.note}>
                  Uses your last 3 complete months of income and spending, your balances, debts and investments. SIPs and money moved to jars count as saved, not spent. Stocks don’t count as emergency money (they can be down 30% when you need them). Parts without enough data are left out and the score is scaled to 100. A guide, not financial advice.
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
