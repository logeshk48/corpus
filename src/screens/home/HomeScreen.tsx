import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import HomeHeader from './components/HomeHeader';
import { styles } from './HomeScreen.styles';

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <HomeHeader />
        {/* Hero card comes next task */}
      </ScrollView>
    </SafeAreaView>
  );
}