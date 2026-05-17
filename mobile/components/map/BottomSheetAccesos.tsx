import BottomSheet, { BottomSheetFlatList } from "@gorhom/bottom-sheet";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { forwardRef, useCallback, useMemo } from "react";
import type { ComponentProps, Ref } from "react";
import { Dimensions, Pressable, StyleSheet, Text, View } from "react-native";
import type { SharedValue } from "react-native-reanimated";

import { colors, iosTitleFont, radii, shadow } from "../../theme/tokens";
import type { Reporte } from "../../services/reportes";

type IconName = ComponentProps<typeof MaterialCommunityIcons>["name"];

export interface QuickTile {
  id: string;
  icono: IconName;
  label: string;
  activo?: boolean;
  onPress: () => void;
}

export interface BottomSheetAccesosProps {
  reportes: Reporte[];
  quickTiles: QuickTile[];
  onPressSearch?: () => void;
  searchPlaceholder?: string;
  animatedPosition?: SharedValue<number>;
  colorPorTipo: Record<string, string>;
  iconoPorTipo: Record<string, string>;
}

// Snap points en píxeles (más predecibles que strings "%" en gorhom v5).
const SCREEN_HEIGHT = Dimensions.get("window").height;
const SNAP_POINTS = [
  Math.round(SCREEN_HEIGHT * 0.12),
  Math.round(SCREEN_HEIGHT * 0.5),
  Math.round(SCREEN_HEIGHT * 0.9),
];
const MAX_REPORTES_LISTA = 12;

function tituloTipo(tipo: string): string {
  return tipo.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
}

