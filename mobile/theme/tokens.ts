import { Platform } from "react-native";

export const colors = {
  background: "#F2F7FB",
  backgroundStrong: "#E8F1F8",
  surface: "#FFFFFF",
  surfaceMuted: "#EEF4FA",
  border: "#D6E1EB",
  text: "#0F172A",
  textMuted: "#5B6B7D",
  primary: "#0EA5A4",
  primaryDark: "#0F766E",
  accent: "#F97316",
  success: "#16A34A",
  danger: "#DC2626",
  warningBg: "#FEF3C7",
  warningText: "#92400E",
  errorBg: "#FEE2E2",
  errorText: "#991B1B",
  overlay: "rgba(15, 23, 42, 0.48)",
} as const;

export const radii = {
  sm: 10,
  md: 14,
  lg: 18,
  pill: 999,
} as const;

export const spacing = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
} as const;

export const shadow = {
  card: {
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 5,
  },
  floating: {
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 7,
  },
} as const;

export const iosTitleFont = Platform.select({
  ios: "AvenirNext-DemiBold",
  default: undefined,
});
