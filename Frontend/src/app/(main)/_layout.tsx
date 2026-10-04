import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { BadgePop } from '../../components/Motion';
import { useStore } from '../../state/store';
import { colors, fonts } from '../../theme';

function TabIcon({ focused, name, badge = 0 }: { focused: boolean; name: keyof typeof Ionicons.glyphMap; badge?: number }) {
  const outline = `${name}-outline` as keyof typeof Ionicons.glyphMap;
  return (
    <View style={{ width: 46, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: focused ? colors.mint : 'transparent' }}>
      <Ionicons name={focused ? name : outline} size={20} color={focused ? colors.ink : '#8E93A3'} />
      <BadgePop count={badge} />
    </View>
  );
}

export default function MainLayout() {
  const { ready, session, awaitingReturn, openDisposition, data } = useStore();
  const missed = data.calls.filter((call) => call.status === 'Missed').length;
  if (ready && !session) return <Redirect href="/(auth)/login" />;
  return (
    <View style={{ flex: 1, backgroundColor: colors.cream }}>
      {awaitingReturn ? (
        <Pressable onPress={openDisposition} style={({ pressed }) => [{ backgroundColor: colors.hero, paddingHorizontal: 16, paddingVertical: 10 }, pressed && { opacity: 0.85 }]}>
          <Text style={{ color: colors.white, fontFamily: fonts.semibold }}>
            Call in progress with {awaitingReturn.name}. Tap to log the outcome.
          </Text>
        </Pressable>
      ) : null}
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.ink,
          tabBarInactiveTintColor: '#8E93A3',
          tabBarStyle: {
            backgroundColor: colors.paper,
            borderTopColor: '#EEF0F5',
            height: 68,
            paddingTop: 6,
            paddingBottom: 8,
          },
          tabBarLabelStyle: { fontFamily: fonts.semibold, fontSize: 10, marginTop: 2 },
        }}
      >
        <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({ focused }) => <TabIcon focused={focused} name="home" /> }} />
        <Tabs.Screen name="customers" options={{ title: 'Customers', tabBarIcon: ({ focused }) => <TabIcon focused={focused} name="people" /> }} />
        <Tabs.Screen name="leads" options={{ title: 'Leads', tabBarIcon: ({ focused }) => <TabIcon focused={focused} name="clipboard" /> }} />
        <Tabs.Screen name="followups" options={{ title: 'Follow-ups', tabBarIcon: ({ focused }) => <TabIcon focused={focused} name="calendar" /> }} />
        <Tabs.Screen name="calls" options={{ title: 'Calls', tabBarIcon: ({ focused }) => <TabIcon focused={focused} name="call" badge={missed} /> }} />
        <Tabs.Screen name="more" options={{ href: null }} />
      </Tabs>
    </View>
  );
}
