import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import { type ComponentProps, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { auth } from "../../lib/firebase";
import { lireProfil, Utilisateur } from "../../lib/utilisateurs";

type IoniconName = ComponentProps<typeof Ionicons>["name"];

// Couleur principale de l'app (bleu Teach-Me).
const BLEU = "#2E3FCB";
const GRIS = "#6E6E6E";

// NOUVEAU : correspondance entre la valeur stockée dans Firestore
// (minuscules, sans accent) et le texte à afficher à l'écran.
// Si tu as d'autres types de compte, ajoute-les ici.
const LIBELLES_TYPE_PROFIL: Record<string, string> = {
  eleve: "Élève",
  etudiant: "Étudiant",
  parent: "Parent",
  accompagnateur: "Accompagnateur",
};

// NOUVEAU : renvoie le libellé propre d'un type de compte.
function formaterTypeProfil(type?: string | null) {
  // Aucun type enregistré : texte par défaut
  if (!type) return "Membre";

  // On met en minuscules pour être sûr de trouver la clé du dictionnaire
  const cle = type.trim().toLowerCase();

  // Type connu : on renvoie le libellé avec majuscule et accent
  if (LIBELLES_TYPE_PROFIL[cle]) return LIBELLES_TYPE_PROFIL[cle];

  // Type inconnu : on met au moins la première lettre en majuscule
  return cle.charAt(0).toUpperCase() + cle.slice(1);
}

// Routes vers les écrans liés au profil. Adapte-les si tes fichiers
// portent un nom différent dans ton dossier app/.
const ROUTES = {
  accueil: "/Acceuil",
  messages: "/Messages",
  publier: "/Publier_Demande",
  notification: "/Notification",
  modifierProfil: "/Modifier_profile",
  profil: "/Profil",
} as const;

// Onglets de la barre de navigation du bas — identiques aux autres écrans.
const ONGLETS: Array<{
  cle: string;
  label: string;
  icone: IoniconName;
  iconeActif: IoniconName;
}> = [
  {
    cle: "Accueil",
    label: "Accueil",
    icone: "home-outline",
    iconeActif: "home",
  },
  {
    cle: "Messages",
    label: "Messages",
    icone: "chatbubble-ellipses-outline",
    iconeActif: "chatbubble-ellipses",
  },
  {
    cle: "Publier",
    label: "Publier",
    icone: "add-circle-outline",
    iconeActif: "add-circle",
  },
  {
    cle: "Notification",
    label: "Notification",
    icone: "notifications-outline",
    iconeActif: "notifications",
  },
  {
    cle: "Profil",
    label: "Profil",
    icone: "person-outline",
    iconeActif: "person",
  },
];

// Lignes d'informations affichées sous la carte profil. Chaque ligne n'est
// affichée que si la donnée correspondante existe.
function ligneInfo(icone: IoniconName, label: string, valeur?: string | null) {
  if (!valeur) return null;
  return (
    <View style={styles.ligneInfo} key={label}>
      <View style={styles.iconeInfoConteneur}>
        <Ionicons name={icone} size={18} color={BLEU} />
      </View>
      <View style={styles.texteInfoConteneur}>
        <Text style={styles.labelInfo}>{label}</Text>
        <Text style={styles.valeurInfo}>{valeur}</Text>
      </View>
    </View>
  );
}

export default function EcranProfil() {
  const router = useRouter();
  const [ongletActif, setOngletActif] = useState("Profil");

  // Les infos de l'utilisateur, lues dans Firestore (vide au départ)
  const [profile, setProfile] = useState<Utilisateur | null>(null);
  const [loading, setLoading] = useState(true); // true pendant le chargement
  const [error, setError] = useState(""); // message d'erreur éventuel

  // Au moment où l'écran s'ouvre, on va chercher le profil
  useEffect(() => {
    // Firebase nous dit qui est connecté (user)
    const arreter = onAuthStateChanged(auth, async (user) => {
      // Personne de connecté : rien à afficher
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // lireProfil vient de ton fichier utilisateurs.ts
        const resultat = await lireProfil(user.uid);
        setProfile(resultat); // null si aucun document trouvé
      } catch (e: any) {
        console.log("Erreur Firestore :", e.code);
        setError("Impossible de charger le profil.");
      } finally {
        setLoading(false);
      }
    });

    // On arrête d'écouter quand on quitte l'écran
    return arreter;
  }, []);

  function ouvrirModifierProfil() {
    router.push(ROUTES.modifierProfil);
  }

  // Nom affiché : prénom + nom (ou un texte par défaut si vide)
  const nomComplet = `${profile?.prenom || ""} ${profile?.nom || ""}`.trim();

  return (
    <SafeAreaView style={styles.conteneur}>
      {/* ---------- En-tête ---------- */}
      <View style={styles.entete}>
        <Text style={styles.titre}>Profil</Text>
      </View>

      {/* ---------- Chargement ---------- */}
      {loading && (
        <View style={styles.centre}>
          <ActivityIndicator size="large" color={BLEU} />
        </View>
      )}

      {/* ---------- Erreur ou profil introuvable ---------- */}
      {!loading && (error !== "" || !profile) && (
        <View style={styles.centre}>
          <Text style={styles.texteErreur}>
            {error !== "" ? error : "Aucun profil trouvé."}
          </Text>
        </View>
      )}

      {/* ---------- Contenu (quand les données sont chargées) ---------- */}
      {!loading && profile && (
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* ---------- Carte profil ---------- */}
          <View style={styles.carteProfil}>
            {profile.photoUrl ? (
              <Image source={{ uri: profile.photoUrl }} style={styles.photo} />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Ionicons name="person" size={40} color="#FFFFFF" />
              </View>
            )}

            <Text style={styles.nom}>{nomComplet || "Utilisateur"}</Text>

            {/* MODIFIÉ : on affiche le libellé propre (Élève, Étudiant...) */}
            <Text style={styles.role}>
              {formaterTypeProfil(profile.typeProfil)}
            </Text>

            {/* Bouton pour modifier le profil */}
            <TouchableOpacity
              style={styles.boutonModifier}
              activeOpacity={0.8}
              onPress={ouvrirModifierProfil}
            >
              <Text style={styles.texteBoutonModifier}>Modifier le profil</Text>
            </TouchableOpacity>
          </View>

          {/* ---------- Informations détaillées ---------- */}
          <View style={styles.blocInfos}>
            <Text style={styles.titreSection}>Informations</Text>
            <View style={styles.groupeInfos}>
              {ligneInfo("mail-outline", "Email", profile.email)}
              {ligneInfo("call-outline", "Téléphone", profile.telephone)}
              {ligneInfo("location-outline", "Lieu", profile.lieu)}
            </View>
          </View>
        </ScrollView>
      )}

      {/* ---------- Barre de navigation du bas ---------- */}
      <View style={styles.barreNavigation}>
        {ONGLETS.map((onglet) => {
          const estActif = ongletActif === onglet.cle;

          return (
            <TouchableOpacity
              key={onglet.cle}
              style={styles.onglet}
              onPress={() => {
                if (onglet.cle === "Accueil") {
                  router.push(ROUTES.accueil);
                } else if (onglet.cle === "Messages") {
                  router.push(ROUTES.messages);
                } else if (onglet.cle === "Publier") {
                  router.push(ROUTES.publier);
                } else if (onglet.cle === "Notification") {
                  router.push(ROUTES.notification);
                } else {
                  setOngletActif("Profil"); // déjà sur cette page
                }
              }}
            >
              <Ionicons
                name={estActif ? onglet.iconeActif : onglet.icone}
                size={26}
                color={estActif ? BLEU : "#000000"}
              />
              <Text
                style={[
                  styles.libelleOnglet,
                  estActif && styles.libelleOngletActif,
                ]}
              >
                {onglet.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
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
    marginTop: 14,
    marginBottom: 10,
  },
  titre: {
    fontSize: 26,
    fontWeight: "800",
    color: BLEU,
  },

  // --- Carte profil ---
  carteProfil: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  photo: {
    width: 96,
    height: 96,
    borderRadius: 48,
    marginBottom: 14,
  },
  photoPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#B7BEEB",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  nom: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  role: {
    fontSize: 15,
    fontWeight: "700",
    color: BLEU,
    marginBottom: 18,
  },
  boutonModifier: {
    borderWidth: 1.5,
    borderColor: BLEU,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  texteBoutonModifier: {
    fontSize: 14,
    fontWeight: "700",
    color: BLEU,
  },

  // --- Titre de section (Informations) ---
  titreSection: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1A1A1A",
    marginBottom: 12,
  },

  // --- Informations détaillées ---
  blocInfos: {
    paddingHorizontal: 20,
    marginBottom: 100, // laisse de la place au-dessus de la barre de navigation
  },
  groupeInfos: {
    borderRadius: 18,
    backgroundColor: "#EEF1FD",
    overflow: "hidden",
  },
  ligneInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#DCE1F8",
  },
  iconeInfoConteneur: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#DDE2FB",
    alignItems: "center",
    justifyContent: "center",
  },
  texteInfoConteneur: {
    flex: 1,
  },
  labelInfo: {
    fontSize: 12,
    color: GRIS,
    marginBottom: 2,
  },
  valeurInfo: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1A1A1A",
  },

  // --- Barre de navigation du bas ---
  barreNavigation: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#E5E5E5",
    paddingTop: 12,
    paddingBottom: 22,
  },
  onglet: {
    alignItems: "center",
  },
  libelleOnglet: {
    fontSize: 11,
    fontWeight: "400",
    color: "#000000",
    marginTop: 2,
  },
  libelleOngletActif: {
    color: BLEU,
  },
});
