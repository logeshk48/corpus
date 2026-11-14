import { Corpus, Type } from '@/constants/theme';
import ShareCatcher from '@/components/ShareCatcher';
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { View } from 'react-native';
import BillsAutoLogger from '@/components/BillsAutoLogger';
import MoneyNotifier from '@/components/MoneyNotifier';

export default function TabsLayout() {
  return (
    <>
      <BillsAutoLogger />
      <MoneyNotifier />
      <ShareCatcher />
      <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Corpus.gold,
        tabBarInactiveTintColor: Corpus.textFaint,
        tabBarStyle: {
          backgroundColor: Corpus.bg,
          borderTopColor: Corpus.border,
          borderTopWidth: 0.5,
        },
        tabBarLabelStyle: { fontSize: Type.caption, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: 'Analytics',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="stats-chart" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          title: 'Add',
          tabBarIcon: ({ color, size }) => (
            <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: Corpus.gold, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="add" size={22} color={Corpus.onGold} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="invest"
        options={{
          title: 'Invest',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="trending-up" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings" size={size} color={color} />
          ),
        }}
      />
      </Tabs>
    </>
  );
}