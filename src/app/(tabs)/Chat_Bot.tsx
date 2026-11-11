// Chat_Bot.tsx
// Écran de chat avec l'assistant Teach-IA (agent n8n).
//
// Fonctionnement :
// 1. L'utilisateur écrit un message -> il est envoyé au webhook n8n.
// 2. L'agent répond avec un petit texte + la liste des identifiants
//    ("ids") des publications qu'il propose.
// 3. L'app va lire ces publications dans Firestore et les affiche sous
//    forme de CARTES, comme sur la page d'accueil.
// 4. Un clic sur une carte ouvre le profil détaillé (Detail_Profil).
// 5. Chaque échange (question + réponse) est enregistré dans l'historique
//    IA (voir src/lib/historiqueIA.ts et la page Historique_IA).
//
// ATTENTION : le chemin de l'import "../../lib/firebase" suppose que ce
// fichier est dans src/app/(tabs)/. S'il est dans src/app/, mets "../lib/...".

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { db } from "../../lib/firebase";
// Fonction qui enregistre un échange dans l'historique IA
import { enregistrerEchange } from "../../lib/historiqueIA";

// ---------- Réglages ----------

// URL de PRODUCTION de ton webhook n8n (sans "-test").
// Le workflow doit être "Publié" dans n8n pour qu'elle réponde.
const URL_AGENT = "https://soutenance.app.n8n.cloud/webhook/agent-teachme";

// Temps maximum d'attente de la réponse de l'agent (en millisecondes)
const DELAI_MAX = 45000;

// Nombre maximum de cartes affichées pour une réponse
const MAX_PROFILS = 3;

// Route du profil détaillé (la même que sur l'accueil)
const ROUTE_PROFIL = "/Detail_Profil";

// Mêmes couleurs que l'écran d'accueil
const BLEU = "#2E3FCB";
const GRIS = "#4A4A4A";

// Infos affichées dans l'en-tête
const CONTACT = {
  nom: "Teach-IA",
  statut: "En ligne",
};

// Premier message affiché à l'ouverture du chat
const MESSAGES_INITIAUX: any[] = [
  {
    id: "1",
    texte:
      "Bonjour ! Je suis l'assistant Teach-Me. Dites-moi la matière, le niveau et le lieu, et je vous aide à trouver un accompagnateur. ou une demande de service",
    envoyePar: "contact",
    profils: [],
  },
];

// ---------- Fonctions utiles ----------

// Crée un identifiant de conversation. n8n s'en sert pour garder la
// mémoire de la discussion (l'agent se souvient des messages précédents).
function creerIdSession() {
  return "session-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8);
}

// Affiche le niveau, qu'il soit un texte ("Terminale C")
// ou un tableau (["6ème", "5ème"]).
function texteNiveau(niveau: any) {
  if (Array.isArray(niveau)) return niveau.join(", ");
  return niveau ?? "";
}

// Transforme une liste en texte ("En ligne, En présentiel").
function enTexte(valeur: any) {
  if (Array.isArray(valeur)) return valeur.join(", ");
  return valeur ?? "";
}

// Lit la réponse de l'agent. L'agent doit répondre avec du JSON :
// {"texte": "...", "ids": ["id1", "id2"]}
// Si ce n'est pas du JSON valide, on affiche simplement le texte reçu.
function lireReponseAgent(brut: string) {
  // On enlève d'éventuelles balises ```json ... ``` autour du JSON
  const nettoye = brut
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();

  try {
    const objet = JSON.parse(nettoye);
    return {
      texte: String(objet.texte ?? ""),
      ids: Array.isArray(objet.ids) ? objet.ids.map((i: any) => String(i)) : [],
    };
  } catch (erreur) {
    return { texte: brut, ids: [] as string[] };
  }
}

