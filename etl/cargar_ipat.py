# para ejecutarlo: python etl/cargar_ipat.py --csv etl/data/Accidentalidad_en_Barranquilla_20260430.csv

import re # modulo de expresiones regulares
import os
import sys
import json 
import argparse # parsear argumentos de linea de comandos
import logging
from pathlib import Path

import pandas as pd
import googlemaps         # SDK oficial de Google Maps
from dotenv import load_dotenv # cargar desde .env
from tqdm import tqdm # barra de progreso

BASE_DIR = Path(__file__).resolve().parent

GEOCACHE_PATH = BASE_DIR / "data" / "geocache.json" # cache de geocodificacion para no hacer consultas repetidas a la API

FAILURES_LOG = BASE_DIR / "data" / "geocoding_failures.log" # log de fallos de geocodificacion para revisar manualmente


# Limites geograficos de Barranquilla para filtrar resultados de geocodificacion
BBOX = {
    "lat_min": 10.92, "lat_max": 11.05,
    "lng_min": -74.86, "lng_max": -74.74,
}

# configuracion de logging para registrar el proceso de ETL
logging.basicConfig(
    level = logging.INFO, #info, warning, error, critical
    format = "%(asctime)s - %(levelname)s - %(message)s",
    handlers = [
        logging.StreamHandler(sys.stdout), # logs en consola
        logging.FileHandler(BASE_DIR / "data" / "etl.log", encoding="utf-8"), # logs en archivo
    ],
)
log = logging.getLogger(__name__) 

ROAD_ALIASES = {
    # "Avenida 110" y "AV 110" → nombre oficial que Google Maps reconoce
    r"\bAV(?:ENIDA)?\s+110\b": "Avenida Circunvalar",
    # "Avenida Murillo" → su nombre como calle numerada (Google la conoce mejor así)
    r"\bAV(?:ENIDA)?\s+MURILLO\b": "Calle 45",
    # "Avenida del Río" → otro alias local de la Vía 40
    r"\bAV(?:ENIDA)?\s+DEL\s+R[IÍ]O\b": "Via 40",
    # "Calle Murillo" (a veces aparece como CALLE MURILLO directamente)
    r"\bCALLE\s+MURILLO\b": "Calle 45",
}

NOISE_WORDS = [
    r"\bENTRADA\b",      # referencias a entradas de conjuntos/barrios
    r"\bSECTOR\b",       # "SECTOR EL PRADO"
    r"\bBARRIO\b",       # "BARRIO BOSTON"
    r"\bFRENTE\s+A\b",   # "FRENTE AL ÉXITO"
    r"\bLOCAL\b",        # "LOCAL 3"
    r"\bLOTE\b",         # "LOTE VILLA HELGAS"
    r"\bCENTRO\s+COMERCIAL\b",
    r"\bCONJUNTO\b",
    r"\bEDIFICIO\b",
    r"\bURBANIZACION\b",
]


