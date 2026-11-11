import { AnimatedSplashOverlay } from "@/components/animated-icon";
import { auth } from "@/lib/firebase";
import { enregistrerToken } from "@/lib/notification";

import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";

import * as SplashScreen from "expo-splash-screen";
import { onAuthStateChanged } from "firebase/auth";
import { useEffect } from "react";
import { Platform, useColorScheme } from "react-native";

import {
  AntDesign,
  Entypo,
  Feather,
  FontAwesome,
  Ionicons,
  MaterialCommunityIcons,
  MaterialIcons,
} from "@expo/vector-icons";
import { useFonts } from "expo-font";

import "@/global.css";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();

  // Chargement des polices de toutes les bibliothèques d'icônes
  const [fontsLoaded, fontError] = useFonts({
    ...Ionicons.font,
    ...Feather.font,
    ...FontAwesome.font,
    ...MaterialCommunityIcons.font,
    ...MaterialIcons.font,
    ...AntDesign.font,
    ...Entypo.font,
  });

  // Masquer l'écran de chargement lorsque les polices sont prêtes
  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  // Enregistrement du token de notification sur mobile uniquement
  useEffect(() => {
    const arreter = onAuthStateChanged(auth, (user) => {
      if (user && Platform.OS !== "web") {
        enregistrerToken();
      }
    });

    return arreter;
  }, []);

  // Attendre le chargement des polices
  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />

      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="Connection" />
      </Stack>
    </ThemeProvider>
  );
}
