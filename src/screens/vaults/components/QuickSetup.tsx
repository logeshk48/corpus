import { Corpus } from '@/constants/theme';
import { VAULT_PROFILES } from '@/utils/vaults';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';
import { styles } from './QuickSetup.styles';

type Profile = (typeof VAULT_PROFILES)[number];

export default function QuickSetup({ onPick }: { onPick: (profile: Profile) => void }) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Quick setup</Text>
      <Text style={styles.subtitle}>Pick what fits you — you can fine-tune each vault later.</Text>
      {VAULT_PROFILES.map((p) => (
        <Pressable
          key={p.id}
          style={({ pressed }) => [styles.option, pressed && styles.pressed]}
          onPress={() => onPick(p)}
        >
          <View style={styles.icon}>
            <Ionicons name={p.icon} size={16} color={Corpus.gold} />
          </View>
          <View style={styles.body}>
            <Text style={styles.label}>{p.label}</Text>
            <Text style={styles.blurb}>{p.blurb}</Text>
          </View>
          <Text style={styles.apply}>Apply</Text>
        </Pressable>
      ))}
    </View>
  );
}
