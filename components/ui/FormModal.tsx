import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

/**
 * Cáscara compartida de los formularios que se abren como modal transparente
 * (Nueva Compra, Nueva Receta): header con título/cerrar, body scrolleable,
 * footer Cancelar/Guardar. "Cancelar" y "cerrar" siempre hacen router.back()
 * porque estas pantallas solo existen empujadas como modal sobre su index.
 */
export function FormModal({
  titulo,
  botonGuardarLabel,
  guardando,
  puedeGuardar,
  onGuardar,
  children,
}: {
  titulo: string;
  botonGuardarLabel: string;
  guardando: boolean;
  puedeGuardar: boolean;
  onGuardar: () => void;
  children: ReactNode;
}) {
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 items-center justify-center bg-black/40 p-4">
      <SafeAreaView
        edges={['bottom']}
        className="h-[85%] w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-lg">
        <View className="flex-row items-center justify-between border-b border-slate-100 p-4">
          <Text className="text-lg font-bold text-slate-900">{titulo}</Text>
          <Pressable hitSlop={8} onPress={() => router.back()}>
            <MaterialIcons name="close" size={22} color="#64748b" />
          </Pressable>
        </View>

        <ScrollView
          className="flex-1 px-4"
          contentContainerClassName="gap-4 py-4"
          keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>

        <View className="flex-row gap-3 border-t border-slate-100 p-4">
          <Pressable
            onPress={() => router.back()}
            className="h-12 flex-1 items-center justify-center rounded-lg border border-slate-300 active:bg-slate-50">
            <Text className="font-semibold text-slate-900">Cancelar</Text>
          </Pressable>
          <Pressable
            onPress={onGuardar}
            disabled={!puedeGuardar || guardando}
            className={`h-12 flex-1 items-center justify-center rounded-lg shadow-sm ${
              !puedeGuardar || guardando ? 'bg-primary-500/50' : 'bg-primary-500 active:bg-primary-600'
            }`}>
            <Text className="font-semibold text-white">{guardando ? 'Guardando…' : botonGuardarLabel}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}
