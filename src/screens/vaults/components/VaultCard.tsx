import { Corpus } from '@/constants/theme';
import { formatINR } from '@/utils/format';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';
import { styles } from './VaultCard.styles';

type VaultCardProps = {
  icon: keyof typeof Ionicons.glyphMap;
  name: string;
  color: string;     // vault accent colour
  tint: string;      // icon background
  percent: number;   // 0 = not active
  baseLabel: string; // e.g. "client & business income"
  baseAmount: number;
  thisMonth: number;
  thisYear: number;
  moved: number;     // marked as moved this month
  onEdit: () => void;
  onMarkMoved: (amount: number) => void;
};

export default function VaultCard(props: VaultCardProps) {
  const { icon, name, color, tint, percent, baseLabel, baseAmount, thisMonth, thisYear, moved } = props;
  const active = percent > 0;
  const toMove = Math.max(thisMonth - moved, 0);

  return (
    <Pressable onPress={props.onEdit} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.top}>
        <View style={[styles.iconCircle, { backgroundColor: active ? tint : Corpus.cardAlt }]}>
          <Ionicons name={icon} size={19} color={active ? color : Corpus.textFaint} />
        </View>
        <View style={styles.middle}>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.yearText}>
            {active ? `${formatINR(thisYear)} protected this year` : 'Not active'}
          </Text>
        </View>
        <View style={[styles.badge, { borderColor: active ? color : Corpus.border }]}>
          <Text style={[styles.badgeText, { color: active ? color : Corpus.textFaint }]}>
            {active ? `${percent}%` : 'Off'}
          </Text>
          <Ionicons name="create-outline" size={11} color={active ? color : Corpus.textFaint} />
        </View>
      </View>

      {!active ? (
        <View style={styles.setup}>
          <Ionicons name="add-circle-outline" size={15} color={Corpus.gold} />
          <Text style={styles.setupText}>Tap to turn on</Text>
        </View>
      ) : (
        <>
          {/* The formula, in plain words */}
          <View style={styles.math}>
            {baseAmount > 0 ? (
              <Text style={styles.mathText}>
                {percent}% of {formatINR(baseAmount)} {baseLabel} ={' '}
                <Text style={[styles.mathStrong, { color }]}>{formatINR(thisMonth)}</Text> this month
              </Text>
            ) : (
              <Text style={styles.mathText}>No {baseLabel} yet this month</Text>
            )}
          </View>

          {/* Real-world action: did you actually move the money? */}
          {thisMonth > 0 &&
            (toMove === 0 ? (
              <View style={styles.transfer}>
                <Ionicons name="checkmark-circle" size={16} color={Corpus.income} />
                <Text style={styles.doneText}>Moved {formatINR(moved)} this month</Text>
                <Pressable onPress={() => props.onMarkMoved(0)} hitSlop={8}>
                  <Text style={styles.undoText}>Undo</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.transfer}>
                <Ionicons name="swap-horizontal" size={16} color={Corpus.textMuted} />
                <Text style={styles.transferText}>
                  {formatINR(toMove)} to move
                  {moved > 0 && (
                    <Text style={styles.transferMuted}> · {formatINR(moved)} already moved</Text>
                  )}
                </Text>
                <Pressable
                  style={[styles.markButton, { backgroundColor: color }]}
                  onPress={() => props.onMarkMoved(thisMonth)}
                  hitSlop={6}
                >
                  <Ionicons name="checkmark" size={13} color="#0F1115" />
                  <Text style={styles.markText}>Mark moved</Text>
                </Pressable>
              </View>
            ))}
        </>
      )}
    </Pressable>
  );
}
