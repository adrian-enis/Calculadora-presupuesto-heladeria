/**
 * app/(tabs)/compras/nueva.tsx
 *
 * "Registrar Nueva Compra" (HU 1.1). Se arma la lista de items en memoria y
 * recién se valida/persiste todo junto al tocar "Guardar Compra" — Zod
 * (CompraSchema) es la puerta real de entrada, esto en pantalla es solo para
 * dar feedback temprano por item.
 *
 * El diseño mostraba el insumo como un <select> con opciones fijas, pero
 * HU 1.1 dice "si el insumo no existe, se crea automáticamente": por eso acá
 * es un texto libre en vez de un dropdown cerrado. La unidad tampoco estaba
 * en el mock (el "ml" era un label estático) — se agregaron chips porque
 * CompraItemSchema la exige.
 */

import { MaterialIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';

import { FormModal } from '@/components/ui/FormModal';
import { UnidadPicker } from '@/components/ui/UnidadPicker';
import { CompraItemSchema, type CompraItemInput } from '@/features/compras/compra.schema';
import { useCompras } from '@/features/compras/useCompras';
import { formatearFecha } from '@/lib/fecha';
import type { Unidad } from '@/lib/unidades';

export default function NuevaCompraScreen() {
  const { registrarCompra } = useCompras();

  const [fecha, setFecha] = useState(() => new Date());
  const [mostrarFecha, setMostrarFecha] = useState(false);

  const [insumoNombre, setInsumoNombre] = useState('');
  const [cantidad, setCantidad] = useState('');
  const [unidad, setUnidad] = useState<Unidad>('ml');
  const [precio, setPrecio] = useState('');

  const [items, setItems] = useState<CompraItemInput[]>([]);
  const [guardando, setGuardando] = useState(false);

  const total = useMemo(() => items.reduce((suma, item) => suma + item.precio, 0), [items]);

  function agregarInsumo() {
    const resultado = CompraItemSchema.safeParse({
      insumoNombre,
      cantidad: Number(cantidad),
      unidad,
      precio: Number(precio),
    });
    if (!resultado.success) {
      Alert.alert('Revisá el insumo', resultado.error.issues[0]?.message ?? 'Datos inválidos');
      return;
    }
    setItems((prev) => [...prev, resultado.data]);
    setInsumoNombre('');
    setCantidad('');
    setPrecio('');
  }

  function quitarInsumo(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  async function guardarCompra() {
    if (items.length === 0) return;
    setGuardando(true);
    try {
      await registrarCompra({ fecha: fecha.toISOString(), items });
      router.back();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo registrar la compra');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <FormModal
      titulo="Registrar Nueva Compra"
      botonGuardarLabel="Guardar Compra"
      guardando={guardando}
      puedeGuardar={items.length > 0}
      onGuardar={guardarCompra}>
      <View>
        <Text className="mb-1 text-xs font-semibold text-slate-500">Fecha</Text>
        <Pressable
          onPress={() => setMostrarFecha(true)}
          className="h-12 flex-row items-center gap-2 rounded-lg border border-slate-300 bg-white px-3">
          <MaterialIcons name="calendar-today" size={18} color="#64748b" />
          <Text className="text-slate-900">{formatearFecha(fecha)}</Text>
        </Pressable>
        {mostrarFecha && (
          <DateTimePicker
            value={fecha}
            mode="date"
            maximumDate={new Date()}
            onChange={(_, seleccionada) => {
              setMostrarFecha(false);
              if (seleccionada) setFecha(seleccionada);
            }}
          />
        )}
      </View>

      <View className="gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
        <Text className="text-base font-bold text-slate-900">Agregar Insumo</Text>

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

        <View className="flex-row gap-3">
          <View className="flex-1">
            <Text className="mb-1 text-xs font-semibold text-slate-500">Cantidad</Text>
            <TextInput
              value={cantidad}
              onChangeText={setCantidad}
              keyboardType="decimal-pad"
              placeholder="0"
              className="h-12 rounded-lg border border-slate-300 bg-white px-3 text-slate-900"
            />
          </View>
          <View className="flex-1">
            <Text className="mb-1 text-xs font-semibold text-slate-500">Precio</Text>
            <View className="h-12 flex-row items-center rounded-lg border border-slate-300 bg-white px-3">
              <Text className="mr-1 text-slate-500">$</Text>
              <TextInput
                value={precio}
                onChangeText={setPrecio}
                keyboardType="decimal-pad"
                placeholder="0.00"
                className="flex-1 text-slate-900"
              />
            </View>
          </View>
        </View>

        <Pressable
          onPress={agregarInsumo}
          className="h-12 flex-row items-center justify-center gap-1 rounded-lg bg-secondary-500 active:bg-secondary-600">
          <MaterialIcons name="check" size={18} color="#ffffff" />
          <Text className="font-semibold text-white">Agregar insumo</Text>
        </Pressable>
      </View>

      <View className="gap-2">
        <Text className="text-base font-bold text-slate-900">Lista de Agregados</Text>
        {items.length === 0 && <Text className="text-sm text-slate-500">Todavía no agregaste insumos.</Text>}
        {items.length > 0 && (
          <View className="divide-y divide-slate-100 rounded-xl border border-slate-100 bg-white">
            {items.map((item, i) => (
              <View key={`${item.insumoNombre}-${i}`} className="flex-row items-center justify-between p-3">
                <View className="flex-row items-center gap-3">
                  <View className="h-10 w-10 items-center justify-center rounded-full bg-slate-100">
                    <MaterialIcons name="inventory" size={18} color="#64748b" />
                  </View>
                  <View>
                    <Text className="font-semibold text-slate-900">{item.insumoNombre}</Text>
                    <Text className="text-xs text-slate-500">
                      {item.cantidad}
                      {item.unidad}
                    </Text>
                  </View>
                </View>
                <View className="items-end">
                  <Text className="font-bold text-slate-900">${item.precio.toFixed(2)}</Text>
                  <Pressable hitSlop={8} onPress={() => quitarInsumo(i)}>
                    <Text className="mt-0.5 text-xs font-semibold text-red-600">Quitar</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}

        <View className="flex-row items-center justify-between border-t border-slate-200 pt-3">
          <Text className="text-lg font-bold text-slate-900">Total</Text>
          <Text className="text-2xl font-bold text-primary-700">${total.toFixed(2)}</Text>
        </View>
      </View>
    </FormModal>
  );
}
