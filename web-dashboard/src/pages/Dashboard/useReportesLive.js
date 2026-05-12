// src/pages/Dashboard/useReportesLive.js
//
// Hook que mantiene los reportes ciudadanos actualizados mediante polling.
// - Carga inicial al montar.
// - Refresca cada POLL_INTERVAL ms sin necesidad de recargar la página.
// - Detecta IDs nuevos y los expone en `newIds` (Set) para que los
//   componentes hijos puedan animar su aparición.
// - `newIds` se resetea en el siguiente ciclo para que la animación
//   no se repita indefinidamente.

import { useCallback, useEffect, useRef, useState } from "react";
import { getReportes } from "../../api/reportes";

const POLL_INTERVAL = 30_000; // 30 segundos
const LIMIT = 50;

export function useReportesLive() {
  const [reportes, setReportes] = useState([]);
  const [newIds, setNewIds] = useState(new Set());
  const knownIds = useRef(new Set()); // IDs ya vistos — persiste entre renders

  const fetchReportes = useCallback(async () => {
    try {
      const data = await getReportes(LIMIT, 0);

      // Detectar IDs que no existían antes
      const entrantes = new Set(
        data.filter((r) => !knownIds.current.has(r.id)).map((r) => r.id),
      );

      // Actualizar el conjunto de IDs conocidos
      data.forEach((r) => knownIds.current.add(r.id));

      setReportes(data);

      if (entrantes.size > 0) {
        setNewIds(entrantes);
        // Limpia el badge / animación después de 4 s para no repetirla
        setTimeout(() => setNewIds(new Set()), 4000);
      }
    } catch {
      // Silenciar errores de red — no romper la UI por un poll fallido
    }
  }, []);

  // Carga inicial + polling
  useEffect(() => {
    fetchReportes();
    const timer = setInterval(fetchReportes, POLL_INTERVAL);
    return () => clearInterval(timer);
  }, [fetchReportes]);

  return { reportes, newIds };
}