// Va lire dans Firestore les publications dont l'agent a donné l'identifiant
async function chargerPublications(ids: string[]) {
  const resultats = await Promise.all(
    ids.slice(0, MAX_PROFILS).map(async (id) => {
      try {
        const snap = await getDoc(doc(db, "publications", id));
        if (snap.exists()) {
          return { id: snap.id, ...snap.data() };
        }
      } catch (erreur) {
        console.log("Erreur lecture publication :", erreur);
      }
      return null; // publication introuvable : on l'ignore
    }),
  );

  // On retire les publications introuvables
  return resultats.filter((p) => p !== null);
}

// Prépare un texte pour la comparaison des noms :
// minuscules, sans accents, et tout ce qui n'est pas une lettre ou un chiffre
// (espaces spéciaux invisibles, ** du gras Markdown, tirets...) devient
// un simple espace. Le modèle IA écrit parfois des espaces "insécables"
// qui empêchent de retrouver un nom avec une comparaison simple.
function normaliser(texte: string) {
  return texte
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // retire les accents
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// PLAN B : si l'agent n'a donné aucun identifiant utilisable, on cherche
// dans Firestore les publications dont le NOM apparaît dans sa réponse.
// Exemple : l'agent écrit "Levi Yeo propose des cours d'informatique"
// -> on affiche la carte de la publication de Levi Yeo.
async function chargerPublicationsParNom(texteAgent: string) {
  try {
    const snap = await getDocs(collection(db, "publications"));
    const toutes = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const texteNormalise = normaliser(texteAgent);

    return toutes
      .filter((p: any) => {
        const nom = normaliser(String(p.nom ?? ""));
        return nom.length > 0 && texteNormalise.includes(nom);
      })
      .slice(0, MAX_PROFILS);
  } catch (erreur) {
    console.log("Erreur plan B (recherche par nom) :", erreur);
    return [];
  }
}

// ---------- Carte de profil (même présentation que l'accueil) ----------
// Elle va chercher la photo de l'auteur à partir de son uid.
function CarteProfil({ pub, onPress }: { pub: any; onPress: () => void }) {
  const [photo, setPhoto] = useState("");

  useEffect(() => {
    if (!pub.uid) return;
    getDoc(doc(db, "utilisateurs", pub.uid))
      .then((snap) => {
        if (snap.exists()) setPhoto(snap.data().photoUrl ?? "");
      })
      .catch(() => {}); // pas de photo : on garde l'icône par défaut
  }, [pub.uid]);

  const estService = pub.type === "service";

  return (
    <TouchableOpacity
      style={styles.carteProfil}
      activeOpacity={0.7}
      onPress={onPress}
    >
      {photo ? (
        <Image source={{ uri: photo }} style={styles.photoProfil} />
      ) : (
        <View style={styles.photoPlaceholder}>
          <Ionicons name="person" size={36} color="#FFFFFF" />
        </View>
      )}

      <View style={styles.infosProfil}>
        {/* Nom + étiquette Service / Demande */}
        <View style={styles.ligneNom}>
          <Text style={styles.nomProfil} numberOfLines={1}>
            {pub.nom}
          </Text>
          <View
            style={[
              styles.etiquette,
              estService ? styles.etiquetteService : styles.etiquetteDemande,
            ]}
          >
            <Text
              style={[
                styles.etiquetteTexte,
                estService
                  ? styles.etiquetteTexteService
                  : styles.etiquetteTexteDemande,
              ]}
            >
              {estService ? "Service" : "Demande"}
            </Text>
          </View>
        </View>

        {/* Matière et niveau sur une seule ligne */}
        <Text style={styles.matiereProfil} numberOfLines={1}>
          {pub.matiere} · {texteNiveau(pub.niveau)}
        </Text>

        {/* Localisation (affichée seulement si elle existe) */}
        {pub.lieu ? (
          <View style={styles.ligneLieu}>
            <Ionicons name="location-outline" size={15} color="#7A7A7A" />
            <Text style={styles.lieuProfil} numberOfLines={1}>
              {pub.lieu}
            </Text>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

// ---------- Écran principal ----------

export default function EcranChat() {
  const router = useRouter();

  // Liste des messages affichés à l'écran
  const [messages, setMessages] = useState<any[]>(MESSAGES_INITIAUX);

  // Texte en cours de saisie dans le champ du bas
  const [texteSaisi, setTexteSaisi] = useState("");

  // Vrai pendant qu'on attend la réponse de l'agent
  const [enAttente, setEnAttente] = useState(false);

  // Identifiant de conversation, créé une seule fois à l'ouverture de l'écran
  const idSession = useRef(creerIdSession());

  // Référence vers le ScrollView pour descendre automatiquement en bas
  const scrollViewRef = useRef<any>(null);

  // Revient à l'écran précédent
  function revenirEnArriere() {
    router.back();
  }

  // Ouvre le profil détaillé d'une publication (mêmes paramètres que l'accueil)
  function ouvrirProfil(pub: any) {
    router.push({
      pathname: ROUTE_PROFIL as any,
      params: {
        id: pub.uid, // identifiant de l'auteur
        nom: pub.nom ?? "",
        photo: "", // la photo est chargée par la page de détail
        matiere: pub.matiere ?? "",
        niveau: texteNiveau(pub.niveau),
        lieu: pub.lieu ?? "",
        bio: pub.presentation ?? "",

        // --- Le reste de la publication ---
        type: pub.type ?? "", // "service" ou "demande"
        tarif: pub.tarif ?? "",
        remuneration: enTexte(pub.remuneration),
        lieuTravail: enTexte(pub.lieuTravail),
        experience: pub.experience ?? "",
        precisions: pub.precisions ?? "",
      },
    });
  }

  // Ajoute un message (avec éventuellement des cartes de profils)
  function ajouterMessage(
    texte: string,
    envoyePar: string,
    profils: any[] = [],
  ) {
    const nouveauMessage = {
      id: Date.now().toString() + Math.random().toString(36).slice(2, 5),
      texte: texte,
      envoyePar: envoyePar,
      profils: profils,
    };
    setMessages((messagesActuels) => [...messagesActuels, nouveauMessage]);
  }

  // Envoie la question à l'agent n8n et renvoie sa réponse (texte brut)
  async function demanderALAgent(question: string) {
    // AbortController permet d'annuler la requête si elle est trop longue
    const controleur = new AbortController();
    const minuteur = setTimeout(() => controleur.abort(), DELAI_MAX);

    try {
      const reponse = await fetch(URL_AGENT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: question,
          sessionId: idSession.current,
        }),
        signal: controleur.signal,
      });

      // Si le serveur répond par une erreur (404, 500...)
      if (!reponse.ok) {
        // On lit le détail envoyé par n8n pour comprendre la cause
        const detail = await reponse.text();
        console.log("Détail erreur n8n :", detail);
        throw new Error("Erreur serveur : " + reponse.status);
      }

      const donnees = await reponse.json();

      // On accepte "reponse" (notre format) ou "output" (format n8n brut)
      const texte = donnees.reponse || donnees.output;

      if (!texte) {
        throw new Error("Réponse vide");
      }

      return String(texte);
    } finally {
      // On arrête le minuteur dans tous les cas
      clearTimeout(minuteur);
    }
  }

  // Envoie le message tapé, puis affiche la réponse de l'agent
  async function envoyerMessage() {
    const texte = texteSaisi.trim();

    // On n'envoie rien si le champ est vide ou si l'agent est déjà en train de répondre
    if (texte.length === 0 || enAttente) {
      return;
    }

    // 1. On affiche le message de l'utilisateur et on vide le champ
    ajouterMessage(texte, "moi");
    setTexteSaisi("");
    setEnAttente(true);

    try {
      // 2. On attend la réponse de l'agent (texte + identifiants des profils)
      const brut = await demanderALAgent(texte);
      const reponseAgent = lireReponseAgent(brut);

      // DIAGNOSTIC : ces lignes s'affichent dans le terminal d'Expo.
      // Tu pourras les supprimer quand tout marchera.
      console.log("Réponse brute de l'agent :", brut);
      console.log("Identifiants reçus (ids) :", reponseAgent.ids);

      // 3. On lit les publications proposées dans Firestore
      let profils = await chargerPublications(reponseAgent.ids);
      console.log("Publications trouvées avec les ids :", profils.length);

      // Plan B : aucun identifiant utilisable -> on cherche par nom
      // dans le texte de l'agent
      if (profils.length === 0) {
        profils = await chargerPublicationsParNom(reponseAgent.texte);
        console.log("Publications trouvées par le nom :", profils.length);
      }

      // 4. Si des profils ont été trouvés, on affiche UNIQUEMENT les cartes
      //    (sans le texte de l'agent). Sinon, on affiche le texte de l'agent
      //    (par exemple une question pour préciser la recherche).
      //    Dans les deux cas, on enregistre l'échange dans l'historique IA.
      if (profils.length > 0) {
        ajouterMessage("", "contact", profils);

        // Historique : la "réponse" est la liste des noms proposés
        const noms = profils.map((p: any) => p.nom).join(", ");
        enregistrerEchange(texte, "Profils proposés : " + noms);
      } else {
        const texteReponse = reponseAgent.texte || "Je n'ai rien trouvé.";
        ajouterMessage(texteReponse, "contact");

        // Historique : la réponse est le texte de l'agent
        enregistrerEchange(texte, texteReponse);
      }
    } catch (erreur) {
      // 5. En cas de problème, on affiche un message clair
      console.log("Erreur agent IA :", erreur);
      ajouterMessage(
        "Désolé, je n'arrive pas à répondre pour le moment. Vérifiez votre connexion et réessayez dans un instant.",
        "contact",
      );
    } finally {
      setEnAttente(false);
    }
  }

  return (
    <SafeAreaView style={styles.conteneur}>
      {/* ---------- En-tête : retour + nom du contact ---------- */}
      <View style={styles.entete}>
        <TouchableOpacity
          onPress={revenirEnArriere}
          hitSlop={10}
          style={styles.boutonRetour}
        >
          <Ionicons name="arrow-back" size={24} color="#000000" />
        </TouchableOpacity>

        <View style={styles.infosContact}>
          <Text style={styles.nomContact}>{CONTACT.nom}</Text>
          <Text style={styles.statutContact}>{CONTACT.statut}</Text>
        </View>

        {/* Vue vide pour équilibrer la mise en page */}
        <View style={styles.espaceVide} />
      </View>

      {/* ---------- Zone de conversation ---------- */}
      <KeyboardAvoidingView
        style={styles.zoneClavier}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.conversation}
          contentContainerStyle={styles.conversationContenu}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() =>
            scrollViewRef.current?.scrollToEnd({ animated: true })
          }
        >
          {messages.map((message) => {
            const estDeMoi = message.envoyePar === "moi";
            const profils = message.profils ?? [];

            return (
              <View key={message.id}>
                {/* Bulle de texte (absente si le message ne contient que des cartes) */}
                {message.texte ? (
                  <View
                    style={[
                      styles.bulleConteneur,
                      estDeMoi
                        ? styles.bulleConteneurMoi
                        : styles.bulleConteneurContact,
                    ]}
                  >
                    <View
                      style={[
                        styles.bulle,
                        estDeMoi ? styles.bulleMoi : styles.bulleContact,
                      ]}
                    >
                      <Text
                        style={[
                          styles.texteBulle,
                          estDeMoi && styles.texteBulleMoi,
                        ]}
                      >
                        {message.texte}
                      </Text>
                    </View>
                  </View>
                ) : null}

                {/* Cartes des profils proposés par l'agent */}
                {profils.length > 0 && (
                  <View style={styles.listeProfils}>
                    {profils.map((pub: any) => (
                      <CarteProfil
                        key={pub.id}
                        pub={pub}
                        onPress={() => ouvrirProfil(pub)}
                      />
                    ))}
                  </View>
                )}
              </View>
            );
          })}

          {/* Bulle "en train de répondre", visible seulement pendant l'attente */}
          {enAttente && (
            <View style={[styles.bulleConteneur, styles.bulleConteneurContact]}>
              <View
                style={[styles.bulle, styles.bulleContact, styles.bulleAttente]}
              >
                <ActivityIndicator size="small" color={BLEU} />
                <Text style={styles.texteBulle}>Teach-IA réfléchit...</Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* ---------- Barre de saisie du bas ---------- */}
        <View style={styles.barreSaisie}>
          <TextInput
            style={styles.champSaisie}
            value={texteSaisi}
            onChangeText={setTexteSaisi}
            placeholder="Écrire un message..."
            placeholderTextColor={GRIS}
            multiline
          />
          <TouchableOpacity
            style={[styles.boutonEnvoyer, enAttente && styles.boutonDesactive]}
            activeOpacity={0.8}
            onPress={envoyerMessage}
            disabled={enAttente}
          >
            <Ionicons name="send" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
    paddingTop: 10,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
  },
  infosContact: {
    alignItems: "center",
  },
  nomContact: {
    fontSize: 16,
    marginTop: 30,
    fontWeight: "800",
    color: "#1A1A1A",
  },
  statutContact: {
    fontSize: 12,
    fontWeight: "600",
    color: BLEU,
    marginTop: 2,
  },
  espaceVide: {
    width: 24,
  },

  // --- Conversation ---
  zoneClavier: {
    flex: 1,
  },
  boutonRetour: {
    marginTop: 26,
  },
  conversation: {
    flex: 1,
  },
  conversationContenu: {
    paddingVertical: 16,
  },

  // --- Bulles de message ---
  bulleConteneur: {
    flexDirection: "row",
    marginBottom: 10,
    paddingHorizontal: 16,
  },
  bulleConteneurMoi: {
    justifyContent: "flex-end",
  },
  bulleConteneurContact: {
    justifyContent: "flex-start",
  },
  bulle: {
    maxWidth: "78%",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  bulleMoi: {
    backgroundColor: BLEU,
    borderBottomRightRadius: 4,
  },
  bulleContact: {
    backgroundColor: "#EEF1FD",
    borderBottomLeftRadius: 4,
  },
  bulleAttente: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  texteBulle: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1A1A1A",
  },
  texteBulleMoi: {
    color: "#FFFFFF",
  },

  // --- Cartes de profils proposés par l'agent ---
  listeProfils: {
    width: "100%",
    marginBottom: 10,
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0", // trait gris fin au-dessus de la première carte
  },
  carteProfil: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0", // trait gris fin entre les profils
    backgroundColor: "#FFFFFF",
  },
  photoProfil: {
    width: 72,
    height: 72,
    borderRadius: 36, // photo ronde
    backgroundColor: "#B7BEEB",
  },
  photoPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#B7BEEB",
    alignItems: "center",
    justifyContent: "center",
  },
  infosProfil: {
    flex: 1,
  },
  ligneNom: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  nomProfil: {
    flexShrink: 1, // les noms longs ne poussent pas l'étiquette hors de la carte
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  matiereProfil: {
    fontSize: 16,
    fontWeight: "400",
    color: "#1A1A1A",
    marginTop: 2,
  },
  ligneLieu: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  lieuProfil: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: "#7A7A7A",
  },

  // --- Étiquette Service / Demande ---
  etiquette: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  etiquetteService: {
    backgroundColor: "#E3E7FB",
  },
  etiquetteDemande: {
    backgroundColor: "#FFE9D6",
  },
  etiquetteTexte: {
    fontSize: 11,
    fontWeight: "700",
  },
  etiquetteTexteService: {
    color: BLEU,
  },
  etiquetteTexteDemande: {
    color: "#C2580A",
  },

  // --- Barre de saisie du bas ---
  barreSaisie: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    marginBottom: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#E5E5E5",
  },
  champSaisie: {
    flex: 1,
    maxHeight: 100,
    backgroundColor: "#EEF1FD",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: "500",
    color: GRIS,
  },
  boutonEnvoyer: {
    width: 42,
    height: 42,
    marginBottom: 3,
    borderRadius: 21,
    backgroundColor: BLEU,
    alignItems: "center",
    justifyContent: "center",
  },
  boutonDesactive: {
    opacity: 0.5,
  },
});
