import { Platform } from "react-native";

/** Base URL sin barra final. En teléfono físico pon tu IP LAN, ej. `http://192.168.1.10:8000`. */
export function apiBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  if (__DEV__) {
    return Platform.OS === "android"
      ? "http://10.0.2.2:8000"
      : "http://127.0.0.1:8000";
  }
  return "";
}
