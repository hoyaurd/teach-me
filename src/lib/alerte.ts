// src/lib/alerte.ts
//
// Remplace Alert.alert, qui ne fait RIEN dans un navigateur.
// Même utilisation que Alert.alert :
//   alerte("Titre", "Message");
//   alerte("Succès", "Publié !", [{ text: "OK", onPress: () => ... }]);
//   alerte("Se déconnecter", "Es-tu sûr ?", [
//     { text: "Annuler", style: "cancel" },
//     { text: "Se déconnecter", style: "destructive", onPress: () => ... },
//   ]);
//
// - Sur mobile : c'est exactement Alert.alert (rien ne change).
// - Sur le web : window.alert (un bouton) ou window.confirm (deux boutons).

import { Alert, Platform } from "react-native";

type Bouton = {
  text?: string;
  style?: "default" | "cancel" | "destructive";
  onPress?: () => void;
};

export function alerte(titre: string, message?: string, boutons?: Bouton[]) {
  // Mobile : le comportement habituel
  if (Platform.OS !== "web") {
    Alert.alert(titre, message, boutons);
    return;
  }

  const texte = message ? `${titre}\n\n${message}` : titre;

  // Pas de bouton, ou un seul bouton : simple message, puis on lance son action
  if (!boutons || boutons.length <= 1) {
    window.alert(texte);
    boutons?.[0]?.onPress?.();
    return;
  }

  // Deux boutons ou plus : question OK / Annuler.
  // OK lance l'action (le bouton qui n'est pas "cancel"), Annuler lance "cancel".
  const annuler = boutons.find((b) => b.style === "cancel");
  const action = boutons.find((b) => b !== annuler);

  if (window.confirm(texte)) {
    action?.onPress?.();
  } else {
    annuler?.onPress?.();
  }
}
