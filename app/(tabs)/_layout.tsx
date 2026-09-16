import { MaterialIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Text, View } from 'react-native';

type IconName = keyof typeof MaterialIcons.glyphMap;

function TabPill({ focused, icon, label }: { focused: boolean; icon: IconName; label: string }) {
  return (
    <View
      className={`flex-row items-center gap-1 rounded-full px-4 py-2 ${focused ? 'bg-primary-500' : ''}`}>
      <MaterialIcons name={icon} size={22} color={focused ? '#022c22' : '#64748b'} />
      <Text className={`text-xs font-semibold ${focused ? 'text-emerald-950' : 'text-slate-500'}`}>{label}</Text>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: '#022c22',
        tabBarStyle: {
          height: 64,
          paddingTop: 8,
          backgroundColor: '#e2e8f0',
          borderTopWidth: 0,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => <TabPill focused={focused} icon="home" label="Home" />,
        }}
      />
      <Tabs.Screen
        name="compras/index"
        options={{
          title: 'History',
          tabBarIcon: ({ focused }) => <TabPill focused={focused} icon="history" label="History" />,
        }}
      />
      <Tabs.Screen
        name="insumos/index"
        options={{
          title: 'Insumos',
          tabBarIcon: ({ focused }) => <TabPill focused={focused} icon="inventory" label="Insumos" />,
        }}
      />
      <Tabs.Screen
        name="recetas/index"
        options={{
          title: 'Recetas',
          tabBarIcon: ({ focused }) => <TabPill focused={focused} icon="menu-book" label="Recetas" />,
        }}
      />
    </Tabs>
  );
}
