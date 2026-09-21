import { Stack } from 'expo-router';

export default function RecetasLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="nueva" options={{ presentation: 'transparentModal', animation: 'fade' }} />
    </Stack>
  );
}
