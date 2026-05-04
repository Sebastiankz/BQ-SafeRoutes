// src/pages/Dashboard/ReporteFeed.jsx
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, MapPin, Clock, AlertTriangle, Zap, Navigation, Timer } from 'lucide-react';
// ── Data simulada de 10 reportes ciudadanos ──────────────────
const REPORTES = [
  { id: 1,  tipo: 'Semáforo dañado',       icono: 'zap',    color: 'text-yellow-500', direccion: 'Calle 84 con 51B',               descripcion: 'Semáforo intermitente genera caos en hora pico.',         hace: '19 min',  estado: 'Activo',   prioridad: 'Alta'   },
  { id: 2,  tipo: 'Hueco peligroso',        icono: 'alert',  color: 'text-orange-500', direccion: 'Carrera 43 con Calle 76',         descripcion: 'Bache profundo en carril izquierdo.',                     hace: '35 min',  estado: 'Activo',   prioridad: 'Alta'   },
  { id: 3,  tipo: 'Accidente leve',         icono: 'nav',    color: 'text-blue-500',   direccion: 'Av. Circunvalar (Sector Alameda)', descripcion: 'Choque simple entre dos particulares.',                   hace: '45 min',  estado: 'Atendido', prioridad: 'Media'  },
  { id: 4,  tipo: 'Congestión extrema',     icono: 'timer',  color: 'text-red-500',    direccion: 'Vía 40 con Calle 80',             descripcion: 'Tráfico lento por labores de mantenimiento vial.',        hace: '1 hora',  estado: 'Activo',   prioridad: 'Alta'   },
  { id: 5,  tipo: 'Ciclista en vía principal', icono: 'nav', color: 'text-green-500',  direccion: 'Calle 72 con Carrera 54',         descripcion: 'Grupo de ciclistas sin escolta.',                         hace: '2 horas', estado: 'Activo',   prioridad: 'Media'  },
  { id: 6,  tipo: 'Derrame de aceite',      icono: 'alert',  color: 'text-orange-500', direccion: 'Carrera 46 con Calle 50',         descripcion: 'Mancha de aceite en calzada, riesgo de accidente.',       hace: '2 horas', estado: 'Activo',   prioridad: 'Alta'   },
  { id: 7,  tipo: 'Semáforo apagado',       icono: 'zap',    color: 'text-yellow-500', direccion: 'Calle 30 con Carrera 38',         descripcion: 'Semáforo sin energía desde las 6am.',                     hace: '3 horas', estado: 'Activo',   prioridad: 'Alta'   },
  { id: 8,  tipo: 'Accidente grave',        icono: 'nav',    color: 'text-red-500',    direccion: 'Av. Murillo con Calle 17',         descripcion: 'Colisión múltiple, dos heridos trasladados.',             hace: '3 horas', estado: 'Atendido', prioridad: 'Crítica'},
  { id: 9,  tipo: 'Vehículo varado',        icono: 'timer',  color: 'text-slate-500',  direccion: 'Puente Pumarejo',                  descripcion: 'Tractomula varada bloquea carril derecho.',               hace: '4 horas', estado: 'Activo',   prioridad: 'Media'  },
  { id: 10, tipo: 'Inundación vial',        icono: 'alert',  color: 'text-blue-500',   direccion: 'Calle 45 con Carrera 21',         descripcion: 'Agua acumulada por lluvia dificulta el paso vehicular.',  hace: '5 horas', estado: 'Activo',   prioridad: 'Alta'   },
];

const ICONO_MAP = {
  zap:   <Zap size={14} />,
  alert: <AlertTriangle size={14} />,
  nav:   <Navigation size={14} />,
  timer: <Timer size={14} />,
};

const PRIORIDAD_COLOR = {
  'Crítica': 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  'Alta':    'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  'Media':   'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
};

// ── Modal de detalle ─────────────────────────────────────────
function ReporteModal({ reporte, onClose }) {
  return createPortal(
    <div
      className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Tarjeta del modal — stopPropagation evita cerrar al hacer clic adentro */}
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header del modal */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`${reporte.color} p-2 bg-slate-100 dark:bg-gray-700 rounded-lg`}>
              {ICONO_MAP[reporte.icono]}
            </div>
            <div>
              <h2 className="font-bold text-slate-800 dark:text-white">{reporte.tipo}</h2>
              <p className="text-xs text-slate-400 dark:text-gray-400">Reporte #{reporte.id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-gray-200 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Cuerpo */}
        <div className="space-y-3 text-sm">
          <div className="flex items-center gap-2 text-slate-600 dark:text-gray-300">
            <MapPin size={14} className="text-blue-500 shrink-0" />
            <span>{reporte.direccion}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-600 dark:text-gray-300">
            <Clock size={14} className="text-slate-400 shrink-0" />
            <span>Reportado hace {reporte.hace}</span>
          </div>
          <p className="text-slate-600 dark:text-gray-300 bg-slate-50 dark:bg-gray-700 rounded-lg p-3">
            {reporte.descripcion}
          </p>
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Prioridad:</span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${PRIORIDAD_COLOR[reporte.prioridad]}`}>
                {reporte.prioridad}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Estado:</span>
              <span className={`text-xs font-bold ${reporte.estado === 'Atendido' ? 'text-emerald-500' : 'text-orange-500'}`}>
                ● {reporte.estado}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ── Feed principal ────────────────────────────────────────────
export default function ReporteFeed() {
  const [seleccionado, setSeleccionado] = useState(null);

  return (
    <>
      {/* Header del aside */}
      <div className="mb-4 pb-3 border-b border-slate-100 dark:border-gray-700">
        <h2 className="font-bold text-slate-800 dark:text-white text-sm">Reportes Ciudadanos</h2>
        <div className="flex items-center gap-1 mt-0.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs text-slate-400 dark:text-gray-400 uppercase tracking-widest">
            En vivo (Barranquilla)
          </span>
        </div>
      </div>

      {/* Lista con scroll */}
      <div className="space-y-1">
        {REPORTES.map((r) => (
          <button
            key={r.id}
            onClick={() => setSeleccionado(r)}
            className="w-full text-left p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-gray-700 transition-colors cursor-pointer group"
          >
            <div className="flex items-start justify-between gap-2">
              <div className={`${r.color} mt-0.5 shrink-0`}>{ICONO_MAP[r.icono]}</div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-700 dark:text-gray-200 truncate">{r.tipo}</p>
                <p className="text-xs text-slate-400 dark:text-gray-500 flex items-center gap-1 mt-0.5">
                  <MapPin size={10} /> {r.direccion}
                </p>
                <p className="text-xs text-slate-500 dark:text-gray-400 mt-1 line-clamp-1">{r.descripcion}</p>
              </div>
              <span className="text-[10px] text-slate-300 dark:text-gray-600 shrink-0 whitespace-nowrap">
                {r.hace}
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* Modal — solo se renderiza si hay un reporte seleccionado */}
      {seleccionado && (
        <ReporteModal reporte={seleccionado} onClose={() => setSeleccionado(null)} />
      )}
    </>
  );
}