def normalize_address(raw_address: str) -> str:
    """
    Limpia y estandariza una dirección de Barranquilla para que Google Maps
    la geocodifique con la mayor precisión posible.
    """

    # 0. Mayúsculas y limpieza de puntuación molesta.
    address_str = raw_address.upper().replace(".", "").replace(",", "").strip()

    for pattern, replacement in ROAD_ALIASES.items():
        address_str = re.sub(pattern, replacement, address_str)

    # 2. Cortar ruido semántico: todo lo que viene después de palabras como
    for pattern in NOISE_WORDS:
        parts = re.split(pattern, address_str)
        address_str = parts[0].strip()

    # 3. Manejar patrón "ENTRE X Y Y" → quedarse solo con el primer cruce.
    address_str = re.sub(r"\bENTRE\s+(.+?)\s+Y\s+\S+", r"y \1", address_str)

    # 4. "CON" como palabra de intersección → reemplazar por "y".
    address_str = re.sub(r"\bCON\b", "y", address_str)

    # 5. Estandarizar abreviaturas de tipos de vía.
    address_str = re.sub(r"\b(CRA|CARRE|CARRERA)\b",  "Carrera",     address_str)
    address_str = re.sub(r"\b(CR)\b",                 "Carrera",     address_str)
    address_str = re.sub(r"\b(CLLE|CLL|CALLE)\b",     "Calle",       address_str)
    address_str = re.sub(r"\b(CL)\b",                 "Calle",       address_str)
    address_str = re.sub(r"\b(AVENIDA|AV)\b",         "Avenida",     address_str)
    address_str = re.sub(r"\b(DIAGONAL|DIAG|DG)\b",   "Diagonal",    address_str)
    address_str = re.sub(r"\b(TRANSVERSAL|TV|TR)\b",  "Transversal", address_str)
    address_str = re.sub(r"\bVIA\b",                  "Via",         address_str)

    # 6. Insertar "y" entre dos vías cuando no hay conector explícito.
    address_str = re.sub(r"(Avenida\s+\S+)\s+(Carrera|Calle|Diagonal|Transversal)", r"\1 y \2", address_str)
    address_str = re.sub(r"(Calle\s+\S+)\s+(Carrera|Avenida|Diagonal|Transversal)",  r"\1 y \2", address_str)
    address_str = re.sub(r"(Carrera\s+\S+)\s+(Calle|Avenida|Diagonal|Transversal)",  r"\1 y \2", address_str)
    address_str = re.sub(r"(Via\s+\S+)\s+(Calle|Carrera|Avenida)",                   r"\1 y \2", address_str)

    # 7. Limpiar dobles espacios residuales.
    address_str = re.sub(r"\s+", " ", address_str).strip()

    # 8. Añadir contexto geográfico estricto.
    return f"{address_str}, Barranquilla, Atlantico, Colombia"

#------- punto de entrada -------#
def main():
    # parsear argumentos de linea de comandos
    parser = argparse.ArgumentParser(description="ETL: loads historical IPAT accident data into PostgreSQL")

    # argumento para ruta del archivo CSV, con valor por defecto apuntando al archivo en data/
    parser.add_argument("--csv", default=str(BASE_DIR / "data" / "Accidentalidad_en_Barranquilla_20260430.csv"), help="Path to the accident data CSV file")

    # argumento para limitar el numero de registros a procesar
    parser.add_argument("--limit",
        type=int,
        default=None,
        help="Process only the first N records (useful for testing)",)
    
    parser.add_argument(
        "--skip-geocoding",
        action="store_true",
        help="Skip the geocoding step (cleaning and normalization only)",
    )

    parser.add_argument(
        "--reset",
        action="store_true",
        help="Delete existing IPAT records before inserting (idempotency)",
    )

    parser.add_argument(
        "--from-year",
        type=int,
        default=2024,
        help="Include only accidents from this year onwards (default: 2024)",
    )

    args = parser.parse_args()

    #prueba de normalizacion de direcciones

    if args.skip_geocoding:
        log.info("Skipping geocoding, running data cleaning and normalization only")
        df = load_csv(args.csv)
        df = clean_dataframe(df, from_year=args.from_year, limit=args.limit)

        log.info("Address normalization sample:")
        sample = df["normalized_address"].dropna().unique()[:20]
        for address in sample:
            log.info(f" -> {address}")
        log.info(f"Total rows ready to geocode: {len(df)}")
        return

    # ── Flujo completo ────────────────────────────────────────────────────────
    df = load_csv(args.csv)
    df = clean_dataframe(df, from_year=args.from_year, limit=args.limit)
    df = geocode_addresses(df)

    log.info(f"Records with coordinates ready to insert into DB: {len(df):,}")
    log.info("Next step: insert into 'incidentes_historicos' table (under construction).")
    # TODO: llamar a insert_into_db(df) — próximo paso

def load_csv(path: str, limit: int | None = None) -> pd.DataFrame:
    log.info(f"Reading CSV: {path}")

    df = pd.read_csv(path, encoding="utf-8")
    
    df.columns = (
        df.columns
        .str.strip() # eliminar espacios en blanco
        .str.upper() # convertir a mayusculas para estandarizar
        .str.replace(" ", "_") # reemplazar espacios por guiones bajos
        .str.replace("Ñ", "N") 
        .str.replace("AÑO", "ANNO")
    )

    log.info(f"Detected columns: {list(df.columns)}")
    log.info(f"Total rows in CSV: {len(df):,}")
    # El recorte por --limit se aplica DESPUÉS del filtro de año en clean_dataframe,
    return df

