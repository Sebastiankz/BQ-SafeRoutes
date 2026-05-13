// src/pages/Dashboard/views/ReportesView.jsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { Avatar, Button, Chip, Table } from "@heroui/react";
import { CheckCircle, ChevronUp, Loader2, XCircle } from "lucide-react";
import { getReportes, cambiarEstadoReporte } from "../../../api/reportes";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../context/AuthContext";

// â”€â”€â”€ Maps â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const SEVERIDAD_LABEL = {
  1: "Leve",
  2: "Solo Da\u00F1os",
  3: "Riesgo Alto",
  4: "Heridos",
  5: "Muertos",
};

const SEVERIDAD_CHIP_COLOR = {
  Leve: "default",
  "Solo Da\u00F1os": "accent",
  "Riesgo Alto": "warning",
  Heridos: "warning",
  Muertos: "danger",
};

const ESTADO_CHIP_COLOR = {
  pendiente: "warning",
  confirmado: "success",
  inactivo: "default",
};

const ESTADO_ICON = {
  pendiente: "\uD83D\uDFE1",
  confirmado: "\uD83D\uDFE2",
  inactivo: "\u26AA",
};

const TIPO_ICON = {
  accidente: "\u26A0\uFE0F",
  hueco: "\uD83D\uDD73\uFE0F",
  arroyo: "\uD83C\uDF0A",
  semaforo_danado: "\uD83D\uDEA6",
  otro: "\uD83D\uDCCC",
};

