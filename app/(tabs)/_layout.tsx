import { MaterialIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type IconName = keyof typeof MaterialIcons.glyphMap;

// Por debajo de este ancho el label no entra junto al icono en los 4 tabs
// (probado en celulares reales angostos) — se muestra solo el icono.
const NARROW_SCREEN_WIDTH = 360;

/**
 * Ícono arriba, label abajo (no lado a lado) — así entran los 4 con texto
 * en pantallas angostas de celular real. El bug anterior era horizontal
 * (icono+texto en fila), no que el texto no cupiera.
 */
function TabPill({
  focused,
  icon,
  label,
  showLabel,
}: {
  focused: boolean;
  icon: IconName;
  label: string;
  showLabel: boolean;
}) {
  return (
    <View
      className={`items-center justify-center gap-0.5 rounded-2xl px-4 ${showLabel ? 'py-1.5' : 'py-2'} ${focused ? 'bg-primary-500' : ''}`}>
      <MaterialIcons name={icon} size={24} color={focused ? '#022c22' : '#64748b'} />
      {showLabel && (
        <Text className={`text-xs font-semibold ${focused ? 'text-emerald-950' : 'text-slate-600'}`}>{label}</Text>
      )}
    </View>
  );
}

export default function TabLayout() {
  // tabBarStyle con height fijo pisa el cálculo automático de inset que hace
  // React Navigation — sin sumar insets.bottom, el bottom nav gestual de
  // Android tapa/corta la barra (bug reportado en dispositivo real).
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const showLabel = width >= NARROW_SCREEN_WIDTH;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: '#022c22',
        tabBarStyle: {
          height: (showLabel ? 56 : 48) + insets.bottom,
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
          tabBarIcon: ({ focused }) => <TabPill focused={focused} icon="home" label="Home" showLabel={showLabel} />,
        }}
      />
      <Tabs.Screen
        name="compras/index"
        options={{
          title: 'History',
          tabBarIcon: ({ focused }) => (
            <TabPill focused={focused} icon="history" label="History" showLabel={showLabel} />
          ),
        }}
      />
      <Tabs.Screen
        name="insumos/index"
        options={{
          title: 'Insumos',
          tabBarIcon: ({ focused }) => (
            <TabPill focused={focused} icon="inventory" label="Insumos" showLabel={showLabel} />
          ),
        }}
      />
      <Tabs.Screen
        name="recetas/index"
        options={{
          title: 'Recetas',
          tabBarIcon: ({ focused }) => (
            <TabPill focused={focused} icon="menu-book" label="Recetas" showLabel={showLabel} />
          ),
        }}
      />
    </Tabs>
  );
}
