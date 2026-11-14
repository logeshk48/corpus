import GlassTabBar from '@/components/GlassTabBar';
import ShareCatcher from '@/components/ShareCatcher';
import { Tabs } from 'expo-router';
import BillsAutoLogger from '@/components/BillsAutoLogger';
import MoneyNotifier from '@/components/MoneyNotifier';

export default function TabsLayout() {
  return (
    <>
      <BillsAutoLogger />
      <MoneyNotifier />
      <ShareCatcher />
      <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <GlassTabBar {...props} />}>
        <Tabs.Screen name="index" options={{ title: 'Today' }} />
        <Tabs.Screen name="analytics" options={{ title: 'Insights' }} />
        <Tabs.Screen name="add" options={{ title: 'Add' }} />
        <Tabs.Screen name="invest" options={{ title: 'Invest' }} />
        <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
      </Tabs>
    </>
  );
}