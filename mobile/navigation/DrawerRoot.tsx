import { createDrawerNavigator } from "@react-navigation/drawer";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import AjustesScreen from "../screens/AjustesScreen";
import MapScreen from "../screens/MapScreen";
import MiCuentaScreen from "../screens/MiCuentaScreen";
import MisReportesScreen from "../screens/MisReportesScreen";
import { colors, iosTitleFont } from "../theme/tokens";
import type { RootDrawerParamList } from "./types";

const Drawer = createDrawerNavigator<RootDrawerParamList>();

export default function DrawerRoot() {
  return (
    <Drawer.Navigator
      initialRouteName="Mapa"
      screenOptions={{
        drawerPosition: "left",
        drawerType: "front",
        headerShown: false,
        drawerStyle: {
          backgroundColor: colors.surface,
          width: 292,
          borderTopRightRadius: 24,
          borderBottomRightRadius: 24,
        },
        drawerActiveBackgroundColor: "rgba(14,165,164,0.14)",
        drawerActiveTintColor: colors.primaryDark,
        drawerInactiveTintColor: colors.textMuted,
        drawerItemStyle: {
          marginHorizontal: 10,
          borderRadius: 12,
        },
        drawerLabelStyle: {
          fontSize: 15,
          fontWeight: "700",
          fontFamily: iosTitleFont,
        },
      }}
    >
      <Drawer.Screen
        component={MapScreen}
        name="Mapa"
        options={{
          drawerLabel: "Mapa",
          title: "Mapa",
          drawerIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              color={color}
              name="map-marker-radius-outline"
              size={size}
            />
          ),
        }}
      />
      <Drawer.Screen
        component={MiCuentaScreen}
        name="MiCuenta"
        options={{
          drawerLabel: "Mi cuenta",
          drawerIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              color={color}
              name="account-circle-outline"
              size={size}
            />
          ),
        }}
      />
      <Drawer.Screen
        component={MisReportesScreen}
        name="MisReportes"
        options={{
          drawerLabel: "Mis reportes",
          drawerIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              color={color}
              name="text-box-check-outline"
              size={size}
            />
          ),
        }}
      />
      <Drawer.Screen
        component={AjustesScreen}
        name="Ajustes"
        options={{
          drawerLabel: "Ajustes",
          drawerIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              color={color}
              name="cog-outline"
              size={size}
            />
          ),
        }}
      />
    </Drawer.Navigator>
  );
}
