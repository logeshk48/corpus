import { Button } from '@/components/ui';
import { Corpus } from '@/constants/theme';
import { styles as sheet } from '@/screens/budgets/components/BudgetEditorSheet.styles';
import { styles as f } from '@/screens/ious/components/IouSheet.styles';
import type { Investment } from '@/types/investment';
import type { InvestGoal } from '@/types/settings';
import { compactINR } from '@/utils/format';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

const ICONS = ['🏠', '🎓', '🚗', '💍', '🏖️', '👴', '🛡️', '🎯'];
const IDEAS = [
  { name: 'Emergency fund', icon: '🛡️', years: 1 },
  { name: 'House down payment', icon: '🏠', years: 5 },
  { name: 'Child’s education', icon: '🎓', years: 15 },
  { name: 'Retirement', icon: '👴', years: 25 },
  { name: 'Car', icon: '🚗', years: 3 },
];

export default function GoalSheet({ goal, list, onSave, onDelete, onClose }: {
  goal?: InvestGoal; list: Investment[];
  onSave: (g: InvestGoal, linkIds: string[]) => Promise<void>; onDelete?: () => Promise<void>; onClose: () => void;
}) {
  const yearNow = new Date().getFullYear();
  const [name, setName] = useState(goal?.name ?? '');
  const [icon, setIcon] = useState(goal?.icon ?? '🎯');
  const [target, setTarget] = useState(goal ? String(goal.target) : '');
  const [year, setYear] = useState(goal ? String(new Date(goal.by).getFullYear()) : String(yearNow + 5));
  const [links, setLinks] = useState<string[]>(goal ? list.filter((h) => h.goalId === goal.id).map((h) => h.id) : []);
  const [busy, setBusy] = useState(false);
  const ok = name.trim() && Number(target) > 0 && Number(year) >= yearNow;
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={sheet.overlay}>
        <Pressable style={sheet.backdrop} onPress={onClose} />
        <View style={sheet.sheet}>
          <View style={sheet.handle} />
          <View style={sheet.header}>
            <View style={[sheet.iconCircle, { backgroundColor: Corpus.goldTint }]}>
              <Ionicons name="flag-outline" size={18} color={Corpus.gold} />
            </View>
            <View style={sheet.titleBlock}>
              <Text style={sheet.title}>{goal ? 'Edit goal' : 'New goal'}</Text>
              <Text style={sheet.subtitle}>What is this money for?</Text>
            </View>
            <Pressable style={sheet.closeButton} onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={18} color={Corpus.textMuted} />
            </Pressable>
          </View>
          <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={f.body} keyboardShouldPersistTaps="handled">
            {!goal && (
              <View style={sheet.chips}>
                {IDEAS.map((i) => (
                  <Pressable key={i.name} style={sheet.chip} onPress={() => (setName(i.name), setIcon(i.icon), setYear(String(yearNow + i.years)))}>
                    <Text style={sheet.chipText}>{i.icon} {i.name}</Text>
                  </Pressable>
                ))}
              </View>
            )}
            <View style={f.field}>
              <Text style={f.label}>NAME</Text>
              <TextInput style={f.input} value={name} onChangeText={setName} placeholder="e.g. House down payment" placeholderTextColor={Corpus.textFaint} maxLength={40} />
            </View>
            <View style={sheet.chips}>
              {ICONS.map((i) => (
                <Pressable key={i} style={[sheet.chip, icon === i && sheet.chipSuggested]} onPress={() => setIcon(i)}>
                  <Text style={sheet.chipText}>{i}</Text>
                </Pressable>
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={[f.field, { flex: 1 }]}>
                <Text style={f.label}>AMOUNT NEEDED</Text>
                <TextInput style={f.input} value={target} onChangeText={(t) => setTarget(t.replace(/\D/g, ''))} placeholder="₹" placeholderTextColor={Corpus.textFaint} keyboardType="number-pad" />
                {Number(target) > 0 && <Text style={sheet.hint}>{compactINR(Number(target))}</Text>}
              </View>
              <View style={[f.field, { flex: 1 }]}>
                <Text style={f.label}>BY (YEAR)</Text>
                <TextInput style={f.input} value={year} onChangeText={(t) => setYear(t.replace(/\D/g, '').slice(0, 4))} keyboardType="number-pad" />
              </View>
            </View>
            <Text style={sheet.hint}>Tip: for far-off goals, add inflation — something costing ₹10 L today costs about ₹18 L in 10 years at 6%.</Text>
            {list.length > 0 && (
              <View style={{ gap: 6 }}>
                <Text style={f.label}>MONEY FOR THIS GOAL</Text>
                <View style={sheet.chips}>
                  {list.map((h) => {
                    const on = links.includes(h.id);
                    const elsewhere = h.goalId && h.goalId !== goal?.id;
                    return (
                      <Pressable key={h.id} style={[sheet.chip, on && sheet.chipSuggested]} onPress={() => setLinks(on ? links.filter((x) => x !== h.id) : [...links, h.id])}>
                        <Text style={[sheet.chipText, on && sheet.chipTextSuggested]}>{h.name} · {compactINR(h.value)}{elsewhere && !on ? ' (other goal)' : ''}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}
            <Button
              label={goal ? 'Save goal' : 'Create goal'}
              loading={busy}
              disabled={!ok}
              onPress={async () => {
                setBusy(true);
                try {
                  await onSave({ id: goal?.id ?? `g${Date.now().toString(36)}`, name: name.trim(), icon, target: Number(target), by: new Date(Number(year), 2, 31).toISOString() }, links);
                } finally {
                  setBusy(false);
                }
              }}
            />
            {goal && onDelete && <Button variant="danger" icon="trash-outline" label="Delete goal" onPress={onDelete} />}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
