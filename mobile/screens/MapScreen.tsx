import { DrawerActions, useNavigation } from "@react-navigation/native";
import type { DrawerNavigationProp } from "@react-navigation/drawer";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Alert,
  Dimensions,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import MapView from "react-native-maps";
import * as Location from "expo-location";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ReanimatedView, {
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";

import AuthRequiredModal from "../components/AuthRequiredModal";
import FiltroHotspotsSheet from "../components/FiltroHotspotsSheet";
import NuevoReporteModal from "../components/NuevoReporteModal";
import VigenciaModal from "../components/VigenciaModal";
import MapaInteractivo from "../components/map/MapaInteractivo";
import FabReportar from "../components/map/FabReportar";
import BottomSheetAccesos from "../components/map/BottomSheetAccesos";
import type { QuickTile } from "../components/map/BottomSheetAccesos";
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
const PITCH_NAVEGACION = 0;
const ZOOM_NAVEGACION = 17.2;
const ALTITUD_NAVEGACION = 680;
const DURACION_ANIMACION_CAMARA_MS = 260;
const UMBRAL_GIRO_BRUJULA_GRADOS = 6;
const UMBRAL_RECARGA_REPORTES_M = 300;
const OVERLAY_SIDE_PADDING = 16;
const BOTTOM_OVERLAY_OFFSET = 24;
// Margen del FAB al borde inferior. Sin BottomSheet permanente, basta una
// respiración propia anclada al borde de pantalla (estilo Waze).
const REPORT_CTA_BOTTOM_OFFSET = 18;
// Tamaño visual total del FAB (botón + halo) + separación vertical respecto
// a la botonera lateral apilada arriba.
const FAB_VISUAL_EXTENT = 88;
const FAB_TO_CONTROLES_GAP = 14;
const ENTRY_STAGGER_MS = 60;
const ENTRY_DURATION_MS = 360;
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
  const animEntradaUi = useRef(new Animated.Value(0)).current;
  const animSearchUi = useRef(new Animated.Value(0)).current;
  const animControlesUi = useRef(new Animated.Value(0)).current;
  const animFabUi = useRef(new Animated.Value(0)).current;

  // Proximidad: el reporte que está mostrando el prompt y el set de ids ya preguntados.
  const [vigenciaPendiente, setVigenciaPendiente] = useState<Reporte | null>(
    null,
  );
  const [enviandoVigencia, setEnviandoVigencia] = useState(false);
  const preguntadosRef = useRef<Set<number>>(new Set());
  const watcherRef = useRef<Location.LocationSubscription | null>(null);
  const reportesRef = useRef<Reporte[]>([]);

  // ── Toast efímero (feedback para acciones laterales como Modo Seguro) ──
  const [toastMensaje, setToastMensaje] = useState<string | null>(null);
  const animToast = useRef(new Animated.Value(0)).current;
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const mostrarToast = useCallback(
    (mensaje: string) => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
        toastTimerRef.current = null;
      }
      setToastMensaje(mensaje);
      Animated.timing(animToast, {
        toValue: 1,
        duration: 200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
      toastTimerRef.current = setTimeout(() => {
        Animated.timing(animToast, {
          toValue: 0,
          duration: 180,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }).start(({ finished }) => {
          if (finished) setToastMensaje(null);
        });
        toastTimerRef.current = null;
      }, 2400);
    },
    [animToast],
  );

  useEffect(
    () => () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    },
    [],
  );

  const toggleModoSeguro = useCallback(() => {
    setModoSeguroActivo((prev) => {
      const siguiente = !prev;
      mostrarToast(
        siguiente
          ? "Modo Seguro activado · te avisamos al acercarte a un punto"
          : "Modo Seguro desactivado",
      );
      return siguiente;
    });
  }, [mostrarToast]);

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

  const uiTranslateY = animEntradaUi.interpolate({
    inputRange: [0, 1],
    outputRange: [22, 0],
  });

  const uiScale = animEntradaUi.interpolate({
    inputRange: [0, 1],
    outputRange: [0.96, 1],
  });

  const searchTranslateY = animSearchUi.interpolate({
    inputRange: [0, 1],
    outputRange: [-16, 0],
  });

  const fabTranslateY = animFabUi.interpolate({
    inputRange: [0, 1],
    outputRange: [28, 0],
  });

  const fabScale = animFabUi.interpolate({
    inputRange: [0, 1],
    outputRange: [0.82, 1],
  });

  // SharedValue rastreado por @gorhom/bottom-sheet (Y del borde superior
  // del sheet desde el tope de pantalla). El FAB se desplaza con la hoja
  // manteniendo un gap visual constante.
  const sheetPosition = useSharedValue(0);
  const fabAnimStyle = useAnimatedStyle(() => {
    "worklet";
    return {
      transform: [
        { translateY: sheetPosition.value - FAB_VISUAL_EXTENT - 14 },
      ],
    };
  });

  const mapPaddingNavegacion = useMemo(
    () => ({
      top: topOverlayStart + 56 + 84,
      right: OVERLAY_SIDE_PADDING,
      // Padding inferior compensa la mitad del sheet (snap medio ~50%) para
      // que el marker del usuario quede centrado en el área de mapa visible.
      bottom: reportCtaBottom + FAB_VISUAL_EXTENT + 16,
      left: OVERLAY_SIDE_PADDING,
    }),
    [bottomOverlayStart, topOverlayStart, reportCtaBottom],
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

  // Quick-tiles dentro del BottomSheet (patrón Waze: Home / Work / +New).
  // Orden por frecuencia de uso: Centrar primero por estar más a mano dentro
  // del sheet expandido.
  const quickTiles = useMemo<QuickTile[]>(
    () => [
      {
        id: "center",
        icono: "crosshairs-gps",
        label: "Centrar",
        onPress: enfocarCamaraUsuario,
      },
      {
        id: "heatmap",
        icono: "fire",
        label: "Mapa calor",
        activo: heatmapMode,
        onPress: () => setHeatmapMode((v) => !v),
      },
      {
        id: "modoSeguro",
        icono: modoSeguroActivo ? "shield-check" : "shield-outline",
        label: "Modo seguro",
        activo: modoSeguroActivo,
        onPress: toggleModoSeguro,
      },
      {
        id: "filtros",
        icono: "layers-triple-outline",
        label: "Filtros",
        activo: filtroVisible,
        onPress: () => setFiltroVisible(true),
      },
    ],
    [
      enfocarCamaraUsuario,
      heatmapMode,
      filtroVisible,
      modoSeguroActivo,
      toggleModoSeguro,
    ],
  );

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
      animSearchUi.setValue(0);
      animControlesUi.setValue(0);
      animFabUi.setValue(0);
      return;
    }

    // HUD aparece junto con la búsqueda (mismo "grupo superior").
    Animated.timing(animEntradaUi, {
      toValue: 1,
      duration: ENTRY_DURATION_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    // Entrada escalonada de los overlays primarios:
    // búsqueda → controles laterales → FAB (jerarquía visual y atención).
    Animated.stagger(ENTRY_STAGGER_MS, [
      Animated.timing(animSearchUi, {
        toValue: 1,
        duration: ENTRY_DURATION_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(animControlesUi, {
        toValue: 1,
        duration: ENTRY_DURATION_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(animFabUi, {
        toValue: 1,
        duration: ENTRY_DURATION_MS,
        easing: Easing.out(Easing.back(1.2)),
        useNativeDriver: true,
      }),
    ]).start();
  }, [
    animEntradaUi,
    animSearchUi,
    animControlesUi,
    animFabUi,
    cargandoUbicacion,
  ]);

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
        <MapaInteractivo
          ref={mapRef}
          initialRegion={region}
          onMapReady={enfocarCamaraUsuario}
          mapPadding={mapPaddingNavegacion}
          reportes={reportes}
          heatmapMode={heatmapMode}
          heatmapPoints={heatmapPoints}
          heatmapGradient={HEATMAP_GRADIENT}
          colorPorTipo={COLOR_POR_TIPO}
          iconoPorTipo={ICONO_POR_TIPO}
        />
      )}

      {hudState && hudTone ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.hudWrap,
            {
              top: topOverlayStart + 4,
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

      {/* Botón menú flotante (top-left) — patrón Waze: card 48×48 sólo
          con el hamburguer, deja todo el ancho superior libre. */}
      <Animated.View
        style={[
          styles.menuFlotanteWrap,
          {
            top: topOverlayStart,
            opacity: animSearchUi,
            transform: [{ translateY: searchTranslateY }],
          },
        ]}
      >
        <Pressable
          accessibilityLabel="Abrir menú"
          accessibilityRole="button"
          android_ripple={{
            color: "rgba(15,23,42,0.10)",
            borderless: true,
            radius: 24,
          }}
          hitSlop={8}
          onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
          style={({ pressed }) => [
            styles.menuFlotanteBtn,
            pressed && styles.menuFlotantePressed,
          ]}
        >
          <MaterialCommunityIcons color={colors.text} name="menu" size={24} />
        </Pressable>
      </Animated.View>

      {/* BottomSheet primero en el árbol para que el FAB (siguiente)
          siempre dibuje por encima en cualquier snap. */}
      <BottomSheetAccesos
        animatedPosition={sheetPosition}
        colorPorTipo={COLOR_POR_TIPO}
        iconoPorTipo={ICONO_POR_TIPO}
        quickTiles={quickTiles}
        reportes={reportes}
      />

      {/* FAB Reportar — tracking de la posición animada del bottom sheet
          vía Reanimated (sube/baja con la hoja). */}
      <ReanimatedView.View
        style={[styles.fabReportarWrap, fabAnimStyle]}
        pointerEvents="box-none"
      >
        <Animated.View
          style={{
            opacity: animFabUi,
            transform: [{ translateY: fabTranslateY }, { scale: fabScale }],
          }}
        >
          <FabReportar habilitado={!!token} onPress={pulsarNuevoReporte} />
        </Animated.View>
      </ReanimatedView.View>

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

      {toastMensaje ? (
        <Animated.View
          accessibilityLiveRegion="polite"
          pointerEvents="none"
          style={[
            styles.toast,
            {
              bottom:
                reportCtaBottom +
                FAB_VISUAL_EXTENT +
                FAB_TO_CONTROLES_GAP +
                14,
              opacity: animToast,
              transform: [
                {
                  translateY: animToast.interpolate({
                    inputRange: [0, 1],
                    outputRange: [10, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <MaterialCommunityIcons
            color="#fff"
            name="shield-check"
            size={16}
          />
          <Text numberOfLines={2} style={styles.toastTxt}>
            {toastMensaje}
          </Text>
        </Animated.View>
      ) : null}
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
  // Píldora compacta top-right — equivalente a la insignia rosa de música
  // en Waze; sólo aparece cuando hay un modo activo (heatmap / Modo Seguro).
  hudWrap: {
    position: "absolute",
    right: OVERLAY_SIDE_PADDING,
    zIndex: 2,
    maxWidth: 232,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.98)",
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: "rgba(214,225,235,0.82)",
    ...shadow.overlay,
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
  menuFlotanteWrap: {
    position: "absolute",
    left: OVERLAY_SIDE_PADDING,
    zIndex: 4,
  },
  menuFlotanteBtn: {
    width: 48,
    height: 48,
    borderRadius: radii.md,
    backgroundColor: "rgba(255,255,255,0.98)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(214,225,235,0.85)",
    ...shadow.overlay,
  },
  menuFlotantePressed: {
    opacity: 0.7,
  },
  // FAB Reportar — anclado en el origen (top:0) y desplazado por Reanimated
  // siguiendo el borde superior del bottom sheet.
  fabReportarWrap: {
    position: "absolute",
    right: OVERLAY_SIDE_PADDING - 2,
    top: 0,
    zIndex: 4,
  },
  toast: {
    position: "absolute",
    left: OVERLAY_SIDE_PADDING,
    right: OVERLAY_SIDE_PADDING,
    alignSelf: "center",
    maxWidth: 360,
    marginHorizontal: "auto",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radii.pill,
    backgroundColor: "rgba(15,23,42,0.92)",
    zIndex: 5,
    ...shadow.overlay,
  },
  toastTxt: {
    flex: 1,
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.2,
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
});
