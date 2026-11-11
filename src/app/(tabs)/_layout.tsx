// src/app/(tabs)/_layout.tsx
//
// Layout des écrans du dossier (tabs) pour le MOBILE (APK) :
// une simple pile d'écrans, sans en-tête (comme avant).
//
// Expo Router exige ce fichier "de base" à côté de _layout.web.tsx.
// Sur le site web, c'est _layout.web.tsx (avec le menu latéral) qui est utilisé.

import { Stack } from "expo-router";

export default function LayoutTabs() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
