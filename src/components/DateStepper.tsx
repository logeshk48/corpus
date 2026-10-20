import { Corpus } from '@/constants/theme';
import { addDays, isSameDay } from '@/utils/dates';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';
import { styles } from './DateStepper.styles';

type DateStepperProps = {
  value: Date;
  onChange: (date: Date) => void;
};

function dayLabel(d: Date, today: Date): string {
  if (isSameDay(d, today)) return 'Today';
  if (isSameDay(d, addDays(today, -1))) return 'Yesterday';
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}

// ‹ Today › — step one day at a time; can't go into the future
export default function DateStepper({ value, onChange }: DateStepperProps) {
  const today = new Date();
  const isToday = isSameDay(value, today);
  const canGoForward = !isToday && value < today;

  return (
    <View style={styles.container}>
      <Pressable style={styles.arrow} onPress={() => onChange(addDays(value, -1))} hitSlop={6}>
        <Ionicons name="chevron-back" size={20} color={Corpus.text} />
      </Pressable>

      <View style={styles.middle}>
        <Text style={styles.label}>{dayLabel(value, today)}</Text>
        {isToday ? (
          <Text style={styles.sub}>
            {value.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
          </Text>
        ) : (
          <Pressable onPress={() => onChange(today)} hitSlop={6}>
            <Text style={styles.todayLink}>Back to today</Text>
          </Pressable>
        )}
      </View>

      <Pressable
        style={styles.arrow}
        onPress={() => canGoForward && onChange(addDays(value, 1))}
        disabled={!canGoForward}
        hitSlop={6}
      >
        <Ionicons
          name="chevron-forward"
          size={20}
          color={canGoForward ? Corpus.text : Corpus.textFaint}
        />
      </Pressable>
    </View>
  );
}
