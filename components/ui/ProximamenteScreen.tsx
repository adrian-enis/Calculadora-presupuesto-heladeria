import { View, Text } from 'react-native';

export function ProximamenteScreen({ titulo }: { titulo: string }) {
  return (
    <View className="flex-1 items-center justify-center bg-slate-50 px-6">
      <Text className="text-xl font-bold text-slate-900">{titulo}</Text>
      <Text className="mt-2 text-center text-sm text-slate-500">Pantalla en construcción — todavía no llegó su diseño.</Text>
    </View>
  );
}
