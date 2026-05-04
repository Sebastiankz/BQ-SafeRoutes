// src/pages/Dashboard/KPICard.jsx
import { TrendingUp, TrendingDown } from 'lucide-react';

export default function KPICard({ titulo, valor, tendencia, icono, color }) {
  const esSube = tendencia >= 0;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-5 flex items-center gap-4 w-full">

      {/* Ícono */}
      <div className={`${color} text-white p-3 rounded-lg shrink-0`}>
        {icono}
      </div>

      {/* Texto */}
      <div>
        <p className="text-xs text-slate-400 dark:text-gray-400 uppercase tracking-widest font-semibold">
          {titulo}
        </p>
        <p className="text-2xl font-bold text-slate-800 dark:text-white">
          {valor.toLocaleString('es-CO')}
        </p>
        <div className={`flex items-center gap-1 text-xs font-semibold mt-1 ${esSube ? 'text-emerald-500' : 'text-red-500'}`}>
          {esSube ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
          <span>{esSube ? '+' : ''}{tendencia}% vs mes anterior</span>
        </div>
      </div>

    </div>
  );
}