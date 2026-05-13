import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { DrawerNavigationProp } from "@react-navigation/drawer";
import { MaterialCommunityIcons } from "@expo/vector-icons";
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

import RevealView from "../components/RevealView";
import { useAuth } from "../context/AuthContext";
import type { RootDrawerParamList } from "../navigation/types";
import type { Reporte } from "../services/reportes";
import { listarMisReportes } from "../services/reportes";
import { colors, iosTitleFont, radii, shadow, spacing } from "../theme/tokens";

type Nav = DrawerNavigationProp<RootDrawerParamList>;

function etiquetaEstado(estado: Reporte["estado"]): string {
  if (estado === "confirmado") return "Confirmado";
  if (estado === "inactivo") return "Inactivo";
  return "Pendiente";
}

function colorEstado(estado: Reporte["estado"]): string {
  if (estado === "confirmado") return colors.success;
  if (estado === "inactivo") return colors.danger;
  return colors.accent;
}

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
        <View pointerEvents="none" style={styles.blobA} />
        <View pointerEvents="none" style={styles.blobB} />

        <RevealView delay={40}>
          <Text style={styles.tag}>Seguimiento</Text>
          <Text style={styles.titulo}>Mis reportes</Text>
          <Text style={styles.aviso}>
            Inicia sesion para ver tus reportes enviados.
          </Text>
        </RevealView>

        <RevealView delay={130}>
          <Pressable
            accessibilityRole="button"
            style={styles.btn}
            onPress={() => navigation.navigate("MiCuenta")}
          >
            <MaterialCommunityIcons
              color="#fff"
              name="account-arrow-right"
              size={18}
            />
            <Text style={styles.btnTxt}>Ir a Mi cuenta</Text>
          </Pressable>
        </RevealView>
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <View pointerEvents="none" style={styles.blobA} />
      <View pointerEvents="none" style={styles.blobB} />

      <RevealView delay={35} style={styles.headerWrap}>
        <Text style={styles.tag}>Actividad comunitaria</Text>
        <Text style={[styles.titulo, styles.tituloPad]}>Mis reportes</Text>
        <Text style={styles.resumen}>
          {items.length === 0
            ? "Aun no tienes reportes en esta cuenta."
            : `${items.length} reporte${items.length === 1 ? "" : "s"} registrado${items.length === 1 ? "" : "s"}.`}
        </Text>
      </RevealView>

      {carga && items.length === 0 ? (
        <ActivityIndicator style={styles.loader} color={colors.primary} />
      ) : null}
      {error && <Text style={styles.error}>{error}</Text>}

      <FlatList
        contentContainerStyle={styles.lista}
        data={items}
        keyExtractor={(item) => String(item.id)}
        ListEmptyComponent={
          !carga ? (
            <View style={styles.vacioWrap}>
              <MaterialCommunityIcons
                color={colors.textMuted}
                name="file-document-outline"
                size={26}
              />
              <Text style={styles.vacio}>
                Aun no tienes reportes con esta cuenta.
              </Text>
            </View>
          ) : null
        }
        refreshing={carga && items.length > 0}
        renderItem={({ item }) => (
          <RevealView delay={40}>
            <View style={styles.tarjeta}>
              <View style={styles.tarjetaTop}>
                <Text style={styles.tarjetaTit}>{item.tipo}</Text>
                <View
                  style={[
                    styles.estadoBadge,
                    { backgroundColor: `${colorEstado(item.estado)}22` },
                  ]}
                >
                  <Text
                    style={[
                      styles.estadoTxt,
                      { color: colorEstado(item.estado) },
                    ]}
                  >
                    {etiquetaEstado(item.estado)}
                  </Text>
                </View>
              </View>

              <Text style={styles.meta}>
                Sev. {item.severidad} -{" "}
                {new Date(item.created_at).toLocaleString()}
              </Text>
              <Text style={styles.coords}>
                {item.latitud.toFixed(5)}, {item.longitud.toFixed(5)}
              </Text>
              {item.descripcion ? (
                <Text style={styles.desc}>{item.descripcion}</Text>
              ) : null}
            </View>
          </RevealView>
        )}
        onRefresh={() => void cargar()}
      />
    </View>
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
    backgroundColor: "rgba(14,165,164,0.16)",
  },
  blobB: {
    position: "absolute",
    left: -70,
    bottom: 40,
    width: 210,
    height: 210,
    borderRadius: 105,
    backgroundColor: "rgba(249,115,22,0.10)",
  },
  centrado: {
    flex: 1,
    padding: spacing.lg,
    paddingTop: Platform.OS === "ios" ? 62 : 36,
    justifyContent: "center",
    backgroundColor: colors.background,
    overflow: "hidden",
  },
  headerWrap: {
    paddingHorizontal: spacing.lg,
    paddingTop: Platform.OS === "ios" ? 62 : 36,
    paddingBottom: spacing.sm,
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
    fontFamily: iosTitleFont,
    letterSpacing: 0.35,
  },
  tituloPad: {},
  resumen: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 8,
  },
  aviso: {
    fontSize: 16,
    color: colors.textMuted,
    marginTop: 12,
    marginBottom: 24,
    lineHeight: 22,
    maxWidth: "92%",
  },
  btn: {
    alignSelf: "flex-start",
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: radii.md,
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "center",
    ...shadow.floating,
  },
  btnTxt: { color: "#fff", fontWeight: "700", fontSize: 16 },
  lista: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 40,
    gap: spacing.sm,
  },
  loader: { marginTop: 34 },
  error: {
    color: colors.danger,
    marginHorizontal: spacing.lg,
    marginBottom: 8,
    backgroundColor: "rgba(220,38,38,0.08)",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: radii.sm,
  },
  vacioWrap: {
    marginTop: 54,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    ...shadow.card,
  },
  vacio: {
    color: colors.textMuted,
    textAlign: "center",
    marginTop: 10,
    fontSize: 14,
  },
  tarjeta: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  tarjetaTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.sm,
  },
  estadoBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.pill,
  },
  estadoTxt: {
    fontSize: 12,
    fontWeight: "700",
  },
  tarjetaTit: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.primaryDark,
    textTransform: "capitalize",
  },
  meta: { fontSize: 13, color: colors.textMuted, marginTop: 6 },
  coords: { fontSize: 12, color: "#8EA0B4", marginTop: 4 },
  desc: { fontSize: 15, color: colors.text, marginTop: 10, lineHeight: 21 },
});
