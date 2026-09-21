const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// expo-sqlite en web carga su motor via un módulo .wasm (wa-sqlite) — sin
// esto Metro no sabe resolverlo y el bundle de web falla al importar db/client.
config.resolver.assetExts.push('wasm');

module.exports = withNativeWind(config, { input: './global.css' });
