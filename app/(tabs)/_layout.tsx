import { Tabs } from 'expo-router';
import type { ComponentType } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HistoryIcon, HomeIcon, InsumosIcon, RecetasIcon } from '@/components/ui/TabBarIcon';

// Por debajo de este ancho el label no entra junto al icono en los 4 tabs
// (probado en celulares reales angostos) — se muestra solo el icono.
const NARROW_SCREEN_WIDTH = 360;

/**
 * Ícono en un pill que se colorea al enfocar. El label NO se renderiza acá:
 * cualquier <Text> dentro de tabBarIcon (este slot) se mide con ancho
 * colapsado (~7px) en Expo Go 57.0.9 + bottom-tabs animado con
 * Reanimated/Fabric — bug del cliente, no del código. El ícono pasó de
 * MaterialIcons (font) a SVG (react-native-svg) porque tampoco se libra de
 * ese bug al ser un glyph de fuente. El label usa el mecanismo nativo de
 * bottom-tabs (tabBarLabel/tabBarShowLabel), un path de renderizado
 * distinto que no pasa por este slot y no sufre el bug.
 */
function IconPill({ focused, Icon }: { focused: boolean; Icon: ComponentType<{ color: string; size?: number }> }) {
  return (
    <View className={`h-9 w-14 items-center justify-center rounded-2xl ${focused ? 'bg-primary-500' : ''}`}>
      <Icon color={focused ? '#022c22' : '#64748b'} size={24} />
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
        tabBarShowLabel: showLabel,
        tabBarActiveTintColor: '#022c22',
        tabBarInactiveTintColor: '#64748b',
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        tabBarStyle: {
          height: (showLabel ? 64 : 52) + insets.bottom,
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
          tabBarIcon: ({ focused }) => <IconPill focused={focused} Icon={HomeIcon} />,
        }}
      />
      <Tabs.Screen
        name="compras"
        options={{
          title: 'History',
          tabBarIcon: ({ focused }) => <IconPill focused={focused} Icon={HistoryIcon} />,
        }}
      />
      <Tabs.Screen
        name="insumos/index"
        options={{
          title: 'Insumos',
          tabBarIcon: ({ focused }) => <IconPill focused={focused} Icon={InsumosIcon} />,
        }}
      />
      <Tabs.Screen
        name="recetas"
        options={{
          title: 'Recetas',
          tabBarIcon: ({ focused }) => <IconPill focused={focused} Icon={RecetasIcon} />,
        }}
      />
    </Tabs>
  );
}
