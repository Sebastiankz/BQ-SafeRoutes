import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import type { Reporte } from "../services/reportes";
import { colors, iosTitleFont, radii, shadow } from "../theme/tokens";

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

export default function VigenciaModal({
  reporte,
  enviando,
  onResponder,
  onDismiss,
}: Props) {
  const visible = reporte !== null;
  const etiqueta = reporte ? (LABEL_TIPO[reporte.tipo] ?? reporte.tipo) : "";

  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={onDismiss}
    >
      <View style={styles.fondo}>
        <View style={styles.tarjeta}>
          <View style={styles.iconoWrap}>
            <MaterialCommunityIcons
              color={colors.primaryDark}
              name="map-marker-alert-outline"
              size={24}
            />
          </View>
          <Text style={styles.titulo}>¿Sigue ahí?</Text>
          <Text style={styles.mensaje}>
            Estás cerca de un <Text style={styles.bold}>{etiqueta}</Text>{" "}
            reportado por la comunidad. ¿Lo sigues viendo en este lugar?
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
    backgroundColor: colors.overlay,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  tarjeta: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    ...shadow.floating,
  },
  iconoWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(14,165,164,0.14)",
    marginBottom: 8,
  },
  titulo: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.text,
    marginBottom: 8,
    fontFamily: iosTitleFont,
  },
  mensaje: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
    marginBottom: 18,
  },
  bold: { fontWeight: "700", color: colors.primaryDark },
  acciones: { flexDirection: "row", gap: 10, marginBottom: 8 },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
  },
  btnSi: {
    backgroundColor: colors.success,
    ...shadow.card,
  },
  btnSiTxt: { color: "#fff", fontWeight: "700", fontSize: 15 },
  btnNo: { backgroundColor: "rgba(220,38,38,0.14)" },
  btnNoTxt: { color: colors.danger, fontWeight: "700", fontSize: 15 },
  btnSaltar: { alignSelf: "center", paddingVertical: 10 },
  btnSaltarTxt: { color: colors.textMuted, fontSize: 14, fontWeight: "700" },
});
