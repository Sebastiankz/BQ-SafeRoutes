import { useEffect, useState } from 'react';
import { getAccidentes } from '../api/accidentes';
import KPICard from '../components/KPICard';

export default function Dashboard() {
  const [datos, setDatos] = useState([]);

  useEffect(() => {
    getAccidentes().then(setDatos);
  }, []);

  const totalAccidentes = datos.length;
  const totalHeridos = datos.reduce((sum, d) => sum + (parseInt(d['CANT_HERIDOS_EN _SITIO_ACCIDENTE']) || 0), 0);
  const totalMuertos = datos.reduce((sum, d) => sum + (parseInt(d['CANT_MUERTOS_EN _SITIO_ACCIDENTE']) || 0), 0);

  return (
    <div style={{ padding: '32px', background: '#13131f', minHeight: '100vh' }}>
      <h1 style={{ color: '#fff', marginBottom: '24px' }}>Dashboard — Accidentalidad Barranquilla</h1>
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
        <KPICard titulo="Total Accidentes" valor={totalAccidentes} color="#1a1a2e" />
        <KPICard titulo="Total Heridos" valor={totalHeridos} color="#1a2e1a" />
        <KPICard titulo="Total Muertos" valor={totalMuertos} color="#2e1a1a" />
      </div>
    </div>
  );
}