import { DrawerActions, useNavigation } from "@react-navigation/native";
import type { DrawerNavigationProp } from "@react-navigation/drawer";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  NativeModules,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import MapView, { Heatmap, Marker, PROVIDER_GOOGLE } from "react-native-maps";
import * as Location from "expo-location";

import FiltroHotspotsSheet from "../components/FiltroHotspotsSheet";
import NuevoReporteModal from "../components/NuevoReporteModal";
import { useAuth } from "../context/AuthContext";
import type { RootDrawerParamList } from "../navigation/types";
import type { Hotspot, HotspotFilter } from "../services/hotspots";
import { listarHotspots } from "../services/hotspots";
import type { Reporte } from "../services/reportes";
import { listarReportes } from "../services/reportes";

type DrawerNav = DrawerNavigationProp<RootDrawerParamList>;

const BARRANQUILLA = {
  latitude: 10.9685,
  longitude: -74.7889,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

function alturaBarraEstado(): number {
  if (Platform.OS === "android") return StatusBar.currentHeight ?? 0;
  const h = NativeModules.StatusBarManager?.height as number | undefined;
  return typeof h === "number" && !Number.isNaN(h) ? h : 47;
}

const tieneClaveGoogleMaps = Boolean(process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY?.trim());

const COLOR_POR_TIPO: Record<string, string> = {
  accidente: "#E53E3E",
  hueco: "#D69E2E",
  arroyo: "#3182CE",
  semaforo_danado: "#805AD5",
  otro: "#718096",
};

const HEATMAP_GRADIENT = {
      colors: ["#1a73e8", "#43e97b", "#f6d365", "#f08080", "#E53E3E"],                                                                                                                          
      startPoints: [0.05, 0.25, 0.5, 0.75, 1.0],      
  colorMapSize: 256,
};

function etiquetaFiltro(f: HotspotFilter): string {
  if (f.mode === "global") return "Historico global";
  if (f.mode === "year") return `Ano ${f.year}`;
  return `${String(f.month).padStart(2, "0")}/${f.year}`;
}

export default function MapScreen() {
  const navigation = useNavigation<DrawerNav>();
  const { token, usuario } = useAuth();
  const insetSuperior = alturaBarraEstado() + 12;

  const mapRef = useRef<MapView>(null);
  const [region, setRegion] = useState(BARRANQUILLA);
  const [cargandoUbicacion, setCargandoUbicacion] = useState(true);
  const [errorUbicacion, setErrorUbicacion] = useState<string | null>(null);
  const [coordsUsuario, setCoordsUsuario] = useState<{ latitude: number; longitude: number } | null>(
    null,
  );
  const [reportes, setReportes] = useState<Reporte[]>([]);
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [cargandoReportes, setCargandoReportes] = useState(true);
  const [errorReportes, setErrorReportes] = useState<string | null>(null);
  const [modalNuevo, setModalNuevo] = useState(false);

  const [heatmapMode, setHeatmapMode] = useState(false);
  const [filtroVisible, setFiltroVisible] = useState(false);
  const [filtro, setFiltro] = useState<HotspotFilter>({ mode: "global" });
  const [cargandoHotspots, setCargandoHotspots] = useState(false);

  const debeMostrarListaSinGoogleMaps = !tieneClaveGoogleMaps;

  const ubicacionParaReporte = useMemo(() => {
    const c = coordsUsuario;
    if (c) return { latitud: c.latitude, longitud: c.longitude };
    return { latitud: region.latitude, longitud: region.longitude };
  }, [coordsUsuario, region.latitude, region.longitude]);

  const heatmapPoints = useMemo(
    () =>
      hotspots
        .filter((h) => Number.isFinite(h.latitud) && Number.isFinite(h.longitud))
        .map((h) => ({
          latitude: h.latitud,
          longitude: h.longitud,
          weight: Math.max(1, h.num_incidentes ?? 1),
        })),
    [hotspots],
  );

  async function obtenerUbicacion() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      setErrorUbicacion("Permiso de ubicación denegado. Mostrando ubicación predeterminada.");
      setCargandoUbicacion(false);
      setCoordsUsuario(null);
      return;
    }
    const ubicacion = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
    const lat = ubicacion.coords.latitude;
    const lng = ubicacion.coords.longitude;
    setCoordsUsuario({ latitude: lat, longitude: lng });
    setRegion({
      latitude: lat,
      longitude: lng,
      latitudeDelta: 0.02,
      longitudeDelta: 0.02,
    });
    setCargandoUbicacion(false);
  }

  const cargarReportes = useCallback(async () => {
    setErrorReportes(null);
    try {
      const lista = await listarReportes(150, 0);
      setReportes(lista);
    } catch (e) {
      const mensaje = e instanceof Error ? e.message : String(e);
      const sugerencia =
        __DEV__ && !process.env.EXPO_PUBLIC_API_URL?.trim()
          ? " En teléfono físico, define EXPO_PUBLIC_API_URL con la IP de tu PC (ej. http://192.168.1.10:8000)."
          : "";
      setErrorReportes(mensaje + sugerencia);
    } finally {
      setCargandoReportes(false);
    }
  }, []);

  const cargarHotspots = useCallback(async (f: HotspotFilter) => {
    setCargandoHotspots(true);
    setErrorReportes(null);
    try {
      const hs = await listarHotspots(f);
      setHotspots(hs);
    } catch (e) {
      const mensaje = e instanceof Error ? e.message : String(e);
      setErrorReportes(mensaje);
    } finally {
      setCargandoHotspots(false);
    }
  }, []);

  useEffect(() => {
    void obtenerUbicacion();
  }, []);

  useEffect(() => {
    if (!cargandoUbicacion) {
      void cargarReportes();
      void cargarHotspots(filtro);
    }
  }, [cargandoUbicacion, cargarReportes, cargarHotspots, filtro]);

  function pulsarNuevoReporte() {
    if (!token) {
      Alert.alert("Inicia sesión", "Solo usuarios registrados pueden crear reportes en el mapa.", [
        { text: "Cancelar", style: "cancel" },
        { text: "Ir a Mi cuenta", onPress: () => navigation.navigate("MiCuenta") },
      ]);
      return;
    }
    setModalNuevo(true);
  }

  function aplicarFiltro(f: HotspotFilter) {
    setFiltro(f);
    setHeatmapMode(true);
  }

  if (cargandoUbicacion) {
    return (
      <View style={styles.centrado}>
        <ActivityIndicator size="large" color="#E53E3E" />
        <Text style={styles.textoGris}>Cargando ubicación...</Text>
      </View>
    );
  }

  return (
    <View style={styles.contenedor}>
      <StatusBar barStyle="dark-content" />
      {errorUbicacion && (
        <View style={styles.banner}>
          <Text style={styles.bannerTexto}>{errorUbicacion}</Text>
        </View>
      )}
      {errorReportes && (
        <View style={[styles.banner, styles.bannerError]}>
          <Text style={styles.bannerErrorTexto}>{errorReportes}</Text>
        </View>
      )}
      {(cargandoReportes || cargandoHotspots) && !errorReportes && (
        <View style={[styles.badgeCarga, { top: insetSuperior }]}>
          <ActivityIndicator size="small" color="#E53E3E" />
          <Text style={styles.badgeCargaTxt}>
            {cargandoHotspots ? "Cargando puntos criticos…" : "Cargando reportes…"}
          </Text>
        </View>
      )}

      {debeMostrarListaSinGoogleMaps ? (
        <ScrollView
          contentContainerStyle={styles.listaSinMapaContenido}
          keyboardShouldPersistTaps="handled"
          style={styles.mapa}
        >
          <Text style={styles.listaSinMapaTitulo}>Google Maps sin configurar</Text>
          <Text style={styles.listaSinMapaTxt}>
            En <Text style={styles.mono}>mobile/.env</Text> define{" "}
            <Text style={styles.mono}>EXPO_PUBLIC_GOOGLE_MAPS_KEY</Text> con una clave de Google Cloud con{" "}
            <Text style={styles.bold}>Maps SDK for Android</Text> e <Text style={styles.bold}>Maps SDK for iOS</Text>{" "}
            habilitados para este proyecto. Reinicia Expo con <Text style={styles.mono}>npx expo start -c</Text>.
          </Text>
          <Text style={styles.listaSinMapaSub}>Reportes cargados ({reportes.length})</Text>
          {reportes.map((r) => (
            <View key={r.id} style={styles.filaRepo}>
              <Text style={styles.filaTipo}>{r.tipo}</Text>
              <Text style={styles.filaMeta}>
                sev. {r.severidad} · {r.latitud.toFixed(4)}, {r.longitud.toFixed(4)}
              </Text>
              {r.descripcion ? <Text style={styles.filaDesc}>{r.descripcion}</Text> : null}
            </View>
          ))}
        </ScrollView>
      ) : (
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={styles.mapa}
          initialRegion={region}
          showsCompass
          showsMyLocationButton
          showsUserLocation
        >
          {!heatmapMode && reportes.map((r) => (
            <Marker
              key={r.id}
              coordinate={{ latitude: r.latitud, longitude: r.longitud }}
              description={r.descripcion ?? undefined}
              pinColor={COLOR_POR_TIPO[r.tipo] ?? "#E53E3E"}
              title={`${r.tipo} · sev. ${r.severidad}`}
            />
          ))}

          {heatmapMode && heatmapPoints.length > 0 && (
            <Heatmap
              gradient={HEATMAP_GRADIENT}
              opacity={0.85}
              points={heatmapPoints}
              radius={70}
            />
          )}
        </MapView>
      )}

      <View style={[styles.fabIzq, { top: insetSuperior }]}>
        <Pressable
          accessibilityLabel="Menú lateral"
          accessibilityRole="button"
          style={styles.fabChico}
          onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
        >
          <MaterialCommunityIcons color="#2d3748" name="menu" size={24} />
        </Pressable>
      </View>

      <View style={[styles.fabFila, styles.fabFilaGap, { top: insetSuperior }]}>
        <Pressable
          accessibilityLabel="Actualizar reportes"
          accessibilityRole="button"
          style={styles.fab}
          onPress={() => {
            void cargarReportes();
            void cargarHotspots(filtro);
          }}
        >
          <MaterialCommunityIcons color="#2d3748" name="refresh" size={22} />
        </Pressable>

        <Pressable
          accessibilityLabel={heatmapMode ? "Ocultar puntos criticos" : "Mostrar puntos criticos"}
          accessibilityRole="button"
          accessibilityState={{ selected: heatmapMode }}
          style={[styles.fab, heatmapMode && styles.fabActive]}
          onPress={() => setHeatmapMode((v) => !v)}
        >
          <MaterialCommunityIcons
            color={heatmapMode ? "#fff" : "#2d3748"}
            name="fire"
            size={22}
          />
        </Pressable>

        <Pressable
          accessibilityLabel="Filtrar puntos criticos"
          accessibilityRole="button"
          style={[styles.fab, filtroVisible && styles.fabActive]}
          onPress={() => setFiltroVisible(true)}
        >
          <MaterialCommunityIcons
            color={filtroVisible ? "#fff" : "#2d3748"}
            name="layers-triple-outline"
            size={22}
          />
        </Pressable>
      </View>

      {heatmapMode && (
        <View style={styles.chipFiltro} pointerEvents="none">
          <MaterialCommunityIcons color="#fff" name="filter-variant" size={14} />
          <Text style={styles.chipFiltroTxt}>{etiquetaFiltro(filtro)}</Text>
        </View>
      )}

      <Pressable
        accessibilityLabel={token ? "Nuevo reporte" : "Nuevo reporte (requiere cuenta)"}
        accessibilityRole="button"
        style={[styles.fabMas, !token && styles.fabMasInvitado]}
        onPress={pulsarNuevoReporte}
      >
        <Text style={styles.fabMasTxt}>＋</Text>
      </Pressable>

      <FiltroHotspotsSheet
        initialFilter={filtro}
        onApply={aplicarFiltro}
        onDismiss={() => setFiltroVisible(false)}
        visible={filtroVisible}
      />

      {token ? (
        <NuevoReporteModal
          accessToken={token}
          userId={usuario?.id ?? ""}
          latitud={ubicacionParaReporte.latitud}
          longitud={ubicacionParaReporte.longitud}
          onCreado={() => void cargarReportes()}
          onDismiss={() => setModalNuevo(false)}
          visible={modalNuevo}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1 },
  mapa: { flex: 1 },
  centrado: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  textoGris: { color: "#666", fontSize: 14 },
  banner: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 12,
    paddingVertical: 10,
    maxHeight: 100,
  },
  bannerTexto: { color: "#92400E", fontSize: 13 },
  bannerError: { backgroundColor: "#FED7D7", maxHeight: 140 },
  bannerErrorTexto: { color: "#742A2A", fontSize: 13 },
  badgeCarga: {
    position: "absolute",
    alignSelf: "center",
    zIndex: 2,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fff",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  badgeCargaTxt: { fontSize: 13, color: "#4a5568" },
  fabIzq: {
    position: "absolute",
    left: 16,
    zIndex: 3,
  },
  fabChico: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  fabFila: {
    position: "absolute",
    right: 16,
    zIndex: 3,
  },
  fab: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  fabFilaGap: { gap: 10 },
  fabActive: { backgroundColor: "#E53E3E" },
  chipFiltro: {
    position: "absolute",
    bottom: 110,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(229,62,62,0.92)",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    zIndex: 2,
  },
  chipFiltroTxt: { color: "#fff", fontSize: 12, fontWeight: "600", letterSpacing: 0.3 },
  fabMas: {
    position: "absolute",
    left: 20,
    bottom: 36,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#E53E3E",
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    zIndex: 3,
  },
  fabMasInvitado: { opacity: 0.75 },
  fabMasTxt: { fontSize: 32, color: "#fff", fontWeight: "300", marginTop: -2 },
  listaSinMapaContenido: { padding: 16, paddingBottom: 120, gap: 8 },
  listaSinMapaTitulo: { fontSize: 18, fontWeight: "700", color: "#1a202c" },
  listaSinMapaTxt: { fontSize: 14, color: "#4a5568", lineHeight: 20 },
  listaSinMapaSub: { fontSize: 15, fontWeight: "600", color: "#2d3748", marginTop: 12 },
  mono: { fontFamily: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }) },
  bold: { fontWeight: "700" },
  filaRepo: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e2e8f0",
  },
  filaTipo: { fontSize: 15, fontWeight: "700", color: "#E53E3E", textTransform: "capitalize" },
  filaMeta: { fontSize: 12, color: "#718096", marginTop: 2 },
  filaDesc: { fontSize: 14, color: "#2d3748", marginTop: 6 },
});
