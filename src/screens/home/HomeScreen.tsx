import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import HeroCard from './components/HeroCard';
import HomeHeader from './components/HomeHeader';
import StatCard from './components/StatCard';
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
        <HeroCard />
        <View style={styles.statsRow}>
          <StatCard label="Income this month" value="₹72,500" />
          <StatCard label="Spent" value="₹28,320" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}