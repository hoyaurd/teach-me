// src/lib/useBarreLaterale.ts
//
// Dit si l'app doit afficher le MENU LATÉRAL (à gauche) au lieu de la barre
// du bas. C'est le cas uniquement sur le WEB, quand la fenêtre est assez large
// (tablette en paysage, PC). Sur téléphone (et dans l'APK), la barre du bas
// reste exactement comme avant.
//
// Utilisation dans un écran :
//   const barreLaterale = useBarreLaterale();
//   ... et on cache la barre du bas quand barreLaterale vaut true.

import { Platform, useWindowDimensions } from "react-native";

// À partir de cette largeur (en px), le web passe en mode "grand écran"
export const LARGEUR_GRAND_ECRAN = 768;

// Largeur du menu latéral
export const LARGEUR_MENU = 240;

// Largeur maximale de la zone de contenu sur la page d'accueil (grille)
export const LARGEUR_MAX_GRILLE = 1200;

export function useBarreLaterale(): boolean {
  const { width } = useWindowDimensions();
  return Platform.OS === "web" && width >= LARGEUR_GRAND_ECRAN;
}
