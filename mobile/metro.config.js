// https://docs.expo.dev/guides/customizing-metro/
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Excluir carpetas que EAS/Xcode modifican durante builds para evitar recargas fantasma
config.watchFolders = [__dirname];
config.resolver.blockList = [
  // Archivos derivados de Xcode que cambian frecuentemente
  /ios\/build\/.*/,
  /ios\/Pods\/.*/,
  /ios\/\.xcode\.env\.local/,
  // Carpeta .expo que EAS actualiza
  /\.expo\/devices\.json/,
];

module.exports = config;
