import { Corpus, Radius, Space, Type } from '@/constants/theme';
import type { dataHealth } from '@/utils/dataHealth';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

// "Can you trust these numbers?" — shown on reports
export default function DataHealthCard({ h }: { h: ReturnType<typeof dataHealth> }) {
  const router = useRouter();
  const [open, setOpen] = useState(h.score < 80);
  const c = h.score >= 80 ? Corpus.income : h.score >= 55 ? Corpus.gold : Corpus.warning;
  const todo = h.checks.filter((x) => !x.ok);
  return (
    <View style={st.card}>
      <Pressable style={st.head} onPress={() => setOpen(!open)}>
        <View style={[st.ring, { borderColor: c }]}>
          <Text style={[st.num, { color: c }]}>{h.score}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={st.title}>
            Data health · <Text style={{ color: c }}>{h.label}</Text>
          </Text>
          <Text style={st.sub}>{todo.length ? `${todo.length} thing${todo.length > 1 ? 's' : ''} would make these numbers more accurate` : 'These numbers reflect your real money'}</Text>
        </View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={Corpus.textFaint} />
      </Pressable>
      {open &&
        h.checks.map((x) => (
          <Pressable key={x.id} style={st.row} onPress={() => !x.ok && router.push(x.href as Href)} disabled={x.ok}>
            <Ionicons name={x.ok ? 'checkmark-circle' : 'alert-circle'} size={17} color={x.ok ? Corpus.income : Corpus.warning} />
            <View style={{ flex: 1, gap: 1 }}>
              <Text style={st.rowTitle}>{x.title}</Text>
              {!x.ok && <Text style={st.sub}>{x.detail}</Text>}
            </View>
            {!x.ok && <Ionicons name="chevron-forward" size={15} color={Corpus.textFaint} />}
          </Pressable>
        ))}
    </View>
  );
}

const st = StyleSheet.create({
  card: { backgroundColor: Corpus.card, borderRadius: Radius.lg, borderWidth: 0.5, borderColor: Corpus.border, padding: Space.md, gap: 10 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  ring: { width: 42, height: 42, borderRadius: 21, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  num: { fontSize: Type.body, fontWeight: '700' },
  title: { fontSize: Type.label, fontWeight: '600', color: Corpus.text },
  sub: { fontSize: Type.small, color: Corpus.textMuted, lineHeight: 17 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  rowTitle: { fontSize: Type.body, color: Corpus.text, fontWeight: '500' },
});
