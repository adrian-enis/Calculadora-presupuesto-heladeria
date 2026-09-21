/**
 * app/(tabs)/insumos/index.tsx
 *
 * "Insumos y Costos" (HU 2.1 listar + HU 2.2 editar nombre). El mock
 * (stitch_helader_a_dibuluc_cost_tracker/insumos_y_costos) mostraba cada
 * card expandible con "Historial de Compras" y "Última compra" por insumo —
 * eso no está: insumo.repository.listarInsumos() no trae ese detalle (no hay
 * join con compra_items) y agregarlo es una pantalla propia, no parte de
 * "lista + editar nombre". Tampoco está "Añadir Nuevo Insumo" del mock: los
 * insumos se crean implícitamente desde Nueva Compra/Receta
 * (obtenerOCrearInsumo), no hay un alta directa acá.
 */

import { MaterialIcons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TopAppBar } from '@/components/ui/TopAppBar';
import type { InsumoListado } from '@/features/insumos/insumo.repository';
import { useInsumos } from '@/features/insumos/useInsumos';

function formatearCosto(costo: number): string {
  return costo < 1 ? costo.toFixed(4) : costo.toFixed(2);
}

function InsumoCard({ insumo, onEditar }: { insumo: InsumoListado; onEditar: (insumo: InsumoListado) => void }) {
  return (
    <View className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
      <View className="flex-row items-start justify-between">
        <View className="flex-1 flex-row items-center gap-3">
          <View className="h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
            <MaterialIcons name="inventory-2" size={20} color="#64748b" />
          </View>
          <View className="flex-1">
            <Text className="text-lg font-bold leading-tight text-slate-900">{insumo.nombre}</Text>
            <Text className="text-sm text-slate-500">Unidad: {insumo.unidadBase}</Text>
          </View>
        </View>
        <Pressable hitSlop={8} className="rounded-full p-1 active:bg-slate-100" onPress={() => onEditar(insumo)}>
          <MaterialIcons name="edit" size={20} color="#64748b" />
        </Pressable>
      </View>

      <View className="mt-3 flex-row items-end justify-between">
        <View>
          <Text className="mb-0.5 text-xs text-slate-500">Costo actual</Text>
          <View className="flex-row items-baseline gap-1">
            <Text className="text-lg font-semibold text-primary-700">${formatearCosto(insumo.costoPromedio)}</Text>
            <Text className="text-xs text-slate-500">/ {insumo.unidadBase}</Text>
          </View>
        </View>
        <Text className="text-xs text-slate-500">
          Stock: {insumo.stockDisponible} {insumo.unidadBase}
        </Text>
      </View>
    </View>
  );
}

function EditarNombreModal({
  insumo,
  onCerrar,
  onGuardar,
}: {
  insumo: InsumoListado | null;
  onCerrar: () => void;
  onGuardar: (insumoId: number, nombre: string) => Promise<void>;
}) {
  const [nombre, setNombre] = useState(insumo?.nombre ?? '');
  const [guardando, setGuardando] = useState(false);

  async function guardar() {
    if (!insumo) return;
    setGuardando(true);
    try {
      await onGuardar(insumo.id, nombre);
      onCerrar();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo editar el insumo');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal visible={insumo !== null} transparent animationType="fade" onRequestClose={onCerrar}>
      <View className="flex-1 items-center justify-center bg-black/40 p-4">
        <View className="w-full max-w-sm rounded-xl bg-white p-4 shadow-lg">
          <Text className="mb-3 text-lg font-bold text-slate-900">Editar nombre</Text>
          <TextInput
            value={nombre}
            onChangeText={setNombre}
            placeholder="Nombre del insumo"
            autoFocus
            className="h-12 rounded-lg border border-slate-300 bg-white px-3 text-slate-900"
          />
          <View className="mt-4 flex-row gap-3">
            <Pressable
              onPress={onCerrar}
              className="h-12 flex-1 items-center justify-center rounded-lg border border-slate-300 active:bg-slate-50">
              <Text className="font-semibold text-slate-900">Cancelar</Text>
            </Pressable>
            <Pressable
              onPress={guardar}
              disabled={guardando}
              className={`h-12 flex-1 items-center justify-center rounded-lg shadow-sm ${
                guardando ? 'bg-primary-500/50' : 'bg-primary-500 active:bg-primary-600'
              }`}>
              <Text className="font-semibold text-white">{guardando ? 'Guardando…' : 'Guardar'}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function InsumosScreen() {
  const { insumos, cargando, error, editarNombreInsumo } = useInsumos();
  const [busqueda, setBusqueda] = useState('');
  const [insumoEditando, setInsumoEditando] = useState<InsumoListado | null>(null);

  const insumosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return insumos;
    return insumos.filter((i) => i.nombre.toLowerCase().includes(q));
  }, [insumos, busqueda]);

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-slate-50">
      <TopAppBar />

      <ScrollView className="flex-1 px-4" contentContainerClassName="gap-4 pb-6 pt-4">
        <View>
          <Text className="text-2xl font-bold text-slate-900">Insumos y Costos</Text>
          <Text className="mt-0.5 text-sm text-slate-500">Gestiona los insumos usados en tus recetas</Text>
        </View>

        <View className="relative">
          <MaterialIcons
            name="search"
            size={20}
            color="#64748b"
            style={{ position: 'absolute', left: 12, top: 14, zIndex: 1 }}
          />
          <TextInput
            value={busqueda}
            onChangeText={setBusqueda}
            placeholder="Buscar insumo..."
            className="h-12 rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-slate-900"
          />
        </View>

        {cargando && insumos.length === 0 && <Text className="text-center text-slate-500">Cargando insumos…</Text>}
        {error && <Text className="text-center text-red-600">{error}</Text>}
        {!cargando && !error && insumosFiltrados.length === 0 && (
          <Text className="text-center text-slate-500">
            {busqueda ? `No hay insumos que coincidan con "${busqueda}".` : 'Todavía no hay insumos registrados.'}
          </Text>
        )}

        {insumosFiltrados.map((insumo) => (
          <InsumoCard key={insumo.id} insumo={insumo} onEditar={setInsumoEditando} />
        ))}
      </ScrollView>

      <EditarNombreModal
        key={insumoEditando?.id ?? 'cerrado'}
        insumo={insumoEditando}
        onCerrar={() => setInsumoEditando(null)}
        onGuardar={(insumoId, nombre) => editarNombreInsumo(insumoId, { nombre })}
      />
    </SafeAreaView>
  );
}
