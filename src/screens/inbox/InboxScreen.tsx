import { ScreenHeader, SectionLabel } from '@/components/ui';
import { Corpus, Radius, Space, Type } from '@/constants/theme';
import { useInbox } from '@/hooks/useInbox';
import type { InboxGroup, InboxItem, InboxKind } from '@/utils/inbox';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const KIND: Record<InboxKind, { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  people: { icon: 'people-outline', color: Corpus.gold },
  card: { icon: 'card-outline', color: Corpus.danger },
  bill: { icon: 'receipt-outline', color: Corpus.warning },
  sip: { icon: 'repeat-outline', color: Corpus.income },
  debt: { icon: 'flag-outline', color: Corpus.danger },
  budget: { icon: 'pie-chart-outline', color: Corpus.warning },
  checkin: { icon: 'refresh-outline', color: Corpus.textMuted },
};
const GROUP: Record<InboxGroup, string> = { overdue: 'OVERDUE', today: 'TODAY', week: 'THIS WEEK', later: 'LATER THIS MONTH' };

export default function InboxScreen() {
  const router = useRouter();
  const { items } = useInbox();
  const groups = (['overdue', 'today', 'week', 'later'] as InboxGroup[]).map((g) => ({ g, list: items.filter((i) => i.group === g) })).filter((x) => x.list.length);

  return (
    <SafeAreaView style={st.safe} edges={['top']}>
      <ScrollView contentContainerStyle={st.content} showsVerticalScrollIndicator={false}>
        <ScreenHeader title="Reminders" onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
        {items.length === 0 ? (
          <View style={st.empty}>
            <Ionicons name="checkmark-done-circle-outline" size={44} color={Corpus.income} />
            <Text style={st.emptyTitle}>All clear</Text>
            <Text style={st.meta}>No bills, dues, SIPs or money with people in the next 30 days.</Text>
          </View>
        ) : (
          groups.map(({ g, list }) => (
            <View key={g} style={{ gap: Space.sm }}>
              <SectionLabel right={`${list.length}`}>{GROUP[g]}</SectionLabel>
              {list.map((i: InboxItem) => (
                <Pressable key={i.id} style={[st.row, g === 'overdue' && { borderColor: Corpus.dangerLine }]} onPress={() => router.push(i.href as Href)}>
                  <View style={st.icon}>
                    <Ionicons name={KIND[i.kind].icon} size={17} color={g === 'overdue' ? Corpus.danger : KIND[i.kind].color} />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={st.title}>{i.title}</Text>
                    <Text style={[st.meta, g === 'overdue' && { color: Corpus.danger }]}>{i.body}</Text>
                  </View>
                  {g !== 'today' && g !== 'overdue' && (
                    <Text style={st.when}>{i.when.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</Text>
                  )}
                  <Ionicons name="chevron-forward" size={15} color={Corpus.textFaint} />
                </Pressable>
              ))}
            </View>
          ))
        )}
        <Text style={st.note}>On your phone these also come as notifications (Settings → Notifications). On the web, this is where you see them.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Corpus.bg },
  content: { padding: Space.lg, paddingBottom: 120, gap: Space.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Corpus.card, borderRadius: Radius.lg, borderWidth: 0.5, borderColor: Corpus.border, padding: Space.md },
  icon: { width: 34, height: 34, borderRadius: 17, backgroundColor: Corpus.cardAlt, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: Type.bodyLg, fontWeight: '600', color: Corpus.text },
  meta: { fontSize: Type.small, color: Corpus.textMuted, lineHeight: 17 },
  when: { fontSize: Type.caption, color: Corpus.textFaint },
  empty: { alignItems: 'center', gap: Space.sm, paddingVertical: 50 },
  emptyTitle: { fontSize: Type.title, fontWeight: '600', color: Corpus.text },
  note: { fontSize: Type.small, color: Corpus.textFaint, lineHeight: 17, marginTop: Space.sm },
});
