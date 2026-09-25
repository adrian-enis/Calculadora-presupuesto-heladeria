/**
 * app/(tabs)/recetas/nueva.tsx
 *
 * "Nueva Receta" (HU 3.1a). No había mock para esta pantalla en
 * stitch_helader_a_dibuluc_cost_tracker/mis_recetas (solo el listado) — se
 * armó siguiendo el mismo patrón que compras/nueva.tsx: ingredientes en
 * memoria, validados de a uno con RecetaIngredienteSchema para feedback
 * temprano, y CrearRecetaSchema como puerta real al guardar. El insumo es
 * texto libre pero debe existir: los insumos solo nacen de una Compra, la
 * receta nunca los crea (receta.repository.ts re-valida al guardar).
 */

import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';

import { FormModal } from '@/components/ui/FormModal';
import { UnidadPicker } from '@/components/ui/UnidadPicker';
import { RecetaIngredienteSchema, type RecetaIngredienteInput } from '@/features/recetas/receta.schema';
import { useInsumos } from '@/features/insumos/useInsumos';
import { useRecetas } from '@/features/recetas/useRecetas';
import type { Unidad } from '@/lib/unidades';

export default function NuevaRecetaScreen() {
  const { crearReceta } = useRecetas();
  const { insumos } = useInsumos();

  const [nombre, setNombre] = useState('');

  const [insumoNombre, setInsumoNombre] = useState('');
  const [cantidad, setCantidad] = useState('');
  const [unidad, setUnidad] = useState<Unidad>('ml');

  const [ingredientes, setIngredientes] = useState<RecetaIngredienteInput[]>([]);
  const [guardando, setGuardando] = useState(false);

  const puedeGuardar = useMemo(() => nombre.trim().length > 0 && ingredientes.length > 0, [nombre, ingredientes]);

  function agregarIngrediente() {
    const resultado = RecetaIngredienteSchema.safeParse({
      insumoNombre,
      cantidad: Number(cantidad),
      unidad,
    });
    if (!resultado.success) {
      Alert.alert('Revisá el ingrediente', resultado.error.issues[0]?.message ?? 'Datos inválidos');
      return;
    }
    const nombreBuscado = resultado.data.insumoNombre.toLowerCase();
    if (!insumos.some((i) => i.nombre.toLowerCase() === nombreBuscado)) {
      Alert.alert('Insumo inexistente', `"${resultado.data.insumoNombre}" no está registrado. Cargalo primero con una compra.`);
      return;
    }
    if (ingredientes.some((i) => i.insumoNombre.toLowerCase() === resultado.data.insumoNombre.toLowerCase())) {
      Alert.alert('Ingrediente repetido', 'Ese insumo ya está en la receta.');
      return;
    }
    setIngredientes((prev) => [...prev, resultado.data]);
    setInsumoNombre('');
    setCantidad('');
  }

  function quitarIngrediente(index: number) {
    setIngredientes((prev) => prev.filter((_, i) => i !== index));
  }

  async function guardarReceta() {
    if (!puedeGuardar) return;
    setGuardando(true);
    try {
      await crearReceta({ nombre: nombre.trim(), ingredientes });
      router.back();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo crear la receta');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <FormModal
      titulo="Nueva Receta"
      botonGuardarLabel="Guardar Receta"
      guardando={guardando}
      puedeGuardar={puedeGuardar}
      onGuardar={guardarReceta}>
      <View>
        <Text className="mb-1 text-xs font-semibold text-slate-500">Nombre de la receta</Text>
        <TextInput
          value={nombre}
          onChangeText={setNombre}
          placeholder="Ej: Chocolate"
          className="h-12 rounded-lg border border-slate-300 bg-white px-3 text-slate-900"
        />
      </View>

      <View className="gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
        <Text className="text-base font-bold text-slate-900">Agregar Ingrediente</Text>

        <View>
          <Text className="mb-1 text-xs font-semibold text-slate-500">Insumo</Text>
          <TextInput
            value={insumoNombre}
            onChangeText={setInsumoNombre}
            placeholder="Ej: Leche"
            className="h-12 rounded-lg border border-slate-300 bg-white px-3 text-slate-900"
          />
        </View>

        <UnidadPicker value={unidad} onChange={setUnidad} />

        <View>
          <Text className="mb-1 text-xs font-semibold text-slate-500">Cantidad</Text>
          <TextInput
            value={cantidad}
            onChangeText={setCantidad}
            keyboardType="decimal-pad"
            placeholder="0"
            className="h-12 rounded-lg border border-slate-300 bg-white px-3 text-slate-900"
          />
        </View>

        <Pressable
          onPress={agregarIngrediente}
          className="h-12 flex-row items-center justify-center gap-1 rounded-lg bg-secondary-500 active:bg-secondary-600">
          <MaterialIcons name="check" size={18} color="#ffffff" />
          <Text className="font-semibold text-white">Agregar ingrediente</Text>
        </Pressable>
      </View>

      <View className="gap-2">
        <Text className="text-base font-bold text-slate-900">Ingredientes de la receta</Text>
        {ingredientes.length === 0 && (
          <Text className="text-sm text-slate-500">Todavía no agregaste ingredientes.</Text>
        )}
        {ingredientes.length > 0 && (
          <View className="divide-y divide-slate-100 rounded-xl border border-slate-100 bg-white">
            {ingredientes.map((ingrediente, i) => (
              <View key={`${ingrediente.insumoNombre}-${i}`} className="flex-row items-center justify-between p-3">
                <View className="flex-row items-center gap-3">
                  <View className="h-10 w-10 items-center justify-center rounded-full bg-slate-100">
                    <MaterialIcons name="inventory" size={18} color="#64748b" />
                  </View>
                  <Text className="font-semibold text-slate-900">{ingrediente.insumoNombre}</Text>
                </View>
                <View className="flex-row items-center gap-3">
                  <Text className="text-slate-600">
                    {ingrediente.cantidad}
                    {ingrediente.unidad}
                  </Text>
                  <Pressable hitSlop={8} onPress={() => quitarIngrediente(i)}>
                    <Text className="text-xs font-semibold text-red-600">Quitar</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    </FormModal>
  );
}
