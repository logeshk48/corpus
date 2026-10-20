import { Corpus } from '@/constants/theme';
import { streamTypeMeta, type IncomeStream } from '@/types/incomeStream';
import { formatINR } from '@/utils/format';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';
import { styles } from './StreamCard.styles';

type StreamCardProps = {
  stream: IncomeStream;
  receivedThisMonth: number;
  onPress?: () => void;
};

export default function StreamCard({ stream, receivedThisMonth, onPress }: StreamCardProps) {
  const meta = streamTypeMeta(stream.type);
  const expected = stream.expectedMonthly;
  const percent = expected ? Math.min((receivedThisMonth / expected) * 100, 100) : 0;

  let progressText = 'No monthly expectation set';
  if (expected) {
    progressText =
      receivedThisMonth >= expected
        ? `Fully received · ${formatINR(expected)} expected`
        : `${formatINR(expected - receivedThisMonth)} still expected of ${formatINR(expected)}`;
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.top}>
        <View style={styles.iconCircle}>
          <Ionicons name={meta.icon as any} size={17} color={Corpus.income} />
        </View>
        <View style={styles.middle}>
          <Text style={styles.name}>{stream.name}</Text>
          <Text style={styles.type}>{meta.label}</Text>
        </View>
        <Text style={styles.received}>{formatINR(receivedThisMonth)}</Text>
      </View>

      {expected ? (
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${percent}%` }]} />
        </View>
      ) : null}
      <Text style={styles.progressText}>{progressText}</Text>
    </Pressable>
  );
}
