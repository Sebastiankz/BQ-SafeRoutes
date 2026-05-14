import { forwardRef } from "react";
import type { Ref } from "react";
import MapView, { Heatmap, Marker, PROVIDER_GOOGLE } from "react-native-maps";
import type { MapViewProps, Region } from "react-native-maps";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StyleSheet, View } from "react-native";

import type { Reporte } from "../../services/reportes";

export type HeatmapPoint = {
  latitude: number;
  longitude: number;
  weight?: number;
};

export type HeatmapGradient = {
  colors: string[];
  startPoints: number[];
  colorMapSize: number;
};

export interface MapaInteractivoProps
  extends Pick<MapViewProps, "mapPadding" | "onMapReady"> {
  initialRegion: Region;
  reportes: Reporte[];
  heatmapMode: boolean;
  heatmapPoints: HeatmapPoint[];
  heatmapGradient: HeatmapGradient;
  colorPorTipo: Record<string, string>;
  iconoPorTipo: Record<string, string>;
}

// Shell — paso 2 trasladará aquí la lógica completa del <MapView>.
function MapaInteractivoBase(
  {
    initialRegion,
    onMapReady,
    mapPadding,
    reportes,
    heatmapMode,
    heatmapPoints,
    heatmapGradient,
    colorPorTipo,
    iconoPorTipo,
  }: MapaInteractivoProps,
  ref: Ref<MapView>,
) {
  return (
    <MapView
      ref={ref}
      provider={PROVIDER_GOOGLE}
      style={styles.mapa}
      initialRegion={initialRegion}
      onMapReady={onMapReady}
      pitchEnabled={false}
      rotateEnabled
      showsBuildings
      showsUserLocation
      showsMyLocationButton={false}
      showsCompass={false}
      followsUserLocation={false}
      mapPadding={mapPadding}
    >
      {!heatmapMode &&
        reportes.map((r) => {
          const color = colorPorTipo[r.tipo] ?? "#6B7280";
          const icono = (iconoPorTipo[r.tipo] ?? "alert-circle") as React.ComponentProps<typeof MaterialCommunityIcons>["name"];
          return (
            <Marker
              key={r.id}
              coordinate={{ latitude: r.latitud, longitude: r.longitud }}
              title={r.tipo.replace(/_/g, " ")}
              description={r.descripcion ?? undefined}
              tracksViewChanges={false}
            >
              <View style={[styles.marcadorContenedor, { borderColor: color }]}>
                <View style={[styles.marcadorBurbuja, { backgroundColor: color }]}>
                  <MaterialCommunityIcons name={icono} size={18} color="#fff" />
                </View>
                <View style={[styles.marcadorPunta, { borderTopColor: color }]} />
              </View>
            </Marker>
          );
        })}

      {heatmapMode && heatmapPoints.length > 0 && (
        <Heatmap
          gradient={heatmapGradient}
          opacity={0.85}
          points={heatmapPoints}
          radius={70}
        />
      )}
    </MapView>
  );
}

const MapaInteractivo = forwardRef<MapView, MapaInteractivoProps>(
  MapaInteractivoBase,
);
MapaInteractivo.displayName = "MapaInteractivo";

export default MapaInteractivo;

const styles = StyleSheet.create({
  mapa: { flex: 1 },
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.28,
    shadowRadius: 4,
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
});