function BottomSheetAccesosBase(
  {
    reportes,
    quickTiles,
    onPressSearch,
    searchPlaceholder = "Buscar lugar o dirección",
    animatedPosition,
    colorPorTipo,
    iconoPorTipo,
  }: BottomSheetAccesosProps,
  ref: Ref<BottomSheet>,
) {
  const snapPoints = useMemo(() => SNAP_POINTS, []);

  const reportesVisibles = useMemo(
    () =>
      reportes
        .filter((r) => r.estado === "confirmado")
        .slice(0, MAX_REPORTES_LISTA),
    [reportes],
  );

  const renderHandle = useCallback(
    () => (
      <View style={styles.handleWrap}>
        <View style={styles.handleBar} />
      </View>
    ),
    [],
  );

  const renderHeader = useCallback(
    () => (
      <View style={styles.headerWrap}>
        <Pressable
          accessibilityLabel="Buscar lugar"
          accessibilityRole="search"
          onPress={onPressSearch}
          style={({ pressed }) => [
            styles.search,
            pressed && styles.searchPressed,
          ]}
        >
          <MaterialCommunityIcons
            color={colors.textMuted}
            name="magnify"
            size={20}
          />
          <Text numberOfLines={1} style={styles.searchTxt}>
            {searchPlaceholder}
          </Text>
          <View style={styles.searchMic}>
            <MaterialCommunityIcons
              color={colors.textMuted}
              name="microphone-outline"
              size={18}
            />
          </View>
        </Pressable>

        <View style={styles.tilesRow}>
          {quickTiles.map((tile) => (
            <Pressable
              accessibilityLabel={tile.label}
              accessibilityRole="button"
              accessibilityState={{ selected: !!tile.activo }}
              android_ripple={{
                color: "rgba(15,23,42,0.08)",
                borderless: false,
              }}
              key={tile.id}
              onPress={tile.onPress}
              style={({ pressed }) => [
                styles.tile,
                tile.activo && styles.tileActiva,
                pressed && styles.tilePressed,
              ]}
            >
              <MaterialCommunityIcons
                color={tile.activo ? "#fff" : colors.primaryDark}
                name={tile.icono}
                size={22}
              />
            </Pressable>
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Reportes confirmados</Text>
          <Text style={styles.sectionCount}>{reportesVisibles.length}</Text>
        </View>
      </View>
    ),
    [
      onPressSearch,
      quickTiles,
      reportesVisibles.length,
      searchPlaceholder,
    ],
  );

  const renderItem = useCallback(
    ({ item }: { item: Reporte }) => {
      const color = colorPorTipo[item.tipo] ?? colors.textMuted;
      const icono = (iconoPorTipo[item.tipo] ?? "alert-circle") as IconName;
      return (
        <View style={styles.fila}>
          <View style={[styles.filaIcono, { backgroundColor: `${color}1A` }]}>
            <MaterialCommunityIcons color={color} name={icono} size={20} />
          </View>
          <View style={styles.filaCuerpo}>
            <Text numberOfLines={1} style={styles.filaTitulo}>
              {tituloTipo(item.tipo)}
            </Text>
            <Text numberOfLines={1} style={styles.filaSub}>
              {item.descripcion
                ? item.descripcion
                : `${item.latitud.toFixed(4)}, ${item.longitud.toFixed(4)}`}
            </Text>
          </View>
          <View style={styles.severidad}>
            <View
              style={[
                styles.severidadDot,
                {
                  backgroundColor:
                    item.severidad >= 4
                      ? colors.danger
                      : item.severidad >= 2
                        ? colors.accent
                        : colors.primary,
                },
              ]}
            />
            <Text style={styles.severidadTxt}>S{item.severidad}</Text>
          </View>
        </View>
      );
    },
    [colorPorTipo, iconoPorTipo],
  );

  const renderEmpty = useCallback(
    () => (
      <View style={styles.empty}>
        <MaterialCommunityIcons
          color={colors.textMuted}
          name="map-search-outline"
          size={28}
        />
        <Text style={styles.emptyTxt}>
          No hay reportes confirmados en este momento.
        </Text>
      </View>
    ),
    [],
  );

  return (
    <BottomSheet
      ref={ref}
      animatedPosition={animatedPosition}
      animateOnMount={false}
      backgroundStyle={styles.fondo}
      enableDynamicSizing={false}
      enablePanDownToClose={false}
      handleComponent={renderHandle}
      index={1}
      snapPoints={snapPoints}
    >
      <BottomSheetFlatList
        ListEmptyComponent={renderEmpty}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContent}
        data={reportesVisibles}
        ItemSeparatorComponent={Separator}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
      />
    </BottomSheet>
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

function keyExtractor(item: Reporte): string {
  return String(item.id);
}

const BottomSheetAccesos = forwardRef<BottomSheet, BottomSheetAccesosProps>(
  BottomSheetAccesosBase,
);
BottomSheetAccesos.displayName = "BottomSheetAccesos";

export default BottomSheetAccesos;

const styles = StyleSheet.create({
  fondo: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    ...shadow.card,
  },
  handleWrap: {
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 6,
  },
  handleBar: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
  },
  headerWrap: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
    gap: 14,
  },
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.pill,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  searchPressed: {
    opacity: 0.7,
  },
  searchTxt: {
    flex: 1,
    color: colors.textMuted,
    fontSize: 15,
    fontWeight: "500",
  },
  searchMic: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  tilesRow: {
    flexDirection: "row",
    gap: 10,
  },
  tile: {
    flex: 1,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  tileActiva: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tilePressed: {
    opacity: 0.7,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 4,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    fontFamily: iosTitleFont,
  },
  sectionCount: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "600",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  fila: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
  },
  filaIcono: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  filaCuerpo: {
    flex: 1,
  },
  filaTitulo: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
  },
  filaSub: {
    marginTop: 2,
    color: colors.textMuted,
    fontSize: 12,
  },
  severidad: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceMuted,
  },
  severidadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  severidadTxt: {
    color: colors.text,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  empty: {
    alignItems: "center",
    paddingVertical: 28,
    gap: 8,
  },
  emptyTxt: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: "center",
    paddingHorizontal: 24,
  },
});
