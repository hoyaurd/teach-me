// Notification.tsx
// Page des notifications. Elle affiche deux types de cartes :
// 1. Les demandes REÇUES (aId = mon uid) avec les boutons Accepter / Refuser.
// 2. Les réponses à mes demandes ENVOYÉES (deId = mon uid) quand l'autre
//    utilisateur a accepté ou refusé : "Votre demande ... a été acceptée".
// Tout vient de la collection Firestore "demandes", en temps réel.
//
// Point rouge : quand quelqu'un répond à ma demande, "reponseVue" passe à
// false (point rouge chez moi). En ouvrant cette page, je la marque "vue".
//
// NOUVEAU : quand j'accepte ou refuse une demande, celui qui l'avait envoyée
// reçoit une notification push "Vous avez une nouvelle notification".

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { getAuth } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { db } from "../../lib/firebase";
// NOUVEAU : pour envoyer la notification push
import { envoyerPush } from "../../lib/notification";
// Choisit la bonne page de publication selon le profil (comme sur l'accueil)
import { alerte } from "../../lib/alerte";
import { getRoutePublier } from "../../lib/Profil";
import { useBarreLaterale } from "../../lib/useBarreLaterale";

// Couleur principale de l'app (bleu Teach-Me).
const BLEU = "#2E3FCB";
const GRIS = "#8A8A8A";
const VERT = "#1E8E3E";
const ROUGE = "#C0392B";

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

// Transforme la date Firestore en texte (ex : "16/10/2026").
function formaterDate(creeLe: any): string {
  if (!creeLe?.seconds) return "";
  return new Date(creeLe.seconds * 1000).toLocaleDateString("fr-FR");
}

