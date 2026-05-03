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

import { useAuth } from "../context/AuthContext";

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

  if (usuario) {
    return (
      <View style={styles.contenedorCentrado}>
        <Text style={styles.titulo}>Mi cuenta</Text>
        <Text style={styles.label}>Nombre</Text>
        <Text style={styles.valor}>{usuario.nombre ?? "—"}</Text>
        <Text style={styles.label}>Correo</Text>
        <Text style={styles.valor}>{usuario.email}</Text>
        <Pressable
          accessibilityRole="button"
          disabled={cargando}
          style={[styles.btn, styles.btnRojo, { marginTop: 28 }]}
          onPress={() => void cerrarSesion()}
        >
          <Text style={styles.btnRojoTxt}>Cerrar sesión</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={64}
      style={styles.flex}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.titulo}>{modoRegistro ? "Registro" : "Iniciar sesión"}</Text>
        {modoRegistro && (
          <>
            <Text style={styles.hintEtiqueta}>Nombre</Text>
            <TextInput
              autoCapitalize="words"
              editable={!cargando}
              onChangeText={setNombre}
              placeholder="Tu nombre"
              placeholderTextColor="#a0aec0"
              style={styles.input}
              value={nombre}
            />
          </>
        )}
        <Text style={styles.hintEtiqueta}>Correo electrónico</Text>
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          editable={!cargando}
          keyboardType="email-address"
          onChangeText={setEmail}
          placeholder="tu@correo.com"
          placeholderTextColor="#a0aec0"
          style={styles.input}
          value={email}
        />
        <Text style={styles.hintEtiqueta}>Contraseña</Text>
        <TextInput
          editable={!cargando}
          onChangeText={setPassword}
          placeholder="········"
          placeholderTextColor="#a0aec0"
          secureTextEntry
          style={styles.input}
          value={password}
        />

        {error && <Text style={styles.error}>{error}</Text>}

        <Pressable
          accessibilityRole="button"
          disabled={cargando || !email.trim() || !password.trim() || (modoRegistro && !nombre.trim())}
          style={[styles.btn, styles.btnRojo]}
          onPress={() => void (modoRegistro ? crearCuentaYEntrar() : entrar())}
        >
          {cargando ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnRojoTxt}>{modoRegistro ? "Crear cuenta" : "Entrar"}</Text>
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
            {modoRegistro ? "¿Ya tenés cuenta? Iniciar sesión" : "¿Sin cuenta? Registrarse"}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#f7fafc" },
  scroll: { padding: 20, paddingTop: Platform.OS === "ios" ? 56 : 32, paddingBottom: 40 },
  contenedorCentrado: {
    flex: 1,
    padding: 24,
    paddingTop: Platform.OS === "ios" ? 56 : 32,
    backgroundColor: "#f7fafc",
  },
  titulo: {
    fontSize: 26,
    fontWeight: "800",
    color: "#1a202c",
    marginBottom: 20,
  },
  hintEtiqueta: { fontSize: 13, fontWeight: "600", color: "#4a5568", marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: "#1a202c",
    marginBottom: 14,
    backgroundColor: "#fff",
  },
  error: { color: "#c53030", marginBottom: 12, fontSize: 14 },
  btn: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  btnRojo: { backgroundColor: "#E53E3E" },
  btnRojoTxt: { color: "#fff", fontSize: 16, fontWeight: "700" },
  switchModo: { marginTop: 20, alignSelf: "center", paddingVertical: 8 },
  switchTxt: { color: "#2b6cb0", fontSize: 15, fontWeight: "600" },
  label: { fontSize: 12, fontWeight: "600", color: "#718096", marginTop: 12 },
  valor: { fontSize: 17, fontWeight: "600", color: "#2d3748" },
});
