import { useEffect, useRef } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Animated, Easing, Pressable, StyleSheet, View } from "react-native";

import { colors, shadow } from "../../theme/tokens";

export interface FabReportarProps {
  onPress: () => void;
  habilitado?: boolean;
}

export default function FabReportar({
  onPress,
  habilitado = true,
}: FabReportarProps) {
  const accentColor = habilitado ? colors.danger : colors.accent;
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 1800,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  const pulseScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.65],
  });
  const pulseOpacity = pulseAnim.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [0.55, 0.3, 0],
  });

  return (
    <View style={styles.haloWrap} pointerEvents="box-none">
      <Animated.View
        pointerEvents="none"
        style={[
          styles.pulse,
          {
            backgroundColor: accentColor,
            transform: [{ scale: pulseScale }],
            opacity: pulseOpacity,
          },
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          styles.halo,
          { backgroundColor: hexToRgba(accentColor, 0.14) },
        ]}
      />
      <Pressable
        accessibilityLabel={
          habilitado
            ? "Crear reporte de riesgo"
            : "Crear reporte (requiere cuenta)"
        }
        accessibilityRole="button"
        android_ripple={{
          color: "rgba(255,255,255,0.18)",
          borderless: true,
          radius: 40,
        }}
        hitSlop={HALO_PADDING}
        onPress={onPress}
        style={({ pressed }) => [
          styles.fab,
          { backgroundColor: accentColor, shadowColor: accentColor },
          pressed && styles.fabPressed,
        ]}
      >
        <MaterialCommunityIcons color="#fff" name="plus-thick" size={30} />
      </Pressable>
    </View>
  );
}

function hexToRgba(hex: string, alpha: number): string {
  const cleaned = hex.replace("#", "");
  const r = parseInt(cleaned.substring(0, 2), 16);
  const g = parseInt(cleaned.substring(2, 4), 16);
  const b = parseInt(cleaned.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const FAB_SIZE = 72;
const HALO_PADDING = 8;

const styles = StyleSheet.create({
  haloWrap: {
    width: FAB_SIZE + HALO_PADDING * 2,
    height: FAB_SIZE + HALO_PADDING * 2,
    alignItems: "center",
    justifyContent: "center",
  },
  pulse: {
    position: "absolute",
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
  },
  halo: {
    position: "absolute",
    width: FAB_SIZE + HALO_PADDING * 2,
    height: FAB_SIZE + HALO_PADDING * 2,
    borderRadius: (FAB_SIZE + HALO_PADDING * 2) / 2,
  },
  fab: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.55)",
    ...shadow.overlay,
    shadowOpacity: 0.38,
    shadowRadius: 16,
    elevation: 12,
  },
  fabPressed: {
    transform: [{ scale: 0.94 }],
    opacity: 0.94,
  },
});
