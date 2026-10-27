import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Couleur principale de l'app (bleu Teach-Me).
const BLEU = "#2E3FCB";
const GRIS = "#6E6E6E";
const ROUGE = "#E63946"; // utilisé uniquement pour "Se déconnecter"

// Routes vers les écrans liés à chaque option. Adapte-les si tes fichiers
// portent un nom différent dans ton dossier app/.
const ROUTES = {
  monCompte: "/Profil",
  historiqueIA: "/Historique_IA",
  apropos: "/A_propos",
};

export default function EcranParametres() {
  const router = useRouter();

  function ouvrirMonCompte() {
    router.push(ROUTES.monCompte);
  }

  function ouvrirHistoriqueIA() {
    router.push(ROUTES.historiqueIA);
  }

  function ouvrirApropos() {
    router.push(ROUTES.apropos);
  }

  // Demande confirmation avant de déconnecter l'utilisateur.
  function seDeconnecter() {
    Alert.alert("Se déconnecter", "Es-tu sûr de vouloir te déconnecter ?", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Se déconnecter",
        style: "destructive",
        onPress: () => {
          // TODO: remplacer par ta vraie logique de déconnexion
          // (ex: suppression du token, appel à ton contexte d'auth...)
          router.replace("/");
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.conteneur}>
      {/* ---------- En-tête ---------- */}
      <View style={styles.entete}>
        <TouchableOpacity hitSlop={10} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={30} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.titre}>Paramètres</Text>
        {/* Espace vide pour garder le titre centré (même largeur que la flèche) */}
        <View style={styles.espaceVide} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* ---------- Groupe unique : toutes les options collées ---------- */}
        <View style={styles.groupe}>
          <TouchableOpacity
            style={styles.ligneOption}
            activeOpacity={0.7}
            onPress={ouvrirMonCompte}
          >
            <View style={styles.iconeConteneur}>
              <Ionicons name="person-outline" size={26} color={BLEU} />
            </View>
            <Text style={styles.libelleOption}>Mon compte</Text>
            <Ionicons name="chevron-forward" size={24} color={GRIS} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.ligneOption}
            activeOpacity={0.7}
            onPress={ouvrirHistoriqueIA}
          >
            <View style={styles.iconeConteneur}>
              <Ionicons name="time-outline" size={26} color={BLEU} />
            </View>
            <Text style={styles.libelleOption}>Historique IA</Text>
            <Ionicons name="chevron-forward" size={24} color={GRIS} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.ligneOption}
            activeOpacity={0.7}
            onPress={ouvrirApropos}
          >
            <View style={styles.iconeConteneur}>
              <Ionicons
                name="information-circle-outline"
                size={26}
                color={BLEU}
              />
            </View>
            <Text style={styles.libelleOption}>À propos</Text>
            <Ionicons name="chevron-forward" size={24} color={GRIS} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.ligneOption, styles.derniereLigne]}
            activeOpacity={0.7}
            onPress={seDeconnecter}
          >
            <View style={[styles.iconeConteneur, styles.iconeConteneurRouge]}>
              <Ionicons name="log-out-outline" size={26} color={ROUGE} />
            </View>
            <Text style={[styles.libelleOption, styles.libelleDeconnexion]}>
              Se déconnecter
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  conteneur: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  // --- En-tête ---
  entete: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginTop: 24,
    marginBottom: 28,
  },
  titre: {
    fontSize: 24,
    fontWeight: "800",
    color: "#1A1A1A",
  },
  espaceVide: {
    width: 30, // même largeur que l'icône flèche retour, pour centrer le titre
  },

  // --- Groupe unique contenant les 4 options ---
  groupe: {
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 18,
    backgroundColor: "#EEF1FD",
    overflow: "hidden",
  },
  ligneOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
    paddingHorizontal: 20,
    paddingVertical: 22,
    borderBottomWidth: 1,
    borderBottomColor: "#DCE1F8",
  },
  derniereLigne: {
    borderBottomWidth: 0, // pas de bordure après la dernière option
  },
  iconeConteneur: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#DDE2FB",
    alignItems: "center",
    justifyContent: "center",
  },
  iconeConteneurRouge: {
    backgroundColor: "#FBD6D8",
  },
  libelleOption: {
    flex: 1,
    fontSize: 18,
    fontWeight: "600",
    color: "#1A1A1A",
  },
  libelleDeconnexion: {
    color: ROUGE,
  },
});
