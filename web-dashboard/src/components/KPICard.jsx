export default function KPICard({ titulo, valor, color }) {
  return (
    <div style={{
      background: color || '#1e1e2e',
      borderRadius: '12px',
      padding: '24px',
      textAlign: 'center',
      flex: 1,
      minWidth: '160px',
    }}>
      <p style={{ color: '#aaa', fontSize: '13px', marginBottom: '8px' }}>{titulo}</p>
      <h2 style={{ color: '#fff', fontSize: '32px', margin: 0 }}>{valor.toLocaleString()}</h2>
    </div>
  );
}