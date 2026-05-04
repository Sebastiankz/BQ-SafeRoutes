// src/pages/Dashboard/useDashboardData.js
import { useState, useEffect, useRef } from 'react';
import { getAccidentes } from '../../api/accidentes';

const GRAVEDAD_MAP = {
  'Todas':      null,
  'Solo Daños': 'Solo daños',
  'Heridos':    'Con heridos',
  'Muertos':    'Con muertos',
};

// MES_ACCIDENTE en el CSV viene como nombre en inglés
const MES_CSV_MAP = {
  '1': 'January',  '2': 'February', '3': 'March',     '4': 'April',
  '5': 'May',      '6': 'June',     '7': 'July',      '8': 'August',
  '9': 'September','10': 'October', '11': 'November', '12': 'December',
};

const DIAS_ORDER = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const DIAS_ES    = { Mon:'Lun', Tue:'Mar', Wed:'Mié', Thu:'Jue', Fri:'Vie', Sat:'Sáb', Sun:'Dom' };

// Parsea "01:30:00:am" → número de hora (0-23)
function parseHora(horaStr) {
  if (!horaStr) return null;
  const partes = horaStr.toLowerCase().split(':');
  let hora = parseInt(partes[0]);
  const periodo = partes[partes.length - 1];
  if (periodo === 'pm' && hora !== 12) hora += 12;
  if (periodo === 'am' && hora === 12) hora = 0;
  return hora;
}

const AÑOS_RANGO = [2022, 2023, 2024, 2025];

function calcularTodo(filas, año, gravedad, mes) {
  // 1. Filtrar por año ('Todos' incluye 2022-2025)
  let f = año === 'Todos'
    ? filas.filter(r => AÑOS_RANGO.includes(Number(r.ANO_ACCIDENTE)))
    : filas.filter(r => String(r.ANO_ACCIDENTE) === String(año));
  const gravedadCSV = GRAVEDAD_MAP[gravedad];
  if (gravedadCSV) f = f.filter(r => r.GRAVEDAD_ACCIDENTE === gravedadCSV);
  // 2. Filtrar por mes (MES_ACCIDENTE en CSV es nombre en inglés)
  const mesCsv = MES_CSV_MAP[String(mes)];
  if (mesCsv) f = f.filter(r => r.MES_ACCIDENTE === mesCsv);

  // ── KPIs ──────────────────────────────────────────────
  const total    = f.length;
  const victimas = f.reduce((s, r) => {
    return s + (parseInt(r['CANT_HERIDOS_EN _SITIO_ACCIDENTE']) || 0)
             + (parseInt(r['CANT_MUERTOS_EN _SITIO_ACCIDENTE']) || 0);
  }, 0);
  // 'Todos' año + 'Todos' mes = 48 meses; año especifico = 12 meses; mes especifico = 1
  const meses  = mes !== 'Todos' ? 1 : (año === 'Todos' ? 48 : 12);
  const promedio = Math.round(total / meses);
  // Tendencia: compara mismo mes del año anterior (o año completo si mes = 'Todos')
  let anterior = total; // default: sin cambio
  if (año !== 'Todos') {
    let fAnterior = filas.filter(r => String(r.ANO_ACCIDENTE) === String(año - 1));
    const gravedadCSV2 = GRAVEDAD_MAP[gravedad];
    if (gravedadCSV2) fAnterior = fAnterior.filter(r => r.GRAVEDAD_ACCIDENTE === gravedadCSV2);
    if (mes !== 'Todos') {
      const mesCsvAnterior = MES_CSV_MAP[String(mes)];
      if (mesCsvAnterior) fAnterior = fAnterior.filter(r => r.MES_ACCIDENTE === mesCsvAnterior);
    }
    anterior = fAnterior.length;
  }
  // null = sin dato comparable (no mostrar tendencia)
  const t1 = (año === 'Todos' || anterior === 0)
    ? null
    : parseFloat((((total - anterior) / anterior) * 100).toFixed(1));

  // ── Gráfica 1: accidentes por hora (normalizado 0-100) ──
  const porHora = Array.from({ length: 24 }, (_, i) => ({ hora: `${String(i).padStart(2,'0')}:00`, valor: 0 }));
  f.forEach(r => {
    const h = parseHora(r.HORA_ACCIDENTE);
    if (h !== null) porHora[h].valor++;
  });
  const maxHora = Math.max(...porHora.map(d => d.valor), 1);
  const hourlyData = porHora.map(d => ({ ...d, valor: Math.round((d.valor / maxHora) * 100) }));

  // ── Gráfica 2: accidentes por día de semana ──
  const contDia = {};
  f.forEach(r => { if (r.DIA_ACCIDENTE) contDia[r.DIA_ACCIDENTE] = (contDia[r.DIA_ACCIDENTE] || 0) + 1; });
  const dailyData = DIAS_ORDER.map(d => ({ dia: DIAS_ES[d] || d, valor: contDia[d] || 0 }));

  // ── Gráfica 3: proporción de gravedad ──
  const contGrav = {};
  f.forEach(r => { if (r.GRAVEDAD_ACCIDENTE) contGrav[r.GRAVEDAD_ACCIDENTE] = (contGrav[r.GRAVEDAD_ACCIDENTE] || 0) + 1; });
  const gravedadData = Object.entries(contGrav).map(([name, value]) => ({ name, value }));

  // ── Gráfica 4: tipología de siniestros ──
  const contTipo = {};
  f.forEach(r => { if (r.CLASE_ACCIDENTE) contTipo[r.CLASE_ACCIDENTE] = (contTipo[r.CLASE_ACCIDENTE] || 0) + 1; });
  const tipologiaData = Object.entries(contTipo)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, value]) => ({ name, value }));

  // ── Tabla: Top 5 vías peligrosas ──
  const contVia = {};
  f.forEach(r => { if (r.SITIO_NORMALIZADO) contVia[r.SITIO_NORMALIZADO] = (contVia[r.SITIO_NORMALIZADO] || 0) + 1; });
  const top5Vias = Object.entries(contVia)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([via, cantidad], i) => ({ rank: i + 1, via, cantidad }));

  return {
    kpi: { total, victimas, promedio, t1, t2: t1, t3: t1 },
    hourlyData,
    dailyData,
    gravedadData,
    tipologiaData,
    top5Vias,
  };
}

export function useDashboardData(año, gravedad, mes) {
  const csvCache = useRef(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const procesar = (filas) => {
      setTimeout(() => {
        setResult(calcularTodo(filas, año, gravedad, mes));
        setLoading(false);
      }, 500);
    };
    if (csvCache.current) {
      procesar(csvCache.current);
    } else {
      getAccidentes().then(filas => {
        csvCache.current = filas;
        procesar(filas);
      });
    }
  }, [año, gravedad, mes]);

  return { result, loading };
}