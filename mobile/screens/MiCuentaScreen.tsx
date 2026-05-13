import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import RevealView from "../components/RevealView";
import { useAuth } from "../context/AuthContext";
import { colors, iosTitleFont, radii, shadow, spacing } from "../theme/tokens";

export default function MiCuentaScreen() {
  const { usuario, iniciarSesion, registrar, cerrarSesion } = useAuth();

  const [modoRegistro, setModoRegistro] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nombre, setNombre] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function entrar() {
    setError(null);
    setCargando(true);
    try {
      await iniciarSesion(email.trim(), password);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setCargando(false);
    }
  }

  async function crearCuentaYEntrar() {
    setError(null);
    setCargando(true);
    try {
      await registrar(email.trim(), password, nombre.trim());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setCargando(false);
    }
  }

  const formularioValido =
    !!email.trim() && !!password.trim() && (!modoRegistro || !!nombre.trim());

  if (usuario) {
    return (
      <View style={styles.flex}>
        <View pointerEvents="none" style={styles.blobA} />
        <View pointerEvents="none" style={styles.blobB} />

        <View style={styles.contenedorCentrado}>
          <RevealView delay={40}>
            <Text style={styles.tag}>Perfil activo</Text>
            <Text style={styles.titulo}>Mi cuenta</Text>
          </RevealView>

          <RevealView delay={120} style={styles.cardPerfil}>
            <View style={styles.avatarWrap}>
              <MaterialCommunityIcons
                color={colors.primaryDark}
                name="account"
                size={34}
              />
            </View>

            <Text style={styles.label}>Nombre</Text>
            <Text style={styles.valor}>{usuario.nombre ?? "Sin nombre"}</Text>
            <Text style={styles.label}>Correo</Text>
            <Text style={styles.valor}>{usuario.email}</Text>

            <Pressable
              accessibilityRole="button"
              disabled={cargando}
              style={[
                styles.btn,
                styles.btnDanger,
                cargando && styles.btnDisabled,
              ]}
              onPress={() => void cerrarSesion()}
            >
              <MaterialCommunityIcons color="#fff" name="logout" size={18} />
              <Text style={styles.btnPrimTxt}>Cerrar sesion</Text>
            </Pressable>
          </RevealView>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={64}
      style={styles.flex}
    >
      <View pointerEvents="none" style={styles.blobA} />
      <View pointerEvents="none" style={styles.blobB} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <RevealView delay={40}>
          <Text style={styles.tag}>Acceso seguro</Text>
          <Text style={styles.titulo}>
            {modoRegistro ? "Crear una cuenta" : "Iniciar sesion"}
          </Text>
          <Text style={styles.subTitulo}>
            Reporta incidentes, confirma vigencia y revisa tus aportes.
          </Text>
        </RevealView>

        <RevealView delay={120} style={styles.cardForm}>
          <View style={styles.segmentedRow}>
            <Pressable
              accessibilityRole="button"
              disabled={cargando}
              onPress={() => {
                setError(null);
                setModoRegistro(false);
              }}
              style={[
                styles.segmentedBtn,
                !modoRegistro && styles.segmentedBtnActiva,
              ]}
            >
              <Text
                style={[
                  styles.segmentedTxt,
                  !modoRegistro && styles.segmentedTxtActiva,
                ]}
              >
                Entrar
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              disabled={cargando}
              onPress={() => {
                setError(null);
                setModoRegistro(true);
              }}
              style={[
                styles.segmentedBtn,
                modoRegistro && styles.segmentedBtnActiva,
              ]}
            >
              <Text
                style={[
                  styles.segmentedTxt,
                  modoRegistro && styles.segmentedTxtActiva,
                ]}
              >
                Registro
              </Text>
            </Pressable>
          </View>

          {modoRegistro && (
            <>
              <Text style={styles.hintEtiqueta}>Nombre</Text>
              <TextInput
                autoCapitalize="words"
                editable={!cargando}
                onChangeText={setNombre}
                placeholder="Tu nombre"
                placeholderTextColor="#94A3B8"
                style={styles.input}
                value={nombre}
              />
            </>
          )}

          <Text style={styles.hintEtiqueta}>Correo electronico</Text>
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            editable={!cargando}
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder="tu@correo.com"
            placeholderTextColor="#94A3B8"
            style={styles.input}
            value={email}
          />

          <Text style={styles.hintEtiqueta}>Contrasena</Text>
          <TextInput
            editable={!cargando}
            onChangeText={setPassword}
            placeholder="Minimo 6 caracteres"
            placeholderTextColor="#94A3B8"
            secureTextEntry
            style={styles.input}
            value={password}
          />

          {error && <Text style={styles.error}>{error}</Text>}

          <Pressable
            accessibilityRole="button"
            disabled={cargando || !formularioValido}
            style={[
              styles.btn,
              styles.btnPrimario,
              (cargando || !formularioValido) && styles.btnDisabled,
            ]}
            onPress={() =>
              void (modoRegistro ? crearCuentaYEntrar() : entrar())
            }
          >
            {cargando ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <MaterialCommunityIcons
                  color="#fff"
                  name="shield-check"
                  size={18}
                />
                <Text style={styles.btnPrimTxt}>
                  {modoRegistro ? "Crear cuenta" : "Entrar"}
                </Text>
              </>
            )}
          </Pressable>

          <Pressable
            accessibilityRole="button"
            disabled={cargando}
            style={styles.switchModo}
            onPress={() => {
              setError(null);
              setModoRegistro((m) => !m);
            }}
          >
            <Text style={styles.switchTxt}>
              {modoRegistro
                ? "Ya tienes cuenta? Entrar"
                : "Aun no tienes cuenta? Registrarse"}
            </Text>
          </Pressable>
        </RevealView>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
    overflow: "hidden",
  },
  blobA: {
    position: "absolute",
    top: -60,
    right: -30,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(14,165,164,0.18)",
  },
  blobB: {
    position: "absolute",
    left: -80,
    bottom: 40,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(249,115,22,0.12)",
  },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: Platform.OS === "ios" ? 62 : 36,
    paddingBottom: 40,
  },
  contenedorCentrado: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: Platform.OS === "ios" ? 62 : 36,
  },
  tag: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(14,165,164,0.14)",
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: "700",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.pill,
    letterSpacing: 0.3,
    marginBottom: 10,
    textTransform: "uppercase",
  },
  titulo: {
    fontSize: 31,
    fontWeight: "800",
    color: colors.text,
    marginBottom: 10,
    fontFamily: iosTitleFont,
    letterSpacing: 0.35,
  },
  subTitulo: {
    fontSize: 15,
    color: colors.textMuted,
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  cardForm: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    ...shadow.card,
  },
  segmentedRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  segmentedBtn: {
    flex: 1,
    borderRadius: radii.sm,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceMuted,
  },
  segmentedBtnActiva: {
    backgroundColor: "rgba(14,165,164,0.18)",
  },
  segmentedTxt: {
    color: colors.textMuted,
    fontWeight: "700",
    fontSize: 14,
  },
  segmentedTxtActiva: {
    color: colors.primaryDark,
  },
  hintEtiqueta: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textMuted,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    padding: 14,
    fontSize: 16,
    color: colors.text,
    marginBottom: 14,
    backgroundColor: colors.surfaceMuted,
  },
  error: {
    color: colors.danger,
    marginBottom: 12,
    fontSize: 13,
    backgroundColor: "rgba(220,38,38,0.08)",
    borderRadius: radii.sm,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  btn: {
    paddingVertical: 14,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    flexDirection: "row",
    gap: 8,
  },
  btnPrimario: {
    backgroundColor: colors.primary,
    ...shadow.floating,
  },
  btnDanger: {
    marginTop: spacing.lg,
    backgroundColor: colors.danger,
    ...shadow.floating,
  },
  btnDisabled: {
    opacity: 0.55,
  },
  btnPrimTxt: { color: "#fff", fontSize: 16, fontWeight: "700" },
  switchModo: { marginTop: 18, alignSelf: "center", paddingVertical: 8 },
  switchTxt: { color: colors.primaryDark, fontSize: 14, fontWeight: "700" },
  cardPerfil: {
    marginTop: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    ...shadow.card,
  },
  avatarWrap: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(14,165,164,0.14)",
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.35,
    marginTop: 6,
  },
  valor: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.text,
    marginTop: 4,
  },
});
