import { Platform, StyleSheet, Text, View } from "react-native";

import Constants from "expo-constants";

export default function AjustesScreen() {
  return (
    <View style={styles.contenedor}>
      <Text style={styles.titulo}>Ajustes</Text>
      <Text style={styles.txt}>
        Aquí más adelante podrás ajustar notificaciones, idioma y preferencias del mapa.
      </Text>
      <Text style={styles.ver}>SafeRoutes BQ · v{Constants.expoConfig?.version ?? "1"}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    padding: 24,
    paddingTop: Platform.OS === "ios" ? 56 : 32,
    backgroundColor: "#f7fafc",
  },
  titulo: {
    fontSize: 26,
    fontWeight: "800",
    color: "#1a202c",
    marginBottom: 16,
  },
  txt: { fontSize: 16, color: "#4a5568", lineHeight: 24 },
  ver: { marginTop: 32, fontSize: 13, color: "#a0aec0" },
});
