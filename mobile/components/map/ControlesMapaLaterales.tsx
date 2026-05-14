import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { colors, radii, shadow } from "../../theme/tokens";

type IconName = ComponentProps<typeof MaterialCommunityIcons>["name"];

export interface ControlLateral {
  id: string;
  icono: IconName;
  label: string;
  activo?: boolean;
  onPress: () => void;
}

export interface ControlesMapaLateralesProps {
  controles: ControlLateral[];
}

export default function ControlesMapaLaterales({
  controles,
}: ControlesMapaLateralesProps) {
  return (
    <View style={styles.card}>
      {controles.map((c, i) => (
        <View key={c.id}>
          <Pressable
            accessibilityLabel={c.label}
            accessibilityRole="button"
            accessibilityState={{ selected: !!c.activo }}
            android_ripple={{
              color: "rgba(15,23,42,0.10)",
              borderless: false,
              radius: 24,
            }}
            onPress={c.onPress}
            style={({ pressed }) => [
              styles.btn,
              c.activo && styles.btnActivo,
              pressed && styles.btnPressed,
            ]}
          >
            <MaterialCommunityIcons
              color={c.activo ? "#fff" : colors.text}
              name={c.icono}
              size={22}
            />
          </Pressable>
          {i < controles.length - 1 ? <View style={styles.divisor} /> : null}
        </View>
      ))}
    </View>
  );
}

const BTN_SIZE = 48;

const styles = StyleSheet.create({
  card: {
    backgroundColor: "rgba(255,255,255,0.96)",
    borderRadius: radii.lg,
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(214,225,235,0.85)",
    ...shadow.overlay,
  },
  btn: {
    width: BTN_SIZE,
    height: BTN_SIZE,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.md,
  },
  btnActivo: {
    backgroundColor: colors.primary,
  },
  btnPressed: {
    opacity: 0.6,
  },
  divisor: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginHorizontal: 8,
    marginVertical: 2,
  },
});
