// src/components/BlocEstimation.tsx
//
// Petit bloc qui affiche : "Chances d'acceptation : 72 % (Élevées)".
// On l'utilise dans Detail_Profil, juste avant le bouton "Envoyer une demande".
//
// Exemple d'utilisation :
//   <BlocEstimation miennes={monProfil} vues={profilAffiche} />

import { StyleSheet, Text, View } from "react-native";
import type { InfosProfil } from "../lib/calculerCompatibilite";
import { estimerCompatibilite } from "../lib/estimerCompatibilite";

// Couleur du pourcentage selon le niveau
const COULEURS = {
  elevees: "#16A34A", // vert
  moyennes: "#D97706", // orange
  faibles: "#DC2626", // rouge
};

// Les deux profils à comparer
type Props = {
  miennes: InfosProfil; // mon profil
  vues: InfosProfil; // le profil que je regarde
};

export default function BlocEstimation({ miennes, vues }: Props) {
  // Le calcul se fait ici, directement sur le téléphone
  const resultat = estimerCompatibilite(miennes, vues);

  return (
    <View style={styles.conteneur}>
      <Text style={styles.titre}>Chances d'acceptation</Text>
      <Text style={[styles.valeur, { color: COULEURS[resultat.niveau] }]}>
        {resultat.pourcentage} % ({resultat.libelle})
      </Text>
      <Text style={styles.note}>Estimation indicative</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  conteneur: {
    alignItems: "center",
    paddingVertical: 12,
    marginBottom: 8,
  },
  titre: {
    fontSize: 14,
    color: "#6B7280",
  },
  valeur: {
    fontSize: 22,
    fontWeight: "bold",
    marginTop: 4,
  },
  note: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 2,
  },
});
