export default {
  expo: {
    name: "SafeRoutes BQ",
    slug: "saferoutes-bq",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#0F766E",
    },
    ios: {
      supportsTablet: true,
      ...(process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY?.trim()
        ? {
            config: {
              googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY.trim(),
            },
          }
        : {}),
      infoPlist: {
        NSLocationWhenInUseUsageDescription:
          "SafeRoutes necesita tu ubicación para mostrarte riesgos cercanos.",
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#0F766E",
      },
      usesCleartextTraffic: true,
      ...(process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY?.trim()
        ? {
            config: {
              googleMaps: {
                apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY,
              },
            },
          }
        : {}),
      permissions: [
        "android.permission.ACCESS_FINE_LOCATION",
        "android.permission.ACCESS_COARSE_LOCATION",
      ],
    },
  },
};
