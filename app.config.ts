import { ConfigContext, ExpoConfig } from "expo/config";

export default ({config}: ConfigContext): ExpoConfig => ({
    ...config,
    name: "paraderos-app",
    slug: "paraderos-app",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/app-icon.png",
    scheme: "paraderosapp",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    ios: {
        supportsTablet: true
    },
    android: {
        adaptiveIcon: {
            backgroundColor: "#E6F4FE",
            foregroundImage: "./assets/images/app-icon.png",
            backgroundImage: "./assets/images/app-icon.png",
            monochromeImage: "./assets/images/app-icon.png"
        },
        predictiveBackGestureEnabled: false,
        package: "com.thomazo.paraderosapp",
        config: {
            googleMaps: {
                apiKey: process.env.GOOGLE_MAPS_API_KEY
            }
        }
    },
    web: {
        output: "static",
        favicon: "./assets/images/app-icon.png"
    },
    plugins: [
        "expo-router",
        [
            "expo-splash-screen",
            {
                image: "./assets/images/app-icon.png",
                imageWidth: 200,
                resizeMode: "contain",
                backgroundColor: "#ffffff",
                dark: {
                    backgroundColor: "#000000"
                }
            }
        ],
        "expo-background-task",
        [
            "expo-camera",
            {
                cameraPermission: "Permitir que \"Paraderos APP\" acceda a la cámara?"
            }
        ],
    ],
    experiments: {
        typedRoutes: true,
        reactCompiler: true
    },
    extra: {
        router: {},
        eas: {
            projectId: "55989a35-934f-4e00-85f1-23e6034dbf72"
        }
    },
    owner: "thomazo"
})