export default function EcranNotification() {
  const router = useRouter();
  // Site web grand écran : le menu latéral remplace la barre du bas
  const barreLaterale = useBarreLaterale();

  // Demandes que j'ai REÇUES
  const [recues, setRecues] = useState<any[]>([]);
  // Réponses (acceptée / refusée) à mes demandes ENVOYÉES
  const [reponses, setReponses] = useState<any[]>([]);

  // Onglet actif de la barre du bas : "Notification" puisqu'on est sur cette page.
  const [ongletActif, setOngletActif] = useState("Notification");

  // Écoute en temps réel les deux listes.
  useEffect(() => {
    const moi = getAuth().currentUser;
    if (!moi) return;

    // 1. Demandes reçues : celles qui me sont adressées
    const qRecues = query(
      collection(db, "demandes"),
      where("aId", "==", moi.uid),
    );
    const arreterRecues = onSnapshot(
      qRecues,
      (snapshot) => {
        setRecues(
          snapshot.docs.map((d: any) => ({
            id: d.id,
            ...d.data(),
            sens: "recue",
          })),
        );
      },
      (erreur) => console.log("Erreur lecture demandes reçues :", erreur),
    );

    // 2. Demandes envoyées : on ne garde que celles qui ont une réponse
    const qEnvoyees = query(
      collection(db, "demandes"),
      where("deId", "==", moi.uid),
    );
    const arreterEnvoyees = onSnapshot(
      qEnvoyees,
      (snapshot) => {
        const liste = snapshot.docs
          .map((d: any) => ({ id: d.id, ...d.data(), sens: "reponse" }))
          .filter((d: any) => d.statut !== "en_attente");

        setReponses(liste);

        // Ces réponses sont affichées à l'écran, donc je les
        // marque comme "vues" (le point rouge disparaît).
        liste.forEach((d: any) => {
          if (d.reponseVue === false) {
            updateDoc(doc(db, "demandes", d.id), { reponseVue: true }).catch(
              (erreur) => console.log("Erreur marquage réponse vue :", erreur),
            );
          }
        });
      },
      (erreur) => console.log("Erreur lecture réponses :", erreur),
    );

    // Quand on quitte l'écran, on arrête d'écouter
    return () => {
      arreterRecues();
      arreterEnvoyees();
    };
  }, []);

  // Les deux listes réunies, les plus récentes en premier.
  const notifications = [...recues, ...reponses].sort(
    (a: any, b: any) => (b.creeLe?.seconds ?? 0) - (a.creeLe?.seconds ?? 0),
  );

  // Enregistre ma réponse : "acceptee" ou "refusee".
  // On enregistre aussi MON nom, pour que l'autre sache qui a répondu.
  // idExpediteur = uid de celui qui avait envoyé la demande (il sera notifié).
  async function repondre(
    idDemande: string,
    statut: "acceptee" | "refusee",
    idExpediteur: string,
  ) {
    try {
      // 1. Je récupère mon nom dans la collection "utilisateurs"
      const moi = getAuth().currentUser;
      let monNom = "";
      if (moi) {
        const snap = await getDoc(doc(db, "utilisateurs", moi.uid));
        const data: any = snap.exists() ? snap.data() : {};

        // Pour voir dans la console comment s'appellent tes champs
        console.log("Champs utilisateur :", data);

        // On essaie plusieurs noms de champs courants,
        // puis le nom du compte Firebase en dernier recours
        monNom =
          data.nomComplet ||
          data.displayName ||
          data.name ||
          `${data.prenom ?? data.prenoms ?? ""} ${data.nom ?? ""}`.trim() ||
          moi.displayName ||
          "";
      }

      // 2. J'enregistre la réponse avec mon nom.
      // reponseVue = false -> point rouge chez celui qui avait
      // envoyé la demande, jusqu'à ce qu'il ouvre ses notifications.
      await updateDoc(doc(db, "demandes", idDemande), {
        statut,
        repondeParNom: monNom,
        reponseVue: false,
      });

      // 3. NOUVEAU : notification push pour celui qui avait envoyé la demande
      // (il la reçoit même si son app est fermée).
      if (idExpediteur) {
        envoyerPush(idExpediteur, "Vous avez une nouvelle notification");
      }
    } catch (erreur) {
      console.log("Erreur réponse demande :", erreur);
      alerte("Erreur", "Impossible d'enregistrer ta réponse. Réessaie.");
    }
  }

  // Au clic sur "Publier" : même logique que sur l'accueil
  // (accompagnateur -> /Publier_service, les autres -> /Publier_Demande).
  async function ouvrirPublier() {
    const route = await getRoutePublier();
    router.push(route as any);
  }

  // Carte d'une réponse à MA demande (acceptée ou refusée)
  function carteReponse(item: any) {
    const acceptee = item.statut === "acceptee";

    return (
      <View style={styles.carteNotif}>
        <View style={styles.iconeConteneur}>
          <Ionicons
            name={acceptee ? "checkmark-circle" : "close-circle"}
            size={24}
            color={acceptee ? VERT : ROUGE}
          />
        </View>

        <View style={styles.infosNotif}>
          <Text style={styles.messageNotif}>
            Votre demande d'accompagnement en{" "}
            <Text style={styles.gras}>{item.matiere}</Text> a été{" "}
            <Text style={[styles.gras, { color: acceptee ? VERT : ROUGE }]}>
              {acceptee ? "acceptée" : "refusée"}
            </Text>{" "}
            par{" "}
            {/* Nom de celui qui a répondu : repondeParNom (le plus fiable),
                sinon aNom (nom enregistré à l'envoi), sinon "l'utilisateur" */}
            <Text style={styles.gras}>
              {item.repondeParNom || item.aNom || "l'utilisateur"}
            </Text>
            .
          </Text>

          <Text style={styles.heureNotif}>{formaterDate(item.creeLe)}</Text>
        </View>
      </View>
    );
  }

  // Carte d'une demande REÇUE (avec les boutons si pas encore de réponse)
  function carteRecue(item: any) {
    const enAttente = item.statut === "en_attente";

    return (
      // Les demandes en attente sont mises en évidence (fond bleu clair)
      <View style={[styles.carteNotif, enAttente && styles.carteNonLue]}>
        <View style={styles.iconeConteneur}>
          <Ionicons name="person-add" size={22} color={BLEU} />
        </View>

        <View style={styles.infosNotif}>
          <Text style={styles.messageNotif}>
            Vous avez reçu une demande d'accompagnement en{" "}
            <Text style={styles.gras}>{item.matiere}</Text> de la part de{" "}
            <Text style={styles.gras}>{item.deNom}</Text>.
          </Text>

          <Text style={styles.heureNotif}>{formaterDate(item.creeLe)}</Text>

          {/* Boutons si pas encore de réponse, sinon le résultat */}
          {enAttente ? (
            <View style={styles.boutons}>
              <TouchableOpacity
                style={[styles.bouton, styles.boutonAccepter]}
                onPress={() => repondre(item.id, "acceptee", item.deId)}
              >
                <Text style={styles.boutonTexte}>Accepter la demande</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.bouton, styles.boutonRefuser]}
                onPress={() => repondre(item.id, "refusee", item.deId)}
              >
                <Text style={styles.boutonTexteRefuser}>
                  Refuser la demande
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Text
              style={
                item.statut === "acceptee" ? styles.accepte : styles.refuse
              }
            >
              {item.statut === "acceptee"
                ? "Demande acceptée"
                : "Demande refusée"}
            </Text>
          )}
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.conteneur}>
      {/* ---------- En-tête ---------- */}
      <Text style={styles.titre}>Notifications</Text>

      {/* ---------- Liste des notifications ---------- */}
      {notifications.length === 0 ? (
        <View style={styles.etatVide}>
          <Ionicons name="notifications-off-outline" size={48} color={GRIS} />
          <Text style={styles.texteEtatVide}>
            Aucune notification pour l'instant
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          // "sens" dans la clé : une même demande ne peut pas apparaître deux fois
          keyExtractor={(item: any) => item.sens + item.id}
          contentContainerStyle={styles.listeContenu}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }: any) =>
            item.sens === "reponse" ? carteReponse(item) : carteRecue(item)
          }
        />
      )}

      {/* ---------- Barre de navigation du bas ---------- */}
      <View
        style={[styles.barreNavigation, barreLaterale && { display: "none" }]}
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
                  router.push(ROUTES.messages);
                } else if (onglet.cle === "Publier") {
                  ouvrirPublier();
                } else if (onglet.cle === "Notification") {
                  setOngletActif("Notification"); // déjà sur cette page
                } else if (onglet.cle === "Profil") {
                  router.push(ROUTES.profil);
                } else {
                  setOngletActif(onglet.cle);
                }
              }}
            >
              <Ionicons
                name={(estActif ? onglet.iconeActif : onglet.icone) as any}
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

  // --- En-tête ---
  titre: {
    fontSize: 26,
    fontWeight: "800",
    color: BLEU,
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 16,
  },

  // --- Liste ---
  listeContenu: {
    paddingHorizontal: 20,
    paddingBottom: 30,
    gap: 12,
  },

  // --- Carte notification ---
  carteNotif: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    borderRadius: 14,
    backgroundColor: "#F7F8FD",
    padding: 14,
  },
  // Demande reçue en attente de réponse
  carteNonLue: {
    backgroundColor: "#EEF1FD",
    borderWidth: 1,
    borderColor: "#D6DBF9",
  },
  iconeConteneur: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  infosNotif: {
    flex: 1,
  },
  messageNotif: {
    fontSize: 15,
    lineHeight: 22,
    color: "#1A1A1A",
  },
  gras: {
    fontWeight: "700",
  },
  heureNotif: {
    fontSize: 12,
    color: "#B0B0B0",
    marginTop: 4,
  },

  // --- Boutons ---
  boutons: {
    gap: 8,
    marginTop: 12,
  },
  bouton: {
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: "center",
  },
  boutonAccepter: {
    backgroundColor: BLEU,
  },
  boutonRefuser: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: ROUGE,
  },
  boutonTexte: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },
  boutonTexteRefuser: {
    color: ROUGE,
    fontWeight: "700",
    fontSize: 14,
  },

  // --- Résultat après ma réponse ---
  accepte: {
    marginTop: 10,
    fontWeight: "700",
    color: VERT,
  },
  refuse: {
    marginTop: 10,
    fontWeight: "700",
    color: ROUGE,
  },

  // --- État vide ---
  etatVide: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    gap: 12,
  },
  texteEtatVide: {
    fontSize: 15,
    color: GRIS,
    textAlign: "center",
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
