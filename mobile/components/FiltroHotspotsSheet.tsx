import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";

import type { HotspotFilter } from "../services/hotspots";

interface Props {
  visible: boolean;
  initialFilter: HotspotFilter;
  availableYears?: number[];
  onApply: (filter: HotspotFilter) => void;
  onDismiss: () => void;
}

const MESES_CORTOS = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

const ANOS_DEFAULT = [2022, 2023, 2024, 2025];

export default function FiltroHotspotsSheet({
  visible,
  initialFilter,
  availableYears = ANOS_DEFAULT,
  onApply,
  onDismiss,
}: Props) {
  const [global, setGlobal] = useState(initialFilter.mode === "global");
  const [year, setYear] = useState<number | null>(
    initialFilter.mode === "global" ? null : initialFilter.year,
  );
  const [month, setMonth] = useState<number | null>(
    initialFilter.mode === "month" ? initialFilter.month : null,
  );

  const slide = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setGlobal(initialFilter.mode === "global");
      setYear(initialFilter.mode === "global" ? null : initialFilter.year);
      setMonth(initialFilter.mode === "month" ? initialFilter.month : null);
      Animated.timing(slide, {
        toValue: 1,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    } else {
      slide.setValue(0);
    }
  }, [visible, initialFilter, slide]);

  const translateY = slide.interpolate({
    inputRange: [0, 1],
    outputRange: [400, 0],
  });

  const opacity = slide.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const filtroActual = useMemo<HotspotFilter | null>(() => {
    if (global) return { mode: "global" };
    if (year == null) return null;
    if (month == null) return { mode: "year", year };
    return { mode: "month", year, month };
  }, [global, year, month]);

  const puedeAplicar = filtroActual !== null;

  function aplicar() {
    if (filtroActual) {
      onApply(filtroActual);
      onDismiss();
    }
  }

  function alternarGlobal(value: boolean) {
    setGlobal(value);
    if (value) {
      setYear(null);
      setMonth(null);
    }
  }

  function elegirAno(a: number) {
    setYear((prev) => (prev === a ? null : a));
    setMonth(null);
  }

  function elegirMes(m: number) {
    if (year == null) return;
    setMonth((prev) => (prev === m ? null : m));
  }

  return (
    <Modal
      animationType="none"
      onRequestClose={onDismiss}
      transparent
      visible={visible}
    >
      <Animated.View style={[styles.backdrop, { opacity }]}>
        <Pressable style={styles.backdropPress} onPress={onDismiss} />
      </Animated.View>

      <View style={styles.sheetWrapper} pointerEvents="box-none">
        <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <View style={styles.headerIzq}>
              <MaterialCommunityIcons color="#E53E3E" name="filter-variant" size={22} />
              <Text style={styles.titulo}>Filtrar puntos criticos</Text>
            </View>
            <Pressable
              accessibilityLabel="Cerrar filtros"
              accessibilityRole="button"
              hitSlop={8}
              onPress={onDismiss}
              style={styles.cerrar}
            >
              <MaterialCommunityIcons color="#4a5568" name="close" size={22} />
            </Pressable>
          </View>

          <View style={styles.fila}>
            <View style={styles.filaInfo}>
              <Text style={styles.filaTitulo}>Historico global</Text>
              <Text style={styles.filaSub}>
                Muestra los puntos persistentes (sin periodo).
              </Text>
            </View>
            <Switch
              ios_backgroundColor="#cbd5e0"
              onValueChange={alternarGlobal}
              thumbColor="#fff"
              trackColor={{ false: "#cbd5e0", true: "#E53E3E" }}
              value={global}
            />
          </View>

          <View style={[styles.bloque, global && styles.bloqueDeshab]}>
            <Text style={styles.label}>Filtrar por temporalidad</Text>
            <Text style={styles.subLabel}>Ano</Text>
            <ScrollView
              contentContainerStyle={styles.chipsRow}
              horizontal
              showsHorizontalScrollIndicator={false}
            >
              {availableYears.map((a) => {
                const activo = year === a && !global;
                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: activo, disabled: global }}
                    disabled={global}
                    key={`y-${a}`}
                    onPress={() => elegirAno(a)}
                    style={[styles.chip, activo && styles.chipActivo]}
                  >
                    <Text style={[styles.chipTxt, activo && styles.chipTxtActivo]}>
                      {a}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <Text style={[styles.subLabel, styles.subLabelMes]}>
              Mes {year == null && !global ? "(elige un ano primero)" : ""}
            </Text>
            <View style={styles.chipsGrid}>
              {MESES_CORTOS.map((nombre, idx) => {
                const m = idx + 1;
                const deshab = global || year == null;
                const activo = !deshab && month === m;
                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: activo, disabled: deshab }}
                    disabled={deshab}
                    key={`m-${m}`}
                    onPress={() => elegirMes(m)}
                    style={[
                      styles.chipMes,
                      activo && styles.chipActivo,
                      deshab && styles.chipDeshab,
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipTxt,
                        activo && styles.chipTxtActivo,
                        deshab && styles.chipTxtDeshab,
                      ]}
                    >
                      {nombre}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !puedeAplicar }}
            disabled={!puedeAplicar}
            onPress={aplicar}
            style={[styles.aplicar, !puedeAplicar && styles.aplicarDeshab]}
          >
            <Text style={styles.aplicarTxt}>Aplicar filtro</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15,23,42,0.45)",
  },
  backdropPress: { flex: 1 },
  sheetWrapper: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 28,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 16,
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#cbd5e0",
    marginBottom: 14,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  headerIzq: { flexDirection: "row", alignItems: "center", gap: 8 },
  titulo: { fontSize: 17, fontWeight: "700", color: "#1a202c" },
  cerrar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#edf2f7",
  },
  fila: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "#e2e8f0",
  },
  filaInfo: { flex: 1, paddingRight: 12 },
  filaTitulo: { fontSize: 15, fontWeight: "600", color: "#1a202c" },
  filaSub: { fontSize: 12, color: "#718096", marginTop: 2 },
  bloque: { paddingTop: 18, paddingBottom: 4 },
  bloqueDeshab: { opacity: 0.45 },
  label: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1a202c",
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  subLabel: { fontSize: 13, fontWeight: "600", color: "#4a5568", marginBottom: 8 },
  subLabelMes: { marginTop: 14 },
  chipsRow: { gap: 8, paddingRight: 4 },
  chipsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#edf2f7",
    borderWidth: 1,
    borderColor: "transparent",
  },
  chipMes: {
    width: "22%",
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#edf2f7",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "transparent",
  },
  chipActivo: {
    backgroundColor: "#FED7D7",
    borderColor: "#E53E3E",
  },
  chipDeshab: { backgroundColor: "#f7fafc" },
  chipTxt: { fontSize: 13, fontWeight: "600", color: "#2d3748" },
  chipTxtActivo: { color: "#9B2C2C" },
  chipTxtDeshab: { color: "#a0aec0" },
  aplicar: {
    marginTop: 22,
    backgroundColor: "#E53E3E",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  aplicarDeshab: { backgroundColor: "#fbb6b6" },
  aplicarTxt: { color: "#fff", fontSize: 15, fontWeight: "700", letterSpacing: 0.3 },
});
