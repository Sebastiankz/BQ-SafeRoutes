// src/lib/supabase.js
// Cliente Supabase singleton para el web-dashboard.
// Se usa exclusivamente para suscripciones Realtime — la autenticación
// y las consultas de datos se siguen haciendo a través del backend FastAPI.
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
  // No necesitamos sesión de usuario en el dashboard — solo lectura pública vía Realtime
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});
