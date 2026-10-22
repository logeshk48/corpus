import { Corpus } from '@/constants/theme';
import { StyleSheet, Text, View } from 'react-native';

type Props = {
  label: string;
  value: string;
  delta?: string | null; // e.g. "▲ 12% vs Sep"
};

export default function StatTile({ label, value, delta }: Props) {
  return (
    <View style={styles.tile}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
      {delta ? <Text style={styles.delta}>{delta}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flexBasis: '47%',
    flexGrow: 1,
    backgroundColor: Corpus.card,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: Corpus.border,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 2,
  },
  label: { fontSize: 11, color: Corpus.textMuted },
  value: { fontSize: 18, fontWeight: '600', color: Corpus.text },
  delta: { fontSize: 11, color: Corpus.textMuted },
});
