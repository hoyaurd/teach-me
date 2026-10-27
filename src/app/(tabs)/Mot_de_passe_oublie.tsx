import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { sendPasswordResetEmail } from "firebase/auth";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { auth } from "../../lib/firebase";

export default function ForgotPasswordScreen() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [envoye, setEnvoye] = useState(false); // true après l'envoi réussi du lien
  const [loading, setLoading] = useState(false); // true pendant l'envoi

  // Transforme les codes d'erreur Firebase en messages en français
  function messageErreur(code: string) {
    switch (code) {
      case "auth/invalid-email":
        return "L'adresse email n'est pas valide.";
      case "auth/too-many-requests":
        return "Trop de tentatives. Réessaie dans quelques minutes.";
      case "auth/network-request-failed":
        return "Problème de connexion internet.";
      default:
        return "Une erreur est survenue. Réessaie.";
    }
  }

  async function envoyerLien() {
    if (!email.trim()) {
      Alert.alert("Champ manquant", "Merci de saisir ton adresse email.");
      return;
    }

    // Vérification très simple du format email.
    const emailValide = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
    if (!emailValide) {
      Alert.alert(
        "Email invalide",
        "Merci de saisir une adresse email valide.",
      );
      return;
    }

    // Envoi réel du mail de réinitialisation par Firebase
    try {
      setLoading(true);
      await sendPasswordResetEmail(auth, email.trim());
      setEnvoye(true); // on affiche l'écran de confirmation
    } catch (error: any) {
      console.log("Erreur Firebase :", error.code); // pour voir le code exact
      Alert.alert("Erreur", messageErreur(error.code));
    } finally {
      setLoading(false); // on réactive le bouton dans tous les cas
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* ---------- Flèche retour ---------- */}
      <TouchableOpacity
        style={styles.boutonRetour}
        hitSlop={10}
        onPress={() => router.back()}
      >
        <Ionicons name="arrow-back" size={26} color="#1F2937" />
      </TouchableOpacity>

      <View style={styles.contenu}>
        {/* Icône illustrant la réinitialisation */}
        <View style={styles.iconeConteneur}>
          <Ionicons name="lock-closed-outline" size={40} color="#2563EB" />
        </View>

        <Text style={styles.title}>Mot de passe oublié</Text>

        {!envoye ? (
          <>
            <Text style={styles.sousTitre}>
              Entre l'adresse email associée à ton compte. Nous t'enverrons un
              lien pour réinitialiser ton mot de passe.
            </Text>

            <Text style={styles.label}>Adresse email</Text>
            <TextInput
              style={styles.input}
              placeholder="exemple@mail.com"
              placeholderTextColor="#9CA3AF"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            {/* Bouton désactivé pendant l'envoi */}
            <TouchableOpacity
              style={[styles.buttonPrimary, loading && styles.buttonDisabled]}
              onPress={envoyerLien}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonPrimaryText}>Envoyer le lien</Text>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <>
            {/* État de confirmation après envoi du lien */}
            <View style={styles.iconeSucces}>
              <Ionicons name="checkmark-circle" size={56} color="#22C55E" />
            </View>
            <Text style={styles.sousTitre}>
              Un lien de réinitialisation a été envoyé à{" "}
              <Text style={styles.emailGras}>{email}</Text>. Vérifie ta boîte
              mail (et tes spams).
            </Text>

            <TouchableOpacity
              style={styles.buttonPrimary}
              onPress={() => router.back()}
            >
              <Text style={styles.buttonPrimaryText}>
                Retour à la connexion
              </Text>
            </TouchableOpacity>
          </>
        )}

        {/* Lien pour renvoyer, visible seulement après le premier envoi */}
        {envoye && (
          <TouchableOpacity onPress={envoyerLien} disabled={loading}>
            <Text style={styles.renvoyerTexte}>
              {loading ? "Envoi en cours..." : "Je n'ai rien reçu, renvoyer"}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  boutonRetour: {
    marginTop: 10,
    marginLeft: 20,
  },
  contenu: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 30,
    alignItems: "center",
    marginTop: 30, // pour éviter que le bouton "Retour à la connexion" soit trop collé au bas de l'écran
  },
  iconeConteneur: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  iconeSucces: {
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1E3A8A",
    textAlign: "center",
    marginBottom: 12,
  },
  sousTitre: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 28,
  },
  emailGras: {
    fontWeight: "bold",
    color: "#1F2937",
  },
  label: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 4,
    alignSelf: "flex-start",
  },
  input: {
    width: "100%",
    fontSize: 14,
    color: "#111827",
    borderBottomWidth: 1,
    borderBottomColor: "#D1D5DB",
    paddingVertical: 8,
    marginBottom: 28,
  },
  buttonPrimary: {
    backgroundColor: "#2563EB",
    width: "100%",
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: "center",
  },
  // Bouton un peu transparent pendant l'envoi
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonPrimaryText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  renvoyerTexte: {
    marginTop: 20,
    color: "#2563EB",
    fontWeight: "bold",
    fontSize: 14,
  },
});
