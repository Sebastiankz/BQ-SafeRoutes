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
      bundleIdentifier: "com.bqsaferoutes.app",
      ...(process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY_IOS?.trim()
        ? {
          config: {
            googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY_IOS.trim(),
          },
        }
        : {}),
      infoPlist: {
        NSLocationWhenInUseUsageDescription:
          "SafeRoutes necesita tu ubicación para mostrarte riesgos cercanos.",
      },
    },
    android: {
      package: "com.bqsaferoutes.app",
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#0F766E",
      },
      usesCleartextTraffic: true,
      ...(process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY_ANDROID?.trim()
        ? {
          config: {
            googleMaps: {
              apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY_ANDROID,
            },
          },
        }
        : {}),
      permissions: [
        "android.permission.ACCESS_FINE_LOCATION",
        "android.permission.ACCESS_COARSE_LOCATION",
      ],
    },
    plugins: [
      process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME
        ? [
          "@react-native-google-signin/google-signin",
          { iosUrlScheme: process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME },
        ]
        : "@react-native-google-signin/google-signin",
      [
        "expo-build-properties",
        {
          ios: {
            useFrameworks: "static",
          },
        },
      ],
      "./plugins/withReactNativeMapsFix",
    ],
    extra: {
      eas: {
        projectId: "ddaad9d0-19fb-4fc2-bc55-90a9e71d688f",
      },
    },
  },
};
