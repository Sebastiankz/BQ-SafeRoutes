// src/pages/Dashboard/layout/DashboardLayout.jsx
import Header from "../Header";
import Sidebar from "./Sidebar";

export default function DashboardLayout({
  // props de Header
  año, setAño,
  gravedad, setGravedad,
  mes, setMes,
  isDark, setIsDark,
  // props de Sidebar
  seccion, setSeccion,
  // vista activa
  children,
}) {
  return (
    <div
      className={`min-h-screen lg:h-screen flex flex-col font-sans ${
        isDark ? "dark bg-gray-950" : "bg-slate-100"
      }`}
    >
      <Header
        año={año} setAño={setAño}
        gravedad={gravedad} setGravedad={setGravedad}
        mes={mes} setMes={setMes}
        isDark={isDark} setIsDark={setIsDark}
        mostrarGravedad={seccion !== "mapa"}

      />
      <div className="flex flex-1 lg:overflow-hidden">
        <Sidebar seccion={seccion} setSeccion={setSeccion} />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
}
