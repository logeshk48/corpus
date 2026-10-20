import FilterChips, { ChipOption } from '@/components/FilterChips';
import { Corpus } from '@/constants/theme';
import { useIncomeStreams } from '@/hooks/useIncomeStreams';
import type { IncomeStream } from '@/types/incomeStream';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { styles } from './StreamPicker.styles';

export const NO_STREAM = 'none';

type StreamPickerProps = {
  value: string; // a stream id, or NO_STREAM
  onChange: (id: string, stream?: IncomeStream) => void;
};

// "FROM" chips for income: None · Salary · Zenith Studio · ...
export default function StreamPicker({ value, onChange }: StreamPickerProps) {
  const router = useRouter();
  const { streams, loading } = useIncomeStreams();

  if (loading) return null;

  if (streams.length === 0) {
    return (
      <View style={styles.empty}>
        <Ionicons name="git-branch-outline" size={16} color={Corpus.textMuted} />
        <Text style={styles.emptyText}>Track where income comes from</Text>
        <Pressable onPress={() => router.push({ pathname: '/income/[id]', params: { id: 'new' } })}>
          <Text style={styles.emptyLink}>Add a stream</Text>
        </Pressable>
      </View>
    );
  }

  const options: ChipOption<string>[] = [
    { id: NO_STREAM, label: 'None' },
    ...streams.map((s) => ({ id: s.id, label: s.name })),
  ];

  return (
    <FilterChips
      options={options}
      value={value}
      onChange={(id) => onChange(id, streams.find((s) => s.id === id))}
    />
  );
}
