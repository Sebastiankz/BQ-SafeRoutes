import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Platform, StyleSheet, Text, View } from "react-native";

import Constants from "expo-constants";

import RevealView from "../components/RevealView";
import { colors, iosTitleFont, radii, shadow, spacing } from "../theme/tokens";

const ITEMS = [
  {
    icon: "bell-ring-outline",
    title: "Notificaciones inteligentes",
    desc: "Recibe alertas solo cuando estés cerca de una zona de riesgo.",
  },
  {
    icon: "map-marker-path",
    title: "Preferencias de mapa",
    desc: "Define estilo del mapa, visibilidad de capas y modo de navegación.",
  },
  {
    icon: "translate",
    title: "Idioma y accesibilidad",
    desc: "Ajusta textos, contrastes y experiencia para conducción segura.",
  },
] as const;

export default function AjustesScreen() {
  return (
    <View style={styles.contenedor}>
      <View pointerEvents="none" style={styles.blobA} />
      <View pointerEvents="none" style={styles.blobB} />

      <RevealView delay={40}>
        <Text style={styles.tag}>Control del sistema</Text>
        <Text style={styles.titulo}>Ajustes</Text>
        <Text style={styles.txt}>
          Personaliza cómo SafeRoutes te acompaña durante tus desplazamientos.
        </Text>
      </RevealView>

      <RevealView delay={130} style={styles.card}>
        {ITEMS.map((item) => (
          <View key={item.title} style={styles.item}>
            <View style={styles.itemIconoWrap}>
              <MaterialCommunityIcons
                color={colors.primaryDark}
                name={item.icon}
                size={20}
              />
            </View>
            <View style={styles.itemTxtWrap}>
              <Text style={styles.itemTitulo}>{item.title}</Text>
              <Text style={styles.itemDesc}>{item.desc}</Text>
            </View>
          </View>
        ))}
      </RevealView>

      <RevealView delay={220} style={styles.versionWrap}>
        <Text style={styles.ver}>SafeRoutes BQ</Text>
        <Text style={styles.verSub}>
          v{Constants.expoConfig?.version ?? "1"}
        </Text>
      </RevealView>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: Platform.OS === "ios" ? 62 : 36,
    backgroundColor: colors.background,
    overflow: "hidden",
  },
  blobA: {
    position: "absolute",
    right: -34,
    top: -46,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(14,165,164,0.18)",
  },
  blobB: {
    position: "absolute",
    left: -60,
    bottom: 60,
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: "rgba(249,115,22,0.12)",
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
    letterSpacing: 0.35,
    marginBottom: 12,
    textTransform: "uppercase",
  },
  titulo: {
    fontSize: 31,
    fontWeight: "800",
    color: colors.text,
    marginBottom: 10,
    fontFamily: iosTitleFont,
    letterSpacing: 0.4,
  },
  txt: {
    fontSize: 16,
    color: colors.textMuted,
    lineHeight: 24,
    maxWidth: "92%",
  },
  card: {
    marginTop: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 6,
    ...shadow.card,
  },
  item: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  itemIconoWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(14,165,164,0.14)",
  },
  itemTxtWrap: {
    flex: 1,
  },
  itemTitulo: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 4,
  },
  itemDesc: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 20,
  },
  versionWrap: {
    marginTop: 18,
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ver: {
    fontSize: 12,
    color: colors.text,
    fontWeight: "700",
    letterSpacing: 0.25,
  },
  verSub: {
    marginTop: 2,
    fontSize: 12,
    color: colors.textMuted,
  },
});