const TIPO_LABEL = {
  accidente: "Accidente",
  hueco: "Hueco",
  arroyo: "Arroyo",
  semaforo_danado: "Sem\u00E1foro",
  otro: "Otro",
};

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function formatFecha(iso) {
  const d = new Date(iso);
  return d.toLocaleString("es-CO", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function truncarId(uuid) {
  return uuid?.slice(0, 8) + "â€¦";
}

function emailInitial(email) {
  return email ? email[0].toUpperCase() : "?";
}

function SortableColumnHeader({ children, sortDirection }) {
  return (
    <span className="flex items-center justify-between gap-1">
      {children}
      {sortDirection && (
        <ChevronUp
          className={`size-3 shrink-0 transition-transform duration-100 ${
            sortDirection === "descending" ? "rotate-180" : ""
          }`}
        />
      )}
    </span>
  );
}

// â”€â”€â”€ Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function ReportesView() {
  const { isAdmin } = useAuth();
  const [reportes, setReportes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [accionLoading, setAccionLoading] = useState({});
  const [sortDescriptor, setSortDescriptor] = useState({
    column: "created_at",
    direction: "descending",
  });

  const cargarReportes = useCallback((isInitial = false) => {
    if (isInitial) setLoading(true);
    getReportes(200, 0, "todos")
      .then(setReportes)
      .catch((e) => setError(e.message))
      .finally(() => {
        if (isInitial) setLoading(false);
      });
  }, []);

  useEffect(() => {
    cargarReportes(true);
    const channel = supabase
      .channel("reportes-view-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reportes" },
        () => cargarReportes(false),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [cargarReportes]);

  const padresConfirmados = useMemo(
    () => new Set(reportes.filter((r) => r.estado === "confirmado").map((r) => r.id)),
    [reportes],
  );

  function estadoDisplayDe(r) {
    if (
      r.estado === "pendiente" &&
      r.reporte_padre_id !== null &&
      padresConfirmados.has(r.reporte_padre_id)
    ) {
      return "confirmado";
    }
    return r.estado;
  }

  const filtrados =
    filtroEstado === "todos"
      ? reportes
      : reportes.filter((r) => estadoDisplayDe(r) === filtroEstado);

  const sortedFiltered = useMemo(() => {
    return [...filtrados].sort((a, b) => {
      const col = sortDescriptor.column;
      const numericCols = ["id", "severidad", "validaciones"];
      let cmp;
      if (numericCols.includes(col)) {
        cmp = (Number(a[col]) || 0) - (Number(b[col]) || 0);
      } else {
        cmp = String(a[col] ?? "").localeCompare(String(b[col] ?? ""), "es");
      }
      return sortDescriptor.direction === "descending" ? -cmp : cmp;
    });
  }, [filtrados, sortDescriptor]);

  async function handleCambioEstado(r, nuevoEstado) {
    const idObjetivo = r.reporte_padre_id ?? r.id;
    setAccionLoading((prev) => ({ ...prev, [r.id]: true }));
    try {
      await cambiarEstadoReporte(idObjetivo, nuevoEstado);
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setAccionLoading((prev) => ({ ...prev, [r.id]: false }));
    }
  }

  // â”€â”€â”€ Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  return (
    <main className="flex-1 overflow-y-auto p-4 lg:p-6 bg-slate-50 dark:bg-gray-900">
      {/* Header */}
      <div className="mb-5">
        <h2 className="text-base font-bold text-slate-800 dark:text-white">
          Base de Datos Maestras \u00B7 Reportes
        </h2>
        <p className="text-xs text-slate-400 dark:text-gray-500 mt-0.5">
          {loading
            ? "Cargando\u2026"
            : error
              ? `Error: ${error}`
              : `${filtrados.length} de ${reportes.length} registros`}
        </p>

        {/* Filtros de estado */}
        {!loading && !error && (
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            {["todos", "pendiente", "confirmado", "inactivo"].map((e) => (
              <button
                key={e}
                onClick={() => setFiltroEstado(e)}
                className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border transition-colors cursor-pointer ${
                  filtroEstado === e
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-slate-500 border-slate-200 hover:border-blue-300 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600 dark:hover:border-blue-500"
                }`}
              >
                {e !== "todos" && <span>{ESTADO_ICON[e]}</span>}
                {e.charAt(0).toUpperCase() + e.slice(1)}
                <span className="ml-0.5 opacity-60">
                  ({e === "todos"
                    ? reportes.length
                    : reportes.filter((r) => estadoDisplayDe(r) === e).length})
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Loading / Error */}
      {loading && (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="size-8 animate-spin text-blue-500" />
        </div>
      )}
      {error && !loading && (
        <p className="text-red-500 text-sm text-center py-10">{error}</p>
      )}

      {/* Table */}
      {!loading && !error && (
        <Table>
          <Table.ScrollContainer minWidth={820}>
            <Table.Content
              aria-label="Reportes ciudadanos"
              sortDescriptor={sortDescriptor}
              onSortChange={setSortDescriptor}
              selectionMode="none"
            >
              <Table.Header>
                <Table.Column allowsSorting isRowHeader id="id">
                  {({ sortDirection }) => (
                    <SortableColumnHeader sortDirection={sortDirection}>ID</SortableColumnHeader>
                  )}
                </Table.Column>
                <Table.Column allowsSorting id="usuario_email">
                  {({ sortDirection }) => (
                    <SortableColumnHeader sortDirection={sortDirection}>Email</SortableColumnHeader>
                  )}
                </Table.Column>
                <Table.Column allowsSorting id="created_at">
                  {({ sortDirection }) => (
                    <SortableColumnHeader sortDirection={sortDirection}>Fecha / Hora</SortableColumnHeader>
                  )}
                </Table.Column>
                <Table.Column id="direccion">Direccion</Table.Column>
                <Table.Column allowsSorting id="tipo">
                  {({ sortDirection }) => (
                    <SortableColumnHeader sortDirection={sortDirection}>Tipo</SortableColumnHeader>
                  )}
                </Table.Column>
                <Table.Column allowsSorting id="severidad">
                  {({ sortDirection }) => (
                    <SortableColumnHeader sortDirection={sortDirection}>Severidad</SortableColumnHeader>
                  )}
                </Table.Column>
                <Table.Column allowsSorting id="estado">
                  {({ sortDirection }) => (
                    <SortableColumnHeader sortDirection={sortDirection}>Estado</SortableColumnHeader>
                  )}
                </Table.Column>
                {isAdmin && (
                  <Table.Column id="acciones" className="text-end">Acciones</Table.Column>
                )}
              </Table.Header>

              <Table.Body items={sortedFiltered}>
                {(r) => {
                  const sevLabel = SEVERIDAD_LABEL[r.severidad] ?? String(r.severidad);
                  const tipoLabel = TIPO_LABEL[r.tipo] ?? r.tipo;
                  const estadoDisplay = estadoDisplayDe(r);
                  return (
                    <Table.Row id={r.id}>
                      {/* ID */}
                      <Table.Cell>
                        <Chip color="accent" variant="soft" size="sm">
                          #{r.id}
                        </Chip>
                      </Table.Cell>

                      {/* Email / Reporter */}
                      <Table.Cell>
                        <div className="flex items-center gap-3">
                          <Avatar size="sm">
                            <Avatar.Fallback color="accent">
                              {emailInitial(r.usuario_email)}
                            </Avatar.Fallback>
                          </Avatar>
                          <span className="text-xs font-medium truncate">
                            {r.usuario_email ?? "\u2014"}
                          </span>
                        </div>
                      </Table.Cell>

                      {/* Fecha */}
                      <Table.Cell className="whitespace-nowrap text-xs">
                        {formatFecha(r.created_at)}
                      </Table.Cell>

                      {/* DirecciÃ³n */}
                      <Table.Cell className="text-xs max-w-xs truncate">
                        {r.direccion ?? "Sin direcciÃ³n"}
                      </Table.Cell>

                      {/* Tipo */}
                      <Table.Cell>
                        <span className="flex items-center gap-1.5 text-xs">
                          <span>{TIPO_ICON[r.tipo] ?? "ðŸ“Œ"}</span>
                          {tipoLabel}
                        </span>
                      </Table.Cell>

                      {/* Severidad */}
                      <Table.Cell>
                        <Chip
                          color={SEVERIDAD_CHIP_COLOR[sevLabel] ?? "default"}
                          variant="soft"
                          size="sm"
                        >
                          {sevLabel}
                        </Chip>
                      </Table.Cell>

                      {/* Estado */}
                      <Table.Cell>
                        <Chip
                          color={ESTADO_CHIP_COLOR[estadoDisplay] ?? "default"}
                          variant="soft"
                          size="sm"
                        >
                          <span className="flex items-center gap-1">
                            <span>{ESTADO_ICON[estadoDisplay] ?? "âš«"}</span>
                            {estadoDisplay}
                          </span>
                        </Chip>
                      </Table.Cell>

                      {/* Acciones (admin only) */}
                      {isAdmin && (
                        <Table.Cell>
                          <div className="flex items-center justify-end gap-1.5">
                            {estadoDisplay === "pendiente" && (
                              <Button
                                size="sm"
                                variant="ghost"
                                isDisabled={!!accionLoading[r.id]}
                                onPress={() => handleCambioEstado(r, "confirmado")}
                                className="flex items-center gap-1"
                              >
                                {accionLoading[r.id] ? (
                                  <Loader2 className="size-3.5 animate-spin" />
                                ) : (
                                  <CheckCircle className="size-3.5" />
                                )}
                                Confirmar
                              </Button>
                            )}
                            {estadoDisplay === "confirmado" && (
                              <Button
                                size="sm"
                                variant="danger-soft"
                                isDisabled={!!accionLoading[r.id]}
                                onPress={() => handleCambioEstado(r, "inactivo")}
                                className="flex items-center gap-1"
                              >
                                {accionLoading[r.id] ? (
                                  <Loader2 className="size-3.5 animate-spin" />
                                ) : (
                                  <XCircle className="size-3.5" />
                                )}
                                Inactivar
                              </Button>
                            )}
                          </div>
                        </Table.Cell>
                      )}
                    </Table.Row>
                  );
                }}
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
        </Table>
      )}
    </main>
  );
}
