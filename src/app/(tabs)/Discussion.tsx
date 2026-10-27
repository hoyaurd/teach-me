// Discussion.tsx
// Écran de discussion (chat) avec un contact. Ouvert depuis Detail_Profil
// (bouton "Message") ou depuis MessagesScreen.tsx via
// router.push({ pathname: "/Discussion", params: { id, nom, photo } }).
// id = uid de l'AUTRE personne.
//
// VRAIS MESSAGES (Firestore) :
//   conversations/{idA_idB}            (les 2 uid triés, séparés par "_")
//     participants, noms, dernierMessage, dernierMessageLe, nonLuPar
//     messages/{id} : texte, deId, creeLe
// - La conversation est créée au premier message envoyé.
// - Les messages s'affichent en temps réel chez les deux personnes.
// - La photo du contact est lue dans Firestore (champ photoUrl).
//
// "nonLuPar" = uid de la personne qui n'a pas encore lu le dernier message.
// Il est rempli à l'envoi, et vidé quand l'autre voit le message
// (c'est ce qui allume / éteint le point rouge de notification).
//
// NOUVEAU : à chaque message envoyé, l'autre personne reçoit une
// notification push "Vous avez un nouveau message" (même app fermée).

import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { getAuth } from "firebase/auth";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { db } from "../../lib/firebase";
// NOUVEAU : pour envoyer la notification push
import { envoyerPush } from "../../lib/notification";

const BLEU = "#2E3FCB";
const GRIS = "#8A8A8A";

// Les paramètres de route peuvent être du texte OU une liste de textes.
// Cette fonction renvoie toujours un simple texte.
function texte(valeur: string | string[] | undefined): string {
  if (Array.isArray(valeur)) return valeur.join(", ");
  return valeur || "";
}

