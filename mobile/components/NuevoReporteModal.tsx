import { useState } from "react";
import type { ComponentProps } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import type {
  CrearReportePayload,
  Reporte,
  TipoReporte,
} from "../services/reportes";
import { crearReporte } from "../services/reportes";
import { subirFotoReporte } from "../services/storage";
import { colors, iosTitleFont, radii, shadow } from "../theme/tokens";

type IconName = ComponentProps<typeof MaterialCommunityIcons>["name"];

const TIPOS: { value: TipoReporte; label: string; icono: IconName; color: string }[] = [
  { value: "accidente", label: "Accidente",  icono: "car-emergency",  color: "#DC2626" },
  { value: "hueco",     label: "Hueco",      icono: "road-variant",   color: "#D97706" },
  { value: "arroyo",    label: "Arroyo",     icono: "waves",          color: "#2563EB" },
  { value: "semaforo_danado", label: "Semáforo", icono: "traffic-light", color: "#7C3AED" },
  { value: "otro",      label: "Otro",       icono: "alert-circle",   color: "#6B7280" },
];

interface Props {
  visible: boolean;
  onDismiss: () => void;
  latitud: number;
  longitud: number;
  onCreado: () => void;
  /** JWT del usuario logueado (obligatorio al enviar). */
  accessToken: string;
}

function cerrarTodo(onDismiss: () => void) {
  Keyboard.dismiss();
  onDismiss();
}

