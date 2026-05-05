// src/pages/Dashboard/layout/Sidebar.jsx
import { MapPin, BarChart2, List } from "lucide-react";

const NAV_ITEMS = [
  { id: "mapa",      label: "Centro de Control", Icon: MapPin    },
  { id: "analitica", label: "Analítica",          Icon: BarChart2 },
  { id: "reportes",  label: "Historial",          Icon: List      },
];

export default function Sidebar({ seccion, setSeccion }) {
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
      </div>
    </>
  );
}
