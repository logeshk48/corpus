import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BudgetBar from './components/BudgetBar';
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

        <Text style={styles.sectionTitle}>Budgets</Text>
        <View style={styles.budgets}>
          <BudgetBar label="Food" spent={6200} total={8000} />
          <BudgetBar label="Travel" spent={3450} total={4000} />
          <BudgetBar label="Shopping" spent={4800} total={4000} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}