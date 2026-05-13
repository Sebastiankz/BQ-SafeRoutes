import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { colors, iosTitleFont, radii, shadow } from "../theme/tokens";

interface AuthRequiredModalProps {
  visible: boolean;
  onDismiss: () => void;
  onGoToAccount: () => void;
}

export default function AuthRequiredModal({
  visible,
  onDismiss,
  onGoToAccount,
}: AuthRequiredModalProps) {
  return (
    <Modal
      animationType="fade"
      onRequestClose={onDismiss}
      transparent
      visible={visible}
    >
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss} />

        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <MaterialCommunityIcons
              color={colors.primaryDark}
              name="account-lock-outline"
              size={24}
            />
          </View>

          <Text style={styles.title}>Inicia sesion para reportar</Text>
          <Text style={styles.message}>
            Solo los usuarios registrados pueden crear reportes en el mapa y
            hacer seguimiento a sus contribuciones.
          </Text>

          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              onPress={onDismiss}
              style={[styles.button, styles.buttonGhost]}
            >
              <Text style={styles.buttonGhostText}>Ahora no</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={onGoToAccount}
              style={[styles.button, styles.buttonPrimary]}
            >
              <Text style={styles.buttonPrimaryText}>Ir a Mi cuenta</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    ...shadow.floating,
  },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(14,165,164,0.14)",
    marginBottom: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.text,
    fontFamily: iosTitleFont,
  },
  message: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textMuted,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 20,
  },
  button: {
    minWidth: 114,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonGhost: {
    backgroundColor: colors.surfaceMuted,
  },
  buttonGhostText: {
    color: colors.textMuted,
    fontSize: 15,
    fontWeight: "700",
  },
  buttonPrimary: {
    backgroundColor: colors.primary,
    ...shadow.card,
  },
  buttonPrimaryText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
});
