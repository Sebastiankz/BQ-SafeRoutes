import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import DrawerRoot from "./navigation/DrawerRoot";
import { AuthProvider, useAuth } from "./context/AuthContext";

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: "#f7fafc",
  },
};

function AppInner() {
  const { hydrating } = useAuth();
  if (hydrating) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color="#E53E3E" />
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
      <AuthProvider>
        <AppInner />
      </AuthProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  splash: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#fff" },
});
