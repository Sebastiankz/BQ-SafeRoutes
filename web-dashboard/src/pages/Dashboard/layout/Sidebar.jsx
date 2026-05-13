// src/pages/Dashboard/layout/Sidebar.jsx
import { useState } from "react";
import {
  MapPin,
  BarChart2,
  List,
  Shield,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import LoginModal from "../../Login/LoginPage";

const NAV_ITEMS = [
  { id: "mapa", label: "Centro de Control", Icon: MapPin },
  { id: "analitica", label: "Analítica", Icon: BarChart2 },
  { id: "reportes", label: "Historial", Icon: List },
];

export default function Sidebar({ seccion, setSeccion }) {
  const { usuario, isAdmin, cerrarSesion } = useAuth();
  const [showLogin, setShowLogin] = useState(false);

  function AdminArea() {
    if (isAdmin) {
      return (
        <div className="p-3 border-t border-slate-200 dark:border-gray-700">
          <div className="flex items-center gap-2 px-2 py-1.5 mb-1">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
              <Shield className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-700 dark:text-gray-200 truncate">
                {usuario?.email?.split("@")[0]}
              </p>
              <p className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">
                Administrador
              </p>
            </div>
          </div>
          <button
            onClick={cerrarSesion}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-500 dark:text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-colors cursor-pointer"
          >
            <LogOut size={13} />
            Cerrar sesión
          </button>
        </div>
      );
    }

    return (
      <div className="p-3 border-t border-slate-200 dark:border-gray-700">
        <button
          onClick={() => setShowLogin(true)}
          className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-xs font-medium text-slate-500 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-gray-800 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer group"
        >
          <span className="flex items-center gap-2">
            <Shield
              size={14}
              className="text-slate-400 group-hover:text-blue-500 transition-colors"
            />
            Acceso policial
          </span>
          <ChevronRight
            size={13}
            className="opacity-40 group-hover:opacity-100 group-hover:text-blue-500 transition-all"
          />
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Desktop sidebar — visible lg+ */}
      <aside className="hidden lg:flex flex-col w-52 shrink-0 bg-white dark:bg-gray-900 border-r border-slate-200 dark:border-gray-700">
        <nav className="flex-1 p-3 pt-4 space-y-1">
          {NAV_ITEMS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setSeccion(id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                seccion === id
                  ? "bg-blue-600 text-white"
                  : "text-slate-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-gray-800 hover:text-slate-800 dark:hover:text-white"
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </nav>
        <AdminArea />
      </aside>

      {/* Mobile tab bar — visible below lg */}
      <div className="flex lg:hidden shrink-0 bg-white dark:bg-gray-900 border-b border-slate-200 dark:border-gray-700">
        {NAV_ITEMS.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setSeccion(id)}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors cursor-pointer ${
              seccion === id
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-slate-500 dark:text-gray-400"
            }`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
        {/* Botón admin en mobile */}
        <button
          onClick={() => (isAdmin ? cerrarSesion() : setShowLogin(true))}
          className={`flex flex-col items-center gap-0.5 py-2 px-3 text-[10px] font-medium transition-colors cursor-pointer ${
            isAdmin ? "text-blue-600" : "text-slate-400"
          }`}
          title={isAdmin ? "Cerrar sesión" : "Acceso policial"}
        >
          <Shield size={15} />
          {isAdmin ? "Admin" : "Policía"}
        </button>
      </div>

      {/* Modal de login */}
      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
    </>
  );
}
