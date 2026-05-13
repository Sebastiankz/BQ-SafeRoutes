import { DrawerActions, useNavigation } from "@react-navigation/native";
import type { DrawerNavigationProp } from "@react-navigation/drawer";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Alert,
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
import { useSafeAreaInsets } from "react-native-safe-area-context";

import AuthRequiredModal from "../components/AuthRequiredModal";
import FiltroHotspotsSheet from "../components/FiltroHotspotsSheet";
import NuevoReporteModal from "../components/NuevoReporteModal";
import VigenciaModal from "../components/VigenciaModal";
import { useAuth } from "../context/AuthContext";
import type { RootDrawerParamList } from "../navigation/types";
import type { Hotspot, HotspotFilter } from "../services/hotspots";
import { listarHotspots } from "../services/hotspots";
import type { Reporte } from "../services/reportes";
import { responderVigencia } from "../services/reportes";
import { useReportesLive } from "../hooks/useReportesLive";
import { colors, iosTitleFont, radii, shadow } from "../theme/tokens";

type DrawerNav = DrawerNavigationProp<RootDrawerParamList>;

const BARRANQUILLA = {
  latitude: 10.9685,
  longitude: -74.7889,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

const tieneClaveGoogleMaps = Boolean(
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY?.trim(),
);

type HudState = {
  iconName: "fire" | "shield-check" | "layers-triple-outline";
  title: string;
  detail: string;
  tone: "heatmap" | "safe" | "combined";
};

const COLOR_POR_TIPO: Record<string, string> = {
  accidente: "#DC2626",
  hueco: "#D97706",
  arroyo: "#2563EB",
  semaforo_danado: "#7C3AED",
  otro: "#6B7280",
};

// Nombre de icono de MaterialCommunityIcons por tipo de reporte
const ICONO_POR_TIPO: Record<string, string> = {
  accidente: "car-emergency",
  hueco: "road-variant",
  arroyo: "waves",
  semaforo_danado: "traffic-light",
  otro: "alert-circle",
};

const HEATMAP_GRADIENT = {
  colors: ["#2563EB", "#1BAAA6", "#F7B731", "#F57F62", colors.danger],
  startPoints: [0.05, 0.25, 0.5, 0.75, 1.0],
  colorMapSize: 256,
};

function etiquetaFiltro(f: HotspotFilter): string {
  if (f.mode === "global") return "Historico global";
  if (f.mode === "year") return `Ano ${f.year}`;
  return `${String(f.month).padStart(2, "0")}/${f.year}`;
}

const RADIO_PROXIMIDAD_METROS = 80;
const INTERVALO_UBICACION_MS = 8000;
const DISTANCIA_MINIMA_MOVIMIENTO_M = 20;
const INTERVALO_NAVEGACION_MS = 1500;
const DISTANCIA_NAVEGACION_M = 5;
const INTERVALO_RENDER_CAMARA_MS = 320;
const PITCH_NAVEGACION = 64;
const ZOOM_NAVEGACION = 17.2;
const ALTITUD_NAVEGACION = 680;
const DURACION_ANIMACION_CAMARA_MS = 260;
const UMBRAL_GIRO_BRUJULA_GRADOS = 6;
const UMBRAL_CAMBIO_POSICION_CAMARA_M = 2.5;
const UMBRAL_CAMBIO_RUMBO_CAMARA_GRADOS = 4;
const OVERLAY_SIDE_PADDING = 16;
const TOP_ACTION_SIZE = 50;
const TOP_ACTION_GAP = 12;
const HUD_TOP_OFFSET = TOP_ACTION_SIZE + TOP_ACTION_GAP;
const HUD_RIGHT_RESERVE = OVERLAY_SIDE_PADDING + TOP_ACTION_SIZE + 18;
const BOTTOM_OVERLAY_OFFSET = 24;
const REPORT_CTA_BOTTOM_OFFSET = 102;
const ALTURA_BANNER = 44;
const ALTURA_BANNER_ERROR = 52;

function normalizarAngulo(angulo: number): number {
  const valor = angulo % 360;
  return valor < 0 ? valor + 360 : valor;
}

function diferenciaAngular(a: number, b: number): number {
  const diff = Math.abs(a - b) % 360;
  return diff > 180 ? 360 - diff : diff;
}

function distanciaHaversine(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371000;
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export default function MapScreen() {
  const navigation = useNavigation<DrawerNav>();
  const { token } = useAuth();
  const insets = useSafeAreaInsets();
  const insetSuperior = insets.top + 10;
  const insetInferior = Math.max(insets.bottom, 10);

  const mapRef = useRef<MapView>(null);
  const seguimientoCamaraRef = useRef<Location.LocationSubscription | null>(
    null,
  );
  const brujulaRef = useRef<Location.LocationSubscription | null>(null);
  const rumboRef = useRef(0);
  const coordsUsuarioRef = useRef<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const loopCamaraRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const ultimoEstadoCamaraRef = useRef<{
    latitude: number;
    longitude: number;
    heading: number;
  } | null>(null);

  const [region, setRegion] = useState(BARRANQUILLA);
  const [cargandoUbicacion, setCargandoUbicacion] = useState(true);
  const [errorUbicacion, setErrorUbicacion] = useState<string | null>(null);
  const [coordsUsuario, setCoordsUsuario] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  // Reportes en tiempo real — Supabase Realtime + fallback poll 60s.
  // Todos los usuarios ven los mismos reportes confirmados al instante.
  const {
    reportes,
    cargando: cargandoReportes,
    error: errorReportes,
    refetch: cargarReportes,
  } = useReportesLive();

  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [errorHotspots, setErrorHotspots] = useState<string | null>(null);
  const [modalNuevo, setModalNuevo] = useState(false);
  const [modalAuthRequerida, setModalAuthRequerida] = useState(false);

  const [heatmapMode, setHeatmapMode] = useState(false);
  const [filtroVisible, setFiltroVisible] = useState(false);
  const [filtro, setFiltro] = useState<HotspotFilter>({ mode: "global" });
  const [cargandoHotspots, setCargandoHotspots] = useState(false);

  // ── Modo Seguro ────────────────────────────────────────────────────────────
  const [modoSeguroActivo, setModoSeguroActivo] = useState(false);
  const pulso = useRef(new Animated.Value(1)).current;
  const animacionPulso = useRef<Animated.CompositeAnimation | null>(null);
  const animEntradaUi = useRef(new Animated.Value(0)).current;

  // Proximidad: el reporte que está mostrando el prompt y el set de ids ya preguntados.
  const [vigenciaPendiente, setVigenciaPendiente] = useState<Reporte | null>(
    null,
  );
  const [enviandoVigencia, setEnviandoVigencia] = useState(false);
  const preguntadosRef = useRef<Set<number>>(new Set());
  const watcherRef = useRef<Location.LocationSubscription | null>(null);
  const reportesRef = useRef<Reporte[]>([]);

  function toggleModoSeguro() {
    setModoSeguroActivo((prev) => {
      const siguiente = !prev;
      if (siguiente) {
        animacionPulso.current = Animated.loop(
          Animated.sequence([
            Animated.timing(pulso, {
              toValue: 1.06,
              duration: 700,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(pulso, {
              toValue: 1,
              duration: 700,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
          ]),
        );
        animacionPulso.current.start();
      } else {
        animacionPulso.current?.stop();
        pulso.setValue(1);
      }
      return siguiente;
    });
  }

  const debeMostrarListaSinGoogleMaps = !tieneClaveGoogleMaps;

  const ubicacionParaReporte = useMemo(() => {
    const c = coordsUsuario;
    if (c) return { latitud: c.latitude, longitud: c.longitude };
    return { latitud: region.latitude, longitud: region.longitude };
  }, [coordsUsuario, region.latitude, region.longitude]);

  const heatmapPoints = useMemo(
    () =>
      hotspots
        .filter(
          (h) => Number.isFinite(h.latitud) && Number.isFinite(h.longitud),
        )
        .map((h) => ({
          latitude: h.latitud,
          longitude: h.longitud,
          weight: Math.max(1, h.num_incidentes ?? 1),
        })),
    [hotspots],
  );

  const reportesConfirmados = useMemo(
    () => reportes.filter((reporte) => reporte.estado === "confirmado"),
    [reportes],
  );

  const hudState = useMemo<HudState | null>(() => {
    if (heatmapMode && modoSeguroActivo) {
      return {
        iconName: "layers-triple-outline",
        title: "Calor + reportes en vivo",
        detail: `${etiquetaFiltro(filtro)} · modo seguro activo`,
        tone: "combined",
      };
    }

    if (heatmapMode) {
      return {
        iconName: "fire",
        title: "Mapa de calor",
        detail:
          hotspots.length > 0
            ? `${etiquetaFiltro(filtro)} · ${hotspots.length} puntos`
            : `${etiquetaFiltro(filtro)} · sin puntos`,
        tone: "heatmap",
      };
    }

    if (modoSeguroActivo) {
      return {
        iconName: "shield-check",
        title: "Modo seguro",
        detail:
          reportesConfirmados.length > 0
            ? `Monitoreando · ${reportesConfirmados.length} reportes`
            : "Monitoreando reportes en vivo",
        tone: "safe",
      };
    }

    return null;
  }, [
    filtro,
    heatmapMode,
    hotspots.length,
    modoSeguroActivo,
    reportesConfirmados.length,
  ]);

  const hudTone = useMemo(() => {
    if (!hudState) return null;

    if (hudState.tone === "heatmap") {
      return {
        iconColor: colors.accent,
        iconBg: "rgba(249,115,22,0.14)",
        borderColor: "rgba(249,115,22,0.18)",
      };
    }

    if (hudState.tone === "safe") {
      return {
        iconColor: colors.success,
        iconBg: "rgba(22,163,74,0.14)",
        borderColor: "rgba(22,163,74,0.18)",
      };
    }

    return {
      iconColor: colors.primaryDark,
      iconBg: "rgba(14,165,164,0.14)",
      borderColor: "rgba(14,165,164,0.18)",
    };
  }, [hudState]);

  const topOverlayExtra =
    (errorUbicacion ? ALTURA_BANNER : 0) +
    (errorReportes ? ALTURA_BANNER_ERROR : 0);

  const topOverlayStart = insetSuperior + topOverlayExtra;
  const bottomOverlayStart = insetInferior + BOTTOM_OVERLAY_OFFSET;
  const reportCtaBottom = bottomOverlayStart + REPORT_CTA_BOTTOM_OFFSET;
  const chipFiltroBottom = bottomOverlayStart + 78;

  const uiTranslateY = animEntradaUi.interpolate({
    inputRange: [0, 1],
    outputRange: [22, 0],
  });

  const uiScale = animEntradaUi.interpolate({
    inputRange: [0, 1],
    outputRange: [0.96, 1],
  });

  const mapPaddingNavegacion = useMemo(
    () => ({
      top: topOverlayStart + TOP_ACTION_SIZE + 84,
      right: OVERLAY_SIDE_PADDING,
      bottom: bottomOverlayStart + 86,
      left: OVERLAY_SIDE_PADDING,
    }),
    [bottomOverlayStart, topOverlayStart],
  );

  const animarCamaraNavegacion = useCallback(
    (latitude: number, longitude: number, rumbo?: number | null) => {
      const rumboFinal =
        typeof rumbo === "number" && Number.isFinite(rumbo)
          ? normalizarAngulo(rumbo)
          : rumboRef.current;

      rumboRef.current = rumboFinal;

      mapRef.current?.animateCamera(
        {
          center: { latitude, longitude },
          heading: rumboFinal,
          pitch: PITCH_NAVEGACION,
          zoom: ZOOM_NAVEGACION,
          altitude: ALTITUD_NAVEGACION,
        },
        { duration: DURACION_ANIMACION_CAMARA_MS },
      );
    },
    [],
  );

  const enfocarCamaraUsuario = useCallback(() => {
    const coords = coordsUsuarioRef.current;
    if (!coords) return;

    const heading = normalizarAngulo(rumboRef.current);
    animarCamaraNavegacion(coords.latitude, coords.longitude, heading);
    ultimoEstadoCamaraRef.current = {
      latitude: coords.latitude,
      longitude: coords.longitude,
      heading,
    };
  }, [animarCamaraNavegacion]);

  async function obtenerUbicacion() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      setErrorUbicacion(
        "Permiso de ubicación denegado. Mostrando ubicación predeterminada.",
      );
      setCargandoUbicacion(false);
      setCoordsUsuario(null);
      coordsUsuarioRef.current = null;
      return;
    }
    const ubicacion = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Highest,
    });
    const lat = ubicacion.coords.latitude;
    const lng = ubicacion.coords.longitude;
    const coordsIniciales = { latitude: lat, longitude: lng };
    coordsUsuarioRef.current = coordsIniciales;
    setCoordsUsuario(coordsIniciales);
    setRegion({
      latitude: lat,
      longitude: lng,
      latitudeDelta: 0.02,
      longitudeDelta: 0.02,
    });

    if (
      typeof ubicacion.coords.heading === "number" &&
      ubicacion.coords.heading >= 0
    ) {
      rumboRef.current = normalizarAngulo(ubicacion.coords.heading);
    }

    animarCamaraNavegacion(lat, lng, rumboRef.current);
    ultimoEstadoCamaraRef.current = {
      latitude: lat,
      longitude: lng,
      heading: rumboRef.current,
    };
    setCargandoUbicacion(false);
  }

  const cargarHotspots = useCallback(async (f: HotspotFilter) => {
    setCargandoHotspots(true);
    setErrorHotspots(null);
    try {
      const hs = await listarHotspots(f);
      setHotspots(hs);
    } catch (e) {
      const mensaje = e instanceof Error ? e.message : String(e);
      setErrorHotspots(mensaje);
    } finally {
      setCargandoHotspots(false);
    }
  }, []);

  useEffect(() => {
    void obtenerUbicacion();
  }, []);

  useEffect(() => {
    if (!cargandoUbicacion) {
      void cargarHotspots(filtro);
    }
  }, [cargandoUbicacion, cargarHotspots, filtro]);

  useEffect(() => {
    if (cargandoUbicacion) {
      animEntradaUi.setValue(0);
      return;
    }

    Animated.timing(animEntradaUi, {
      toValue: 1,
      duration: 360,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [animEntradaUi, cargandoUbicacion]);

  useEffect(() => {
    if (debeMostrarListaSinGoogleMaps || cargandoUbicacion || errorUbicacion) {
      seguimientoCamaraRef.current?.remove();
      seguimientoCamaraRef.current = null;
      return;
    }

    let cancelado = false;

    (async () => {
      try {
        const subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.BestForNavigation,
            timeInterval: INTERVALO_NAVEGACION_MS,
            distanceInterval: DISTANCIA_NAVEGACION_M,
          },
          (loc) => {
            const { latitude, longitude, heading } = loc.coords;
            const coordsNuevas = { latitude, longitude };
            coordsUsuarioRef.current = coordsNuevas;
            setCoordsUsuario(coordsNuevas);

            if (typeof heading === "number" && heading >= 0) {
              rumboRef.current = normalizarAngulo(heading);
            }
          },
        );

        if (cancelado) {
          subscription.remove();
          return;
        }

        seguimientoCamaraRef.current = subscription;
      } catch {
        // Si falla el seguimiento continuo, dejamos la cámara fija en la última posición.
      }
    })();

    return () => {
      cancelado = true;
      seguimientoCamaraRef.current?.remove();
      seguimientoCamaraRef.current = null;
    };
  }, [cargandoUbicacion, debeMostrarListaSinGoogleMaps, errorUbicacion]);

  useEffect(() => {
    if (debeMostrarListaSinGoogleMaps || cargandoUbicacion || errorUbicacion) {
      brujulaRef.current?.remove();
      brujulaRef.current = null;
      return;
    }

    let cancelado = false;

    (async () => {
      try {
        const headingSub = await Location.watchHeadingAsync((h) => {
          const headingSensor =
            h.trueHeading >= 0
              ? h.trueHeading
              : h.magHeading >= 0
                ? h.magHeading
                : null;

          if (headingSensor === null) return;

          const normalizado = normalizarAngulo(headingSensor);
          if (
            diferenciaAngular(normalizado, rumboRef.current) <
            UMBRAL_GIRO_BRUJULA_GRADOS
          ) {
            return;
          }

          rumboRef.current = normalizado;
        });

        if (cancelado) {
          headingSub.remove();
          return;
        }

        brujulaRef.current = headingSub;
      } catch {
        // En equipos sin brújula no rotamos por rumbo, pero mantenemos el seguimiento.
      }
    })();

    return () => {
      cancelado = true;
      brujulaRef.current?.remove();
      brujulaRef.current = null;
    };
  }, [cargandoUbicacion, debeMostrarListaSinGoogleMaps, errorUbicacion]);

  useEffect(() => {
    if (debeMostrarListaSinGoogleMaps || cargandoUbicacion || errorUbicacion) {
      if (loopCamaraRef.current) {
        clearInterval(loopCamaraRef.current);
        loopCamaraRef.current = null;
      }
      return;
    }

    const renderizarCamara = () => {
      const coords = coordsUsuarioRef.current;
      if (!coords) return;

      const heading = normalizarAngulo(rumboRef.current);
      const ultimo = ultimoEstadoCamaraRef.current;

      if (ultimo) {
        const deltaPosicion = distanciaHaversine(
          ultimo.latitude,
          ultimo.longitude,
          coords.latitude,
          coords.longitude,
        );
        const deltaRumbo = diferenciaAngular(heading, ultimo.heading);

        if (
          deltaPosicion < UMBRAL_CAMBIO_POSICION_CAMARA_M &&
          deltaRumbo < UMBRAL_CAMBIO_RUMBO_CAMARA_GRADOS
        ) {
          return;
        }
      }

      animarCamaraNavegacion(coords.latitude, coords.longitude, heading);
      ultimoEstadoCamaraRef.current = {
        latitude: coords.latitude,
        longitude: coords.longitude,
        heading,
      };
    };

    renderizarCamara();
    loopCamaraRef.current = setInterval(
      renderizarCamara,
      INTERVALO_RENDER_CAMARA_MS,
    );

    return () => {
      if (loopCamaraRef.current) {
        clearInterval(loopCamaraRef.current);
        loopCamaraRef.current = null;
      }
    };
  }, [
    animarCamaraNavegacion,
    cargandoUbicacion,
    debeMostrarListaSinGoogleMaps,
    errorUbicacion,
  ]);

  // Mantener un ref con la lista actual para que el watcher (cuyo closure no se
  // rerenderiza) siempre vea reportes frescos al evaluar proximidad.
  useEffect(() => {
    reportesRef.current = reportes;
  }, [reportes]);

  // Watcher de proximidad: solo corre con Modo Seguro encendido y mientras el
  // usuario tenga sesión (la respuesta al prompt necesita JWT).
  useEffect(() => {
    if (!modoSeguroActivo || !token) {
      watcherRef.current?.remove();
      watcherRef.current = null;
      preguntadosRef.current.clear();
      setVigenciaPendiente(null);
      return;
    }

    let cancelado = false;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted" || cancelado) return;

      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: INTERVALO_UBICACION_MS,
          distanceInterval: DISTANCIA_MINIMA_MOVIMIENTO_M,
        },
        (loc) => {
          const { latitude, longitude } = loc.coords;
          const coordsNuevas = { latitude, longitude };
          coordsUsuarioRef.current = coordsNuevas;
          setCoordsUsuario(coordsNuevas);

          // Si ya hay un prompt abierto, no abrimos otro encima.
          if (vigenciaPendiente !== null) return;

          const cercano = reportesRef.current.find((r) => {
            if (r.estado !== "confirmado") return false;
            if (preguntadosRef.current.has(r.id)) return false;
            const d = distanciaHaversine(
              latitude,
              longitude,
              r.latitud,
              r.longitud,
            );
            return d <= RADIO_PROXIMIDAD_METROS;
          });

          if (cercano) {
            preguntadosRef.current.add(cercano.id);
            setVigenciaPendiente(cercano);
          }
        },
      );

      if (cancelado) {
        subscription.remove();
        return;
      }
      watcherRef.current = subscription;
    })();

    return () => {
      cancelado = true;
      watcherRef.current?.remove();
      watcherRef.current = null;
    };
  }, [modoSeguroActivo, token, vigenciaPendiente]);

  const cerrarVigencia = useCallback(() => {
    setVigenciaPendiente(null);
  }, []);

  const onResponderVigencia = useCallback(
    async (sigue: boolean) => {
      if (!vigenciaPendiente || !token) return;
      setEnviandoVigencia(true);
      try {
        await responderVigencia(vigenciaPendiente.id, sigue, token);
        // Si el reporte pudo haber cambiado de estado, refrescamos la lista.
        await cargarReportes();
      } catch (e) {
        const mensaje = e instanceof Error ? e.message : String(e);
        Alert.alert("No se pudo registrar tu respuesta", mensaje);
      } finally {
        setEnviandoVigencia(false);
        setVigenciaPendiente(null);
      }
    },
    [vigenciaPendiente, token, cargarReportes],
  );

  function pulsarNuevoReporte() {
    if (!token) {
      setModalAuthRequerida(true);
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
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.textoGris}>Cargando ubicación...</Text>
      </View>
    );
  }

  return (
    <View style={styles.contenedor}>
      <StatusBar barStyle="dark-content" />
      {errorUbicacion && (
        <View style={[styles.banner, { paddingTop: insets.top + 8 }]}>
          <Text style={styles.bannerTexto}>{errorUbicacion}</Text>
        </View>
      )}
      {errorReportes && (
        <View
          style={[
            styles.banner,
            styles.bannerError,
            !errorUbicacion && { paddingTop: insets.top + 8 },
          ]}
        >
          <Text style={styles.bannerErrorTexto}>{errorReportes}</Text>
        </View>
      )}

      {(cargandoReportes || cargandoHotspots) && !errorReportes && (
        <View style={[styles.badgeCarga, { top: topOverlayStart }]}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.badgeCargaTxt}>
            {cargandoHotspots
              ? "Cargando puntos criticos…"
              : "Cargando reportes…"}
          </Text>
        </View>
      )}

      {debeMostrarListaSinGoogleMaps ? (
        <ScrollView
          contentContainerStyle={styles.listaSinMapaContenido}
          keyboardShouldPersistTaps="handled"
          style={styles.mapa}
        >
          <Text style={styles.listaSinMapaTitulo}>
            Google Maps sin configurar
          </Text>
          <Text style={styles.listaSinMapaTxt}>
            En <Text style={styles.mono}>mobile/.env</Text> define{" "}
            <Text style={styles.mono}>EXPO_PUBLIC_GOOGLE_MAPS_KEY</Text> con una
            clave de Google Cloud con{" "}
            <Text style={styles.bold}>Maps SDK for Android</Text> e{" "}
            <Text style={styles.bold}>Maps SDK for iOS</Text> habilitados para
            este proyecto. Reinicia Expo con{" "}
            <Text style={styles.mono}>npx expo start -c</Text>.
          </Text>
          <Text style={styles.listaSinMapaSub}>
            Reportes cargados ({reportes.length})
          </Text>
          {reportes.map((r) => (
            <View key={r.id} style={styles.filaRepo}>
              <Text style={styles.filaTipo}>{r.tipo}</Text>
              <Text style={styles.filaMeta}>
                sev. {r.severidad} · {r.latitud.toFixed(4)},{" "}
                {r.longitud.toFixed(4)}
              </Text>
              {r.descripcion ? (
                <Text style={styles.filaDesc}>{r.descripcion}</Text>
              ) : null}
            </View>
          ))}
        </ScrollView>
      ) : (
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={styles.mapa}
          initialRegion={region}
          onMapReady={enfocarCamaraUsuario}
          pitchEnabled
          rotateEnabled
          showsBuildings
          showsUserLocation
          mapPadding={mapPaddingNavegacion}
        >
          {!heatmapMode &&
            reportes.map((r) => {
              const color = COLOR_POR_TIPO[r.tipo] ?? "#6B7280";
              const icono = (ICONO_POR_TIPO[r.tipo] ?? "alert-circle") as Parameters<typeof MaterialCommunityIcons>[0]["name"];
              return (
                <Marker
                  key={r.id}
                  coordinate={{ latitude: r.latitud, longitude: r.longitud }}
                  title={r.tipo.replace(/_/g, " ")}
                  description={r.descripcion ?? undefined}
                  tracksViewChanges={false}
                >
                  {/* Icono personalizado por tipo de reporte */}
                  <View style={[styles.marcadorContenedor, { borderColor: color }]}>
                    <View style={[styles.marcadorBurbuja, { backgroundColor: color }]}>
                      <MaterialCommunityIcons name={icono} size={18} color="#fff" />
                    </View>
                    {/* Punta de la burbuja */}
                    <View style={[styles.marcadorPunta, { borderTopColor: color }]} />
                  </View>
                </Marker>
              );
            })}

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

      {hudState && hudTone ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.hudWrap,
            {
              top: topOverlayStart + HUD_TOP_OFFSET,
              right: HUD_RIGHT_RESERVE,
              borderColor: hudTone.borderColor,
              opacity: animEntradaUi,
              transform: [{ translateY: uiTranslateY }, { scale: uiScale }],
            },
          ]}
        >
          <View
            style={[styles.hudIconWrap, { backgroundColor: hudTone.iconBg }]}
          >
            <MaterialCommunityIcons
              color={hudTone.iconColor}
              name={hudState.iconName}
              size={16}
            />
          </View>

          <View style={styles.hudBody}>
            <Text numberOfLines={1} style={styles.hudTitle}>
              {hudState.title}
            </Text>
            <Text numberOfLines={1} style={styles.hudDetail}>
              {hudState.detail}
            </Text>
          </View>
        </Animated.View>
      ) : null}

      <Animated.View
        style={[
          styles.fabIzq,
          {
            top: topOverlayStart,
            opacity: animEntradaUi,
            transform: [{ translateY: uiTranslateY }, { scale: uiScale }],
          },
        ]}
      >
        <Pressable
          accessibilityLabel="Menú lateral"
          accessibilityRole="button"
          style={styles.fabChico}
          onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
        >
          <MaterialCommunityIcons color={colors.text} name="menu" size={24} />
        </Pressable>
      </Animated.View>

      <Animated.View
        style={[
          styles.fabFila,
          styles.fabFilaGap,
          {
            top: topOverlayStart,
            opacity: animEntradaUi,
            transform: [{ translateY: uiTranslateY }, { scale: uiScale }],
          },
        ]}
      >
        <Pressable
          accessibilityLabel="Actualizar reportes"
          accessibilityRole="button"
          style={styles.fab}
          onPress={() => {
            void cargarReportes();
            void cargarHotspots(filtro);
          }}
        >
          <MaterialCommunityIcons
            color={colors.text}
            name="refresh"
            size={22}
          />
        </Pressable>

        <Pressable
          accessibilityLabel={
            heatmapMode ? "Ocultar puntos criticos" : "Mostrar puntos criticos"
          }
          accessibilityRole="button"
          accessibilityState={{ selected: heatmapMode }}
          style={[styles.fab, heatmapMode && styles.fabActive]}
          onPress={() => setHeatmapMode((v) => !v)}
        >
          <MaterialCommunityIcons
            color={heatmapMode ? "#fff" : colors.text}
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
            color={filtroVisible ? "#fff" : colors.text}
            name="layers-triple-outline"
            size={22}
          />
        </Pressable>
      </Animated.View>

      {heatmapMode && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.chipFiltro,
            {
              bottom: chipFiltroBottom,
              opacity: animEntradaUi,
              transform: [{ translateY: uiTranslateY }],
            },
          ]}
        >
          <MaterialCommunityIcons
            color="#fff"
            name="filter-variant"
            size={14}
          />
          <Text style={styles.chipFiltroTxt}>{etiquetaFiltro(filtro)}</Text>
        </Animated.View>
      )}

      <Animated.View
        style={{
          opacity: animEntradaUi,
          transform: [{ translateY: uiTranslateY }, { scale: uiScale }],
        }}
      >
        <Pressable
          accessibilityLabel={
            token
              ? "Reportar incidente"
              : "Reportar incidente (requiere cuenta)"
          }
          accessibilityRole="button"
          style={[
            styles.fabMas,
            { bottom: reportCtaBottom },
            !token && styles.fabMasInvitado,
          ]}
          onPress={pulsarNuevoReporte}
        >
          <MaterialCommunityIcons
            color="#fff"
            name="alert-circle-outline"
            size={22}
          />
          <View style={styles.fabMasTxtWrap}>
            <Text style={styles.fabMasTit}>Reportar</Text>
            <Text style={styles.fabMasSub}>incidente</Text>
          </View>
        </Pressable>
      </Animated.View>

      <FiltroHotspotsSheet
        initialFilter={filtro}
        onApply={aplicarFiltro}
        onDismiss={() => setFiltroVisible(false)}
        visible={filtroVisible}
      />

      <AuthRequiredModal
        onDismiss={() => setModalAuthRequerida(false)}
        onGoToAccount={() => {
          setModalAuthRequerida(false);
          navigation.navigate("MiCuenta");
        }}
        visible={modalAuthRequerida}
      />

      {token ? (
        <NuevoReporteModal
          accessToken={token}
          latitud={ubicacionParaReporte.latitud}
          longitud={ubicacionParaReporte.longitud}
          onCreado={() => void cargarReportes()}
          onDismiss={() => setModalNuevo(false)}
          visible={modalNuevo}
        />
      ) : null}

      <VigenciaModal
        enviando={enviandoVigencia}
        onDismiss={cerrarVigencia}
        onResponder={onResponderVigencia}
        reporte={vigenciaPendiente}
      />

      {/* ── Botón Modo Seguro ────────────────────────────────────────────── */}
      <Animated.View
        pointerEvents="box-none"
        style={[
          styles.modoSeguroWrap,
          {
            bottom: bottomOverlayStart,
            opacity: animEntradaUi,
            transform: [{ translateY: uiTranslateY }, { scale: pulso }],
          },
        ]}
      >
        <Pressable
          accessibilityLabel={
            modoSeguroActivo ? "Desactivar Modo Seguro" : "Activar Modo Seguro"
          }
          accessibilityRole="button"
          accessibilityState={{ selected: modoSeguroActivo }}
          style={[
            styles.modoSeguroBtn,
            modoSeguroActivo && styles.modoSeguroBtnActivo,
          ]}
          onPress={toggleModoSeguro}
        >
          <MaterialCommunityIcons
            color="#fff"
            name={modoSeguroActivo ? "shield-check" : "shield-outline"}
            size={20}
          />
          <Text style={styles.modoSeguroTxt}>MODO SEGURO</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1 },
  mapa: { flex: 1 },
  // ── Marcadores personalizados ───────────────────────────────────────────────
  marcadorContenedor: {
    alignItems: "center",
    borderRadius: 24,
  },
  marcadorBurbuja: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2.5,
    borderColor: "#fff",
    // Sombra iOS
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.28,
    shadowRadius: 4,
    // Sombra Android
    elevation: 5,
  },
  marcadorPunta: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    marginTop: -1,
  },
  // ── General ─────────────────────────────────────────────────────────────────
  centrado: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    backgroundColor: colors.background,
  },
  textoGris: { color: colors.textMuted, fontSize: 14 },
  hudWrap: {
    position: "absolute",
    left: OVERLAY_SIDE_PADDING,
    zIndex: 2,
    maxWidth: 248,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(255,255,255,0.90)",
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "rgba(214,225,235,0.82)",
    ...shadow.card,
  },
  hudIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  hudBody: {
    flexShrink: 1,
  },
  hudTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "800",
    fontFamily: iosTitleFont,
  },
  hudDetail: {
    marginTop: 1,
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "600",
  },
  banner: {
    backgroundColor: colors.warningBg,
    paddingHorizontal: 12,
    paddingVertical: 10,
    maxHeight: 100,
  },
  bannerTexto: { color: colors.warningText, fontSize: 13 },
  bannerError: { backgroundColor: colors.errorBg, maxHeight: 140 },
  bannerErrorTexto: { color: colors.errorText, fontSize: 13 },
  badgeCarga: {
    position: "absolute",
    alignSelf: "center",
    zIndex: 2,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.95)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    ...shadow.card,
  },
  badgeCargaTxt: { fontSize: 13, color: colors.textMuted },
  fabIzq: {
    position: "absolute",
    left: 16,
    zIndex: 3,
  },
  fabChico: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(255,255,255,0.94)",
    borderWidth: 1,
    borderColor: "rgba(214,225,235,0.82)",
    alignItems: "center",
    justifyContent: "center",
    ...shadow.floating,
  },
  fabFila: {
    position: "absolute",
    right: 16,
    zIndex: 3,
  },
  fab: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(255,255,255,0.94)",
    borderWidth: 1,
    borderColor: "rgba(214,225,235,0.82)",
    alignItems: "center",
    justifyContent: "center",
    ...shadow.floating,
  },
  fabFilaGap: { gap: 12 },
  fabActive: {
    backgroundColor: colors.primary,
    borderColor: "rgba(14,165,164,0.68)",
  },
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
    backgroundColor: "rgba(14,165,164,0.96)",
    ...shadow.card,
    zIndex: 2,
  },
  chipFiltroTxt: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  fabMas: {
    position: "absolute",
    left: 20,
    bottom: 36,
    width: 112,
    height: 82,
    borderRadius: 24,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 10,
    ...shadow.floating,
    zIndex: 3,
  },
  fabMasInvitado: { opacity: 0.75 },
  fabMasTxtWrap: {
    alignItems: "center",
  },
  fabMasTit: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  fabMasSub: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 1,
  },
  listaSinMapaContenido: { padding: 16, paddingBottom: 120, gap: 8 },
  listaSinMapaTitulo: { fontSize: 18, fontWeight: "700", color: colors.text },
  listaSinMapaTxt: { fontSize: 14, color: colors.textMuted, lineHeight: 20 },
  listaSinMapaSub: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
    marginTop: 12,
  },
  mono: {
    fontFamily: Platform.select({
      ios: "Menlo",
      android: "monospace",
      default: "monospace",
    }),
  },
  bold: { fontWeight: "700" },
  filaRepo: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  filaTipo: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.primaryDark,
    textTransform: "capitalize",
  },
  filaMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  filaDesc: { fontSize: 14, color: colors.text, marginTop: 6 },
  modoSeguroWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 4,
  },
  modoSeguroBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 999,
    backgroundColor: "rgba(15,23,42,0.93)",
    ...shadow.floating,
  },
  modoSeguroBtnActivo: {
    backgroundColor: "#16a34a",
  },
  modoSeguroTxt: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 1,
  },
});
