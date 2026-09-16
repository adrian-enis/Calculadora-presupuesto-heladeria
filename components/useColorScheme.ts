import { useColorScheme as useColorSchemeCore } from 'react-native';

// ColorSchemeName incluye null/undefined y, en Android, 'unspecified'.
// El fallback explícito evita que Colors[colorScheme] reciba algo que no sea 'light' | 'dark'.
export function useColorScheme(): 'light' | 'dark' {
  const scheme = useColorSchemeCore();
  return scheme === 'dark' ? 'dark' : 'light';
}
