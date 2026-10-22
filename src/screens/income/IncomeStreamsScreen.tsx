import { Button, ScreenHeader } from '@/components/ui';
import { Corpus } from '@/constants/theme';
import { useIncomeStreams } from '@/hooks/useIncomeStreams';
import { useTransactions } from '@/hooks/useTransactions';
import { formatINR } from '@/utils/format';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import StreamCard from './components/StreamCard';
import { styles } from './IncomeStreamsScreen.styles';

export default function IncomeStreamsScreen() {
  const router = useRouter();
  const { streams, loading: streamsLoading } = useIncomeStreams();
  const { transactions, loading: txLoading } = useTransactions('month');
  const loading = streamsLoading || txLoading;

  // Income received this month, grouped by stream
  const incomeThisMonth = transactions.filter((t) => t.type === 'income');
  const receivedByStream = new Map<string, number>();
  for (const t of incomeThisMonth) {
    if (t.streamId) {
      receivedByStream.set(t.streamId, (receivedByStream.get(t.streamId) ?? 0) + t.amount);
    }
  }
  const streamIds = new Set(streams.map((s) => s.id));
  const unlinkedTotal = incomeThisMonth
    .filter((t) => !t.streamId || !streamIds.has(t.streamId))
    .reduce((sum, t) => sum + t.amount, 0);

  const totalReceived = incomeThisMonth.reduce((sum, t) => sum + t.amount, 0);
  const totalExpected = streams.reduce((sum, s) => sum + (s.expectedMonthly ?? 0), 0);

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const openStream = (id: string) => router.push({ pathname: '/income/[id]', params: { id } });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenHeader title="Income streams" right={streams.length > 0 ? <Button size="sm" icon="add" label="Add" onPress={() => openStream('new')} /> : undefined} onBack={goBack} />

        {loading ? (
          <View style={styles.empty}>
            <ActivityIndicator color={Corpus.gold} />
          </View>
        ) : streams.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="git-branch-outline" size={34} color={Corpus.textFaint} />
            <Text style={styles.emptyTitle}>No income streams yet</Text>
            <Text style={styles.emptyText}>
              Add where your money comes from — your salary, each client, your business.
            </Text>
            <Pressable style={styles.emptyButton} onPress={() => openStream('new')}>
              <Text style={styles.emptyButtonText}>Add your first stream</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.summary}>
              <Text style={styles.summaryLabel}>Received this month</Text>
              <Text style={styles.summaryAmount}>{formatINR(totalReceived)}</Text>
              <Text style={styles.summarySub}>
                {totalExpected > 0
                  ? `of ${formatINR(totalExpected)} expected across ${streams.length} stream${streams.length === 1 ? '' : 's'}`
                  : `across ${streams.length} stream${streams.length === 1 ? '' : 's'}`}
              </Text>
            </View>

            <View style={styles.list}>
              {streams.map((s) => (
                <StreamCard
                  key={s.id}
                  stream={s}
                  receivedThisMonth={receivedByStream.get(s.id) ?? 0}
                  onPress={() => openStream(s.id)}
                />
              ))}
            </View>

            {unlinkedTotal > 0 && (
              <View style={styles.unlinked}>
                <Text style={styles.unlinkedText}>Income not linked to a stream</Text>
                <Text style={styles.unlinkedText}>{formatINR(unlinkedTotal)}</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
