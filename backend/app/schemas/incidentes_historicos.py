from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict

_MESES_EN = {
    1: 'January', 2: 'February', 3: 'March',    4: 'April',
    5: 'May',     6: 'June',     7: 'July',      8: 'August',
    9: 'September', 10: 'October', 11: 'November', 12: 'December',
}
_DIAS_EN = {0: 'Mon', 1: 'Tue', 2: 'Wed', 3: 'Thu', 4: 'Fri', 5: 'Sat', 6: 'Sun'}


class IncidenteHistoricoOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    anio_accidente:     int        = Field(serialization_alias="ANO_ACCIDENTE")
    mes_accidente:      str        = Field(serialization_alias="MES_ACCIDENTE")
    dia_accidente:      str        = Field(serialization_alias="DIA_ACCIDENTE")
    hora_accidente:     str        = Field(serialization_alias="HORA_ACCIDENTE")
    gravedad_accidente: str | None = Field(default=None, serialization_alias="GRAVEDAD_ACCIDENTE")
    clase_accidente:    str | None = Field(default=None, serialization_alias="CLASE_ACCIDENTE")
    sitio_normalizado:  str | None = Field(default=None, serialization_alias="SITIO_NORMALIZADO")
    cant_heridos_sitio: int        = Field(default=0, serialization_alias="CANT_HERIDOS_EN _SITIO_ACCIDENTE")
    cant_muertos_sitio: int        = Field(default=0, serialization_alias="CANT_MUERTOS_EN _SITIO_ACCIDENTE")

    @classmethod
    def from_db(cls, row: object) -> "IncidenteHistoricoOut":
        dt: datetime = row.fecha_hora
        h12 = dt.hour % 12 or 12
        periodo = "am" if dt.hour < 12 else "pm"
        hora_fmt = f"{h12:02d}:{dt.minute:02d}:{dt.second:02d}:{periodo}"
        return cls(
            anio_accidente=dt.year,
            mes_accidente=_MESES_EN[dt.month],
            dia_accidente=_DIAS_EN[dt.weekday()],
            hora_accidente=hora_fmt,
            gravedad_accidente=row.gravedad,
            clase_accidente=row.clase_accidente,
            sitio_normalizado=row.direccion_original,
            cant_heridos_sitio=row.cant_heridos or 0,
            cant_muertos_sitio=row.cant_muertos or 0,
        )