def clean_dataframe(df: pd.DataFrame, from_year: int = 2024, limit: int | None = None) -> pd.DataFrame:

    total_before = len(df)
    df = df[df["ANO_ACCIDENTE"] >= from_year]
    discarded_rows = total_before - len(df)
    log.info(f"Year filter >= {from_year}: {len(df):,} valid records ({discarded_rows:,} discarded)")

    # Ahora sí aplicamos --limit, sobre registros ya filtrados por año.
    if limit:
        df = df.head(limit)
        log.info(f"Limited to the first {limit} records (already year-filtered)")

    # eliminar filas sin direccion (no se pueden geocodificar)
    initial_rows = len(df)
    df = df.dropna(subset=["SITIO_EXACTO_ACCIDENTE"]) # eliminar filas sin direccion
    empty_rows = initial_rows - len(df)
    if empty_rows > 0:
        log.warning(f"Dropped {empty_rows} rows without an address (SITIO_EXACTO_ACCIDENTE)")

    # normalizar direcciones para mejorar geocodificacion
    tqdm.pandas(desc="Normalizing addresses")
    df["normalized_address"] = df["SITIO_EXACTO_ACCIDENTE"].progress_apply(normalize_address)

    log.info(f"Rows ready to geocode: {len(df):,}")
    return df


# ══════════════════════════════════════════════════════════════════════════════
# GEOCODIFICACIÓN
# ══════════════════════════════════════════════════════════════════════════════
# Convierte cada dirección normalizada en coordenadas (lat, lng).
#
# Problemas que resuelve esta función:
#
#  1. COSTO: Google cobra por request. Si el script falla a mitad (error de red,
#     BD caída, etc.) y lo volvemos a correr, sin cache pagaríamos de nuevo por
#     todas las direcciones ya procesadas. El cache guarda los resultados en un
#     archivo JSON local: si la dirección ya fue consultada, se usa el valor
#     guardado sin llamar a la API.
#
#  2. VELOCIDAD: El cache hace que re-runs sean casi instantáneos para
#     direcciones ya procesadas.
#
#  3. CALIDAD: El bounding box (BBOX) descarta coordenadas fuera de Barranquilla.
#     Si Google geocodifica "Via Juan Mina Km 8" y devuelve un punto en zona
#     rural, lo rechazamos. Si devuelve algo en otra ciudad, también.
# ──────────────────────────────────────────────────────────────────────────────

def _load_cache() -> dict:
    """Lee el cache del disco. Si no existe aún, devuelve dict vacío."""
    if GEOCACHE_PATH.exists():
        with open(GEOCACHE_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}


def _save_cache(cache: dict) -> None:
    """Persiste el cache en disco."""
    with open(GEOCACHE_PATH, "w", encoding="utf-8") as f:
        json.dump(cache, f, ensure_ascii=False, indent=2)


def _within_barranquilla(lat: float, lng: float) -> bool:
    """
    Verifica que las coordenadas caigan dentro del bounding box urbano.
    Rechaza resultados en zona rural, otra ciudad o país incorrecto.
    """
    return (
        BBOX["lat_min"] <= lat <= BBOX["lat_max"]
        and BBOX["lng_min"] <= lng <= BBOX["lng_max"]
    )


