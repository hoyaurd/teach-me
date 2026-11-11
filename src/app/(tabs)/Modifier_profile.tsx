import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { auth } from "../../lib/firebase";
import {
  lireProfil,
  modifierProfil,
  telephoneExiste,
  TypeProfil,
  Utilisateur,
} from "../../lib/utilisateurs";
import { alerte } from "../../lib/alerte";

// Couleur principale de l'app (bleu Teach-Me).
const BLEU = "#2E3FCB";
const GRIS = "#6E6E6E";

// Types de profils proposés dans la liste déroulante.
// "valeur" = ce qui est enregistré dans Firestore, "label" = ce que l'utilisateur voit.
const PROFILS: { valeur: TypeProfil; label: string }[] = [
  { valeur: "eleve", label: "Élève" },
  { valeur: "etudiant", label: "Étudiant" },
  { valeur: "parent", label: "Parent" },
  { valeur: "accompagnateur", label: "Accompagnateur" },
];

// Taille maximale de la photo (en caractères base64), pour rester sous la limite de Firestore
const TAILLE_MAX_PHOTO = 700000;

export default function EcranModifierProfil() {
  const router = useRouter();

  // Le profil tel qu'il est actuellement enregistré (sert à comparer le numéro)
  const [original, setOriginal] = useState<Utilisateur | null>(null);

  // Un état par champ du formulaire (vides au départ, remplis après le chargement)
  const [photo, setPhoto] = useState(""); // "" = pas de photo
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState(""); // affiché seulement, non modifiable
  const [telephone, setTelephone] = useState("");
  const [lieu, setLieu] = useState("");
  const [typeProfil, setTypeProfil] = useState<TypeProfil>("eleve");

  // true quand la liste déroulante est ouverte
  const [listeOuverte, setListeOuverte] = useState(false);

  const [chargement, setChargement] = useState(true); // true pendant la lecture du profil
  const [enregistrement, setEnregistrement] = useState(false); // true pendant l'enregistrement
  const [erreur, setErreur] = useState(""); // message d'erreur affiché en rouge

  // Au moment où l'écran s'ouvre, on charge le profil de l'utilisateur connecté
  useEffect(() => {
    const arreter = onAuthStateChanged(auth, async (user) => {
      // Personne de connecté : rien à modifier
      if (!user) {
        setErreur("Tu n'es pas connecté.");
        setChargement(false);
        return;
      }

      try {
        const profil = await lireProfil(user.uid);

        if (profil) {
          setOriginal(profil);
          // On remplit le formulaire avec les données enregistrées
          setPhoto(profil.photoUrl || "");
          setPrenom(profil.prenom || "");
          setNom(profil.nom || "");
          setEmail(profil.email || "");
          setTelephone(profil.telephone || "");
          setLieu(profil.lieu || "");
          setTypeProfil(profil.typeProfil || "eleve");
        } else {
          setErreur("Aucun profil trouvé.");
        }
      } catch (e: any) {
        console.log("Erreur Firestore :", e.code);
        setErreur("Impossible de charger le profil.");
      } finally {
        setChargement(false);
      }
    });

    // On arrête d'écouter quand on quitte l'écran
    return arreter;
  }, []);

  // Libellé du type de profil choisi (ex : "eleve" devient "Élève")
  const labelProfil =
    PROFILS.find((p) => p.valeur === typeProfil)?.label || "Choisir";

  // Ouvre la galerie pour choisir une nouvelle photo
  async function choisirPhoto() {
    setErreur("");

    const resultat = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1], // photo carrée, affichée ronde ensuite
      quality: 0.2, // compression forte pour une photo légère
      base64: true, // on récupère la photo sous forme de texte
    });

    if (resultat.canceled) return;

    const image = resultat.assets[0];

    // Photo trop lourde : on demande d'en choisir une autre
    if (!image.base64 || image.base64.length > TAILLE_MAX_PHOTO) {
      setErreur("Cette photo est trop lourde. Choisis-en une autre.");
      return;
    }

    setPhoto("data:image/jpeg;base64," + image.base64);
  }

  // Vérifie le formulaire puis enregistre dans Firestore
  async function enregistrer() {
    setErreur("");

    const uid = auth.currentUser?.uid;
    if (!uid || !original) {
      setErreur("Impossible d'enregistrer : profil non chargé.");
      return;
    }

    // 1) Vérification des champs
    if (!prenom.trim() || !nom.trim()) {
      setErreur("Merci de saisir ton nom et ton prénom.");
      return;
    }

    // On enlève les espaces du numéro, puis on vérifie : chiffres seulement,
    // avec un + facultatif au début
    const telephoneNettoye = telephone.replace(/\s/g, "");
    if (!/^\+?\d{8,15}$/.test(telephoneNettoye)) {
      setErreur("Merci de saisir un numéro de téléphone valide.");
      return;
    }

    if (!lieu.trim()) {
      setErreur("Merci de saisir ton lieu (ville ou quartier).");
      return;
    }

    // 2) Enregistrement
    try {
      setEnregistrement(true);

      // On vérifie le numéro seulement s'il a changé
      // (sinon on le trouverait dans notre propre profil)
      if (telephoneNettoye !== original.telephone) {
        if (await telephoneExiste(telephoneNettoye)) {
          setErreur("Ce numéro est déjà utilisé.");
          return;
        }
      }

      // modifierProfil vient de utilisateurs.ts : met à jour seulement ces champs
      await modifierProfil(uid, {
        prenom: prenom.trim(),
        nom: nom.trim(),
        telephone: telephoneNettoye,
        lieu: lieu.trim(),
        typeProfil: typeProfil,
        photoUrl: photo,
      });

      alerte(
        "Profil mis à jour",
        "Tes modifications ont été enregistrées.",
      );
      router.back(); // retourne à la page Profil
    } catch (e: any) {
      console.log("Erreur enregistrement :", e.code, e.message);
      setErreur("Impossible d'enregistrer. Réessaie.");
    } finally {
      setEnregistrement(false); // on réactive le bouton dans tous les cas
    }
  }

  return (
    <SafeAreaView style={styles.conteneur}>
      {/* ---------- En-tête : retour + titre ---------- */}
      <View style={styles.entete}>
        <TouchableOpacity hitSlop={10} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.titre}>Modifier le profil</Text>
        {/* Espace vide pour garder le titre bien centré */}
        <View style={{ width: 24 }} />
      </View>

      {/* ---------- Chargement ---------- */}
      {chargement && (
        <View style={styles.centre}>
          <ActivityIndicator size="large" color={BLEU} />
        </View>
      )}

      {/* ---------- Profil introuvable (erreur sans formulaire) ---------- */}
      {!chargement && !original && (
        <View style={styles.centre}>
          <Text style={styles.texteErreur}>{erreur}</Text>
        </View>
      )}

      {/* ---------- Formulaire (quand le profil est chargé) ---------- */}
      {!chargement && original && (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.contenu}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Photo + bouton pour la changer */}
            <TouchableOpacity
              style={styles.photoConteneur}
              activeOpacity={0.8}
              onPress={choisirPhoto}
            >
              {photo ? (
                <Image source={{ uri: photo }} style={styles.photo} />
              ) : (
                <View style={[styles.photo, styles.photoPlaceholder]}>
                  <Ionicons name="person" size={44} color="#FFFFFF" />
                </View>
              )}
              {/* Petit badge appareil photo */}
              <View style={styles.badgePhoto}>
                <Ionicons name="camera" size={16} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
            <Text style={styles.texteChangerPhoto}>Changer la photo</Text>

            {/* Prénom */}
            <Text style={styles.label}>Prénom</Text>
            <TextInput
              style={styles.champ}
              value={prenom}
              onChangeText={setPrenom}
              placeholder="Ton prénom"
              placeholderTextColor={GRIS}
            />

            {/* Nom */}
            <Text style={styles.label}>Nom</Text>
            <TextInput
              style={styles.champ}
              value={nom}
              onChangeText={setNom}
              placeholder="Ton nom"
              placeholderTextColor={GRIS}
            />

            {/* Email : affiché mais non modifiable */}
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={[styles.champ, styles.champBloque]}
              value={email}
              editable={false}
            />
            <Text style={styles.noteEmail}>
              L'adresse email ne peut pas être modifiée.
            </Text>

            {/* Téléphone */}
            <Text style={styles.label}>Téléphone</Text>
            <TextInput
              style={styles.champ}
              value={telephone}
              onChangeText={setTelephone}
              placeholder="0701020304"
              placeholderTextColor={GRIS}
              keyboardType="phone-pad"
            />

            {/* Lieu */}
            <Text style={styles.label}>Lieu</Text>
            <TextInput
              style={styles.champ}
              value={lieu}
              onChangeText={setLieu}
              placeholder="Ex : Cocody, Abidjan"
              placeholderTextColor={GRIS}
            />

            {/* ---------- Liste déroulante : choix du profil ---------- */}
            <Text style={styles.label}>Profil</Text>
            <TouchableOpacity
              style={[styles.champ, styles.champListe]}
              activeOpacity={0.8}
              onPress={() => setListeOuverte(!listeOuverte)}
            >
              <Text style={styles.texteListe}>{labelProfil}</Text>
              <Ionicons
                name={listeOuverte ? "chevron-up" : "chevron-down"}
                size={20}
                color={GRIS}
              />
            </TouchableOpacity>

            {/* Les choix s'affichent seulement quand la liste est ouverte */}
            {listeOuverte ? (
              <View style={styles.listeChoix}>
                {PROFILS.map((choix) => (
                  <TouchableOpacity
                    key={choix.valeur}
                    style={styles.ligneChoix}
                    onPress={() => {
                      setTypeProfil(choix.valeur); // enregistre le choix
                      setListeOuverte(false); // referme la liste
                    }}
                  >
                    <Text
                      style={[
                        styles.texteChoix,
                        choix.valeur === typeProfil && styles.texteChoixActif,
                      ]}
                    >
                      {choix.label}
                    </Text>
                    {choix.valeur === typeProfil ? (
                      <Ionicons name="checkmark" size={20} color={BLEU} />
                    ) : null}
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}

            {/* Message d'erreur (numéro déjà utilisé, champ vide, etc.) */}
            {erreur !== "" && <Text style={styles.erreurTexte}>{erreur}</Text>}

            {/* ---------- Bouton Enregistrer (désactivé pendant l'enregistrement) ---------- */}
            <TouchableOpacity
              style={[
                styles.boutonEnregistrer,
                enregistrement && styles.boutonDesactive,
              ]}
              activeOpacity={0.85}
              onPress={enregistrer}
              disabled={enregistrement}
            >
              {enregistrement ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.texteBoutonEnregistrer}>Enregistrer</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  conteneur: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  // --- Chargement / erreur (centrés dans l'espace restant) ---
  centre: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  texteErreur: {
    color: "#DC2626",
    fontSize: 14,
  },

  // --- En-tête ---
  entete: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 10,
  },
  titre: {
    fontSize: 20,
    fontWeight: "800",
    color: BLEU,
  },

  contenu: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  // --- Photo ---
  photoConteneur: {
    alignSelf: "center",
    marginTop: 10,
  },
  photo: {
    width: 110,
    height: 110,
    borderRadius: 55,
  },
  photoPlaceholder: {
    backgroundColor: "#B7BEEB",
    alignItems: "center",
    justifyContent: "center",
  },
  badgePhoto: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: BLEU,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  texteChangerPhoto: {
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 10,
    fontSize: 14,
    fontWeight: "700",
    color: BLEU,
  },

  // --- Champs ---
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: GRIS,
    marginTop: 16,
    marginBottom: 6,
  },
  champ: {
    borderWidth: 1.5,
    borderColor: "#DCE1F8",
    borderRadius: 14,
    backgroundColor: "#EEF1FD",
    paddingHorizontal: 16,
    height: 50,
    fontSize: 15,
    fontWeight: "600",
    color: "#1A1A1A",
  },
  // Champ non modifiable (email) : texte grisé
  champBloque: {
    color: GRIS,
    backgroundColor: "#F3F4F6",
  },
  noteEmail: {
    fontSize: 12,
    color: GRIS,
    marginTop: 4,
  },

  // --- Liste déroulante ---
  champListe: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  texteListe: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1A1A1A",
  },
  listeChoix: {
    marginTop: 6,
    borderWidth: 1.5,
    borderColor: "#DCE1F8",
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
  },
  ligneChoix: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF1FD",
  },
  texteChoix: {
    fontSize: 15,
    fontWeight: "500",
    color: "#1A1A1A",
  },
  texteChoixActif: {
    fontWeight: "800",
    color: BLEU,
  },

  // --- Message d'erreur ---
  erreurTexte: {
    color: "#DC2626",
    fontSize: 13,
    textAlign: "center",
    marginTop: 16,
  },

  // --- Bouton Enregistrer ---
  boutonEnregistrer: {
    marginTop: 20,
    backgroundColor: BLEU,
    borderRadius: 14,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  // Bouton un peu transparent pendant l'enregistrement
  boutonDesactive: {
    opacity: 0.6,
  },
  texteBoutonEnregistrer: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFFFFF",
  },
});
