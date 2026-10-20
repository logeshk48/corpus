import { Corpus } from '@/constants/theme';
import { STARTER_VAULTS, type NewVault } from '@/types/vault';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';
import { styles } from './StarterJars.styles';

type StarterJarsProps = {
  existingNames: string[]; // hide starters you already created
  onCreate: (vault: NewVault) => void;
  onCustom: () => void;
  compact?: boolean;       // shorter version once you have jars
};

export default function StarterJars({ existingNames, onCreate, onCustom, compact }: StarterJarsProps) {
  const available = STARTER_VAULTS.filter(
    (s) => !existingNames.some((n) => n.toLowerCase() === s.name.toLowerCase())
  );

  return (
    <View style={styles.card}>
      {!compact && (
        <>
          <Text style={styles.title}>Put money in jars</Text>
          <Text style={styles.text}>
            A jar keeps money separate for one purpose. Add money when you can, take it out when
            you need it. Start with one of these:
          </Text>
        </>
      )}

      {available.map(({ why, ...vault }) => (
        <Pressable
          key={vault.name}
          style={({ pressed }) => [styles.option, pressed && styles.pressed]}
          onPress={() => onCreate(vault)}
        >
          <View style={[styles.icon, { backgroundColor: `${vault.color}26` }]}>
            <Ionicons name={vault.icon as any} size={18} color={vault.color} />
          </View>
          <View style={styles.body}>
            <Text style={styles.name}>{vault.name}</Text>
            <Text style={styles.why}>{why}</Text>
          </View>
          <View style={styles.create}>
            <Ionicons name="add" size={14} color={Corpus.gold} />
            <Text style={styles.createText}>Create</Text>
          </View>
        </Pressable>
      ))}

      {!compact && (
        <Pressable style={styles.custom} onPress={onCustom}>
          <Ionicons name="color-wand-outline" size={15} color={Corpus.gold} />
          <Text style={styles.customText}>Create your own jar (trip, gadget, wedding…)</Text>
        </Pressable>
      )}
    </View>
  );
}
