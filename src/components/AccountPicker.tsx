import { Corpus } from '@/constants/theme';
import { accountTypeMeta, type Account } from '@/types/account';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, Text } from 'react-native';
import { styles } from './AccountPicker.styles';

export const NO_ACCOUNT = '';

// "Paid from / Received in": Cash · HDFC · SBI Card
export default function AccountPicker({ accounts, value, onChange }: { accounts: Account[]; value: string; onChange: (id: string) => void }) {
  if (accounts.length === 0) return null;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row} keyboardShouldPersistTaps="handled">
      {accounts.map((a) => {
        const on = value === a.id;
        return (
          <Pressable key={a.id} style={[styles.chip, on && styles.chipOn]} onPress={() => onChange(on ? NO_ACCOUNT : a.id)}>
            <Ionicons name={accountTypeMeta(a.type).icon as keyof typeof Ionicons.glyphMap} size={14} color={on ? Corpus.gold : Corpus.textMuted} />
            <Text style={[styles.text, on && styles.textOn]}>{a.name}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
