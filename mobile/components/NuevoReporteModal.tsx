import { useState } from "react";
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

import type { CrearReportePayload, Reporte, TipoReporte } from "../services/reportes";
import { crearReporte } from "../services/reportes";
import { subirFotoReporte } from "../services/storage";

const TIPOS: { value: TipoReporte; label: string }[] = [
  { value: "accidente", label: "Accidente" },
  { value: "hueco", label: "Hueco" },
  { value: "arroyo", label: "Arroyo" },
  { value: "semaforo_danado", label: "Semáforo" },
  { value: "otro", label: "Otro" },
];

interface Props {
  visible: boolean;
  onDismiss: () => void;
  latitud: number;
  longitud: number;
  onCreado: () => void;
  /** JWT del usuario logueado (obligatorio al enviar). */
  accessToken: string;
  /** UUID del usuario (para nombrar archivo en Storage). */
  userId: string;
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
  userId,
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
        fotoUrl = await subirFotoReporte(fotoUri, userId);
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
                <Text style={styles.btnCerrarTxt}>✕</Text>
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
              <Text style={styles.etiqueta}>Tipo</Text>
              <View style={styles.gridTipos}>
                {TIPOS.map((t) => (
                  <Pressable
                    key={t.value}
                    accessibilityRole="button"
                    disabled={guardando}
                    style={[styles.chip, tipo === t.value && styles.chipActivo]}
                    onPress={() => setTipo(t.value)}
                  >
                    <Text style={[styles.chipTxt, tipo === t.value && styles.chipTxtActivo]}>{t.label}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.etiqueta}>Severidad (1–5)</Text>
              <View style={styles.filaSev}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <Pressable
                    key={n}
                    accessibilityRole="button"
                    disabled={guardando}
                    style={[styles.sevBtn, severidad === n && styles.sevBtnActivo]}
                    onPress={() => setSeveridad(n)}
                  >
                    <Text style={[styles.sevTxt, severidad === n && styles.sevTxtActivo]}>{n}</Text>
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
                <Image source={{ uri: fotoUri }} style={styles.preview} resizeMode="cover" />
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
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  kav: {
    maxHeight: "92%",
    width: "100%",
  },
  tarjeta: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
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
  titulo: { fontSize: 20, fontWeight: "700", color: "#1a202c", flex: 1 },
  btnCerrar: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    backgroundColor: "#edf2f7",
  },
  btnCerrarTxt: { fontSize: 18, color: "#4a5568", fontWeight: "600" },
  sub: { fontSize: 12, color: "#718096", marginBottom: 16 },
  etiqueta: { fontSize: 13, fontWeight: "600", color: "#4a5568", marginBottom: 8 },
  gridTipos: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#edf2f7",
  },
  chipActivo: { backgroundColor: "#E53E3E" },
  chipTxt: { fontSize: 13, color: "#2d3748" },
  chipTxtActivo: { color: "#fff", fontWeight: "600" },
  filaSev: { flexDirection: "row", gap: 10, marginBottom: 14 },
  sevBtn: {
    width: 42,
    height: 42,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#edf2f7",
  },
  sevBtnActivo: { backgroundColor: "#2c5282" },
  sevTxt: { fontSize: 16, fontWeight: "600", color: "#4a5568" },
  sevTxtActivo: { color: "#fff" },
  input: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    minHeight: 80,
    textAlignVertical: "top",
    color: "#1a202c",
    marginBottom: 8,
  },
  filaFoto: { flexDirection: "row", gap: 10, alignItems: "center", marginBottom: 10 },
  btnFoto: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: "#edf2f7" },
  btnFotoTxt: { fontSize: 13, fontWeight: "600", color: "#2d3748" },
  quitarFoto: { fontSize: 18, color: "#c53030", paddingHorizontal: 6 },
  preview: { width: "100%", height: 140, borderRadius: 10, marginBottom: 10 },
  btnTeclado: { alignSelf: "flex-start", paddingVertical: 8, paddingHorizontal: 4, marginBottom: 12 },
  btnTecladoTxt: { fontSize: 15, color: "#2b6cb0", fontWeight: "600" },
  error: { color: "#c53030", fontSize: 13, marginBottom: 12 },
  acciones: { flexDirection: "row", justifyContent: "flex-end", gap: 12, marginTop: 6, paddingBottom: 8 },
  btn: {
    minWidth: 110,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  btnGhost: { backgroundColor: "transparent" },
  btnGhostTxt: { color: "#718096", fontWeight: "600", fontSize: 15 },
  btnPrimario: { backgroundColor: "#E53E3E" },
  btnPrimTxt: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
