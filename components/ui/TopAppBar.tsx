import { MaterialIcons } from '@expo/vector-icons';
import { Text, View } from 'react-native';

/** Barra superior compartida por las pantallas raíz de cada tab. */
export function TopAppBar() {
  return (
    <View className="h-12 w-full flex-row items-center justify-between bg-white px-4 shadow-sm">
      <View className="flex-row items-center gap-2">
        <MaterialIcons name="calendar-today" size={20} color="#047857" />
        <Text className="text-xl font-bold text-primary-700">Heladería Dibuluc</Text>
      </View>
      <MaterialIcons name="account-circle" size={26} color="#047857" />
    </View>
  );
}
