import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors, radii } from "../../theme/tokens";

type IconName = ComponentProps<typeof MaterialCommunityIcons>["name"];

export type HudTone = "heatmap" | "safe" | "combined";

export interface HudEstadoZonaProps {
  top: number;
  right: number;
  iconName: IconName;
  title: string;
  detail: string;
  iconBg: string;
  iconColor: string;
  borderColor: string;
}

// Shell — paso 2/3 lo cableará desde MapScreen (mismo contenido que el hudWrap actual).
export default function HudEstadoZona({
  top,
  right,
  iconName,
  title,
  detail,
  iconBg,
  iconColor,
  borderColor,
}: HudEstadoZonaProps) {
  return (
    <View
      pointerEvents="none"
      style={[styles.wrap, { top, right, borderColor }]}
    >
      <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>
        <MaterialCommunityIcons color={iconColor} name={iconName} size={16} />
      </View>
      <View style={styles.body}>
        <Text numberOfLines={1} style={styles.title}>
          {title}
        </Text>
        <Text numberOfLines={1} style={styles.detail}>
          {detail}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 16,
    zIndex: 2,
    maxWidth: 248,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(255,255,255,0.90)",
    borderRadius: radii.lg,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
  },
  iconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  body: { flex: 1, gap: 1 },
  title: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "700",
  },
  detail: {
    color: colors.textMuted,
    fontSize: 11,
  },
});
