// Detail_Profil.tsx
// Écran de détail d'une publication (service ou demande).
// Reçoit les infos depuis l'accueil via router.push (params) :
// id (uid de l'auteur), pubId (id de la publication), nom, photo, matiere,
// niveau, lieu, bio, tarif, remuneration, lieuTravail, experience,
// precisions, type.
//
// Design simple : photo, nom, puis une liste "titre / valeur".
//
// Bouton du bas :
// - c'est MA publication -> "Supprimer ma publication"
// - pas encore de demande acceptée -> "Envoyer une demande"
// - demande acceptée (dans un sens ou dans l'autre) ->
//   deux boutons : "Contacter" (appel) et "Message" (ouvre la discussion)
//
// Quand j'envoie une demande, l'autre personne reçoit une
// notification push "Vous avez une nouvelle notification".
//
// Au-dessus du bouton "Envoyer une demande", on affiche les
// chances que la demande soit acceptée (calcul fait dans l'app par le modèle).
// Le calcul compare MON profil et le profil que je regarde.

import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { getAuth } from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc, // NOUVEAU : pour supprimer la publication
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  Alert, // NOUVEAU : pour la confirmation de suppression
  Image,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
// Le bloc qui affiche l'estimation (le dossier components est à côté de lib)
import BlocEstimation from "../../components/BlocEstimation";
import { alerte } from "../../lib/alerte";
import type { InfosProfil } from "../../lib/calculerCompatibilite";
import { db } from "../../lib/firebase";
import { envoyerPush } from "../../lib/notification";

// Couleur principale de l'app (bleu Teach-Me).
const BLEU = "#2E3FCB";

// Les paramètres de route peuvent être du texte OU une liste de textes.
// Cette fonction renvoie toujours un simple texte.
function texte(valeur: string | string[] | undefined): string {
  if (Array.isArray(valeur)) return valeur.join(", ");
  return valeur || "";
}

