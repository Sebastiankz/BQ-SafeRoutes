// src/pages/Dashboard/useReportesLive.js
//
// Hook que mantiene los reportes ciudadanos actualizados en tiempo real.
// - Usa Supabase Realtime (WebSocket) para recibir cambios al instante.
// - Un poll de 60s actúa como heartbeat/fallback ante reconexiones perdidas.
// - `reportes`  → confirmados  (feed activo + mapa)
// - `recientes` → pendientes e inactivos, últimos 10 ordenados por fecha desc

import { useCallback, useEffect, useRef, useState } from "react";
import { getReportes } from "../../api/reportes";
import { supabase } from "../../lib/supabase";

const FALLBACK_POLL_INTERVAL = 60_000;
const LIMIT = 50;
const LIMIT_RECIENTES = 10;

export function useReportesLive() {
  const [reportes, setReportes] = useState([]);
  const [newIds, setNewIds] = useState(new Set());
  const [recientes, setRecientes] = useState([]);
  const [newRecentIds, setNewRecentIds] = useState(new Set());

  const knownIds = useRef(new Set());
  const knownRecentIds = useRef(new Set());
  const isFirstLoad = useRef(true);

  const fetchReportes = useCallback(async () => {
    try {
      const [activos, todos] = await Promise.all([
        getReportes(LIMIT, 0, "confirmado"),
        getReportes(LIMIT_RECIENTES * 4, 0, "todos"),
      ]);

      // Recientes: pendiente + inactivo, últimos N por fecha
      const recientesRaw = todos
        .filter((r) => r.estado === "pendiente" || r.estado === "inactivo")
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, LIMIT_RECIENTES);

      if (isFirstLoad.current) {
        activos.forEach((r) => knownIds.current.add(r.id));
        recientesRaw.forEach((r) => knownRecentIds.current.add(r.id));
        setReportes(activos);
        setRecientes(recientesRaw);
        isFirstLoad.current = false;
        return;
      }

      // Confirmados — detectar nuevos
      const entrantes = new Set(
        activos.filter((r) => !knownIds.current.has(r.id)).map((r) => r.id),
      );
      activos.forEach((r) => knownIds.current.add(r.id));
      setReportes(activos);
      if (entrantes.size > 0) {
        setNewIds(entrantes);
        setTimeout(() => setNewIds(new Set()), 4000);
      }

      // Recientes — detectar nuevos
      const entrantesRecientes = new Set(
        recientesRaw
          .filter((r) => !knownRecentIds.current.has(r.id))
          .map((r) => r.id),
      );
      recientesRaw.forEach((r) => knownRecentIds.current.add(r.id));
      setRecientes(recientesRaw);
      if (entrantesRecientes.size > 0) {
        setNewRecentIds(entrantesRecientes);
        setTimeout(() => setNewRecentIds(new Set()), 4000);
      }
    } catch {
      // Silenciar errores de red
    }
  }, []);

  useEffect(() => {
    fetchReportes();

    const channel = supabase
      .channel("reportes-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reportes" },
        () => fetchReportes(),
      )
      .subscribe();

    const timer = setInterval(fetchReportes, FALLBACK_POLL_INTERVAL);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(timer);
    };
  }, [fetchReportes]);

  return { reportes, newIds, recientes, newRecentIds };
}
