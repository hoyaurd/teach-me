// src/app/(tabs)/_layout.web.tsx
//
// Mise en page du SITE WEB uniquement (le suffixe ".web" fait que ce fichier
// est ignoré par l'application mobile : l'APK ne change pas).
//
// - Grand écran (PC, tablette) : menu latéral à gauche + contenu centré.
// - Petit écran (téléphone) : pas de menu latéral, chaque écran garde sa
//   barre du bas habituelle.
// - Pages d'accueil / création de compte / mot de passe oublié : pas de menu.

import { Stack, usePathname } from "expo-router";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import MenuLateral from "../../components/MenuLateral";
import {
  LARGEUR_GRAND_ECRAN,
  LARGEUR_MAX_GRILLE,
} from "../../lib/useBarreLaterale";

// Pages sans menu (l'utilisateur n'est pas encore dans l'app)
const PAGES_PUBLIQUES = ["/", "/creer un compte2", "/mot_de_passe_oublie"];

// Largeur maximale du contenu selon la page (en px)
const LARGEURS: Record<string, number> = {
  "/acceuil": LARGEUR_MAX_GRILLE, // grille de cartes
  "/messages": 820,
  "/notification": 820,
  "/discussion": 820,
  "/chat_bot": 820,
  "/historique ia": 820,
  "/index": 100000, // page de bienvenue : pleine largeur
  "/": 100000,
};
const LARGEUR_PAR_DEFAUT = 760; // profils, formulaires, paramètres...

// "/Creer%20un%20compte2" devient "/creer un compte2"
function nettoyer(chemin: string): string {
  try {
    return decodeURIComponent(chemin).toLowerCase();
  } catch {
    return chemin.toLowerCase();
  }
}

export default function LayoutWeb() {
  const { width } = useWindowDimensions();
  const route = nettoyer(usePathname());

  const estPublique = PAGES_PUBLIQUES.includes(route);
  const avecMenu = width >= LARGEUR_GRAND_ECRAN && !estPublique;
  const grandEcran = width >= LARGEUR_GRAND_ECRAN;

  // Pages publiques : formulaires étroits ; bienvenue : pleine largeur
  const largeurMax = estPublique
    ? (LARGEURS[route] ?? 560)
    : (LARGEURS[route] ?? LARGEUR_PAR_DEFAUT);

  return (
    <View style={styles.page}>
      {avecMenu && <MenuLateral route={route} />}

      {/* Zone de contenu : fond gris clair, colonne blanche centrée */}
      <View style={[styles.zone, grandEcran && styles.zoneGrande]}>
        <View
          style={[
            styles.colonne,
            grandEcran && { maxWidth: largeurMax },
            grandEcran && largeurMax < 100000 && styles.colonneBordee,
          ]}
        >
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: "#FFFFFF" },
            }}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
  },
  zone: {
    flex: 1,
  },
  zoneGrande: {
    backgroundColor: "#FFFFFF",
    marginLeft: 100,
    marginRight: 80,
  },
  colonne: {
    flex: 1,
    width: "100%",
    backgroundColor: "#FFFFFF",
  },
  colonneBordee: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: "#c5c7ca",
  },
});
