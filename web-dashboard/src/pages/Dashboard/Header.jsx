import { Activity, Moon, Sun } from "lucide-react";
import { Select, ListBox } from "@heroui/react";

const AÑOS = ['Todos', 2022, 2023, 2024, 2025];
const GRAVEDADES = ["Todas", "Solo Daños", "Heridos", "Muertos"];
const MESES = [
  { id: 'Todos', label: 'Todos' },
  { id: '1',  label: 'Enero'      }, { id: '2',  label: 'Febrero'    },
  { id: '3',  label: 'Marzo'      }, { id: '4',  label: 'Abril'      },
  { id: '5',  label: 'Mayo'       }, { id: '6',  label: 'Junio'      },
  { id: '7',  label: 'Julio'      }, { id: '8',  label: 'Agosto'     },
  { id: '9',  label: 'Septiembre' }, { id: '10', label: 'Octubre'    },
  { id: '11', label: 'Noviembre'  }, { id: '12', label: 'Diciembre'  },
];

export default function Header({ año, setAño, gravedad, setGravedad, mes, setMes, isDark, setIsDark }) {
  return (
    <header className="bg-white dark:bg-gray-900 border-b border-slate-200 dark:border-gray-700 px-4 sm:px-6 py-3 shrink-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-sm">

      {/* Lado izquierdo: logo + título */}
      <div className="flex items-center gap-3">
        <div className="bg-blue-600 text-white p-2 rounded-lg">
          <Activity size={20} />
        </div>
        <div>
          <h1 className="text-sm font-bold text-slate-800 dark:text-white leading-tight">
            Monitor Vial Barranquilla
          </h1>
          <p className="text-xs text-slate-400 dark:text-gray-400 tracking-widest uppercase">
            Plataforma de Prevención de Riesgos · {año === 'Todos' ? '2022 – 2025' : año}
          </p>
        </div>
      </div>

      {/* Lado derecho: filtros + toggle */}
      <div className="flex flex-wrap items-center gap-3">

        {/* Filtro Gravedad */}
        <div className="flex items-center gap-2">
          <span className="hidden sm:block text-xs font-semibold text-slate-500 dark:text-gray-400">Gravedad</span>
          <Select
            className="w-36"
            placeholder="Gravedad"
            selectedKey={gravedad}
            onSelectionChange={(key) => {
              const val = key instanceof Set ? [...key][0] : key;
              if (val != null) setGravedad(String(val));
            }}
          >
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                {GRAVEDADES.map((g) => (
                  <ListBox.Item key={g} id={g} textValue={g}>
                    {g}
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>
        </div>

        {/* Filtro Año */}
        <div className="flex items-center gap-2">
          <span className="hidden sm:block text-xs font-semibold text-slate-500 dark:text-gray-400">Período</span>
          <Select
            className="w-28"
            placeholder="Período"
            selectedKey={String(año)}
            onSelectionChange={(key) => {
              const val = key instanceof Set ? [...key][0] : key;
              if (val != null) setAño(val === 'Todos' ? 'Todos' : Number(val));
            }}
          >
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                {AÑOS.map((a) => (
                  <ListBox.Item key={String(a)} id={String(a)} textValue={String(a)}>
                    {String(a)}
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>
        </div>

        {/* Filtro Mes */}
        <div className="flex items-center gap-2">
          <span className="hidden sm:block text-xs font-semibold text-slate-500 dark:text-gray-400">Mes</span>
          <Select
            className="w-36"
            placeholder="Mes"
            selectedKey={String(mes)}
            onSelectionChange={(key) => {
              const val = key instanceof Set ? [...key][0] : key;
              if (val != null) setMes(String(val));
            }}
          >
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                {MESES.map((m) => (
                  <ListBox.Item key={m.id} id={m.id} textValue={m.label}>
                    {m.label}
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>
        </div>

        {/* Toggle dark mode */}
        <button
          onClick={() => setIsDark(!isDark)}
          className="p-2 rounded-lg border border-slate-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-slate-500 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
          title={isDark ? 'Modo claro' : 'Modo oscuro'}
        >
          {isDark ? <Sun size={16} /> : <Moon size={16} />}
        </button>

      </div>
    </header>
  );
}