export default function DiscussionScreen() {
  const router = useRouter();

  // Infos du contact transmises depuis l'écran précédent
  const params = useLocalSearchParams();
  const id = texte(params.id); // uid de l'autre personne
  const nomContact = texte(params.nom);

  // Photo du contact. On part de celle des paramètres (souvent vide),
  // puis on la remplace par celle trouvée dans Firestore.
  const [photoContact, setPhotoContact] = useState(texte(params.photo));

  // Moi (utilisateur connecté)
  const moi = getAuth().currentUser;

  // Identifiant de la conversation : les deux uid triés, séparés par "_".
  // Il est identique pour les deux personnes.
  const convId = moi && id ? [moi.uid, id].sort().join("_") : "";

  // Mon nom (affiché dans la liste Messages de l'autre personne)
  const [monNom, setMonNom] = useState("");

  // Les messages de la conversation
  const [messages, setMessages] = useState<any[]>([]);

  // true quand la conversation existe déjà dans Firestore
  const [conversationPrete, setConversationPrete] = useState(false);

  const [texteSaisi, setTexteSaisi] = useState("");

  // Référence vers le ScrollView, pour descendre automatiquement en bas
  const listeRef = useRef<ScrollView>(null);

  // id du dernier message de l'autre que j'ai déjà marqué "lu".
  // Évite de réécrire dans Firestore à chaque mise à jour de la liste.
  const dernierLuRef = useRef("");

  // Au chargement, je récupère la photo du contact dans "utilisateurs".
  useEffect(() => {
    if (!id) return;

    getDoc(doc(db, "utilisateurs", id))
      .then((snap) => {
        if (snap.exists()) setPhotoContact(snap.data().photoUrl ?? "");
      })
      .catch(() => {}); // pas de photo : on garde l'icône par défaut
  }, [id]);

  // 1. Au chargement : je récupère mon nom dans "utilisateurs".
  useEffect(() => {
    if (!moi) return;

    getDoc(doc(db, "utilisateurs", moi.uid))
      .then((snap) => {
        const data: any = snap.exists() ? snap.data() : {};
        setMonNom(
          data.nomComplet ||
            data.displayName ||
            data.name ||
            `${data.prenom ?? data.prenoms ?? ""} ${data.nom ?? ""}`.trim() ||
            moi.displayName ||
            "Utilisateur",
        );
      })
      .catch(() => setMonNom("Utilisateur"));
  }, []);

  // 2. Au chargement : cette conversation existe-t-elle déjà ?
  // (même requête que la page Messages : mes conversations)
  useEffect(() => {
    if (!moi || !convId) return;

    getDocs(
      query(
        collection(db, "conversations"),
        where("participants", "array-contains", moi.uid),
      ),
    )
      .then((snapshot) => {
        if (snapshot.docs.some((d) => d.id === convId)) {
          setConversationPrete(true);
        }
      })
      .catch((erreur) => console.log("Erreur lecture conversation :", erreur));
  }, [convId]);

  // 3. Quand la conversation existe : j'écoute ses messages en temps réel.
  useEffect(() => {
    if (!conversationPrete || !convId) return;

    const q = query(
      collection(db, "conversations", convId, "messages"),
      orderBy("creeLe", "asc"),
    );

    const arreter = onSnapshot(
      q,
      (snapshot) => {
        const liste = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setMessages(liste);

        // Si le dernier message vient de l'autre personne, je viens de le
        // voir : je le marque comme lu (le point rouge s'éteint).
        const dernier: any = liste[liste.length - 1];
        if (
          moi &&
          dernier &&
          dernier.deId !== moi.uid &&
          dernierLuRef.current !== dernier.id
        ) {
          dernierLuRef.current = dernier.id;
          updateDoc(doc(db, "conversations", convId), { nonLuPar: "" }).catch(
            (erreur) => console.log("Erreur marquage message lu :", erreur),
          );
        }
      },
      (erreur) => console.log("Erreur lecture messages :", erreur),
    );

    // Quand on quitte l'écran, on arrête d'écouter
    return arreter;
  }, [conversationPrete, convId]);

  // Enregistre le message tapé dans Firestore.
  async function envoyerMessage() {
    const message = texteSaisi.trim();
    if (!message || !moi || !id) return;

    // On vide le champ tout de suite
    setTexteSaisi("");

    try {
      // 1. Je crée (ou mets à jour) la conversation avec le dernier message.
      // nonLuPar = l'autre personne (elle n'a pas encore lu ce message).
      await setDoc(
        doc(db, "conversations", convId),
        {
          participants: [moi.uid, id],
          noms: { [moi.uid]: monNom || "Utilisateur", [id]: nomContact },
          dernierMessage: message,
          dernierMessageLe: serverTimestamp(),
          nonLuPar: id,
        },
        { merge: true },
      );

      // 2. J'enregistre le message dans la conversation.
      await addDoc(collection(db, "conversations", convId, "messages"), {
        texte: message,
        deId: moi.uid,
        creeLe: serverTimestamp(),
      });

      // 3. NOUVEAU : notification push pour l'autre personne
      // (elle la reçoit même si son app est fermée).
      envoyerPush(id, "Vous avez un nouveau message");

      // 4. La conversation existe maintenant : on commence à l'écouter.
      setConversationPrete(true);
    } catch (erreur) {
      console.log("Erreur envoi message :", erreur);
      setTexteSaisi(message); // on remet le texte pour ne pas le perdre
      Alert.alert("Erreur", "Impossible d'envoyer le message. Réessaie.");
    }
  }

  return (
    <SafeAreaView style={styles.conteneur}>
      {/* Le KeyboardAvoidingView entoure TOUT l'écran (en-tête, messages,
          saisie). "padding" fonctionne sur iOS et Android. */}
      <KeyboardAvoidingView
        style={styles.zoneClavier}
        behavior="padding"
        keyboardVerticalOffset={0}
      >
        {/* ---------- En-tête : retour + photo + nom du contact ---------- */}
        <View style={styles.entete}>
          <TouchableOpacity hitSlop={10} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={26} color="#1A1A1A" />
          </TouchableOpacity>

          {photoContact ? (
            <Image source={{ uri: photoContact }} style={styles.avatar} />
          ) : (
            <View style={styles.avatar}>
              <Ionicons name="person" size={22} color="#FFFFFF" />
            </View>
          )}

          <Text style={styles.nomContact} numberOfLines={1}>
            {nomContact || "Discussion"}
          </Text>
        </View>

        {/* ---------- Liste des messages ---------- */}
        <ScrollView
          ref={listeRef}
          style={styles.liste}
          contentContainerStyle={styles.listeMessages}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          // Descend tout en bas quand le contenu change (nouveau message)
          // ou quand la taille de la liste change (clavier qui s'ouvre).
          onContentSizeChange={() =>
            listeRef.current?.scrollToEnd({ animated: true })
          }
          onLayout={() => listeRef.current?.scrollToEnd({ animated: false })}
        >
          {messages.length === 0 ? (
            <Text style={styles.aucunMessage}>
              Aucun message pour le moment. Écris le premier !
            </Text>
          ) : (
            messages.map((message) => {
              // Mon message ou celui de l'autre personne ?
              const deMoi = message.deId === moi?.uid;

              return (
                <View
                  key={message.id}
                  style={[
                    styles.bulleMessage,
                    deMoi ? styles.bulleMoi : styles.bulleContact,
                  ]}
                >
                  <Text
                    style={[
                      styles.texteMessage,
                      deMoi && styles.texteMessageMoi,
                    ]}
                  >
                    {message.texte}
                  </Text>
                </View>
              );
            })
          )}
        </ScrollView>

        {/* ---------- Champ de saisie + bouton d'envoi ---------- */}
        <View style={styles.zoneSaisie}>
          <TextInput
            style={styles.champSaisie}
            placeholder="Écrire un message..."
            placeholderTextColor={GRIS}
            value={texteSaisi}
            onChangeText={setTexteSaisi}
            multiline
          />
          <TouchableOpacity
            style={styles.boutonEnvoyer}
            onPress={envoyerMessage}
            hitSlop={8}
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
  // Le KeyboardAvoidingView doit occuper tout l'écran.
  zoneClavier: {
    flex: 1,
  },
  entete: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#B7BEEB",
    alignItems: "center",
    justifyContent: "center",
  },
  nomContact: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1A1A1A",
    flex: 1,
  },
  liste: {
    flex: 1,
  },
  listeMessages: {
    padding: 16,
    gap: 10,
  },
  aucunMessage: {
    textAlign: "center",
    color: GRIS,
    marginTop: 40,
    fontSize: 15,
  },
  bulleMessage: {
    maxWidth: "78%",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bulleContact: {
    backgroundColor: "#F0F1FA",
    alignSelf: "flex-start",
    borderBottomLeftRadius: 4,
  },
  bulleMoi: {
    backgroundColor: BLEU,
    alignSelf: "flex-end",
    borderBottomRightRadius: 4,
  },
  texteMessage: {
    fontSize: 15,
    color: "#1A1A1A",
  },
  texteMessageMoi: {
    color: "#FFFFFF",
  },
  zoneSaisie: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  champSaisie: {
    flex: 1,
    maxHeight: 100,
    borderWidth: 1.5,
    borderColor: "#E0E2F5",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    backgroundColor: "#F8F9FF",
  },
  boutonEnvoyer: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: BLEU,
    alignItems: "center",
    justifyContent: "center",
  },
});
