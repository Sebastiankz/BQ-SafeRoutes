import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { DrawerNavigationProp } from "@react-navigation/drawer";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useAuth } from "../context/AuthContext";
import type { RootDrawerParamList } from "../navigation/types";
import type { Reporte } from "../services/reportes";
import { listarMisReportes } from "../services/reportes";

type Nav = DrawerNavigationProp<RootDrawerParamList>;

export default function MisReportesScreen() {
  const navigation = useNavigation<Nav>();
  const { token } = useAuth();
  const [items, setItems] = useState<Reporte[]>([]);
  const [carga, setCarga] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    if (!token) return;
    setCarga(true);
    setError(null);
    try {
      const lista = await listarMisReportes(token, 200, 0);
      setItems(lista);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setCarga(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      void cargar();
    }, [cargar]),
  );

  if (!token) {
    return (
      <View style={styles.centrado}>
        <Text style={styles.titulo}>Mis reportes</Text>
        <Text style={styles.aviso}>Iniciá sesión para ver tus reportes enviados.</Text>
        <Pressable accessibilityRole="button" style={styles.btn} onPress={() => navigation.navigate("MiCuenta")}>
          <Text style={styles.btnTxt}>Ir a Mi cuenta</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <Text style={[styles.titulo, styles.tituloPad]}>Mis reportes</Text>
      {carga && items.length === 0 ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#E53E3E" />
      ) : null}
      {error && <Text style={styles.error}>{error}</Text>}
      <FlatList
        contentContainerStyle={styles.lista}
        data={items}
        keyExtractor={(item) => String(item.id)}
        ListEmptyComponent={
          !carga ? (
            <Text style={styles.vacio}>Aún no tenés reportes con esta cuenta.</Text>
          ) : null
        }
        refreshing={carga && items.length > 0}
        renderItem={({ item }) => (
          <View style={styles.tarjeta}>
            <Text style={styles.tarjetaTit}>{item.tipo}</Text>
            <Text style={styles.meta}>
              Sev. {item.severidad} · {new Date(item.created_at).toLocaleString()}
            </Text>
            <Text style={styles.coords}>
              {item.latitud.toFixed(5)}, {item.longitud.toFixed(5)}
            </Text>
            {item.descripcion ? <Text style={styles.desc}>{item.descripcion}</Text> : null}
          </View>
        )}
        onRefresh={() => void cargar()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#f7fafc" },
  centrado: {
    flex: 1,
    padding: 24,
    paddingTop: Platform.OS === "ios" ? 56 : 32,
    justifyContent: "center",
    backgroundColor: "#f7fafc",
  },
  titulo: { fontSize: 26, fontWeight: "800", color: "#1a202c" },
  tituloPad: { paddingHorizontal: 20, paddingTop: Platform.OS === "ios" ? 56 : 32, paddingBottom: 12 },
  aviso: { fontSize: 16, color: "#4a5568", marginTop: 12, marginBottom: 24, lineHeight: 22 },
  btn: {
    alignSelf: "flex-start",
    backgroundColor: "#E53E3E",
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: 10,
  },
  btnTxt: { color: "#fff", fontWeight: "700", fontSize: 16 },
  lista: { paddingHorizontal: 20, paddingBottom: 40, gap: 12 },
  error: { color: "#c53030", paddingHorizontal: 20, marginBottom: 8 },
  vacio: { color: "#718096", textAlign: "center", marginTop: 48, fontSize: 15 },
  tarjeta: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#e2e8f0",
  },
  tarjetaTit: { fontSize: 17, fontWeight: "700", color: "#E53E3E", textTransform: "capitalize" },
  meta: { fontSize: 13, color: "#718096", marginTop: 4 },
  coords: { fontSize: 12, color: "#a0aec0", marginTop: 4 },
  desc: { fontSize: 15, color: "#2d3748", marginTop: 10 },
});
