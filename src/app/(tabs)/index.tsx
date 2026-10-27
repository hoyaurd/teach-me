import { useRouter } from "expo-router";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function WelcomeScreen() {
  // useRouter permet de naviguer vers une autre page quand on clique sur un bouton
  const router = useRouter();

  return (
    <View style={styles.container}>
      {/* Image du haut : le professeur avec l'élève */}
      <Image
        source={require("../../../assets/images/Image_Page_acceuil.jpeg")}
        style={styles.image}
        resizeMode="cover"
      />

      {/* Carte blanche arrondie qui contient le texte et les boutons */}
      <View style={styles.card}>
        <Text style={styles.title}>Bienvenue</Text>
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
});
