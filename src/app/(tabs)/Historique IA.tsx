// Historique_IA.tsx
// Page "Historique IA" : liste des questions posées au chatbot
// et des réponses reçues, pour l'utilisateur connecté.
//
// Les échanges sont enregistrés dans la collection Firestore
// "historique_ia" (voir src/lib/historiqueIA.ts).
//
// Place ce fichier dans le même dossier que Parametres.tsx.
// ATTENTION aux chemins d'import :
// - fichier dans src/app/          -> "../lib/firebase"
// - fichier dans src/app/(tabs)/   -> "../../lib/firebase"

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { getAuth } from "firebase/auth";
import { collection, getDocs, query, where } from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { db } from "../../lib/firebase";

const BLEU = "#2E3FCB";
const GRIS = "#4A4A4A";

export default function HistoriqueIA() {
  const router = useRouter();

  // Liste des échanges et état de chargement
  const [echanges, setEchanges] = useState<any[]>([]);
  const [chargement, setChargement] = useState(true);

  // Au premier affichage : on lit l'historique de l'utilisateur connecté
  useEffect(() => {
    async function charger() {
      try {
        const user = getAuth().currentUser;
        if (!user) return;

        // On ne récupère que les échanges de cet utilisateur
        const q = query(
          collection(db, "historique_ia"),
          where("uid", "==", user.uid),
        );
        const snap = await getDocs(q);

        const liste = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

        // Tri par date : le plus récent en premier
        // (fait ici pour éviter de créer un index dans Firestore)
        liste.sort((a: any, b: any) => (b.creeLe ?? 0) - (a.creeLe ?? 0));

        setEchanges(liste);
      } catch (erreur) {
        console.log("Erreur lecture historique IA :", erreur);
      } finally {
        setChargement(false);
      }
    }

    charger();
  }, []);

  return (
    <SafeAreaView style={styles.conteneur}>
      {/* ---------- En-tête : bouton retour + titre ---------- */}
      <View style={styles.entete}>
        <TouchableOpacity hitSlop={12} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.titre}>Historique IA</Text>
      </View>

      {/* ---------- Contenu ---------- */}
      {chargement ? (
        <ActivityIndicator color={BLEU} style={{ marginTop: 40 }} />
      ) : echanges.length === 0 ? (
        <Text style={styles.vide}>Aucun échange pour le moment.</Text>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {echanges.map((e) => (
            <View key={e.id} style={styles.ligne}>
              {/* Date de l'échange */}
              <Text style={styles.date}>
                {new Date(e.creeLe).toLocaleDateString("fr-FR")}
              </Text>
              {/* Question en gras */}
              <Text style={styles.question}>{e.question}</Text>
              {/* Réponse de l'agent */}
              <Text style={styles.reponse}>{e.reponse}</Text>
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  conteneur: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  entete: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  titre: {
    fontSize: 22,
    fontWeight: "800",
    color: BLEU,
  },
  vide: {
    textAlign: "center",
    color: GRIS,
    marginTop: 40,
    fontSize: 15,
  },
  // Une ligne = un échange (trait gris fin en dessous)
  ligne: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  date: {
    fontSize: 12,
    color: "#7A7A7A",
    marginBottom: 4,
  },
  question: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  reponse: {
    fontSize: 15,
    color: GRIS,
    marginTop: 4,
  },
});
