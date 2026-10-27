import { AnimatedSplashOverlay } from "@/components/animated-icon";
import { auth } from "@/lib/firebase";
import { enregistrerToken } from "@/lib/notification";
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { onAuthStateChanged } from "firebase/auth";
import { useEffect } from "react";
import { useColorScheme } from "react-native";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();

  // Quand un utilisateur est connecté, on enregistre son token push dans Firestore
  // (cela permet de lui envoyer des notifications, même app fermée)
  useEffect(() => {
    const arreter = onAuthStateChanged(auth, (user) => {
      if (user) enregistrerToken();
    });
    // Nettoyage quand le layout est démonté
    return arreter;
  }, []);

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
