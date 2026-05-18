import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import DrawerRoot from "./navigation/DrawerRoot";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { colors, iosTitleFont } from "./theme/tokens";

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.background,
    card: colors.surface,
    text: colors.text,
    primary: colors.primary,
    border: colors.border,
  },
};

function AppInner() {
  const { hydrating } = useAuth();
  if (hydrating) {
    return (
      <View style={styles.splash}>
        <View pointerEvents="none" style={styles.splashBlobA} />
        <View pointerEvents="none" style={styles.splashBlobB} />
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.splashTitle}>SafeRoutes BQ</Text>
        <Text style={styles.splashSub}>
          Preparando tu mapa en tiempo real...
        </Text>
      </View>
    );
  }
  return (
    <NavigationContainer theme={navTheme}>
      <DrawerRoot />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaProvider>
        <AuthProvider>
          <AppInner />
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  splash: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
    gap: 8,
    overflow: "hidden",
  },
  splashBlobA: {
    position: "absolute",
    width: 240,
    height: 240,
    borderRadius: 120,
    top: -60,
    right: -30,
    backgroundColor: "rgba(14,165,164,0.22)",
  },
  splashBlobB: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    bottom: -70,
    left: -35,
    backgroundColor: "rgba(249,115,22,0.16)",
  },
  splashTitle: {
    marginTop: 6,
    color: colors.text,
    fontSize: 19,
    fontWeight: "800",
    fontFamily: iosTitleFont,
    letterSpacing: 0.2,
  },
  splashSub: {
    color: colors.textMuted,
    fontSize: 14,
    letterSpacing: 0.2,
  },
});
