/**
 * app/(tabs)/recetas/index.tsx
 *
 * "Mis Recetas". costoEstimado sale de useRecetas() (receta.service.ts +
 * lib/inventario.ts) — es una proyección con el costo_promedio actual de
 * cada insumo, no el costo_lote real de una Producción concreta.
 *
 * "Nueva Receta", "Editar" y "Producir" quedan sin acción: cada una necesita
 * su propia pantalla/formulario que todavía no tiene diseño. "⋮" sí está
 * cableado (desactivarReceta, HU 3.2) porque no requiere una pantalla nueva.
 */

import { MaterialIcons } from '@expo/vector-icons';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useRecetas } from '@/features/recetas/useRecetas';
import type { RecetaConCosto } from '@/features/recetas/receta.service';

function RecetaCard({
  receta,
  onDesactivar,
}: {
  receta: RecetaConCosto;
  onDesactivar: (recetaId: number, nombre: string) => void;
}) {
  return (
    <View className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
      <View className="mb-2 flex-row items-start justify-between">
        <View className="flex-row items-center gap-3">
          <View className="h-10 w-10 items-center justify-center rounded-full bg-slate-100">
            <Text className="text-xl">🍦</Text>
          </View>
          <Text className="text-lg font-bold text-slate-900">{receta.nombre}</Text>
        </View>
        <Pressable
          hitSlop={8}
          className="rounded-full p-1 active:bg-slate-100"
          onPress={() => onDesactivar(receta.id, receta.nombre)}>
          <MaterialIcons name="more-vert" size={22} color="#64748b" />
        </Pressable>
      </View>

      <Text className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">Ingredientes</Text>
      <View className="mb-4">
        {receta.ingredientes.map((ingrediente, i) => (
          <View
            key={ingrediente.insumoNombre}
            className={`flex-row justify-between py-1.5 ${
              i < receta.ingredientes.length - 1 ? 'border-b border-slate-100' : ''
            }`}>
            <Text className="text-sm text-slate-600">{ingrediente.insumoNombre}</Text>
            <Text className="text-sm text-slate-600">
              {ingrediente.cantidad}
              {ingrediente.unidadBase}
            </Text>
          </View>
        ))}
      </View>

      <View className="mb-3 flex-row items-center justify-between rounded-lg border-t border-slate-100 bg-slate-50 p-3">
        <Text className="text-sm text-slate-500">Costo del lote</Text>
        <Text className="text-lg font-bold text-primary-700">${receta.costoEstimado.toFixed(2)}</Text>
      </View>

      <View className="flex-row gap-3">
        <Pressable className="h-12 flex-1 items-center justify-center rounded-lg border border-slate-300 active:bg-slate-50">
          <Text className="font-semibold text-slate-900">Editar</Text>
        </Pressable>
        <Pressable className="h-12 flex-1 items-center justify-center rounded-lg bg-secondary-500 shadow-sm active:bg-secondary-600">
          <Text className="font-semibold text-white">Producir</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function RecetasScreen() {
  const { recetas, cargando, error, desactivarReceta } = useRecetas();

  const confirmarDesactivar = (recetaId: number, nombre: string) => {
    Alert.alert('Desactivar receta', `"${nombre}" dejará de estar disponible para producir. ¿Continuar?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Desactivar',
        style: 'destructive',
        onPress: () => {
          desactivarReceta(recetaId).catch((e) =>
            Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo desactivar la receta')
          );
        },
      },
    ]);
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-slate-50">
      <View className="h-12 w-full flex-row items-center justify-between bg-white px-4 shadow-sm">
        <MaterialIcons name="calendar-today" size={22} color="#64748b" />
        <Text className="text-lg font-bold text-primary-700">Heladería Dibuluc</Text>
        <MaterialIcons name="account-circle" size={26} color="#64748b" />
      </View>

      <ScrollView className="flex-1 px-4" contentContainerClassName="gap-4 pb-6 pt-4">
        <View className="flex-row items-end justify-between">
          <View>
            <Text className="text-2xl font-bold text-slate-900">Recetas</Text>
            <Text className="mt-0.5 text-sm text-slate-500">Gestiona tus fórmulas y costos</Text>
          </View>
          <Pressable className="h-12 flex-row items-center gap-1 rounded-full bg-primary-500 px-4 shadow-sm active:bg-primary-600">
            <MaterialIcons name="add" size={20} color="#ffffff" />
            <Text className="font-semibold text-white">Nueva Receta</Text>
          </Pressable>
        </View>

        {cargando && <Text className="text-center text-slate-500">Cargando recetas…</Text>}
        {error && <Text className="text-center text-red-600">{error}</Text>}
        {!cargando && !error && recetas.length === 0 && (
          <Text className="text-center text-slate-500">Todavía no hay recetas activas.</Text>
        )}

        {recetas.map((receta) => (
          <RecetaCard key={receta.id} receta={receta} onDesactivar={confirmarDesactivar} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
