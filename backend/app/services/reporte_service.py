import logging
import googlemaps

logger = logging.getLogger(__name__)

BBOX = {
    "lat_min": 10.92, "lat_max": 11.05,
    "lng_min": -74.86, "lng_max": -74.74,
}


def reverse_geocode(lat: float, lng: float, api_key: str) -> str | None:
    if not api_key:
        return None
    try:
        gmaps = googlemaps.Client(key=api_key)
        results = gmaps.reverse_geocode((lat, lng))
        if not results:
            return None
        location = results[0]["geometry"]["location"]
        if not (
            BBOX["lat_min"] <= location["lat"] <= BBOX["lat_max"]
            and BBOX["lng_min"] <= location["lng"] <= BBOX["lng_max"]
        ):
            return None
        return results[0]["formatted_address"]
    except Exception as e:
        logger.warning("Reverse geocoding fallo para (%s, %s): %s", lat, lng, e)
        return None
