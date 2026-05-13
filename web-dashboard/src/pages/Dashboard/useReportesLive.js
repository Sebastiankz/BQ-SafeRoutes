// src/pages/Dashboard/useReportesLive.js
//
// Hook que mantiene los reportes ciudadanos actualizados en tiempo real.
// - Usa Supabase Realtime (WebSocket) para recibir cambios al instante.
// - Un poll de 60s actúa como heartbeat/fallback ante reconexiones perdidas.
// - Carga inicial: puebla knownIds SIN animar (esos reportes ya existían en la BD).
// - Eventos siguientes: solo IDs genuinamente nuevos se animan.
// - Feed y mapa: solo 'confirmado'. Al confirmar un pendiente, aparece con animación.

import { useCallback, useEffect, useRef, useState } from "react";
import { getReportes } from "../../api/reportes";
import { supabase } from "../../lib/supabase";

const FALLBACK_POLL_INTERVAL = 60_000; // 60s — solo como red de seguridad
const LIMIT = 50;

export function useReportesLive() {
  const [reportes, setReportes] = useState([]);
  const [newIds, setNewIds] = useState(new Set());
  const knownIds = useRef(new Set()); // IDs ya vistos — persiste entre renders
  const isFirstLoad = useRef(true); // silencia animaciones en la carga inicial

  const fetchReportes = useCallback(async () => {
    try {
      // Solo confirmados: el backend filtra directamente.
      // Al pasar pendiente → confirmado, el ID aparece por primera vez en
      // knownIds y se anima con slide-in en el feed y DROP en el mapa.
      const activos = await getReportes(LIMIT, 0, "confirmado");

      if (isFirstLoad.current) {
        // Primera carga: registrar IDs SIN animar (ya existían antes de abrir el dashboard)
        activos.forEach((r) => knownIds.current.add(r.id));
        setReportes(activos);
        isFirstLoad.current = false;
        return; // sale sin tocar newIds → nada se anima
      }

      // Polls siguientes: solo IDs que NO conocemos son realmente nuevos
      const entrantes = new Set(
        activos.filter((r) => !knownIds.current.has(r.id)).map((r) => r.id),
      );
      activos.forEach((r) => knownIds.current.add(r.id));
      setReportes(activos);

      if (entrantes.size > 0) {
        setNewIds(entrantes);
        // Limpia el badge y la clase de animación tras 4 s.
        // El DROP del mapa no se repite: markersRef ya tiene el ID
        // y el efecto de marcadores omite los que ya existen.
        setTimeout(() => setNewIds(new Set()), 4000);
      }
    } catch {
      // Silenciar errores de red — no romper la UI por un poll fallido
    }
  }, []);

  // Carga inicial + Realtime + fallback polling
  useEffect(() => {
    // 1. Carga inicial
    fetchReportes();

    // 2. Suscripción Realtime — cualquier INSERT o UPDATE en la tabla `reportes`
    //    dispara un refetch inmediato. Requiere que Realtime esté habilitado en
    //    Supabase Dashboard: Table Editor → reportes → Realtime ON
    //    (o: ALTER PUBLICATION supabase_realtime ADD TABLE reportes;)
    const channel = supabase
      .channel("reportes-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reportes" },
        () => fetchReportes(),
      )
      .subscribe();

    // 3. Fallback: poll cada 60s en caso de reconexión perdida del WS
    const timer = setInterval(fetchReportes, FALLBACK_POLL_INTERVAL);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(timer);
    };
  }, [fetchReportes]);

  return { reportes, newIds };
}
