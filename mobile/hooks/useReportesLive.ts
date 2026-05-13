// mobile/hooks/useReportesLive.ts
//
// Hook que mantiene los reportes ciudadanos sincronizados en tiempo real
// para TODOS los usuarios de la app, no solo quien creó el reporte.
//
// Estrategia (idéntica al dashboard useReportesLive.js):
//   1. Carga inicial via REST (FastAPI backend).
//   2. Suscripción Supabase Realtime: cualquier INSERT/UPDATE/DELETE en
//      la tabla `reportes` dispara un refetch inmediato en todos los clientes.
//   3. Fallback poll cada 60s como red de seguridad ante reconexiones perdidas.
//   4. Degradación suave: si no hay config de Supabase, solo se usa el poll.

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase, tieneConfigSupabase } from "../lib/supabase";
import { listarReportes, type Reporte } from "../services/reportes";

const FALLBACK_POLL_INTERVAL = 60_000; // 60s
const LIMIT = 150;

export function useReportesLive() {
  const [reportes, setReportes] = useState<Reporte[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const fetchReportes = useCallback(async () => {
    try {
      const lista = await listarReportes(LIMIT, 0);
      if (mountedRef.current) {
        setReportes(lista);
        setError(null);
      }
    } catch (e) {
      if (mountedRef.current) {
        setError(e instanceof Error ? e.message : String(e));
      }
    } finally {
      if (mountedRef.current) {
        setCargando(false);
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    // 1. Carga inicial
    void fetchReportes();

    // 2. Suscripción Realtime (si Supabase está configurado)
    let channel: ReturnType<typeof supabase.channel> | null = null;
    if (tieneConfigSupabase()) {
      channel = supabase
        .channel("reportes-mobile-live")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "reportes" },
          () => void fetchReportes(),
        )
        .subscribe();
    }

    // 3. Fallback poll
    const timer = setInterval(() => void fetchReportes(), FALLBACK_POLL_INTERVAL);

    return () => {
      mountedRef.current = false;
      if (channel) supabase.removeChannel(channel);
      clearInterval(timer);
    };
  }, [fetchReportes]);

  return {
    reportes,
    cargando,
    error,
    refetch: fetchReportes,
  };
}
