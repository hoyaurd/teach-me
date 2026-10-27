import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  Linking,
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

// Informations de l'application. Adapte-les à ton projet.
const VERSION = "1.0.0";
const EMAIL_CONTACT = "Teach-Me@gmail.com";

// Ce que l'on peut faire dans l'app (une ligne par fonctionnalité).
const FONCTIONNALITES = [
  {
    icone: "search-outline",
    texte: "Rechercher un accompagnateur par matière, niveau et lieu",
  },
  {
    icone: "add-circle-outline",
    texte: "Publier une demande d'accompagnement",
  },
  {
    icone: "chatbubble-ellipses-outline",
    texte: "Échanger directement par messages",
  },
  {
    icone: "sparkles-outline",
    texte: "Poser tes questions à l'assistant IA",
  },
];

export default function EcranAPropos() {
  const router = useRouter();

  // Ouvre l'application mail avec l'adresse de contact.
  function ecrireEmail() {
    Linking.openURL(`mailto:${EMAIL_CONTACT}`);
  }

  return (
    <SafeAreaView style={styles.conteneur}>
      {/* ---------- En-tête : retour + titre ---------- */}
      <View style={styles.entete}>
        <TouchableOpacity hitSlop={10} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={30} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.titre}>À propos</Text>
        {/* Espace vide pour garder le titre centré (même largeur que la flèche) */}
        <View style={styles.espaceVide} />
      </View>

      <ScrollView
        contentContainerStyle={styles.contenu}
        showsVerticalScrollIndicator={false}
      >
        {/* ---------- Logo + version ---------- */}
        <View style={styles.blocLogo}>
          <Text style={styles.logo}>Teach-Me</Text>
          <Text style={styles.version}>Version {VERSION}</Text>
        </View>

        {/* ---------- Présentation ---------- */}
        <Text style={styles.titreSection}>Notre mission</Text>
        <View style={styles.groupe}>
          <Text style={styles.description}>
            Teach-Me met en relation les élèves, les étudiants et les parents
            avec des accompagnateurs pédagogiques. Notre objectif : rendre le
            soutien scolaire simple, accessible et proche de chez vous.
          </Text>
        </View>

        {/* ---------- Fonctionnalités ---------- */}
        <Text style={styles.titreSection}>Ce que vous pouvez faire</Text>
        <View style={styles.groupe}>
          {FONCTIONNALITES.map((item, index) => (
            <View
              key={item.icone}
              style={[
                styles.ligneFonction,
                index === FONCTIONNALITES.length - 1 && styles.derniereLigne,
              ]}
            >
              <View style={styles.iconeConteneur}>
                <Ionicons name={item.icone} size={22} color={BLEU} />
              </View>
              <Text style={styles.texteFonction}>{item.texte}</Text>
            </View>
          ))}
        </View>

        {/* ---------- Contact ---------- */}
        <Text style={styles.titreSection}>Nous contacter</Text>
        <View style={styles.groupe}>
          <TouchableOpacity
            style={[styles.ligneFonction, styles.derniereLigne]}
            activeOpacity={0.7}
            onPress={ecrireEmail}
          >
            <View style={styles.iconeConteneur}>
              <Ionicons name="mail-outline" size={22} color={BLEU} />
            </View>
            <Text style={styles.texteFonction}>{EMAIL_CONTACT}</Text>
            <Ionicons name="chevron-forward" size={22} color={GRIS} />
          </TouchableOpacity>
        </View>

        {/* ---------- Pied de page ---------- */}
        <Text style={styles.copyright}>
          © 2026 Teach-Me. Tous droits réservés.
        </Text>
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
    marginBottom: 10,
  },
  titre: {
    fontSize: 24,
    fontWeight: "800",
    color: "#1A1A1A",
  },
  espaceVide: {
    width: 30, // même largeur que l'icône flèche retour
  },

  contenu: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  // --- Logo ---
  blocLogo: {
    alignItems: "center",
    marginTop: 20,
    marginBottom: 10,
  },
  logo: {
    fontSize: 38,
    fontWeight: "800",
    color: BLEU,
  },
  version: {
    fontSize: 14,
    color: GRIS,
    marginTop: 4,
  },

  // --- Sections ---
  titreSection: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1A1A1A",
    marginTop: 24,
    marginBottom: 12,
  },
  groupe: {
    borderRadius: 18,
    backgroundColor: "#EEF1FD",
    overflow: "hidden",
  },
  description: {
    fontSize: 15,
    lineHeight: 24,
    color: "#3A3A3A",
    padding: 18,
  },

  // --- Lignes (fonctionnalités et contact) ---
  ligneFonction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#DCE1F8",
  },
  derniereLigne: {
    borderBottomWidth: 0, // pas de trait après la dernière ligne
  },
  iconeConteneur: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#DDE2FB",
    alignItems: "center",
    justifyContent: "center",
  },
  texteFonction: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: "#1A1A1A",
  },

  // --- Pied de page ---
  copyright: {
    textAlign: "center",
    fontSize: 12,
    color: GRIS,
    marginTop: 30,
  },
});
