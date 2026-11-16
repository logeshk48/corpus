import { Button, Field, Sheet } from '@/components/ui';
import { askWeb } from '@/services/confirm';
import { Font, Type } from '@/constants/theme';
import { Corpus } from '@/constants/theme';
import { styles as sheet } from '@/screens/budgets/components/BudgetEditorSheet.styles';
import { VAULT_COLORS, VAULT_ICONS, type NewVault, type VaultWithBalance } from '@/types/vault';
import { formatINR } from '@/utils/format';
import { formatYearMonth, jarKind, parseYearMonth, toYearMonth } from '@/utils/jarInsights';
import type { InsightContext } from './jarInsightLine';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { styles } from './JarSheet.styles';

// One-tap ideas for a new jar (name → icon + colour)
const TEMPLATES = [
  { name: 'Tax', icon: 'shield-checkmark', color: '#C9A227' },
  { name: 'Emergency fund', icon: 'medkit', color: '#4CAF7D' },
  { name: 'Trip', icon: 'airplane', color: '#A78BDB' },
  { name: 'New phone', icon: 'phone-portrait', color: '#7FB7E0' },
  { name: 'Wedding', icon: 'heart', color: '#D97BA6' },
  { name: 'Education', icon: 'school', color: '#E08A6B' },
  { name: 'Home', icon: 'home', color: '#4CAF7D' },
  { name: 'Vehicle', icon: 'car', color: '#7FB7E0' },
];

export type JarSheetMode = { kind: 'new' } | { kind: 'edit'; jar: VaultWithBalance } | null;

type JarSheetProps = {
  mode: JarSheetMode;
  context?: InsightContext;
  onClose: () => void;
  onSave: (vault: NewVault) => Promise<void>;
  onDelete: (jar: VaultWithBalance) => Promise<void>;
};

function confirmDelete(jar: VaultWithBalance, onConfirm: () => void) {
  const message =
    jar.balance > 0
      ? `Delete "${jar.name}" and its history? Corpus will stop tracking the ${formatINR(jar.balance)} in it (your real money is not affected).`
      : `Delete "${jar.name}" and its history?`;
  if (Platform.OS === 'web') {
    askWeb(`Delete jar?\n\n${message}`, 'Delete').then((y) => { if (y) onConfirm(); });
  } else {
    Alert.alert('Delete jar', message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: onConfirm },
    ]);
  }
}

