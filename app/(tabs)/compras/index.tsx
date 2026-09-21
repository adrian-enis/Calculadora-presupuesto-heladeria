/**
 * app/(tabs)/compras/index.tsx
 *
 * "Historial de Compras" (HU 1.4). El filtro "Todos los insumos" del mock
 * era un <select> con el nombre de la compra que se estuviera cargando en
 * ese momento — acá filtra sobre las páginas ya cargadas de useCompras(),
 * no hace una query nueva: no existe (ni hace falta) un
 * listarCompras(insumoNombre) en el repository para el volumen de un taller.
 *
 * El buscador (lupa del header) y "Editar" de un item individual (HU 1.2)
 * no están: HU 1.2 necesita un formulario propio que todavía no tiene
 * diseño. El "⋮" sí borra la compra completa (HU 1.3, ya disponible).
 */

import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { CompraListada } from '@/features/compras/compra.repository';
import { useCompras } from '@/features/compras/useCompras';
import { useInsumos } from '@/features/insumos/useInsumos';
import { formatearFecha } from '@/lib/fecha';

function CompraCard({ compra, onEliminar }: { compra: CompraListada; onEliminar: (compraId: number) => void }) {
  const total = compra.items.reduce((suma, item) => suma + item.precio, 0);

  return (
    <View className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
      <View className="mb-1 flex-row items-start justify-between">
        <View>
          <Text className="text-lg font-bold text-slate-900">Compra #{compra.id}</Text>
          <Text className="text-sm text-slate-500">{formatearFecha(compra.fecha)}</Text>
        </View>
        <Pressable hitSlop={8} className="rounded-full p-1 active:bg-slate-100" onPress={() => onEliminar(compra.id)}>
          <MaterialIcons name="more-vert" size={22} color="#64748b" />
        </Pressable>
      </View>

      <View className="my-3 divide-y divide-slate-200 rounded-lg bg-slate-50 px-3">
        {compra.items.map((item, i) => (
          <View key={`${item.insumoNombre}-${i}`} className="flex-row items-center justify-between py-2.5">
            <Text className="text-sm text-slate-700">
              {item.insumoNombre} {item.cantidad}
              {item.unidad}
            </Text>
            <Text className="text-sm font-semibold text-slate-900">${item.precio.toFixed(2)}</Text>
          </View>
        ))}
      </View>

      <View className="flex-row items-center justify-between border-t border-slate-200 pt-3">
        <Text className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total</Text>
        <Text className="text-2xl font-bold text-primary-700">${total.toFixed(2)}</Text>
      </View>
    </View>
  );
}

export default function HistorialComprasScreen() {
  const { compras, cargando, error, hayMas, cargarMas, eliminarCompra } = useCompras();
  const { insumos } = useInsumos();
  const [filtro, setFiltro] = useState<string | null>(null);
  const [mostrarFiltro, setMostrarFiltro] = useState(false);

  const comprasFiltradas = useMemo(() => {
    if (!filtro) return compras;
    return compras.filter((compra) => compra.items.some((item) => item.insumoNombre === filtro));
  }, [compras, filtro]);

  const confirmarEliminar = (compraId: number) => {
    Alert.alert('Eliminar compra', `Se va a borrar la Compra #${compraId} y su stock se va a descontar. ¿Continuar?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => {
          eliminarCompra(compraId).catch((e) =>
            Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo eliminar la compra')
          );
        },
      },
    ]);
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-slate-50">
      <View className="h-12 w-full flex-row items-center justify-between bg-white px-4 shadow-sm">
        <Pressable hitSlop={8} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color="#64748b" />
        </Pressable>
        <Text className="text-lg font-bold text-primary-700">Historial de Compras</Text>
        <MaterialIcons name="search" size={22} color="#64748b" />
      </View>

      <ScrollView className="flex-1 px-4" contentContainerClassName="gap-4 pb-6 pt-4">
        <Pressable
          onPress={() => router.push('/compras/nueva')}
          className="h-12 flex-row items-center justify-center gap-1 rounded-full bg-primary-500 shadow-sm active:bg-primary-600">
          <MaterialIcons name="add" size={20} color="#022c22" />
          <Text className="font-bold text-emerald-950">Nueva Compra</Text>
        </Pressable>

        <View>
          <Pressable
            onPress={() => setMostrarFiltro((v) => !v)}
            className="h-12 flex-row items-center justify-between rounded-lg border border-slate-200 bg-slate-100 px-3">
            <Text className="text-slate-700">{filtro ?? 'Todos los insumos'}</Text>
            <MaterialIcons name={mostrarFiltro ? 'expand-less' : 'expand-more'} size={22} color="#64748b" />
          </Pressable>
          {mostrarFiltro && (
            <View className="mt-1 rounded-lg border border-slate-200 bg-white shadow-sm">
              <Pressable
                className="border-b border-slate-100 p-3 active:bg-slate-50"
                onPress={() => {
                  setFiltro(null);
                  setMostrarFiltro(false);
                }}>
                <Text className="text-slate-700">Todos los insumos</Text>
              </Pressable>
              {insumos.map((insumo) => (
                <Pressable
                  key={insumo.id}
                  className="border-b border-slate-100 p-3 active:bg-slate-50"
                  onPress={() => {
                    setFiltro(insumo.nombre);
                    setMostrarFiltro(false);
                  }}>
                  <Text className="text-slate-700">{insumo.nombre}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {cargando && compras.length === 0 && <Text className="text-center text-slate-500">Cargando compras…</Text>}
        {error && <Text className="text-center text-red-600">{error}</Text>}
        {!cargando && !error && comprasFiltradas.length === 0 && (
          <Text className="text-center text-slate-500">
            {filtro ? `No hay compras con "${filtro}" cargadas todavía.` : 'Todavía no hay compras registradas.'}
          </Text>
        )}

        {comprasFiltradas.map((compra) => (
          <CompraCard key={compra.id} compra={compra} onEliminar={confirmarEliminar} />
        ))}

        {!filtro && hayMas && (
          <Pressable
            onPress={cargarMas}
            disabled={cargando}
            className="h-12 items-center justify-center rounded-lg border border-slate-300 active:bg-slate-100">
            <Text className="font-semibold text-slate-700">{cargando ? 'Cargando…' : 'Ver más'}</Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
