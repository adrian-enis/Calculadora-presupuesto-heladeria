import { Pressable, Text, View } from 'react-native';

import { UNIDADES, type Unidad } from '@/lib/unidades';

/** Chips para elegir la unidad de un ítem/ingrediente (Nueva Compra, Nueva Receta). */
export function UnidadPicker({ value, onChange }: { value: Unidad; onChange: (unidad: Unidad) => void }) {
  return (
    <View className="flex-row flex-wrap gap-2">
      {UNIDADES.map((u) => (
        <Pressable
          key={u}
          onPress={() => onChange(u)}
          className={`rounded-full border px-3 py-1.5 ${
            value === u ? 'border-primary-500 bg-primary-500' : 'border-slate-300 bg-white'
          }`}>
          <Text className={`text-xs font-semibold ${value === u ? 'text-white' : 'text-slate-600'}`}>{u}</Text>
        </Pressable>
      ))}
    </View>
  );
}
