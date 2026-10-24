import { Button } from '@/components/ui';
import { Corpus } from '@/constants/theme';
import { styles as sheet } from '@/screens/budgets/components/BudgetEditorSheet.styles';
import { VAULT_COLORS, VAULT_ICONS, type NewVault, type VaultWithBalance } from '@/types/vault';
import { formatINR } from '@/utils/format';
import { formatYearMonth, jarKind, parseYearMonth, toYearMonth } from '@/utils/jarInsights';
import type { InsightContext } from './jarInsightLine';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
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
    if (window.confirm(message)) onConfirm();
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

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={sheet.overlay}>
        <Pressable style={sheet.backdrop} onPress={onClose} />
        <View style={[sheet.sheet, { maxHeight: '92%' }]}>
          <View style={sheet.handle} />
          <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ gap: 14 }} keyboardShouldPersistTaps="handled">
            <View style={sheet.header}>
              <View style={[sheet.iconCircle, { backgroundColor: `${color}26` }]}>
                <Ionicons name={icon as any} size={18} color={color} />
              </View>
              <View style={sheet.titleBlock}>
                <Text style={sheet.title}>{editing ? 'Edit jar' : 'New jar'}</Text>
                <Text style={sheet.subtitle}>{name.trim() || 'Give it a name'}</Text>
              </View>
              <Pressable style={sheet.closeButton} onPress={onClose} hitSlop={8}>
                <Ionicons name="close" size={18} color={Corpus.textMuted} />
              </Pressable>
            </View>

            {!editing && (
              <>
                <Text style={styles.label}>QUICK START</Text>
                <View style={styles.templates}>
                  {TEMPLATES.map((t) => (
                    <Pressable
                      key={t.name}
                      style={[sheet.chip, name === t.name && sheet.chipSuggested]}
                      onPress={() => {
                        setName(t.name);
                        setIcon(t.icon);
                        setColor(t.color);
                      }}
                    >
                      <Ionicons name={t.icon as any} size={12} color={name === t.name ? Corpus.gold : t.color} />
                      <Text style={[sheet.chipText, name === t.name && sheet.chipTextSuggested]}>{t.name}</Text>
                    </Pressable>
                  ))}
                </View>
              </>
            )}

            <Text style={styles.label}>NAME</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Goa trip, New laptop, Wedding"
              placeholderTextColor={Corpus.textFaint}
              maxLength={30}
              autoFocus={!editing}
            />

            <Text style={styles.label}>GOAL (OPTIONAL)</Text>
            <View style={styles.moneyRow}>
              <Text style={styles.rupee}>₹</Text>
              <TextInput
                style={styles.moneyInput}
                value={goal}
                onChangeText={setGoal}
                placeholder="How much do you want in this jar?"
                placeholderTextColor={Corpus.textFaint}
                keyboardType="numeric"
              />
            </View>
            {goalInvalid && <Text style={sheet.error}>Goal must be greater than 0, or leave it empty</Text>}
            {emergencySuggestion && (
              <Pressable
                style={[sheet.chip, sheet.chipSuggested, { alignSelf: 'flex-start' }]}
                onPress={() => setGoal(String(emergencySuggestion))}
              >
                <Ionicons name="sparkles" size={12} color={Corpus.gold} />
                <Text style={[sheet.chipText, sheet.chipTextSuggested]}>
                  Suggested {formatINR(emergencySuggestion)} · {context!.recommendedMonths} months × {formatINR(context!.avgExpenses)}
                </Text>
              </Pressable>
            )}

            <Text style={styles.label}>REACH IT BY (OPTIONAL)</Text>
            {!goalValue ? (
              <Text style={styles.hint}>Set a goal first, then pick a month to get a monthly plan.</Text>
            ) : !targetDate ? (
              <Pressable
                style={[sheet.chip, { alignSelf: 'flex-start' }]}
                onPress={() => setTargetDate(shiftMonth(thisMonth, 5))}
              >
                <Ionicons name="calendar-outline" size={13} color={Corpus.textMuted} />
                <Text style={sheet.chipText}>Pick a month</Text>
              </Pressable>
            ) : (
              <>
                <View style={styles.dateRow}>
                  <Pressable
                    style={styles.dateArrow}
                    onPress={() => setTargetDate(shiftMonth(targetDate, -1))}
                    disabled={targetDate <= thisMonth}
                  >
                    <Ionicons
                      name="chevron-back"
                      size={18}
                      color={targetDate <= thisMonth ? Corpus.textFaint : Corpus.text}
                    />
                  </Pressable>
                  <Text style={styles.dateText}>{formatYearMonth(targetDate)}</Text>
                  <Pressable style={styles.dateArrow} onPress={() => setTargetDate(shiftMonth(targetDate, 1))}>
                    <Ionicons name="chevron-forward" size={18} color={Corpus.text} />
                  </Pressable>
                  <Pressable onPress={() => setTargetDate(undefined)} hitSlop={8}>
                    <Text style={styles.clearDate}>No date</Text>
                  </Pressable>
                </View>
                <Text style={[styles.hint, { color }]}>
                  {perMonth > 0
                    ? `That's ${formatINR(perMonth)} per month for ${monthsLeft} month${monthsLeft === 1 ? '' : 's'}`
                    : 'Goal already reached 🎉'}
                </Text>
              </>
            )}

            <Text style={styles.label}>COLOUR</Text>
            <View style={styles.colors}>
              {VAULT_COLORS.map((c) => (
                <Pressable
                  key={c}
                  style={[styles.colorDot, { backgroundColor: c }, c === color && styles.colorSelected]}
                  onPress={() => setColor(c)}
                >
                  {c === color && <Ionicons name="checkmark" size={14} color={Corpus.onGold} />}
                </Pressable>
              ))}
            </View>

            <Text style={styles.label}>ICON</Text>
            <View style={styles.icons}>
              {VAULT_ICONS.map((i) => (
                <Pressable
                  key={i}
                  style={[styles.iconChoice, i === icon && { borderColor: color, backgroundColor: `${color}26` }]}
                  onPress={() => setIcon(i)}
                >
                  <Ionicons name={i as any} size={18} color={i === icon ? color : Corpus.textMuted} />
                </Pressable>
              ))}
            </View>

            <Button
              label={editing ? 'Save changes' : 'Create jar'}
              tint={color}
              onPress={save}
              loading={busy}
              disabled={!canSave}
            />

            {editing && (
              <Button variant="danger" icon="trash-outline" label="Delete jar" onPress={() => confirmDelete(mode.jar, () => onDelete(mode.jar))} disabled={busy} />
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