export default function JarSheet({ mode, context, onClose, onSave, onDelete }: JarSheetProps) {
  const [name, setName] = useState('');
  const [goal, setGoal] = useState('');
  const [color, setColor] = useState(VAULT_COLORS[0]);
  const [icon, setIcon] = useState(VAULT_ICONS[0]);
  const [targetDate, setTargetDate] = useState<string | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!mode) return;
    if (mode.kind === 'edit') {
      setName(mode.jar.name);
      setGoal(mode.jar.goal ? String(mode.jar.goal) : '');
      setColor(mode.jar.color);
      setIcon(mode.jar.icon);
      setTargetDate(mode.jar.targetDate);
    } else {
      setName('');
      setGoal('');
      setColor(VAULT_COLORS[3]);
      setIcon('airplane');
      setTargetDate(undefined);
    }
  }, [mode]);

  if (!mode) return null;
  const editing = mode.kind === 'edit';

  const goalValue = goal.trim() === '' ? undefined : Number(goal);
  const goalInvalid = goalValue !== undefined && (!Number.isFinite(goalValue) || goalValue <= 0);
  const canSave = name.trim().length > 0 && !goalInvalid && !busy;

  // Target month helpers
  const now = new Date();
  const thisMonth = toYearMonth(now);
  const shiftMonth = (ym: string, by: number) => {
    const d = parseYearMonth(ym);
    return toYearMonth(new Date(d.getFullYear(), d.getMonth() + by, 1));
  };
  const balance = editing ? mode.jar.balance : 0;
  const monthsLeft = targetDate
    ? (parseYearMonth(targetDate).getFullYear() - now.getFullYear()) * 12 +
      parseYearMonth(targetDate).getMonth() - now.getMonth() + 1
    : 0;
  const perMonth =
    goalValue && targetDate && monthsLeft > 0 ? Math.ceil(Math.max(goalValue - balance, 0) / monthsLeft) : 0;

  // Smart features follow the jar's kind. New jars: infer it from the name,
  // so "Emergency fund" or "Tax" created by hand still get their insights.
  const kind = editing ? jarKind(mode.jar) : jarKind({ id: '', name, icon, color });
  const emergencySuggestion =
    kind === 'emergency' && context && context.avgExpenses > 0
      ? Math.ceil((context.avgExpenses * context.recommendedMonths) / 1000) * 1000
      : null;

  const save = async () => {
    if (!canSave) return;
    setBusy(true);
    try {
      await onSave({
        name: name.trim(),
        icon,
        color,
        goal: goalValue,
        targetDate: goalValue ? targetDate : undefined,
        kind,
      });
    } finally {
      setBusy(false);
    }
  };

  const pill = (key: string, label: string, on: boolean, onPress: () => void, iconName?: string, iconColor?: string) => (
    <Pressable key={key} style={({ pressed }) => [x.chip, on && x.chipOn, pressed && { opacity: 0.7 }]} onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: on }}>
      {iconName && <Ionicons name={iconName as any} size={14} color={on ? Corpus.onGold : iconColor ?? Corpus.text} />}
      <Text style={[x.chipText, on && { color: Corpus.onGold }]}>{label}</Text>
    </Pressable>
  );

  return (
    <Sheet
      title={editing ? 'Edit jar' : 'New jar'}
      subtitle={name.trim() || 'Money set aside for one thing'}
      onClose={onClose}
      footer={
        <>
          <Button label={editing ? 'Save changes' : 'Create jar'} tint={color} tintText="black" onPress={save} loading={busy} disabled={!canSave} />
          {editing && <Button variant="quiet" icon="trash-outline" label="Delete jar" onPress={() => confirmDelete(mode.jar, () => onDelete(mode.jar))} disabled={busy} />}
        </>
      }
    >
      {!editing && (
        <View style={{ gap: 8 }}>
          <Text style={x.label}>Ideas</Text>
          <View style={x.wrap}>
            {TEMPLATES.map((t) => pill(t.name, t.name, name === t.name, () => { setName(t.name); setIcon(t.icon); setColor(t.color); }, t.icon, t.color))}
          </View>
        </View>
      )}

      <Field label="Name" value={name} onChangeText={setName} placeholder="Goa trip, new laptop, wedding" maxLength={30} autoFocus={!editing} autoCapitalize="sentences" />

      <View style={{ gap: 8 }}>
        <Field
          money
          label="Goal"
          value={goal}
          onChangeText={(t) => setGoal(t.replace(/[^0-9]/g, ''))}
          placeholder="How much should it hold?"
          hint="Optional"
          error={goalInvalid ? 'Goal must be above ₹0, or leave it empty' : undefined}
        />
        {emergencySuggestion && (
          <View style={x.wrap}>
            {pill('sugg', `${formatINR(emergencySuggestion)}: ${context!.recommendedMonths} months of ${formatINR(context!.avgExpenses)}`, false, () => setGoal(String(emergencySuggestion)), 'bulb')}
          </View>
        )}
      </View>

      <View style={{ gap: 8 }}>
        <Text style={x.label}>Reach it by</Text>
        {!goalValue ? (
          <Text style={x.hint}>Set a goal first, then pick a month to get a monthly plan.</Text>
        ) : !targetDate ? (
          <View style={x.wrap}>{pill('pick', 'Pick a month', false, () => setTargetDate(shiftMonth(thisMonth, 5)), 'calendar-outline')}</View>
        ) : (
          <>
            <View style={x.dateRow}>
              <Pressable style={x.dateArrow} onPress={() => setTargetDate(shiftMonth(targetDate, -1))} disabled={targetDate <= thisMonth} accessibilityLabel="Earlier month" accessibilityRole="button">
                <Ionicons name="chevron-back" size={18} color={targetDate <= thisMonth ? Corpus.textFaint : Corpus.text} />
              </Pressable>
              <Text style={x.dateText}>{formatYearMonth(targetDate)}</Text>
              <Pressable style={x.dateArrow} onPress={() => setTargetDate(shiftMonth(targetDate, 1))} accessibilityLabel="Later month" accessibilityRole="button">
                <Ionicons name="chevron-forward" size={18} color={Corpus.text} />
              </Pressable>
              <Pressable onPress={() => setTargetDate(undefined)} hitSlop={8} accessibilityRole="button">
                <Text style={x.clear}>No date</Text>
              </Pressable>
            </View>
            <Text style={x.hint}>
              {perMonth > 0 ? `That’s ${formatINR(perMonth)} a month for ${monthsLeft} month${monthsLeft === 1 ? '' : 's'}` : 'Goal already reached'}
            </Text>
          </>
        )}
      </View>

      <View style={{ gap: 8 }}>
        <Text style={x.label}>Colour</Text>
        <View style={x.wrap}>
          {VAULT_COLORS.map((c) => (
            <Pressable key={c} style={[x.dot, { backgroundColor: c }, c === color && x.dotOn]} onPress={() => setColor(c)} accessibilityRole="radio" accessibilityState={{ selected: c === color }} accessibilityLabel={`Colour ${VAULT_COLORS.indexOf(c) + 1}`}>
              {c === color && <Ionicons name="checkmark" size={16} color="black" />}
            </Pressable>
          ))}
        </View>
      </View>

      <View style={{ gap: 8 }}>
        <Text style={x.label}>Icon</Text>
        <View style={x.wrap}>
          {VAULT_ICONS.map((i) => (
            <Pressable key={i} style={[x.icon, i === icon && { backgroundColor: color }]} onPress={() => setIcon(i)} accessibilityRole="radio" accessibilityState={{ selected: i === icon }} accessibilityLabel={i.replace(/-/g, ' ')}>
              <Ionicons name={i as any} size={20} color={i === icon ? 'black' : Corpus.text} />
            </Pressable>
          ))}
        </View>
      </View>
    </Sheet>
  );
}

const x = StyleSheet.create({
  label: { fontSize: Type.body, fontFamily: Font.display, color: Corpus.text },
  hint: { fontSize: Type.small, color: Corpus.textMuted, lineHeight: 17 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 40, paddingHorizontal: 14, borderRadius: 20, backgroundColor: Corpus.bg },
  chipOn: { backgroundColor: Corpus.gold },
  chipText: { fontSize: Type.bodyLg, fontFamily: Font.display, color: Corpus.text },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dateArrow: { width: 44, height: 44, borderRadius: 22, backgroundColor: Corpus.bg, alignItems: 'center', justifyContent: 'center' },
  dateText: { fontSize: Type.title, fontFamily: Font.display, color: Corpus.text, minWidth: 110, textAlign: 'center' },
  clear: { fontSize: Type.body, color: Corpus.textMuted, marginLeft: 'auto' },
  dot: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  dotOn: { borderWidth: 3, borderColor: Corpus.card, outlineWidth: 2, outlineColor: Corpus.text } as object,
  icon: { width: 46, height: 46, borderRadius: 14, backgroundColor: Corpus.bg, alignItems: 'center', justifyContent: 'center' },
});
