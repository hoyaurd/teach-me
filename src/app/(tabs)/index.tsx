// Page de bienvenue.
// - Téléphone : l'image en haut, la carte blanche en bas (comme avant).
// - Site web grand écran : l'image à gauche, la carte à droite (2 colonnes).

import { useRouter } from "expo-router";
import {
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";

export default function WelcomeScreen() {
  // useRouter permet de naviguer vers une autre page quand on clique sur un bouton
  const router = useRouter();

  // Grand écran : seulement sur le web, quand la fenêtre est assez large
  const { width } = useWindowDimensions();
  const grand = Platform.OS === "web" && width >= 900;

  return (
    <View style={[styles.container, grand && styles.containerGrand]}>
      {/* Image : le professeur avec l'élève */}
      <Image
        source={require("../../../assets/images/Image_Page_acceuil.jpeg")}
        style={[styles.image, grand && styles.imageGrand]}
        resizeMode="cover"
      />

      {/* Carte blanche qui contient le texte et les boutons */}
      <View style={[styles.card, grand && styles.cardGrand]}>
        <View style={grand ? styles.contenuGrand : styles.contenu}>
          <Text style={[styles.title, grand && styles.titleGrand]}>
            Bienvenue
          </Text>
          <Text style={styles.subtitle}>
            Trouvez l'accompagnateur pédagogique qu'il vous faut
          </Text>

          {/* Bouton bleu plein "Se connecter" */}
          <TouchableOpacity
            style={styles.buttonPrimary}
            onPress={() => router.push("/Connection")}
          >
            <Text style={styles.buttonPrimaryText}>Se connecter</Text>
          </TouchableOpacity>

          {/* Bouton bleu contour "Créer un compte" */}
          <TouchableOpacity
            style={styles.buttonOutline}
            onPress={() => router.push("/(tabs)/Creer un compte2")}
          >
            <Text style={styles.buttonOutlineText}>Créer un compte</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, // prend tout l'écran
    backgroundColor: "#fff",
  },
  image: {
    width: "100%",
    height: "65%", // l'image garde sa taille d'origine
  },
  card: {
    flex: 1,
    marginTop: -35,
    backgroundColor: "#f1f1f1ff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 18,
    paddingTop: 20,
    alignItems: "center",
  },
  // Contenu de la carte (téléphone) : prend toute la largeur
  contenu: {
    width: "100%",
    alignItems: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1E3A8A", // bleu foncé
    marginBottom: 8,
    marginTop: 10,
  },
  subtitle: {
    fontSize: 16,
    color: "#6B7280", // gris
    textAlign: "center",
    marginBottom: -4,
  },
  buttonPrimary: {
    backgroundColor: "#2563EB", // bleu plein
    width: "100%",
    paddingVertical: 14,
    borderRadius: 24,
    alignItems: "center",
    marginBottom: 12,
    marginTop: 24,
  },
  buttonPrimaryText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  buttonOutline: {
    borderWidth: 2,
    borderColor: "#2563EB",
    width: "100%",
    paddingVertical: 14,
    borderRadius: 24,
    alignItems: "center",
  },
  buttonOutlineText: {
    color: "#2563EB",
    fontSize: 18,
    fontWeight: "bold",
  },

  // ---------- Grand écran (site web) ----------
  containerGrand: {
    flexDirection: "row", // image à gauche, carte à droite
  },
  imageGrand: {
    width: "50%",
    height: "100%",
  },
  cardGrand: {
    marginTop: 0,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    backgroundColor: "#FFFFFF",
    justifyContent: "center", // contenu centré verticalement
    paddingHorizontal: 40,
    paddingTop: 0,
  },
  // Contenu limité à 420 px, centré dans la moitié droite
  contenuGrand: {
    width: "100%",
    maxWidth: 420,
    alignItems: "center",
  },
  titleGrand: {
    fontSize: 32,
    marginBottom: 12,
  },
});
