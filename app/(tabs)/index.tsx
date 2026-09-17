/**
 * app/(tabs)/index.tsx
 *
 * Dashboard (Home). Traducción de docs/../stitch_helader_a_dibuluc_cost_tracker
 * /dashboard_helader_a_dibuluc, sin la sección "Resumen de hoy" del mock
 * original (decisión del negocio: no aporta nada). "Últimas Acciones" sigue
 * con datos estáticos hasta cablear useCompras/useProducciones.
 *
 * Semántica confirmada de las acciones rápidas (para las pantallas que faltan):
 * - Nueva Compra: registrar un lote de material comprado (HU 1.1).
 * - Producción: registrar un lote producido (HU 4.1).
 * - Recetas: ver cuántas recetas hay registradas (useRecetas).
 * - Análisis: margen de ganancia por receta/lote — costo del lote vs.
 *   helados producidos vs. precio de venta (HU 4.4, produccion.service).
 */

import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { ComponentProps } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type MaterialIconName = ComponentProps<typeof MaterialIcons>['name'];

function QuickAction({
  icon,
  iconSet = 'material',
  iconColor,
  label,
  className,
  textClassName,
  onPress,
}: {
  icon: MaterialIconName | ComponentProps<typeof MaterialCommunityIcons>['name'];
  iconSet?: 'material' | 'community';
  iconColor: string;
  label: string;
  className: string;
  textClassName: string;
  onPress?: () => void;
}) {
  const IconComponent = iconSet === 'community' ? MaterialCommunityIcons : MaterialIcons;
  return (
    <Pressable onPress={onPress} className={`h-24 items-center justify-center gap-1 rounded-xl shadow-sm ${className}`}>
      <IconComponent name={icon as never} size={24} color={iconColor} />
      <Text className={`text-xs font-semibold ${textClassName}`}>{label}</Text>
    </Pressable>
  );
}

function AccionRecienteItem({
  icon,
  iconColor,
  chipClassName,
  titulo,
  hace,
  valor,
  valorClassName,
}: {
  icon: MaterialIconName;
  iconColor: string;
  chipClassName: string;
  titulo: string;
  hace: string;
  valor: string;
  valorClassName: string;
}) {
  return (
    <View className="flex-row items-center gap-3 rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
      <View className={`rounded-full p-2 ${chipClassName}`}>
        <MaterialIcons name={icon} size={18} color={iconColor} />
      </View>
      <View className="flex-1">
        <Text className="text-sm font-semibold text-slate-900">{titulo}</Text>
        <Text className="mt-0.5 text-xs text-slate-500">{hace}</Text>
      </View>
      <Text className={`text-base font-semibold ${valorClassName}`}>{valor}</Text>
    </View>
  );
}

export default function HomeScreen() {
  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-slate-50">
      <View className="h-12 w-full flex-row items-center justify-between bg-white px-4 shadow-sm">
        <View className="flex-row items-center gap-2">
          <MaterialIcons name="calendar-today" size={20} color="#047857" />
          <Text className="text-xl font-bold text-primary-700">Heladería Dibuluc</Text>
        </View>
        <MaterialIcons name="account-circle" size={26} color="#047857" />
      </View>

      <ScrollView className="flex-1 px-4" contentContainerClassName="gap-6 pb-6 pt-4">
        <View className="flex-row items-center gap-1">
          <MaterialIcons name="event" size={16} color="#94a3b8" />
          <Text className="text-sm text-slate-500">01 Septiembre 2024</Text>
        </View>

        <View className="flex-row flex-wrap gap-4">
          <View className="w-[47%]">
            <QuickAction
              icon="add-circle"
              iconColor="#431407"
              label="Nueva Compra"
              className="bg-secondary-500"
              textClassName="text-orange-950"
              onPress={() => router.push('/compras/nueva')}
            />
          </View>
          <View className="w-[47%]">
            <QuickAction
              icon="inventory"
              iconColor="#022c22"
              label="Producción"
              className="bg-primary-500"
              textClassName="text-emerald-950"
            />
          </View>
          <View className="w-[47%]">
            <QuickAction
              icon="ice-cream"
              iconSet="community"
              iconColor="#451a03"
              label="Recetas"
              className="bg-accent-500"
              textClassName="text-amber-950"
            />
          </View>
          <View className="w-[47%]">
            <QuickAction
              icon="bar-chart"
              iconColor="#334155"
              label="Análisis"
              className="bg-slate-200"
              textClassName="text-slate-700"
            />
          </View>
        </View>

        <View>
          <View className="mb-2 flex-row items-center justify-between">
            <Text className="text-xl font-bold text-slate-900">Últimas Acciones</Text>
            <Text className="text-sm font-semibold text-primary-700">Ver todo</Text>
          </View>
          <View className="gap-2">
            <AccionRecienteItem
              icon="shopping-cart"
              chipClassName="bg-secondary-500/15"
              iconColor="#ea580c"
              titulo="Compra registrada: Leche 5L"
              hace="hace 2 horas"
              valor="-$13.00"
              valorClassName="text-red-600"
            />
            <AccionRecienteItem
              icon="inventory"
              chipClassName="bg-primary-500/15"
              iconColor="#047857"
              titulo="Producción: Chocolate (24)"
              hace="hace 5 horas"
              valor="Lista"
              valorClassName="text-primary-500"
            />
            <AccionRecienteItem
              icon="shopping-cart"
              chipClassName="bg-secondary-500/15"
              iconColor="#ea580c"
              titulo="Compra registrada: Arequipe 1kg"
              hace="hace 1 día"
              valor="-$9.00"
              valorClassName="text-red-600"
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