export default function NuevoReporteModal({
  visible,
  onDismiss,
  latitud,
  longitud,
  onCreado,
  accessToken,
}: Props) {
  const [tipo, setTipo] = useState<TipoReporte>("hueco");
  const [descripcion, setDescripcion] = useState("");
  const [severidad, setSeveridad] = useState(3);
  const [fotoUri, setFotoUri] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function elegirFoto() {
    const permisos = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permisos.granted) {
      setError("Permiso de galería denegado.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.7,
      allowsEditing: true,
    });
    if (!result.canceled && result.assets[0]) {
      setFotoUri(result.assets[0].uri);
    }
  }

  async function tomarFoto() {
    const permisos = await ImagePicker.requestCameraPermissionsAsync();
    if (!permisos.granted) {
      setError("Permiso de cámara denegado.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.7,
      allowsEditing: true,
    });
    if (!result.canceled && result.assets[0]) {
      setFotoUri(result.assets[0].uri);
    }
  }

  function mostrarFeedback(reporte: Reporte) {
    if (reporte.reporte_padre_id !== null) {
      Alert.alert(
        "¡Gracias por confirmar!",
        "Tu reporte se sumó a otro cercano del mismo tipo y ayuda a validarlo. Cuando tres usuarios coincidan, será visible en el mapa.",
      );
      return;
    }
    if (reporte.estado === "pendiente") {
      Alert.alert(
        "Reporte en revisión",
        "Tu reporte fue registrado y está en revisión. Será visible en el mapa cuando otros usuarios reporten lo mismo cerca.",
      );
      return;
    }
    Alert.alert("Reporte creado", "Tu reporte ya está visible en el mapa.");
  }

  async function enviar() {
    Keyboard.dismiss();
    setGuardando(true);
    setError(null);
    try {
      let fotoUrl: string | null = null;
      if (fotoUri) {
        fotoUrl = await subirFotoReporte(fotoUri, accessToken);
      }
      const payload: CrearReportePayload = {
        tipo,
        descripcion: descripcion.trim() || null,
        foto_url: fotoUrl,
        latitud,
        longitud,
        severidad,
      };
      const reporte = await crearReporte(payload, accessToken);
      setDescripcion("");
      setFotoUri(null);
      onCreado();
      onDismiss();
      mostrarFeedback(reporte);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal animationType="slide" transparent visible={visible}>
      <View style={styles.fondo}>
        <Pressable
          accessibilityLabel="Ocultar teclado"
          accessibilityRole="button"
          style={StyleSheet.absoluteFill}
          onPress={() => Keyboard.dismiss()}
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
          pointerEvents="box-none"
          style={styles.kav}
        >
          <View style={styles.tarjeta}>
            <View style={styles.cabecera}>
              <Text style={styles.titulo}>Nuevo reporte</Text>
              <Pressable
                accessibilityLabel="Cerrar"
                accessibilityRole="button"
                disabled={guardando}
                hitSlop={12}
                style={styles.btnCerrar}
                onPress={() => cerrarTodo(onDismiss)}
              >
                <MaterialCommunityIcons
                  color={colors.textMuted}
                  name="close"
                  size={20}
                />
              </Pressable>
            </View>
            <Text style={styles.sub}>
              Coordenadas: {latitud.toFixed(5)}, {longitud.toFixed(5)}
            </Text>

            <ScrollView
              indicatorStyle="default"
              keyboardDismissMode="on-drag"
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.etiqueta}>¿Qué ves?</Text>
              <View style={styles.gridTipos}>
                {TIPOS.map((t) => {
                  const activo = tipo === t.value;
                  return (
                    <Pressable
                      key={t.value}
                      accessibilityLabel={t.label}
                      accessibilityRole="button"
                      accessibilityState={{ selected: activo }}
                      disabled={guardando}
                      onPress={() => setTipo(t.value)}
                      style={({ pressed }) => [
                        styles.tipoItem,
                        pressed && { opacity: 0.72 },
                      ]}
                    >
                      <View
                        style={[
                          styles.tipoCirculo,
                          { backgroundColor: activo ? t.color : `${t.color}1F` },
                          activo && {
                            shadowColor: t.color,
                            shadowOpacity: 0.45,
                            shadowRadius: 10,
                            shadowOffset: { width: 0, height: 4 },
                            elevation: 8,
                          },
                        ]}
                      >
                        <MaterialCommunityIcons
                          name={t.icono}
                          size={32}
                          color={activo ? "#fff" : t.color}
                        />
                      </View>
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.tipoLabel,
                          activo && { color: t.color, fontWeight: "800" },
                        ]}
                      >
                        {t.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.etiqueta}>Severidad (1–5)</Text>
              <View style={styles.filaSev}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <Pressable
                    key={n}
                    accessibilityRole="button"
                    disabled={guardando}
                    style={[
                      styles.sevBtn,
                      severidad === n && styles.sevBtnActivo,
                    ]}
                    onPress={() => setSeveridad(n)}
                  >
                    <Text
                      style={[
                        styles.sevTxt,
                        severidad === n && styles.sevTxtActivo,
                      ]}
                    >
                      {n}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.etiqueta}>Descripción (opcional)</Text>
              <TextInput
                style={styles.input}
                editable={!guardando}
                multiline
                numberOfLines={3}
                onChangeText={setDescripcion}
                placeholder="Qué ves en la vía..."
                placeholderTextColor="#999"
                returnKeyType="default"
                value={descripcion}
              />

              <Text style={styles.etiqueta}>Foto (opcional)</Text>
              <View style={styles.filaFoto}>
                <Pressable
                  accessibilityRole="button"
                  disabled={guardando}
                  style={styles.btnFoto}
                  onPress={() => void tomarFoto()}
                >
                  <Text style={styles.btnFotoTxt}>Cámara</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  disabled={guardando}
                  style={styles.btnFoto}
                  onPress={() => void elegirFoto()}
                >
                  <Text style={styles.btnFotoTxt}>Galería</Text>
                </Pressable>
                {fotoUri && (
                  <Pressable onPress={() => setFotoUri(null)}>
                    <Text style={styles.quitarFoto}>✕</Text>
                  </Pressable>
                )}
              </View>
              {fotoUri && (
                <Image
                  source={{ uri: fotoUri }}
                  style={styles.preview}
                  resizeMode="cover"
                />
              )}

              <Pressable
                accessibilityRole="button"
                disabled={guardando}
                style={styles.btnTeclado}
                onPress={() => Keyboard.dismiss()}
              >
                <Text style={styles.btnTecladoTxt}>Ocultar teclado</Text>
              </Pressable>

              {error && <Text style={styles.error}>{error}</Text>}

              <View style={styles.acciones}>
                <Pressable
                  accessibilityRole="button"
                  disabled={guardando}
                  style={[styles.btn, styles.btnGhost]}
                  onPress={() => cerrarTodo(onDismiss)}
                >
                  <Text style={styles.btnGhostTxt}>Cancelar</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  disabled={guardando}
                  style={[styles.btn, styles.btnPrimario]}
                  onPress={() => void enviar()}
                >
                  {guardando ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.btnPrimTxt}>Enviar</Text>
                  )}
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fondo: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "flex-end",
  },
  kav: {
    maxHeight: "92%",
    width: "100%",
  },
  tarjeta: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderTopWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.select({ ios: 28, android: 20, default: 24 }),
    maxHeight: "100%",
  },
  cabecera: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  titulo: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.text,
    flex: 1,
    fontFamily: iosTitleFont,
    letterSpacing: 0.25,
  },
  btnCerrar: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    backgroundColor: colors.surfaceMuted,
  },
  sub: { fontSize: 12, color: colors.textMuted, marginBottom: 16 },
  etiqueta: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textMuted,
    marginBottom: 8,
  },
  gridTipos: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 16,
  },
  tipoItem: {
    width: "33.33%",
    alignItems: "center",
    paddingVertical: 10,
  },
  tipoCirculo: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  tipoLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.text,
    textAlign: "center",
    letterSpacing: 0.1,
  },
  filaSev: { flexDirection: "row", gap: 10, marginBottom: 14 },
  sevBtn: {
    width: 42,
    height: 42,
    borderRadius: radii.sm,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceMuted,
  },
  sevBtnActivo: { backgroundColor: colors.accent },
  sevTxt: { fontSize: 16, fontWeight: "700", color: colors.textMuted },
  sevTxtActivo: { color: "#fff" },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    padding: 12,
    fontSize: 15,
    minHeight: 80,
    textAlignVertical: "top",
    color: colors.text,
    marginBottom: 8,
    backgroundColor: colors.surfaceMuted,
  },
  filaFoto: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    marginBottom: 10,
  },
  btnFoto: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  btnFotoTxt: { fontSize: 13, fontWeight: "700", color: colors.text },
  quitarFoto: { fontSize: 18, color: colors.danger, paddingHorizontal: 6 },
  preview: {
    width: "100%",
    height: 140,
    borderRadius: radii.sm,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  btnTeclado: {
    alignSelf: "flex-start",
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginBottom: 12,
  },
  btnTecladoTxt: { fontSize: 15, color: colors.primaryDark, fontWeight: "700" },
  error: {
    color: colors.danger,
    fontSize: 13,
    marginBottom: 12,
    backgroundColor: "rgba(220,38,38,0.08)",
    borderRadius: radii.sm,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  acciones: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 6,
    paddingBottom: 8,
  },
  btn: {
    minWidth: 110,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
  },
  btnGhost: { backgroundColor: "transparent" },
  btnGhostTxt: { color: colors.textMuted, fontWeight: "700", fontSize: 15 },
  btnPrimario: {
    backgroundColor: colors.primary,
    ...shadow.floating,
  },
  btnPrimTxt: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
