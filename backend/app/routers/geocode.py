import httpx
from fastapi import APIRouter, HTTPException, Query

from ..config import get_settings

router = APIRouter(prefix="/geocode", tags=["geocode"])

NOMINATIM_URL = "https://nominatim.openstreetmap.org/reverse"
USER_AGENT = "BQ-SafeRoutes/1.0 (saferoutes-bq backend proxy)"
GMAPS_BASE = "https://maps.googleapis.com/maps/api"


def _format_address(data: dict) -> str | None:
    a = data.get("address") or {}
    parts = [
        a.get("road") or a.get("pedestrian") or a.get("path") or a.get("highway"),
        a.get("house_number"),
        a.get("suburb") or a.get("neighbourhood") or a.get("quarter") or a.get("city_district"),
        a.get("city") or a.get("town") or a.get("village") or a.get("county"),
    ]
    parts = [p for p in parts if p]
    if parts:
        return ", ".join(parts)
    return data.get("display_name")


@router.get("/reverse")
async def reverse_geocode(
    lat: float = Query(..., ge=-90, le=90),
    lng: float = Query(..., ge=-180, le=180),
):
    params = {
        "format": "json",
        "lat": lat,
        "lon": lng,
        "addressdetails": 1,
        "accept-language": "es",
    }
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.get(
                NOMINATIM_URL,
                params=params,
                headers={"User-Agent": USER_AGENT},
            )
    except httpx.RequestError as exc:
        raise HTTPException(status_code=502, detail=f"Nominatim no respondió: {exc}")

    if res.status_code != 200:
        raise HTTPException(status_code=502, detail=f"Nominatim error {res.status_code}")

    return {"address": _format_address(res.json())}


@router.get("/places/autocomplete")
async def places_autocomplete(
    input: str = Query(...),
    language: str = Query("es"),
    components: str = Query("country:co"),
    location: str | None = Query(None),
    radius: int | None = Query(None),
):
    api_key = get_settings().GOOGLE_MAPS_API_KEY
    if not api_key:
        raise HTTPException(status_code=503, detail="Google Maps API key not configured")

    params: dict = {
        "input": input,
        "language": language,
        "components": components,
        "key": api_key,
    }
    if location:
        params["location"] = location
    if radius:
        params["radius"] = radius

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.get(f"{GMAPS_BASE}/place/autocomplete/json", params=params)
    except httpx.RequestError as exc:
        raise HTTPException(status_code=502, detail=f"Google Maps no respondió: {exc}")

    return res.json()


@router.get("/places/details")
async def place_details(
    place_id: str = Query(...),
    fields: str = Query("geometry"),
):
    api_key = get_settings().GOOGLE_MAPS_API_KEY
    if not api_key:
        raise HTTPException(status_code=503, detail="Google Maps API key not configured")

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.get(
                f"{GMAPS_BASE}/place/details/json",
                params={"place_id": place_id, "fields": fields, "key": api_key},
            )
    except httpx.RequestError as exc:
        raise HTTPException(status_code=502, detail=f"Google Maps no respondió: {exc}")

    return res.json()


@router.get("/directions")
async def directions(
    origin: str = Query(...),
    destination: str = Query(...),
    language: str = Query("es"),
):
    api_key = get_settings().GOOGLE_MAPS_API_KEY
    if not api_key:
        raise HTTPException(status_code=503, detail="Google Maps API key not configured")

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.get(
                f"{GMAPS_BASE}/directions/json",
                params={
                    "origin": origin,
                    "destination": destination,
                    "language": language,
                    "key": api_key,
                },
            )
    except httpx.RequestError as exc:
        raise HTTPException(status_code=502, detail=f"Google Maps no respondió: {exc}")

    return res.json()
