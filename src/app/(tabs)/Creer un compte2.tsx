import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
// NOUVEAU : deleteUser pour annuler le compte si le numéro est déjà pris
import { createUserWithEmailAndPassword } from "firebase/auth";
import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { auth } from "../../lib/firebase"; // adapte le chemin si besoin
// NOUVEAU : telephoneExiste pour vérifier le numéro
import {
  creerProfil,
  telephoneExiste,
  TypeProfil,
} from "../../lib/utilisateurs";

// Les choix affichés pour le type de profil
// "valeur" est ce qui est enregistré dans la base, "label" est ce que l'utilisateur voit
const PROFILS: { valeur: TypeProfil; label: string }[] = [
  { valeur: "eleve", label: "Élève" },
  { valeur: "etudiant", label: "Étudiant" },
  { valeur: "parent", label: "Parent" },
  { valeur: "accompagnateur", label: "Accompagnateur" },
];

// Taille maximale de la photo (en caractères base64) pour rester sous la limite de Firestore
const TAILLE_MAX_PHOTO = 700000;

export default function CreerCompteScreen() {
  const router = useRouter();

  // Ce que l'utilisateur tape
  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [email, setEmail] = useState("");
  const [telephone, setTelephone] = useState("");
  const [lieu, setLieu] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [typeProfil, setTypeProfil] = useState<TypeProfil | "">(""); // "" = aucun choix
  const [showPassword, setShowPassword] = useState(false); // true = mot de passe visible

  // Photo choisie, sous forme de texte prêt à être affiché et enregistré
  // ("" = pas de photo)
  const [photo, setPhoto] = useState("");

  // Message d'erreur affiché en rouge (vide = pas d'erreur)
  const [erreur, setErreur] = useState("");

  // true pendant la création du compte
  const [loading, setLoading] = useState(false);

  // Transforme les codes d'erreur Firebase en messages en français
  function messageErreur(code: string) {
    switch (code) {
      case "auth/email-already-in-use":
        return "Cette adresse email est déjà utilisée.";
      case "auth/invalid-email":
        return "L'adresse email n'est pas valide.";
      case "auth/weak-password":
        return "Le mot de passe est trop faible (6 caractères minimum).";
      case "auth/network-request-failed":
        return "Problème de connexion internet.";
      default:
        return "Une erreur est survenue. Réessaie.";
    }
  }

  // Ouvre la galerie pour choisir une photo de profil
  async function choisirPhoto() {
    setErreur("");

    const resultat = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"], // seulement les images
      allowsEditing: true, // permet de recadrer
      aspect: [1, 1], // recadrage carré (affiché en rond)
      quality: 0.2, // compression forte pour une photo légère
      base64: true, // on récupère la photo sous forme de texte
    });

    // Si l'utilisateur annule, on ne fait rien
    if (resultat.canceled) return;

    const image = resultat.assets[0];

    // Photo trop lourde : on demande d'en choisir une autre
    if (!image.base64 || image.base64.length > TAILLE_MAX_PHOTO) {
      setErreur("Cette photo est trop lourde. Choisis-en une autre.");
      return;
    }

    // On garde la photo sous la forme "data:image/jpeg;base64,...."
    setPhoto("data:image/jpeg;base64," + image.base64);
  }

  // Fonction appelée quand on clique sur "Créer mon compte"
  async function creerCompte() {
    setErreur("");

    // 1) Vérification des champs
    if (!nom.trim() || !prenom.trim()) {
      setErreur("Merci de saisir ton nom et ton prénom.");
      return;
    }

    const emailValide = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
    if (!emailValide) {
      setErreur("Merci de saisir une adresse email valide.");
      return;
    }

    // On enlève les espaces du numéro, puis on vérifie : chiffres seulement,
    // avec un + facultatif au début (ex : 0575665909 ou +2250575665909)
    const telephoneNettoye = telephone.replace(/\s/g, "");
    if (!/^\+?\d{8,15}$/.test(telephoneNettoye)) {
      setErreur("Merci de saisir un numéro de téléphone valide.");
      return;
    }

    if (!lieu.trim()) {
      setErreur("Merci de saisir ton lieu (ville ou quartier).");
      return;
    }

    if (password.length < 6) {
      setErreur("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }

    if (password !== confirmation) {
      setErreur("Les deux mots de passe ne sont pas identiques.");
      return;
    }

    if (typeProfil === "") {
      setErreur("Merci de choisir ton type de profil.");
      return;
    }

    // 2) Création du compte, puis enregistrement du profil dans la base
    try {
      setLoading(true);

      // Crée le compte de connexion (email + mot de passe)
      // Si l'email existe déjà, Firebase renvoie "auth/email-already-in-use"
      // et on tombe dans le catch plus bas.
      const compte = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password,
      );

      // NOUVEAU : vérification du numéro de téléphone.
      // On le fait maintenant car l'utilisateur est connecté,
      // donc Firestore autorise la lecture.
      let numeroPris = false;
      try {
        numeroPris = await telephoneExiste(telephoneNettoye);
      } catch (e: any) {
        // La vérification a échoué (règles Firestore, réseau...) :
        // on annule le compte pour ne pas laisser un compte sans profil.
        console.log("Erreur vérification numéro :", e.code, e.message);
        await deleteUser(compte.user);
        setErreur("Impossible de vérifier le numéro. Réessaie.");
        return;
      }

      // NOUVEAU : numéro déjà utilisé : on annule le compte qu'on vient de créer
      if (numeroPris) {
        await deleteUser(compte.user);
        setErreur("Ce numéro est déjà utilisé.");
        return;
      }

      // Enregistre le profil dans Firestore, avec le même uid que le compte
      await creerProfil({
        uid: compte.user.uid,
        nom: nom.trim(),
        prenom: prenom.trim(),
        email: email.trim(),
        telephone: telephoneNettoye, // sans espaces
        lieu: lieu.trim(),
        typeProfil: typeProfil,
        photoUrl: photo, // "" si l'utilisateur n'a pas choisi de photo
      });

      // Compte créé : on va vers la page d'accueil
      router.replace("/(tabs)/Acceuil"); // change ici si ta page s'appelle autrement
    } catch (error: any) {
      console.log("Erreur Firebase :", error.code, error.message); // pour voir l'erreur exacte
      setErreur(messageErreur(error.code));
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

      {/* ScrollView : permet de faire défiler la page quand le clavier est ouvert */}
      <ScrollView
        contentContainerStyle={styles.contenu}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Créer un compte</Text>

        {/* Photo de profil : un clic ouvre la galerie */}
        <TouchableOpacity style={styles.photoConteneur} onPress={choisirPhoto}>
          {photo !== "" ? (
            // Photo choisie : on l'affiche
            <Image source={{ uri: photo }} style={styles.photo} />
          ) : (
            // Pas encore de photo : icône par défaut
            <View style={styles.photoVide}>
              <Ionicons name="person" size={44} color="#9CA3AF" />
            </View>
          )}
          {/* Petite icône d'appareil photo en bas à droite */}
          <View style={styles.photoBadge}>
            <Ionicons name="camera" size={16} color="#fff" />
          </View>
        </TouchableOpacity>
        <Text style={styles.photoTexte}>
          {photo !== "" ? "Changer la photo" : "Ajouter une photo (facultatif)"}
        </Text>

        {/* Nom */}
        <Text style={styles.label}>Nom</Text>
        <TextInput
          style={styles.input}
          placeholder="Ton nom"
          placeholderTextColor="#9CA3AF"
          value={nom}
          onChangeText={setNom}
        />

        {/* Prénom */}
        <Text style={styles.label}>Prénom</Text>
        <TextInput
          style={styles.input}
          placeholder="Ton prénom"
          placeholderTextColor="#9CA3AF"
          value={prenom}
          onChangeText={setPrenom}
        />

        {/* Email */}
        <Text style={styles.label}>Adresse email (⚠️pas modifiable)</Text>
        <TextInput
          style={styles.input}
          placeholder="exemple@mail.com"
          placeholderTextColor="#9CA3AF"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        {/* Numéro de téléphone */}
        <Text style={styles.label}>Numéro de téléphone</Text>
        <TextInput
          style={styles.input}
          placeholder="0701020304"
          placeholderTextColor="#9CA3AF"
          value={telephone}
          onChangeText={setTelephone}
          keyboardType="phone-pad" // clavier numérique
        />

        {/* Lieu */}
        <Text style={styles.label}>Lieu d'habitation</Text>
        <TextInput
          style={[styles.input, lieu === "" && styles.lieuPlaceholder]}
          placeholder="Ville ou quartier (ex : Cocody, Abidjan)"
          placeholderTextColor="#9CA3AF"
          value={lieu}
          onChangeText={setLieu}
        />

        {/* Mot de passe */}
        <Text style={styles.label}>Mot de passe</Text>
        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Au moins 6 caractères"
            placeholderTextColor="#9CA3AF"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
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

        {/* Confirmation du mot de passe */}
        <Text style={styles.label}>Confirmer le mot de passe</Text>
        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Retape ton mot de passe"
            placeholderTextColor="#9CA3AF"
            value={confirmation}
            onChangeText={setConfirmation}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
          />
        </View>

        {/* Type de profil : 4 boutons, un seul peut être choisi */}
        <Text style={styles.label}>Je suis</Text>
        <View style={styles.profilsConteneur}>
          {PROFILS.map((profil) => {
            const selectionne = typeProfil === profil.valeur;
            return (
              <TouchableOpacity
                key={profil.valeur}
                style={[
                  styles.profilBouton,
                  selectionne && styles.profilBoutonActif,
                ]}
                onPress={() => setTypeProfil(profil.valeur)}
              >
                <Text
                  style={[
                    styles.profilTexte,
                    selectionne && styles.profilTexteActif,
                  ]}
                >
                  {profil.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Message d'erreur (email déjà utilisé, numéro déjà utilisé, etc.) */}
        {erreur !== "" && <Text style={styles.erreurTexte}>{erreur}</Text>}

        {/* Bouton Créer mon compte (désactivé pendant le chargement) */}
        <TouchableOpacity
          style={[styles.buttonPrimary, loading && styles.buttonDisabled]}
          onPress={creerCompte}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonPrimaryText}>Créer mon compte</Text>
          )}
        </TouchableOpacity>

        {/* Lien vers la connexion */}
        <TouchableOpacity onPress={() => router.replace("/Connection")}>
          <Text style={styles.connexionTexte}>
            Déjà un compte ?{" "}
            <Text style={styles.connexionTexteGras}>Se connecter</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
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
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1E3A8A",
    textAlign: "center",
    marginBottom: 20,
  },
  // ----- Photo de profil -----
  photoConteneur: {
    alignSelf: "center",
    width: 100,
    height: 100,
  },
  photo: {
    width: 100,
    height: 100,
    borderRadius: 50, // rond
  },
  photoVide: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
  },
  photoBadge: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  photoTexte: {
    textAlign: "center",
    color: "#2563EB",
    fontSize: 13,
    fontWeight: "bold",
    marginTop: 8,
    marginBottom: 24,
  },
  label: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 4,
  },
  input: {
    fontSize: 16,
    color: "#111827",
    borderBottomWidth: 1,
    borderBottomColor: "#D1D5DB",
    paddingVertical: 8,
    marginBottom: 20,
  },
  // Taille du placeholder du champ Lieu (seulement quand il est vide)
  lieuPlaceholder: {
    fontSize: 13, // change ce chiffre : plus petit = texte plus petit
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
  // Zone des boutons de choix du profil
  profilsConteneur: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 6,
    marginBottom: 20,
  },
  profilBouton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#fff",
  },
  // Bouton sélectionné : fond bleu
  profilBoutonActif: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
  profilTexte: {
    fontSize: 14,
    color: "#1F2937",
  },
  profilTexteActif: {
    color: "#fff",
    fontWeight: "bold",
  },
  erreurTexte: {
    color: "#DC2626",
    fontSize: 13,
    textAlign: "center",
    marginBottom: 12,
  },
  buttonPrimary: {
    backgroundColor: "#2563EB",
    width: "100%",
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: "center",
    marginTop: 8,
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
  connexionTexte: {
    marginTop: 24,
    textAlign: "center",
    color: "#2563EB",
    fontSize: 14,
  },
  connexionTexteGras: {
    fontWeight: "bold",
  },
});
