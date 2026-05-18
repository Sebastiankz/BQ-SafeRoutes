// src/pages/Dashboard/layout/DashboardLayout.jsx
import { useEffect } from "react";
import Header from "../Header";
import Sidebar from "./Sidebar";

export default function DashboardLayout({
  año, setAño,
  gravedad, setGravedad,
  mes, setMes,
  isDark, setIsDark,
  seccion, setSeccion,
  reportesActivos = 0,
  children,
}) {
  // Theme lives on <html> so it cascades to <body>, portals (modals),
  // and any element outside the React root.
  useEffect(() => {
    const root = document.documentElement;
    if (isDark) root.classList.add("dark");
    else root.classList.remove("dark");
    root.style.colorScheme = isDark ? "dark" : "light";
  }, [isDark]);

  return (
    <div
      className="min-h-screen lg:h-screen flex flex-col bg-[var(--bg-primary)] text-[var(--text-primary)]"
      style={{ fontFamily: "var(--font-sans)" }}
    >
      <Header
        año={año} setAño={setAño}
        gravedad={gravedad} setGravedad={setGravedad}
        mes={mes} setMes={setMes}
        isDark={isDark} setIsDark={setIsDark}
        mostrarGravedad={seccion !== "mapa"}
      />
      <div className="flex flex-1 lg:overflow-hidden">
        <Sidebar
          seccion={seccion}
          setSeccion={setSeccion}
          reportesActivos={reportesActivos}
        />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[var(--bg-primary)]">
          {children}
        </div>
      </div>
    </div>
  );
}
