// app/auth/login.tsx
// Écran de connexion avec validation du formulaire + Firebase Auth

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

// CORRIGÉ : on remonte de 2 dossiers (auth -> app -> racine), puis src/lib/firebase
import { auth } from "../../src/lib/firebase";

export default function LoginScreen() {
  const router = useRouter();

  // Ce que l'utilisateur tape
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false); // true = mot de passe visible

  // Messages d'erreur (vides = pas d'erreur)
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [loginError, setLoginError] = useState(""); // erreur renvoyée par Firebase

  // true pendant que Firebase vérifie les identifiants
  const [loading, setLoading] = useState(false);

  // Transforme les codes d'erreur Firebase en messages en français
  const getFirebaseErrorMessage = (code: string) => {
    switch (code) {
      case "auth/invalid-credential":
      case "auth/user-not-found":
      case "auth/wrong-password":
        return "Email ou mot de passe incorrect.";
      case "auth/invalid-email":
        return "L'adresse email n'est pas valide.";
      case "auth/too-many-requests":
        return "Trop de tentatives. Réessaie dans quelques minutes.";
      case "auth/network-request-failed":
        return "Problème de connexion internet.";
      default:
        return "Une erreur est survenue. Réessaie.";
    }
  };

  // Flèche retour
  const handleBack = () => {
    // S'il existe une page précédente, on y retourne.
    // Sinon (écran ouvert directement), on va à la racine de l'app.
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/");
    }
  };

  // Clic sur "Vérification"
  const handleVerification = async () => {
    setLoginError(""); // on efface l'ancienne erreur Firebase
    let isValid = true; // reste true si tout est correct

    // 1) Vérification de la forme de l'email (texte@texte.texte)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (email.trim() === "") {
      setEmailError("Veuillez saisir votre adresse email.");
      isValid = false;
    } else if (!emailRegex.test(email.trim())) {
      setEmailError("L'adresse email n'est pas valide.");
      isValid = false;
    } else {
      setEmailError("");
    }

    // 2) Vérification de la forme du mot de passe
    if (password === "") {
      setPasswordError("Veuillez saisir votre mot de passe.");
      isValid = false;
    } else if (password.length < 6) {
      setPasswordError("Le mot de passe doit contenir au moins 6 caractères.");
      isValid = false;
    } else {
      setPasswordError("");
    }

    // Si la forme est mauvaise, on s'arrête ici (pas d'appel à Firebase)
    if (!isValid) return;

    // 3) Vérification réelle avec Firebase
    try {
      setLoading(true);
      await signInWithEmailAndPassword(auth, email.trim(), password);

      // Connexion réussie : on va vers la page d'accueil.
      // "replace" empêche de revenir à la page de connexion avec le bouton retour.
      router.replace("/(tabs)/Acceuil");
    } catch (error: any) {
      console.log("Erreur Firebase :", error.code); // pour voir le code exact
      setLoginError(getFirebaseErrorMessage(error.code));
    } finally {
      setLoading(false); // on réactive le bouton dans tous les cas
    }
  };

  return (
    <View style={styles.container}>
      {/* Image du haut */}
      <Image
        source={require("../../assets/images/Image_page_de_connection.jpeg")}
        style={styles.image}
        resizeMode="cover"
      />

      {/* Bouton retour : flèche en haut à gauche, par-dessus l'image */}
      <TouchableOpacity style={styles.backButton} onPress={handleBack}>
        <Ionicons name="arrow-back" size={24} color="#1E3A8A" />
      </TouchableOpacity>

      {/* Carte blanche avec le formulaire */}
      <View style={styles.card}>
        <Text style={styles.title}>Se connecter</Text>

        {/* Champ Adresse email */}
        <Text style={styles.label}>Adresse email</Text>
        <TextInput
          style={[styles.input, emailError !== "" && styles.inputError]}
          placeholder="exemple@mail.com"
          placeholderTextColor="#9CA3AF"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        {/* Message d'erreur affiché seulement s'il y en a un */}
        {emailError !== "" && (
          <Text style={styles.errorText}>{emailError}</Text>
        )}

        {/* Champ Mot de passe */}
        <Text style={styles.label}>Mot de passe</Text>
        <View
          style={[
            styles.passwordContainer,
            passwordError !== "" && styles.inputError,
          ]}
        >
          <TextInput
            style={styles.passwordInput}
            placeholder="Mot de passe"
            placeholderTextColor="#9CA3AF"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            style={styles.eyeIcon}
          >
            <Ionicons
              name={showPassword ? "eye-off" : "eye"}
              size={20}
              color="#6B7280"
            />
          </TouchableOpacity>
        </View>
        {passwordError !== "" && (
          <Text style={styles.errorText}>{passwordError}</Text>
        )}

        {/* Erreur renvoyée par Firebase (mauvais mot de passe, etc.) */}
        {loginError !== "" && (
          <Text style={styles.loginErrorText}>{loginError}</Text>
        )}

        {/* Lien mot de passe oublié */}
        <TouchableOpacity onPress={() => router.push("/Mot_de_passe_oublie")}>
          <Text style={styles.forgotPassword}>Mot de passe oublié ?</Text>
        </TouchableOpacity>

        {/* Bouton Vérification (désactivé pendant le chargement) */}
        <TouchableOpacity
          style={[styles.buttonPrimary, loading && styles.buttonDisabled]}
          onPress={handleVerification}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonPrimaryText}>Vérification</Text>
          )}
        </TouchableOpacity>

        {/* Lien vers l'inscription */}
        <TouchableOpacity onPress={() => router.push("/Creer un compte2")}>
          <Text style={styles.signupText}>
            Pas encore de compte ?{" "}
            <Text style={styles.signupTextBold}>Créer un compte</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  image: {
    width: "100%",
    height: "65%",
    marginTop: 0,
  },
  // Bouton rond blanc en haut à gauche (position absolue = ne déplace rien)
  backButton: {
    position: "absolute",
    top: 50,
    left: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10, // reste au-dessus de l'image et de la carte
  },
  card: {
    flex: 1,
    marginTop: -250,
    backgroundColor: "#fff",
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1E3A8A",
    textAlign: "center",
    marginBottom: 24,
  },
  label: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 4,
  },
  input: {
    fontSize: 14,
    color: "#111827",
    borderBottomWidth: 1,
    borderBottomColor: "#D1D5DB",
    paddingVertical: 8,
    marginBottom: 20,
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#D1D5DB",
    marginBottom: 20,
  },
  passwordInput: {
    flex: 1,
    fontSize: 14,
    color: "#111827",
    paddingVertical: 8,
  },
  eyeIcon: {
    padding: 4,
  },
  // Soulignement rouge quand il y a une erreur
  inputError: {
    borderBottomColor: "#DC2626",
  },
  // Texte d'erreur rouge sous le champ
  errorText: {
    color: "#DC2626",
    fontSize: 12,
    marginTop: -14,
    marginBottom: 14,
  },
  // Erreur Firebase, affichée au-dessus du lien "Mot de passe oublié"
  loginErrorText: {
    color: "#DC2626",
    fontSize: 13,
    textAlign: "center",
    marginTop: 4,
  },
  forgotPassword: {
    color: "#2563EB",
    fontWeight: "bold",
    textAlign: "right",
    marginTop: 24,
    fontSize: 14,
  },
  buttonPrimary: {
    backgroundColor: "#2563EB",
    width: "100%",
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: "center",
    marginTop: 20,
  },
  // Bouton un peu transparent pendant le chargement
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonPrimaryText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  signupText: {
    marginTop: 24,
    textAlign: "center",
    color: "#2563EB",
    fontSize: 14,
  },
  signupTextBold: {
    fontSize: 14,
    fontWeight: "bold",
  },
});
