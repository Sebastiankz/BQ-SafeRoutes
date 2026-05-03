import "react-native-url-polyfill/auto";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? "";
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";

export const supabase = createClient(url, anonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export function tieneConfigSupabase(): boolean {
  return Boolean(url && anonKey);
}
