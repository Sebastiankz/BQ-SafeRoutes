// src/pages/Dashboard/Charts.jsx
import {
  AreaChart, Area, BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, LabelList
} from 'recharts';

const COLORS_GRAV = ['#f59e0b', '#ef4444', '#3b82f6'];
const COLORS_TIPO = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#8b5cf6'];

// Wrapper reutilizable para cada tarjeta de gráfica
function ChartCard({ titulo, children }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-5">
      <p className="text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-widest mb-4">
        {titulo}
      </p>
      {children}
    </div>
  );
}

export function HourlyChart({ data }) {
  return (
    <ChartCard titulo="Mapa de Riesgo por Hora">
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="gradHora" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0}   />
            </linearGradient>
          </defs>
          <XAxis dataKey="hora" tick={{ fontSize: 10 }} interval={2} />
          <YAxis hide />
          <Tooltip formatter={(v) => [`${v}`, 'Accidentes']} />
          <Area type="monotone" dataKey="valor" stroke="#ef4444" fill="url(#gradHora)" strokeWidth={2} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
     
    </ChartCard>
  );
}

export function DailyChart({ data }) {
  return (
    <ChartCard titulo="Siniestros por Día">
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data}>
          <XAxis dataKey="dia" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip formatter={(v) => [v, 'Siniestros']} />
          <Bar dataKey="valor" fill="#3b82f6" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function GravedadChart({ data }) {
  return (
    <ChartCard titulo="Proporción de Gravedad">
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value">
            {data.map((_, i) => <Cell key={i} fill={COLORS_GRAV[i % COLORS_GRAV.length]} />)}
          </Pie>
          <Tooltip />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function TipologiaChart({ data }) {
  return (
    <ChartCard titulo="Tipología de Siniestros">
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value">
            {data.map((_, i) => <Cell key={i} fill={COLORS_TIPO[i % COLORS_TIPO.length]} />)}
          </Pie>
          <Tooltip />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function Top5Vias({ data }) {
  // Recharts necesita el orden invertido para que el #1 quede arriba
  const chartData = [...data].reverse().map(d => ({ via: d.via, siniestros: d.cantidad }));

  return (
    <ChartCard titulo="Top 5 Vías Peligrosas">
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 30 }}>
          <XAxis type="number" tick={{ fontSize: 10 }} />
          <YAxis
            type="category"
            dataKey="via"
            tick={{ fontSize: 10 }}
            width={110}
          />
          <Tooltip formatter={(v) => [v, 'siniestros']} />
          <Bar dataKey="siniestros" fill="#3b82f6" radius={[0, 4, 4, 0]}>
            <LabelList dataKey="siniestros" position="right" style={{ fontSize: 10, fill: '#64748b' }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}