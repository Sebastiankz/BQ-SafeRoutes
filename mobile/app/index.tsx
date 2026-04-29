import { useEffect, useRef, useState } from "react";
import { StyleSheet, View, Text, ActivityIndicator } from "react-native";
import MapView, { PROVIDER_DEFAULT } from "react-native-maps";
import * as Location from "expo-location";

//coordenadas del centro de BQ como fallback
// si el usuario no concede permisos de ubicación

const BARRANQUILLA = {
  latitude: 10.9685,
  longitude: -74.7889,
  latitudeDelta: 0.08,  // zoom: cuántos grados de latitud muestra (menor = más zoom)
  longitudeDelta: 0.08,
}

export default function MapaScreen() {
    const mapRef = useRef<MapView>(null);
    const  [region, setRegion] = useState(BARRANQUILLA);
    const [cargando, setCargando] = useState(true);
    const [errorUbicacion, setErrorUbicacion] = useState<string | null>(null);

    useEffect(() => {
        obtenerUbicacion();
    }, []);

    async function obtenerUbicacion() {
     // Solicitar permisos de ubicación
        const { status } = await Location.requestForegroundPermissionsAsync();

        if (status !== "granted") {
            setErrorUbicacion("Permiso de ubicación denegado. Mostrando ubicación predeterminada.");
            setCargando(false);
            return;
        }

        // Obtener la ubicación actual
        const ubicacion = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });

        const regionUsuario = {
            latitude: ubicacion.coords.latitude,
            longitude: ubicacion.coords.longitude,
            latitudeDelta: 0.02, // zoom más cercano para la ubicación del usuario
            longitudeDelta: 0.02,
        };

        setRegion(regionUsuario);
        setCargando(false);
}

if (cargando) {
    return (
        <View style={styles.centrado}>
            <ActivityIndicator size="large" color="#E53E3E" />
            <Text style={styles.textoGris}>Cargando ubicación...</Text>
        </View>
    );
}

return (
    <View style={styles.contenedor}>
      {errorUbicacion && (
        <View style={styles.banner}>
          <Text style={styles.bannerTexto}>{errorUbicacion}</Text>
        </View>
      )}
      <MapView
        ref={mapRef}
        style={styles.mapa}
        provider={PROVIDER_DEFAULT}
        initialRegion={region}
        showsUserLocation={true}       // punto azul con la posición del usuario
        showsMyLocationButton={true}   // botón para re-centrar en el usuario
        showsCompass={true}
      />
    </View>
);
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
  },
  mapa: {
    flex: 1,
  },
  centrado: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  textoGris: {
    color: '#666',
    fontSize: 14,
  },
  banner: {
    backgroundColor: '#FEF3C7',
    padding: 10,
    alignItems: 'center',
  },
  bannerTexto: {
    color: '#92400E',
    fontSize: 13,
  },
});