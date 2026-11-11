// src/components/BlocCompatibilite.tsx
//
// Affiche : "Chances d'acceptation : 3/5 (72 %) Élevées"
// et la liste des points communs entre mon profil et celui que je regarde.
//
// Exemple d'utilisation dans Detail_Profil :
//   <BlocCompatibilite miennes={mesInfos} vues={{ matiere, niveau, lieu, remuneration, lieuTravail }} />

import { StyleSheet, Text, View } from "react-native";
import { type InfosProfil } from "../lib/calculerCompatibilite";
import { estimerCompatibilite } from "../lib/estimerCompatibilite";

// Couleur selon le niveau
const COULEURS = {
  elevees: "#16A34A", // vert
  moyennes: "#D97706", // orange
  faibles: "#DC2626", // rouge
};

type Props = {
  miennes: InfosProfil; // mes infos
  vues: InfosProfil; // les infos du profil que je regarde
};

export default function BlocCompatibilite({ miennes, vues }: Props) {
  // Le calcul se fait ici, directement sur le téléphone
  const r = estimerCompatibilite(miennes, vues);

  return (
    <View style={styles.conteneur}>
      <Text style={styles.titre}>Chances d'acceptation</Text>
      <Text style={[styles.valeur, { color: COULEURS[r.niveau] }]}>
        {r.points}/{r.total} ({r.pourcentage} %) {r.libelle}
      </Text>
      <Text style={styles.note}>
        {r.communs.length > 0
          ? "Points communs : " + r.communs.join(", ")
          : "Aucun point commun"}
      </Text>
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
    textAlign: "center",
  },
});
