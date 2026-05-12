import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import type { Reporte } from "../services/reportes";

const LABEL_TIPO: Record<string, string> = {
  accidente: "accidente",
  hueco: "hueco",
  arroyo: "arroyo",
  semaforo_danado: "semáforo dañado",
  otro: "incidente",
};

interface Props {
  reporte: Reporte | null;
  enviando: boolean;
  onResponder: (sigue: boolean) => void;
  onDismiss: () => void;
}

export default function VigenciaModal({ reporte, enviando, onResponder, onDismiss }: Props) {
  const visible = reporte !== null;
  const etiqueta = reporte ? (LABEL_TIPO[reporte.tipo] ?? reporte.tipo) : "";

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onDismiss}>
      <View style={styles.fondo}>
        <View style={styles.tarjeta}>
          <Text style={styles.titulo}>¿Sigue ahí?</Text>
          <Text style={styles.mensaje}>
            Estás cerca de un <Text style={styles.bold}>{etiqueta}</Text> reportado por la comunidad.
            ¿Lo sigues viendo en este lugar?
          </Text>

          <View style={styles.acciones}>
            <Pressable
              accessibilityRole="button"
              disabled={enviando}
              style={[styles.btn, styles.btnNo]}
              onPress={() => onResponder(false)}
            >
              <Text style={styles.btnNoTxt}>Ya no está</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={enviando}
              style={[styles.btn, styles.btnSi]}
              onPress={() => onResponder(true)}
            >
              <Text style={styles.btnSiTxt}>Sí, sigue</Text>
            </Pressable>
          </View>

          <Pressable
            accessibilityRole="button"
            disabled={enviando}
            style={styles.btnSaltar}
            onPress={onDismiss}
          >
            <Text style={styles.btnSaltarTxt}>Saltar</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fondo: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  tarjeta: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 20,
  },
  titulo: { fontSize: 19, fontWeight: "700", color: "#1a202c", marginBottom: 8 },
  mensaje: { fontSize: 15, color: "#2d3748", lineHeight: 22, marginBottom: 18 },
  bold: { fontWeight: "700", color: "#1a202c" },
  acciones: { flexDirection: "row", gap: 10, marginBottom: 8 },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  btnSi: { backgroundColor: "#16a34a" },
  btnSiTxt: { color: "#fff", fontWeight: "700", fontSize: 15 },
  btnNo: { backgroundColor: "#FED7D7" },
  btnNoTxt: { color: "#742A2A", fontWeight: "700", fontSize: 15 },
  btnSaltar: { alignSelf: "center", paddingVertical: 10 },
  btnSaltarTxt: { color: "#718096", fontSize: 14, fontWeight: "600" },
});
