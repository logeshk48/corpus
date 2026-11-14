import { Group, GroupRow } from '@/components/ui';
import { Chip, Corpus } from '@/constants/theme';

export type Shortcut = {
  key: string;
  label: string;
  icon: string;
  value: string;        // short status: "₹5.2K", "Update", "All square"
  tone?: 'normal' | 'warn' | 'danger' | 'good';
  onPress: () => void;
};

const TONE = { normal: Corpus.textMuted, warn: Corpus.warning, danger: Corpus.danger, good: Corpus.income };
const COLOR: Record<string, string> = { accounts: Chip.blue, budgets: Chip.orange, people: Chip.teal, jars: Chip.yellow, income: Chip.green, networth: Chip.indigo };
const solid = (icon: string) => icon.replace(/-outline$/, '');

// Everything that isn't today's job: one grouped list, like iPhone Settings
export default function Shortcuts({ items }: { items: { key: string; label: string; icon: string; value: string; tone?: Shortcut['tone']; onPress: () => void }[] }) {
  return (
    <Group title="Money">
      {items.map((s) => (
        <GroupRow key={s.key} icon={solid(s.icon)} color={COLOR[s.key] ?? Chip.gray} title={s.label} value={s.value} valueColor={TONE[s.tone ?? 'normal']} onPress={s.onPress} />
      ))}
    </Group>
  );
}