def geocode_addresses(df: pd.DataFrame) -> pd.DataFrame:
    """
    Añade columnas 'lat' y 'lng' al DataFrame consultando Google Maps.
    Las filas que no se puedan geocodificar quedan con NaN en esas columnas
    y se loguean en geocoding_failures.log para auditoría.

    Args:
        df: DataFrame con columna 'normalized_address' ya preparada.

    Returns:
        El mismo DataFrame con columnas 'lat' y 'lng' añadidas.
    """
    # Leer la API key del entorno (cargada desde .env en __main__).
    # Fallar rápido y con mensaje claro si no está configurada.
    api_key = os.environ.get("GOOGLE_MAPS_API_KEY", "")
    if not api_key:
        raise RuntimeError(
            "GOOGLE_MAPS_API_KEY is not configured. "
            "Copy etl/.env.example to etl/.env and fill in your API key."
        )

    gmaps = googlemaps.Client(key=api_key)

    # Cargar cache existente (dict: normalized_address → {lat, lng})
    cache = _load_cache()
    log.info(f"Cache loaded: {len(cache):,} addresses already geocoded")

    # Preparar columnas de resultado en el DataFrame.
    # Inicializamos con None; al final las filas sin resultado quedarán en NaN.
    df["lat"] = None
    df["lng"] = None

    # Obtener las direcciones únicas a consultar (evita llamadas duplicadas
    # dentro del mismo run cuando la misma dirección aparece varias veces).
    unique_addresses = df["normalized_address"].dropna().unique()
    new_addresses = [addr for addr in unique_addresses if addr not in cache]
    log.info(f"Unique addresses: {len(unique_addresses):,} | New (to query): {len(new_addresses):,}")

    # Abrir el archivo de fallos en modo append para no perder runs anteriores.
    failures_file = open(FAILURES_LOG, "a", encoding="utf-8")

    try:
        for i, address in enumerate(tqdm(new_addresses, desc="Geocoding")):
            try:
                result = gmaps.geocode(address)

                if result:
                    # Google devuelve una lista ordenada por relevancia.
                    # Tomamos siempre el primer resultado (el más probable).
                    location_data = result[0]["geometry"]["location"]
                    lat, lng = location_data["lat"], location_data["lng"]

                    if _within_barranquilla(lat, lng):
                        # Éxito: guardar en cache
                        cache[address] = {"lat": lat, "lng": lng}
                    else:
                        # Google respondió, pero con un punto fuera de la ciudad.
                        # Típico en: rutas rurales (KM X), nombres ambiguos.
                        cache[address] = None
                        failures_file.write(
                            f"OUTSIDE_BBOX\t{address}\t"
                            f"lat={lat:.5f}, lng={lng:.5f}\n"
                        )
                else:
                    # Google no encontró ningún resultado para esta dirección.
                    cache[address] = None
                    failures_file.write(f"NO_RESULT\t{address}\n")

            except Exception as e:
                # Error puntual (timeout, rate limit, etc.).
                # Lo logueamos pero continuamos con la siguiente dirección.
                log.warning(f"Error geocoding '{address}': {e}")
                failures_file.write(f"ERROR\t{address}\t{e}\n")

            # Persistir cache cada 50 requests para que un fallo no pierda
            # el trabajo acumulado desde el último guardado.
            if (i + 1) % 50 == 0:
                _save_cache(cache)

    finally:
        # Guardar cache y cerrar log pase lo que pase (incluso si hay Ctrl+C).
        _save_cache(cache)
        failures_file.close()

    # Ahora mapeamos los resultados del cache a cada fila del DataFrame.
    # Una dirección que aparece 15 veces recibe las mismas coords 15 veces.
    def _lookup(address_key):
        entry = cache.get(address_key)
        if entry:
            return pd.Series([entry["lat"], entry["lng"]])
        return pd.Series([None, None])

    df[["lat", "lng"]] = df["normalized_address"].apply(_lookup)

    # Estadísticas finales
    total_records = len(df)
    geocoded_count = df["lat"].notna().sum()
    failed_count = total_records - geocoded_count
    success_rate = geocoded_count / total_records * 100 if total_records > 0 else 0
    log.info(
        f"Geocoding complete: {geocoded_count:,}/{total_records:,} successful "
        f"({success_rate:.1f}%) | {failed_count:,} failed → see {FAILURES_LOG.name}"
    )

    # Eliminar filas que no se pudieron geocodificar.
    df = df.dropna(subset=["lat", "lng"])
    return df


if __name__ == "__main__":
    load_dotenv(BASE_DIR / ".env") # cargar variables de entorno desde .env
    main()