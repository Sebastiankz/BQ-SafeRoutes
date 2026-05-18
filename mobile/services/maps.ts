const BASE = "https://maps.googleapis.com/maps/api";

export type LatLng = { latitude: number; longitude: number };

export type LugarSugerido = {
    placeId: string;
    descripcion: string;
    textoPrincipal: string;
    textoSecundario: string;
};

export async function buscarLugares(
    query: string,
    apiKey: string,
    userLocation?: { latitude: number; longitude: number },
): Promise<LugarSugerido[]> {
    if (!query.trim()) return [];
    let url =
        `${BASE}/place/autocomplete/json` +
        `?input=${encodeURIComponent(query)}` +
        `&language=es` +
        `&components=country:co` +
        `&key=${apiKey}`;

    if (userLocation) {
        url +=
            `&location=${userLocation.latitude},${userLocation.longitude}` +
            `&radius=15000`;
    }

    const res = await fetch(url);
    const json = await res.json();
    if (json.status !== "OK" && json.status !== "ZERO_RESULTS") {
        throw new Error(`Places Autocomplete: ${json.status}`);
    }
    return (json.predictions ?? []).map(
        (p: {
            place_id: string;
            description: string;
            structured_formatting: { main_text: string; secondary_text?: string };
        }) => ({
            placeId: p.place_id,
            descripcion: p.description,
            textoPrincipal: p.structured_formatting.main_text,
            textoSecundario: p.structured_formatting.secondary_text ?? "",
        }),
    );
}

export async function obtenerCoordenadasLugar(
    placeId: string,
    apiKey: string,
): Promise<LatLng> {
    const url =
        `${BASE}/place/details/json` +
        `?place_id=${encodeURIComponent(placeId)}` +
        `&fields=geometry` +
        `&key=${apiKey}`;
    const res = await fetch(url);
    const json = await res.json();
    if (json.status !== "OK") {
        throw new Error(`Place Details: ${json.status}`);
    }
    const loc = json.result.geometry.location;
    return { latitude: loc.lat, longitude: loc.lng };
}

export type RutaResult = {
    puntos: LatLng[];
    duracion: string;
    distancia: string;
};

export async function obtenerRuta(
    origen: LatLng,
    destino: LatLng,
    apiKey: string,
): Promise<RutaResult> {
    const url =
        `${BASE}/directions/json` +
        `?origin=${origen.latitude},${origen.longitude}` +
        `&destination=${destino.latitude},${destino.longitude}` +
        `&language=es` +
        `&key=${apiKey}`;
    const res = await fetch(url);
    const json = await res.json();
    if (json.status !== "OK") {
        throw new Error(`Directions: ${json.status}`);
    }
    const leg = json.routes[0].legs[0];
    return {
        puntos: decodificarPolyline(json.routes[0].overview_polyline.points as string),
        duracion: leg.duration.text as string,
        distancia: leg.distance.text as string,
    };
}

function decodificarPolyline(encoded: string): LatLng[] {
    const puntos: LatLng[] = [];
    let idx = 0;
    let lat = 0;
    let lng = 0;
    while (idx < encoded.length) {
        let b: number;
        let shift = 0;
        let result = 0;
        do {
            b = encoded.charCodeAt(idx++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);
        lat += result & 1 ? ~(result >> 1) : result >> 1;

        shift = 0;
        result = 0;
        do {
            b = encoded.charCodeAt(idx++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);
        lng += result & 1 ? ~(result >> 1) : result >> 1;

        puntos.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
    }
    return puntos;
}
