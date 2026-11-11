// src/components/BoutonSupprimer.tsx
// Bouton "Supprimer ma publication" avec confirmation.
// Utilisation : <BoutonSupprimer pubId={id} />

import { useRouter } from "expo-router";
import { deleteDoc, doc } from "firebase/firestore";
import { Alert, Text, TouchableOpacity } from "react-native";
import { db } from "../lib/firebase"; // adapte le chemin si besoin

type Props = {
  pubId: string; // id du document dans la collection "publications"
};

export default function BoutonSupprimer({ pubId }: Props) {
  const router = useRouter();

  // Supprime le document dans Firestore, puis revient à l'écran précédent
  const supprimer = async () => {
    try {
      await deleteDoc(doc(db, "publications", pubId));
      router.back();
    } catch (e) {
      Alert.alert("Erreur", "Impossible de supprimer la publication.");
    }
  };

  // Demande confirmation avant de supprimer
  const confirmer = () => {
    Alert.alert(
      "Supprimer la publication",
      "Cette action est définitive. Continuer ?",
      [
        { text: "Annuler", style: "cancel" },
        { text: "Supprimer", style: "destructive", onPress: supprimer },
      ],
    );
  };

  return (
    <TouchableOpacity
      onPress={confirmer}
      style={{
        backgroundColor: "#E53935",
        padding: 14,
        borderRadius: 10,
        alignItems: "center",
        margin: 16,
      }}
    >
      <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 16 }}>
        Supprimer ma publication
      </Text>
    </TouchableOpacity>
  );
}
