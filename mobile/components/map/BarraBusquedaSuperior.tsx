import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radii, shadow } from "../../theme/tokens";

export interface BarraBusquedaSuperiorProps {
  onPressMenu: () => void;
  onPressBuscar?: () => void;
  placeholder?: string;
}

export default function BarraBusquedaSuperior({
  onPressMenu,
  onPressBuscar,
  placeholder = "Buscar lugar o dirección",
}: BarraBusquedaSuperiorProps) {
  return (
    <View style={styles.card}>
      <Pressable
        accessibilityLabel="Menú lateral"
        accessibilityRole="button"
        android_ripple={{
          color: "rgba(15,23,42,0.10)",
          borderless: true,
          radius: 22,
        }}
        hitSlop={8}
        onPress={onPressMenu}
        style={({ pressed }) => [styles.btnMenu, pressed && styles.pressed]}
      >
        <MaterialCommunityIcons color={colors.text} name="menu" size={22} />
      </Pressable>

      <Pressable
        accessibilityLabel="Buscar"
        accessibilityRole="search"
        onPress={onPressBuscar}
        style={({ pressed }) => [styles.input, pressed && styles.pressed]}
      >
        <MaterialCommunityIcons
          color={colors.textMuted}
          name="magnify"
          size={18}
        />
        <Text numberOfLines={1} style={styles.inputTxt}>
          {placeholder}
        </Text>
      </Pressable>

      <View
        accessible={false}
        importantForAccessibility="no"
        pointerEvents="none"
        style={styles.btnVoz}
      >
        <MaterialCommunityIcons
          color={colors.textMuted}
          name="microphone-outline"
          size={20}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.96)",
    borderRadius: radii.pill,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(214,225,235,0.85)",
    alignSelf: "center",
    width: "100%",
    maxWidth: 520,
    ...shadow.overlay,
  },
  btnMenu: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  inputTxt: {
    flex: 1,
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: "500",
  },
  btnVoz: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    opacity: 0.7,
  },
  pressed: {
    opacity: 0.55,
  },
});
