import { Corpus, Radius, Type } from '@/constants/theme';
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
    borderRadius: Radius.md,
    borderWidth: 0.5,
    borderColor: Corpus.border,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 2,
  },
  label: { fontSize: Type.caption, color: Corpus.textMuted },
  value: { fontSize: Type.h3, fontWeight: '600', color: Corpus.text },
  delta: { fontSize: Type.caption, color: Corpus.textMuted },
});
