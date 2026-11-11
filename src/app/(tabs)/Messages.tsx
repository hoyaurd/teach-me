// MessagesScreen.tsx
// Écran "Messages" : liste des VRAIES conversations de l'utilisateur,
// lues en temps réel dans la collection Firestore "conversations".
// Une barre de recherche sous le titre permet de filtrer par nom de contact.
// Un clic sur une conversation ouvre l'écran de discussion correspondant
// (voir DiscussionScreen.tsx), en lui transmettant l'id (uid) et le nom
// du contact via les paramètres de navigation (Expo Router).
//
// Aucune donnée d'exemple : tant qu'il n'y a pas de message, la liste est vide.
// La photo de chaque contact est lue dans Firestore (AvatarContact).
// Une conversation avec un message non lu affiche un point rouge
// à droite et son dernier message en gras (champ "nonLuPar" = mon uid).
//
// NOUVEAU : la barre du bas s'adapte à tous les téléphones.
// Elle respecte la zone de sécurité (boutons Android, barre de gestes
// iPhone) grâce à useSafeAreaInsets, comme sur l'écran d'accueil.
// Ainsi les onglets ne sont plus coupés sur certains téléphones.

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { getAuth } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import {
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
// NOUVEAU : SafeAreaView et useSafeAreaInsets viennent de cette bibliothèque
// (le SafeAreaView de react-native ne protège pas bien sur Android)
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { db } from "../../lib/firebase";
// Choisit la bonne page de publication selon le profil (comme sur l'accueil)
import { getRoutePublier } from "../../lib/Profil";
// Points rouges : nouvelle notification (demande) et nouveau message
import { useBarreLaterale } from "../../lib/useBarreLaterale";
import {
  useNouveauMessage,
  useNouvelleNotification,
} from "../../lib/useNouvelleNotification";

// Couleurs de l'app (mêmes que les autres écrans Teach-Me)
const BLEU = "#2E3FCB";
const GRIS = "#8A8A8A";

// Route vers l'écran de discussion. Adapte le chemin si ton fichier
// DiscussionScreen ne s'appelle pas exactement "/Discussion" dans app/.
const ROUTE_DISCUSSION = "/Discussion";

// Routes de la barre de navigation du bas. Adapte-les si un de tes fichiers
// porte un nom différent dans ton dossier app/.
const ROUTES = {
  accueil: "/Acceuil",
  messages: "/Messages",
  notification: "/Notification",
  profil: "/Profil",
};

// Onglets de la barre de navigation du bas — identiques à l'écran d'accueil.
const ONGLETS = [
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

// Affiche l'heure si le message date d'aujourd'hui (ex : "10:42"),
// sinon la date (ex : "16/10/2026").
function formaterHeure(date: any): string {
  if (!date?.seconds) return "";
  const d = new Date(date.seconds * 1000);
  if (d.toDateString() === new Date().toDateString()) {
    return d.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  return d.toLocaleDateString("fr-FR");
}

// Avatar d'un contact.
// Il va chercher la photo de la personne dans "utilisateurs" (champ photoUrl).
// Sans photo, on garde l'icône par défaut.
function AvatarContact({ uid }: { uid: string }) {
  const [photo, setPhoto] = useState("");

  useEffect(() => {
    if (!uid) return;

    getDoc(doc(db, "utilisateurs", uid))
      .then((snap) => {
        if (snap.exists()) setPhoto(snap.data().photoUrl ?? "");
      })
      .catch(() => {}); // pas de photo : on garde l'icône par défaut
  }, [uid]);

  return photo ? (
    <Image source={{ uri: photo }} style={styles.avatar} />
  ) : (
    <View style={styles.avatar}>
      <Ionicons name="person" size={26} color="#FFFFFF" />
    </View>
  );
}

export default function MessagesScreen() {
  const router = useRouter();
  // Site web grand écran : le menu latéral remplace la barre du bas
  const barreLaterale = useBarreLaterale();

  // NOUVEAU : zones de sécurité du téléphone (barre de gestes, boutons Android)
  const insets = useSafeAreaInsets();

  const [recherche, setRecherche] = useState("");
  // Onglet actif de la barre du bas : "Messages" puisqu'on est sur cette page.
  const [ongletActif, setOngletActif] = useState("Messages");

  // true s'il y a une nouvelle demande / réponse -> point rouge sur Notification
  const aNouvelleNotif = useNouvelleNotification();
  // true s'il y a un message non lu -> point rouge sur Messages
  const aNouveauMessage = useNouveauMessage();

  // Vraies conversations, lues dans Firestore
  const [conversations, setConversations] = useState<any[]>([]);

  // Écoute en temps réel les conversations dont je fais partie.
  useEffect(() => {
    const moi = getAuth().currentUser;
    if (!moi) return;

    const q = query(
      collection(db, "conversations"),
      where("participants", "array-contains", moi.uid),
    );

    const arreter = onSnapshot(
      q,
      (snapshot) => {
        const liste = snapshot.docs.map((d) => {
          const data: any = d.data();

          // L'autre personne = le participant qui n'est pas moi
          const autreId =
            (data.participants ?? []).find((p: string) => p !== moi.uid) ?? "";

          return {
            id: d.id,
            autreId,
            nom: data.noms?.[autreId] ?? "Utilisateur",
            dernierMessage: data.dernierMessage ?? "",
            dernierMessageLe: data.dernierMessageLe ?? null,
            // true si le dernier message n'a pas encore été lu par moi
            nonLu: data.nonLuPar === moi.uid,
          };
        });

        // Les conversations les plus récentes en premier
        liste.sort(
          (a, b) =>
            (b.dernierMessageLe?.seconds ?? 0) -
            (a.dernierMessageLe?.seconds ?? 0),
        );

        setConversations(liste);
      },
      (erreur) => console.log("Erreur lecture conversations :", erreur),
    );

    // Quand on quitte l'écran, on arrête d'écouter
    return arreter;
  }, []);

  // Filtre les conversations dont le nom contient le texte recherché
  // (insensible à la casse). Si la recherche est vide, on garde tout.
  const conversationsFiltrees = conversations.filter((conversation) =>
    conversation.nom.toLowerCase().includes(recherche.toLowerCase()),
  );

  // Ouvre la discussion avec cette personne
  // (la photo est récupérée par l'écran Discussion lui-même)
  function ouvrirDiscussion(conversation: any) {
    router.push({
      pathname: ROUTE_DISCUSSION,
      params: {
        id: conversation.autreId, // uid de l'autre personne
        nom: conversation.nom,
        photo: "",
      },
    } as any);
  }

  // Au clic sur "Publier" : même logique que sur l'accueil
  // (accompagnateur -> /Publier_service, les autres -> /Publier_Demande).
  async function ouvrirPublier() {
    const route = await getRoutePublier();
    router.push(route as any);
  }

  return (
    // NOUVEAU : on protège seulement le haut et les côtés.
    // Le bas est géré à la main sur la barre de navigation (voir plus bas).
    <SafeAreaView style={styles.conteneur} edges={["top", "left", "right"]}>
      {/* KeyboardAvoidingView : quand le clavier s'ouvre, le contenu remonte
          et la liste se rétrécit pour laisser la place. */}
      <KeyboardAvoidingView
        style={styles.zoneClavier}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        {/* ---------- En-tête ---------- */}
        <View style={styles.entete}>
          <Text style={styles.titre}>Messages</Text>
        </View>

        {/* ---------- Barre de recherche ---------- */}
        <View style={styles.barreRecherche}>
          <Ionicons name="search" size={20} color={GRIS} />
          <TextInput
            style={styles.champRecherche}
            value={recherche}
            onChangeText={setRecherche}
            placeholder="Rechercher une conversation"
            placeholderTextColor={GRIS}
          />
        </View>

        {/* ---------- Liste des conversations ---------- */}
        <ScrollView
          style={styles.contenu}
          contentContainerStyle={styles.liste}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {conversationsFiltrees.length === 0 ? (
            <Text style={styles.aucunMessage}>
              {conversations.length === 0
                ? "Aucune conversation pour le moment."
                : "Aucune conversation ne correspond à ta recherche."}
            </Text>
          ) : (
            conversationsFiltrees.map((conversation) => (
              <TouchableOpacity
                key={conversation.id}
                style={styles.ligneConversation}
                activeOpacity={0.7}
                onPress={() => ouvrirDiscussion(conversation)}
              >
                {/* Photo du contact (ou icône par défaut) */}
                <AvatarContact uid={conversation.autreId} />

                {/* Nom + dernier message */}
                <View style={styles.infosConversation}>
                  <Text style={styles.nomContact} numberOfLines={1}>
                    {conversation.nom}
                  </Text>
                  {/* Dernier message en gras s'il n'est pas lu */}
                  <Text
                    style={[
                      styles.dernierMessage,
                      conversation.nonLu && styles.dernierMessageNonLu,
                    ]}
                    numberOfLines={1}
                  >
                    {conversation.dernierMessage}
                  </Text>
                </View>

                {/* Heure du dernier message + point rouge si non lu */}
                <View style={styles.colonneDroite}>
                  <Text style={styles.heure}>
                    {formaterHeure(conversation.dernierMessageLe)}
                  </Text>
                  {conversation.nonLu && <View style={styles.pastilleNonLu} />}
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>

        {/* ---------- Barre de navigation du bas ---------- */}
        <View
          style={[
            styles.barreNavigation,
            // NOUVEAU : l'espace du bas s'adapte au téléphone
            // (barre de gestes iPhone, boutons Android).
            // Math.max(..., 12) garantit toujours un minimum d'espace.
            { paddingBottom: Math.max(insets.bottom, 12) + 4 },
            // Site web grand écran : le menu latéral remplace la barre du bas
            barreLaterale && { display: "none" },
          ]}
        >
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
                    setOngletActif("Messages"); // déjà sur cette page
                  } else if (onglet.cle === "Publier") {
                    ouvrirPublier();
                  } else if (onglet.cle === "Notification") {
                    router.push(ROUTES.notification);
                  } else if (onglet.cle === "Profil") {
                    router.push(ROUTES.profil);
                  } else {
                    setOngletActif(onglet.cle);
                  }
                }}
              >
                {/* Icône + point rouge :
                    - Notification : nouvelle demande ou réponse
                    - Messages : message non lu */}
                <View>
                  <Ionicons
                    name={(estActif ? onglet.iconeActif : onglet.icone) as any}
                    size={26}
                    color={estActif ? BLEU : "#000000"}
                  />
                  {((onglet.cle === "Notification" && aNouvelleNotif) ||
                    (onglet.cle === "Messages" && aNouveauMessage)) &&
                    !estActif && <View style={styles.pointRouge} />}
                </View>

                <Text
                  style={[
                    styles.libelleOnglet,
                    estActif && styles.libelleOngletActif,
                  ]}
                  numberOfLines={1}
                >
                  {onglet.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // NOUVEAU : plus besoin de paddingTop avec StatusBar.currentHeight,
  // le SafeAreaView de react-native-safe-area-context protège le haut.
  conteneur: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  // Le KeyboardAvoidingView doit occuper tout l'écran (flex: 1).
  zoneClavier: {
    flex: 1,
  },
  entete: {
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 16,
  },
  titre: {
    fontSize: 26,
    fontWeight: "800",
    color: "#2E3FCB",
  },
  barreRecherche: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 20,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: "#000000",
    borderRadius: 30,
    backgroundColor: "#EEF1FD",
    paddingHorizontal: 16,
    height: 50,
  },
  champRecherche: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: GRIS,
    height: 50,
  },
  contenu: {
    flex: 1,
  },
  liste: {
    paddingBottom: 40,
  },
  aucunMessage: {
    textAlign: "center",
    color: GRIS,
    marginTop: 60,
    fontSize: 15,
  },
  ligneConversation: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
    gap: 14,
  },
  // Photo ronde (ou icône sur fond bleu clair si pas de photo)
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#B7BEEB",
    alignItems: "center",
    justifyContent: "center",
  },
  infosConversation: {
    flex: 1,
  },
  nomContact: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 3,
  },
  dernierMessage: {
    fontSize: 14,
    color: GRIS,
  },
  // Dernier message en gras et plus foncé quand il n'est pas lu
  dernierMessageNonLu: {
    fontWeight: "700",
    color: "#1A1A1A",
  },
  // Heure en haut, point rouge en dessous (colonne de droite)
  colonneDroite: {
    alignItems: "flex-end",
    gap: 6,
  },
  heure: {
    fontSize: 12,
    color: GRIS,
  },
  // Point rouge d'une conversation non lue
  pastilleNonLu: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#E53935",
  },

  // --- Barre de navigation du bas ---
  // NOUVEAU : le paddingBottom n'est plus fixé ici, il est ajouté dans le
  // composant selon la zone de sécurité du téléphone.
  barreNavigation: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#E5E5E5",
    paddingTop: 12,
    backgroundColor: "#FFFFFF",
  },
  // NOUVEAU : flex: 1 -> les 5 onglets se partagent la largeur à égalité,
  // même sur un tout petit écran (avant : space-around)
  onglet: {
    flex: 1,
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

  // Point rouge sur les icônes Notification et Messages (barre du bas)
  pointRouge: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: "#E53935",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
});