export default function EcranProfil() {
  const router = useRouter();

  // Infos envoyées par l'écran d'accueil.
  const params = useLocalSearchParams();

  const id = texte(params.id); // uid de l'auteur de la publication
  const pubId = texte(params.pubId); // NOUVEAU : id du document "publications"
  const nom = texte(params.nom);
  const matiere = texte(params.matiere);
  const niveau = texte(params.niveau);
  const lieu = texte(params.lieu);
  const bio = texte(params.bio);
  const tarif = texte(params.tarif);
  const remuneration = texte(params.remuneration);
  const lieuTravail = texte(params.lieuTravail);
  const experience = texte(params.experience);
  const precisions = texte(params.precisions);
  const type = texte(params.type); // "service" ou "demande"

  // Photo de l'utilisateur : celle des paramètres (souvent vide),
  // remplacée par celle trouvée dans Firestore.
  const [photo, setPhoto] = useState(texte(params.photo));

  // Numéro de téléphone de cette personne (lu dans Firestore)
  const [telephone, setTelephone] = useState("");

  // true une fois la demande envoyée (le bouton est alors grisé).
  const [demandeEnvoyee, setDemandeEnvoyee] = useState(false);

  // true pendant l'envoi (évite de cliquer deux fois).
  const [envoiEnCours, setEnvoiEnCours] = useState(false);

  // NOUVEAU : true pendant la suppression (évite de cliquer deux fois).
  const [suppressionEnCours, setSuppressionEnCours] = useState(false);

  // true si une demande que J'AI envoyée à cette personne a été acceptée.
  const [accepteeEnvoyee, setAccepteeEnvoyee] = useState(false);

  // true si une demande que CETTE PERSONNE m'a envoyée a été acceptée par moi.
  const [accepteeRecue, setAccepteeRecue] = useState(false);

  // Profil complet de cette personne (le destinataire), lu dans "utilisateurs".
  // null = pas encore chargé
  const [profilDestinataire, setProfilDestinataire] = useState<any>(null);

  // Mon propre profil complet (celui qui envoie la demande).
  // null = pas encore chargé
  const [monProfil, setMonProfil] = useState<any>(null);

  // Va chercher la photo, le téléphone et le profil de l'utilisateur dans Firestore.
  useEffect(() => {
    if (!id) return; // pas d'id (ex : mon propre profil) : rien à chercher

    getDoc(doc(db, "utilisateurs", id))
      .then((snap) => {
        if (snap.exists()) {
          const data: any = snap.data();
          setPhoto(data.photoUrl ?? "");
          // On essaie plusieurs noms de champs courants pour le téléphone
          setTelephone(data.telephone ?? data.tel ?? data.phone ?? "");
          // Profil du destinataire (pour l'estimation)
          setProfilDestinataire(data);
        }
      })
      .catch(() => {}); // en cas d'erreur, on garde les valeurs par défaut
  }, [id]);

  // Va chercher MON profil dans Firestore (pour l'estimation).
  useEffect(() => {
    const moi = getAuth().currentUser;
    if (!moi) return;

    getDoc(doc(db, "utilisateurs", moi.uid))
      .then((snap) => {
        if (snap.exists()) {
          setMonProfil(snap.data());
        }
      })
      .catch(() => {}); // en cas d'erreur, l'estimation ne sera simplement pas affichée
  }, []);

  // Surveille en temps réel s'il existe une demande ACCEPTÉE
  // entre moi et cette personne (dans un sens ou dans l'autre).
  useEffect(() => {
    const moi = getAuth().currentUser;
    if (!moi || !id) return;

    // 1. Les demandes que j'ai envoyées : une est-elle acceptée par cette personne ?
    const qEnvoyees = query(
      collection(db, "demandes"),
      where("deId", "==", moi.uid),
    );
    const arreterEnvoyees = onSnapshot(
      qEnvoyees,
      (snapshot) => {
        setAccepteeEnvoyee(
          snapshot.docs.some(
            (d) => d.data().aId === id && d.data().statut === "acceptee",
          ),
        );
      },
      (erreur) => console.log("Erreur lecture demandes envoyées :", erreur),
    );

    // 2. Les demandes que j'ai reçues : ai-je accepté celle de cette personne ?
    const qRecues = query(
      collection(db, "demandes"),
      where("aId", "==", moi.uid),
    );
    const arreterRecues = onSnapshot(
      qRecues,
      (snapshot) => {
        setAccepteeRecue(
          snapshot.docs.some(
            (d) => d.data().deId === id && d.data().statut === "acceptee",
          ),
        );
      },
      (erreur) => console.log("Erreur lecture demandes reçues :", erreur),
    );

    // Quand on quitte l'écran, on arrête d'écouter
    return () => {
      arreterEnvoyees();
      arreterRecues();
    };
  }, [id]);

  // true si une demande a été acceptée entre nous (peu importe le sens)
  const estAccepte = accepteeEnvoyee || accepteeRecue;

  // Sans nom transmis, c'est mon propre profil : pas de bouton en bas.
  const estMonProfil = !nom;
  const estDemande = type === "demande";

  // NOUVEAU : true si cette publication est la MIENNE
  // (l'auteur de la publication = moi, et on connaît l'id de la publication).
  const moiUid = getAuth().currentUser?.uid;
  const estMaPublication = !!pubId && !!moiUid && moiUid === id;

  // On affiche l'estimation seulement quand les deux profils sont chargés.
  const estimationPrete = monProfil !== null && profilDestinataire !== null;

  // Les deux profils à comparer, envoyés à BlocEstimation :
  // - miennes : mon profil Firestore
  // - vues : le profil Firestore de l'autre personne, complété par les infos
  //   de la publication affichée (matière, niveau, lieu...) qui sont les plus précises.
  const miennes = (monProfil ?? {}) as InfosProfil;
  const vues = {
    ...(profilDestinataire ?? {}),
    matiere,
    niveau,
    lieu,
    lieuTravail,
  } as InfosProfil;

  // Liste des infos à afficher. Les lignes vides sont retirées par le filter.
  const infos = [
    { titre: "À propos", valeur: bio },
    { titre: "Matière", valeur: matiere },
    { titre: "Niveau", valeur: niveau },
    { titre: "Lieu", valeur: lieu },
    { titre: estDemande ? "Budget horaire" : "Tarif horaire", valeur: tarif },
    { titre: "Type de rémunération", valeur: remuneration },
    {
      titre: estDemande ? "Lieu de cours souhaité" : "Lieu de travail",
      valeur: lieuTravail,
    },
    { titre: "Expérience / Diplômes", valeur: experience },
    { titre: "Précisions", valeur: precisions },
  ].filter((info) => info.valeur !== "");

  // Enregistre la demande dans Firestore.
  async function envoyerDemande() {
    if (demandeEnvoyee || envoiEnCours) return;

    // 1. Qui envoie ? L'utilisateur connecté.
    const moi = getAuth().currentUser;
    if (!moi) {
      alerte("Erreur", "Tu dois être connecté pour envoyer une demande.");
      return;
    }

    // 2. On ne peut pas s'envoyer une demande à soi-même.
    if (!id || moi.uid === id) {
      alerte("Impossible", "Tu ne peux pas t'envoyer une demande.");
      return;
    }

    try {
      setEnvoiEnCours(true);

      // 3. On récupère mon nom dans la collection "utilisateurs".
      const snap = await getDoc(doc(db, "utilisateurs", moi.uid));
      const data: any = snap.exists() ? snap.data() : {};

      // On essaie plusieurs noms de champs courants
      const monNom =
        data.nomComplet ||
        data.displayName ||
        data.name ||
        `${data.prenom ?? data.prenoms ?? ""} ${data.nom ?? ""}`.trim() ||
        "Un utilisateur";

      // 4. On enregistre la demande.
      await addDoc(collection(db, "demandes"), {
        deId: moi.uid, // qui envoie
        deNom: monNom,
        aId: id, // qui reçoit
        aNom: nom, // nom du destinataire (pour lui répondre)
        matiere: matiere,
        statut: "en_attente",
        creeLe: serverTimestamp(),
      });

      // 5. Notification push pour le destinataire
      // (il la reçoit même si son app est fermée).
      envoyerPush(id, "Vous avez une nouvelle notification");

      setDemandeEnvoyee(true);
      alerte("Demande envoyée", `Ta demande a bien été envoyée à ${nom}.`);
    } catch (erreur) {
      console.log("Erreur envoi demande :", erreur);
      alerte("Erreur", "Impossible d'envoyer la demande. Réessaie.");
    } finally {
      setEnvoiEnCours(false);
    }
  }

  // NOUVEAU : supprime la publication dans Firestore, puis revient en arrière.
  // (La règle Firestore refuse si ce n'est pas l'auteur.)
  async function supprimerPublication() {
    if (suppressionEnCours) return;

    try {
      setSuppressionEnCours(true);
      await deleteDoc(doc(db, "publications", pubId));
      router.back();
    } catch (erreur) {
      console.log("Erreur suppression publication :", erreur);
      alerte("Erreur", "Impossible de supprimer la publication. Réessaie.");
      setSuppressionEnCours(false);
    }
  }

  // NOUVEAU : demande confirmation avant de supprimer.
  function confirmerSuppression() {
    Alert.alert(
      "Supprimer la publication",
      "Cette action est définitive. Continuer ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: supprimerPublication,
        },
      ],
    );
  }

  // "Contacter" -> ouvre l'application Téléphone avec le numéro.
  function contacter() {
    if (!telephone) {
      alerte(
        "Numéro indisponible",
        `${nom} n'a pas encore renseigné son numéro de téléphone.`,
      );
      return;
    }
    // Sur le site web (PC), un appel ne peut pas démarrer : on affiche le numéro
    if (Platform.OS === "web") {
      alerte(`Contacter ${nom}`, `Numéro : ${telephone}`);
      return;
    }
    Linking.openURL(`tel:${telephone}`);
  }

  // "Message" -> ouvre directement la DISCUSSION avec cette personne
  // (et non plus la liste Messages), en indiquant son id, son nom et sa photo.
  function envoyerMessage() {
    router.push({
      pathname: "/Discussion",
      params: { id, nom, photo },
    } as any);
  }

  return (
    <SafeAreaView style={styles.conteneur}>
      {/* ---------- Bouton retour ---------- */}
      <TouchableOpacity
        style={styles.boutonRetour}
        hitSlop={10}
        onPress={() => router.back()}
      >
        <Ionicons name="arrow-back" size={24} color="#000000" />
      </TouchableOpacity>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.contenu}
        showsVerticalScrollIndicator={false}
      >
        {/* ---------- Photo ronde (celle de l'utilisateur) ---------- */}
        {photo ? (
          <Image source={{ uri: photo }} style={styles.photo} />
        ) : (
          <View style={[styles.photo, styles.photoPlaceholder]}>
            <Ionicons name="person" size={60} color="#FFFFFF" />
          </View>
        )}

        {/* ---------- Nom ---------- */}
        <Text style={styles.nom}>{nom || "Mon profil"}</Text>

        {/* ---------- Liste des infos ---------- */}
        <View style={styles.liste}>
          {infos.map((info) => (
            <View key={info.titre} style={styles.ligne}>
              <Text style={styles.titre}>{info.titre}</Text>
              <Text style={styles.valeur}>{info.valeur}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* ---------- Barre du bas (fixée) ---------- */}
      {/* NOUVEAU : si c'est ma publication -> bouton Supprimer */}
      {estMaPublication ? (
        <View style={styles.barreBas}>
          <TouchableOpacity
            style={[
              styles.boutonSupprimer,
              suppressionEnCours && styles.boutonEnvoye,
            ]}
            activeOpacity={0.8}
            onPress={confirmerSuppression}
            disabled={suppressionEnCours}
          >
            <Text style={styles.boutonTexte}>
              {suppressionEnCours
                ? "Suppression..."
                : "Supprimer ma publication"}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        !estMonProfil && (
          <View style={styles.barreBas}>
            {estAccepte ? (
              // Demande acceptée : deux boutons
              <View style={styles.ligneBoutons}>
                <TouchableOpacity
                  style={[styles.bouton, styles.boutonMoitie]}
                  activeOpacity={0.8}
                  onPress={contacter}
                >
                  <Ionicons name="call" size={20} color="#FFFFFF" />
                  <Text style={styles.boutonTexte}>Contacter</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.boutonContour, styles.boutonMoitie]}
                  activeOpacity={0.8}
                  onPress={envoyerMessage}
                >
                  <Ionicons name="chatbubble-ellipses" size={20} color={BLEU} />
                  <Text style={styles.boutonTexteContour}>Message</Text>
                </TouchableOpacity>
              </View>
            ) : (
              // Pas encore acceptée : estimation + bouton "Envoyer une demande"
              <View>
                {/* Chances d'acceptation, avant l'envoi de la demande */}
                {estimationPrete && !demandeEnvoyee && (
                  <BlocEstimation miennes={miennes} vues={vues} />
                )}

                <TouchableOpacity
                  style={[
                    styles.bouton,
                    (demandeEnvoyee || envoiEnCours) && styles.boutonEnvoye,
                  ]}
                  activeOpacity={0.8}
                  onPress={envoyerDemande}
                  disabled={demandeEnvoyee || envoiEnCours}
                >
                  <Text style={styles.boutonTexte}>
                    {demandeEnvoyee
                      ? "Demande envoyée"
                      : envoiEnCours
                        ? "Envoi..."
                        : "Envoyer une demande"}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  conteneur: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  boutonRetour: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  contenu: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingBottom: 30,
  },

  // --- Photo ---
  photo: {
    width: 110,
    height: 110,
    borderRadius: 55,
    marginTop: 10,
  },
  photoPlaceholder: {
    backgroundColor: "#B7BEEB",
    alignItems: "center",
    justifyContent: "center",
  },

  // --- Nom ---
  nom: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1A1A1A",
    marginTop: 14,
    marginBottom: 10,
    textAlign: "center",
  },

  // --- Liste des infos ---
  liste: {
    alignSelf: "stretch",
  },
  ligne: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#EEEEEE",
  },
  titre: {
    fontSize: 13,
    color: "#7A7A7A",
  },
  valeur: {
    fontSize: 16,
    color: "#1A1A1A",
    marginTop: 4,
    lineHeight: 23,
  },

  // --- Barre du bas ---
  barreBas: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: "#EEEEEE",
    backgroundColor: "#FFFFFF",
  },
  bouton: {
    backgroundColor: BLEU,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  boutonEnvoye: {
    backgroundColor: "#9AA0C9",
  },
  boutonTexte: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },

  // NOUVEAU : bouton rouge "Supprimer ma publication"
  boutonSupprimer: {
    backgroundColor: "#E53935",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },

  // --- Les deux boutons (demande acceptée) ---
  ligneBoutons: {
    flexDirection: "row",
    gap: 10,
  },
  // Chaque bouton prend la moitié de la largeur, icône + texte côte à côte
  boutonMoitie: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  // Bouton "Message" : fond blanc, bordure bleue
  boutonContour: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: BLEU,
    borderRadius: 12,
    paddingVertical: 16,
  },
  boutonTexteContour: {
    color: BLEU,
    fontSize: 17,
    fontWeight: "700",
  },
});
