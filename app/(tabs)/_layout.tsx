import { MaterialIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type IconName = keyof typeof MaterialIcons.glyphMap;

/**
 * Ícono arriba, label abajo (no lado a lado) — así entran los 4 con texto
 * en pantallas angostas de celular real. El bug anterior era horizontal
 * (icono+texto en fila), no que el texto no cupiera.
 */
function TabPill({ focused, icon, label }: { focused: boolean; icon: IconName; label: string }) {
  return (
    <View className={`items-center justify-center gap-0.5 rounded-2xl px-4 py-1.5 ${focused ? 'bg-primary-500' : ''}`}>
      <MaterialIcons name={icon} size={24} color={focused ? '#022c22' : '#64748b'} />
      <Text className={`text-xs font-semibold ${focused ? 'text-emerald-950' : 'text-slate-600'}`}>{label}</Text>
    </View>
  );
}

export default function TabLayout() {
  // tabBarStyle con height fijo pisa el cálculo automático de inset que hace
  // React Navigation — sin sumar insets.bottom, el bottom nav gestual de
  // Android tapa/corta la barra (bug reportado en dispositivo real).
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: '#022c22',
        tabBarStyle: {
          height: 56 + insets.bottom,
          paddingTop: 8,
          paddingBottom: insets.bottom,
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
