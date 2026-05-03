import { createDrawerNavigator } from "@react-navigation/drawer";

import AjustesScreen from "../screens/AjustesScreen";
import MapScreen from "../screens/MapScreen";
import MiCuentaScreen from "../screens/MiCuentaScreen";
import MisReportesScreen from "../screens/MisReportesScreen";
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
        drawerActiveTintColor: "#E53E3E",
        drawerInactiveTintColor: "#4a5568",
      }}
    >
      <Drawer.Screen
        component={MapScreen}
        name="Mapa"
        options={{ drawerLabel: "Mapa", title: "Mapa" }}
      />
      <Drawer.Screen component={MiCuentaScreen} name="MiCuenta" options={{ drawerLabel: "Mi cuenta" }} />
      <Drawer.Screen component={MisReportesScreen} name="MisReportes" options={{ drawerLabel: "Mis reportes" }} />
      <Drawer.Screen component={AjustesScreen} name="Ajustes" options={{ drawerLabel: "Ajustes" }} />
    </Drawer.Navigator>
  );
}
