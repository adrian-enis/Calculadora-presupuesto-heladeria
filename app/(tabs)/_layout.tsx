import { MaterialIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Text, View } from 'react-native';

type IconName = keyof typeof MaterialIcons.glyphMap;

/**
 * Solo el tab activo muestra texto (en un pill). Los inactivos son
 * ícono solo — con los 4 tabs + label no entraban cómodos en pantallas
 * angostas de celular real.
 */
function TabPill({ focused, icon, label }: { focused: boolean; icon: IconName; label: string }) {
  if (!focused) {
    return (
      <View className="items-center justify-center px-3 py-2">
        <MaterialIcons name={icon} size={24} color="#64748b" />
      </View>
    );
  }
  return (
    <View className="flex-row items-center gap-1 rounded-full bg-primary-500 px-4 py-2">
      <MaterialIcons name={icon} size={22} color="#022c22" />
      <Text className="text-xs font-semibold text-emerald-950">{label}</Text>
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
