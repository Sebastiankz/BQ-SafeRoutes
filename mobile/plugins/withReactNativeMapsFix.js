const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

// react-native-maps no es compatible con use_frameworks! :linkage => :static
// (requerido por @react-native-google-signin/google-signin). Sus headers usan
// imports non-modular de React-Core, y al promoverse a static framework el
// sistema de modulos los rechaza.
//
// Expo ya tiene una API para este caso: `expo_add_modules_to_patch` extiende
// la lista interna de pods cuyo build_type se fuerza a static_library, con
// todos los side effects que eso requiere (xcconfig, headers, etc.).
// La usamos para excluir react-native-maps del modo frameworks.
const MARKER = "# react-native-maps fix: expo_add_modules_to_patch";
const SNIPPET = `\n${MARKER}\nexpo_add_modules_to_patch ['react-native-maps', 'react-native-google-maps']\n`;

module.exports = function withReactNativeMapsFix(config) {
  return withDangerousMod(config, [
    "ios",
    async (mod) => {
      const podfile = path.join(mod.modRequest.platformProjectRoot, "Podfile");
      let contents = fs.readFileSync(podfile, "utf8");
      if (contents.includes(MARKER)) {
        return mod;
      }
      // Insertarlo al nivel raiz del Podfile, justo antes del primer 'target'
      contents = contents.replace(/(\ntarget '[^']+' do\n)/, `${SNIPPET}$1`);
      fs.writeFileSync(podfile, contents);
      return mod;
    },
  ]);
};
