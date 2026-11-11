// Acceuil.tsx
// Page d'accueil : liste des publications (services et demandes),
// barre de recherche et barre de navigation du bas.
//
// RECHERCHE :
// - Quand on tape dans la barre de recherche, la liste est filtrée
//   en direct selon le NOM, la MATIÈRE ou le NIVEAU.
// - Les majuscules et les accents sont ignorés
//   ("francais" trouve "Français").
// - Barre vide : toutes les publications sont affichées.
//
// Points rouges dans la barre du bas :
// - Notification : nouvelle demande ou réponse à ma demande
// - Messages : message reçu non lu
//
// ADAPTATION À TOUS LES ÉCRANS :
// - Les tailles (textes, photos, icônes) sont mises à l'échelle selon la
//   largeur de l'écran (référence : un téléphone de 390 px de large).
// - La barre du bas respecte la zone de sécurité (boutons Android, barre
//   de gestes iPhone) grâce à useSafeAreaInsets.
// - Le bouton flottant se place toujours juste au-dessus de la barre du bas,
//   quelle que soit sa hauteur (mesurée avec onLayout).
// - Sur tablette, le contenu est centré avec une largeur maximale.
// - Les textes ne grossissent pas à l'infini si l'utilisateur a réglé une
//   très grande police dans son téléphone.

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
// Fonctions Firestore pour lire les publications
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { db } from "../../lib/firebase";
// Fonction qui choisit la bonne page de publication selon le profil
import { getRoutePublier } from "../../lib/Profil";
// Menu latéral du site web (PC / tablette) : grille de cartes à la place de la liste
import {
  LARGEUR_MAX_GRILLE,
  LARGEUR_MENU,
  useBarreLaterale,
} from "../../lib/useBarreLaterale";

// Points rouges : nouvelle notification (demande) et nouveau message
import {
  useNouveauMessage,
  useNouvelleNotification,
} from "../../lib/useNouvelleNotification";

// Couleur principale de l'app (bleu Teach-Me).
const BLEU = "#2E3FCB";
const GRIS = "#4A4A4A";

// Largeur de référence (un téléphone courant) et largeur maximale du
// contenu (pour que la liste ne s'étire pas trop sur tablette).
const LARGEUR_REFERENCE = 390;
const LARGEUR_MAX_CONTENU = 700;

// Les textes ne grossiront pas au-delà de 120 % même si la police du
// téléphone est réglée très grande (sinon la mise en page casse).
const GROSSISSEMENT_MAX = 1.2;

// Routes de l'app. Elles doivent commencer par "/" et correspondre
// exactement au nom des fichiers dans ton dossier app/. Adapte-les ici.
const ROUTES = {
  // Route vers le profil détaillé d'un accompagnateur consulté depuis la liste.
  profil: "/Detail_Profil",
  chatBot: "/Chat_Bot",
  parametres: "/Parametres",
  messages: "/Messages",
  notification: "/Notification",
  // Route vers la propre page profil de l'utilisateur connecté (onglet du bas).
  monProfil: "/Profil",
};

// Image utilisée dans le bouton flottant (adapte le chemin si besoin).
const ICONE_BOUTON_FLOTTANT = require("../../../assets/images/icone-bouton-flottant.png");

// Onglets de la barre de navigation du bas.
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

// Affiche le niveau, qu'il soit un texte ("Terminale C")
// ou un tableau (["6ème", "5ème"]).
function texteNiveau(niveau) {
  if (Array.isArray(niveau)) return niveau.join(", ");
  return niveau ?? "";
}

// Même principe que texteNiveau, mais pour n'importe quel champ.
// Transforme une liste (ex : ["En ligne", "En présentiel"]) en texte
// "En ligne, En présentiel". Un texte simple est renvoyé tel quel.
function enTexte(valeur) {
  if (Array.isArray(valeur)) return valeur.join(", ");
  return valeur ?? "";
}

// Prépare un texte pour la recherche : tout en minuscules et sans accents.
// Exemple : "Français" devient "francais".
// Ainsi "FRANÇAIS", "français" et "francais" sont considérés identiques.
function normaliser(texte) {
  return (texte ?? "")
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

// Une carte de publication sur l'accueil.
// Elle va chercher la photo de l'auteur à partir de son uid.
// "styles" et "t" viennent de l'écran principal (tailles adaptées à l'écran).
// grille / largeurCarte : sur le site web grand écran, la carte est un bloc
// encadré de largeur fixe (plusieurs cartes par ligne).
function CartePublication({ pub, onPress, styles, t, grille, largeurCarte }) {
  const [photo, setPhoto] = useState("");

  useEffect(() => {
    getDoc(doc(db, "utilisateurs", pub.uid))
      .then((snap) => {
        if (snap.exists()) setPhoto(snap.data().photoUrl ?? "");
      })
      .catch(() => {}); // pas de photo : on garde l'icône par défaut
  }, [pub.uid]);

  const estService = pub.type === "service";

  return (
    <TouchableOpacity
      style={[
        styles.carteAccompagnateur,
        grille && {
          width: largeurCarte,
          borderWidth: 1,
          borderColor: "#E0E0E0",
          borderRadius: 16,
          paddingHorizontal: 16,
          paddingVertical: 14,
        },
      ]}
      activeOpacity={0.7}
      onPress={onPress}
    >
      {photo ? (
        <Image source={{ uri: photo }} style={styles.photoAccompagnateur} />
      ) : (
        <View style={styles.photoPlaceholder}>
          <Ionicons name="person" size={t(36)} color="#FFFFFF" />
        </View>
      )}

      <View style={styles.infosAccompagnateur}>
        {/* Nom + étiquette Service / Demande */}
        <View style={styles.ligneNom}>
          <Text
            style={styles.nomAccompagnateur}
            numberOfLines={1}
            maxFontSizeMultiplier={GROSSISSEMENT_MAX}
          >
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
              maxFontSizeMultiplier={GROSSISSEMENT_MAX}
            >
              {estService ? "Service" : "Demande"}
            </Text>
          </View>
        </View>

        {/* Matière et niveau sur une seule ligne */}
        <Text
          style={styles.matiereAccompagnateur}
          numberOfLines={1}
          maxFontSizeMultiplier={GROSSISSEMENT_MAX}
        >
          {pub.matiere} · {texteNiveau(pub.niveau)}
        </Text>

        {/* Localisation (affichée seulement si elle existe) */}
        {pub.lieu ? (
          <View style={styles.ligneLieu}>
            <Ionicons name="location-outline" size={t(15)} color="#7A7A7A" />
            <Text
              style={styles.lieuAccompagnateur}
              numberOfLines={1}
              maxFontSizeMultiplier={GROSSISSEMENT_MAX}
            >
              {pub.lieu}
            </Text>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

export default function EcranAccueil() {
  const router = useRouter();

  // --- Adaptation à l'écran ---
  // Largeur de l'écran (se met à jour si on tourne le téléphone)
  const { width } = useWindowDimensions();
  // Zones de sécurité (encoche, barre de gestes, boutons Android)
  const insets = useSafeAreaInsets();

  // Échelle : 1 pour un écran de 390 px, limitée entre 0.85 et 1.2
  const echelle = Math.min(Math.max(width / LARGEUR_REFERENCE, 0.85), 1.2);
  // t(20) = 20 adapté à l'écran
  const t = (valeur: number) => Math.round(valeur * echelle);

  // Les styles sont recalculés seulement si l'échelle change
  const styles = useMemo(() => creerStyles(echelle), [echelle]);

  // --- Site web grand écran : menu latéral + grille de cartes ---
  // barreLaterale = true sur PC / tablette (web). Sur téléphone : false, rien ne change.
  const barreLaterale = useBarreLaterale();
  const ESPACE_GRILLE = 16;
  // Largeur de la zone de contenu (écran moins le menu, limitée à 1200 px)
  const largeurZone = Math.min(width - LARGEUR_MENU, LARGEUR_MAX_GRILLE);
  // 3 colonnes sur grand PC, 2 sur PC / tablette, 1 sinon
  const colonnes = !barreLaterale
    ? 1
    : largeurZone >= 1000
      ? 3
      : largeurZone >= 640
        ? 2
        : 1;
  // Largeur d'une carte (20 px de marge pour la barre de défilement)
  const largeurCarte = Math.floor(
    (largeurZone - 20 - ESPACE_GRILLE * 2 - ESPACE_GRILLE * (colonnes - 1)) /
      colonnes,
  );

  // Hauteur réelle de la barre du bas (pour placer le bouton flottant)
  const [hauteurBarre, setHauteurBarre] = useState(80);

  // Texte tapé dans la barre de recherche
  const [recherche, setRecherche] = useState("");
  const [ongletActif, setOngletActif] = useState("Accueil");

  // true s'il y a une nouvelle demande ou réponse -> point rouge sur Notification
  const aNouvelleNotif = useNouvelleNotification();
  // true s'il y a un message non lu -> point rouge sur Messages
  const aNouveauMessage = useNouveauMessage();

  // Liste des publications lues dans Firestore
  const [publications, setPublications] = useState([]);

  // Écoute la collection "publications" en temps réel :
  // dès que quelqu'un publie (ou supprime), la liste se met à jour toute seule.
  useEffect(() => {
    const q = query(collection(db, "publications"), orderBy("creeLe", "desc"));

    const arreter = onSnapshot(
      q,
      (snapshot) => {
        setPublications(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
      },
      (erreur) => console.log("Erreur lecture publications :", erreur),
    );

    // Quand on quitte l'écran, on arrête d'écouter
    return arreter;
  }, []);

  // Liste filtrée par la recherche.
  // Une publication est gardée si le texte tapé apparaît dans son
  // nom, sa matière ou son niveau. Barre vide : on garde tout.
  // Elle est recalculée seulement quand "publications" ou "recherche" change.
  const publicationsFiltrees = useMemo(() => {
    const mot = normaliser(recherche.trim());
    if (mot === "") return publications; // barre vide : on montre tout

    return publications.filter(
      (pub) =>
        normaliser(pub.nom).includes(mot) ||
        normaliser(pub.matiere).includes(mot) ||
        normaliser(texteNiveau(pub.niveau)).includes(mot),
    );
  }, [publications, recherche]);

  // Ouvre l'écran de détail de la publication cliquée.
  // On envoie TOUTES les infos de la publication
  // (tarif, rémunération, lieu de cours, expérience, précisions, type).
  // Les paramètres de route doivent être du texte : les listes cochées
  // sont donc converties avec enTexte().
  function ouvrirProfil(pub) {
    router.push({
      pathname: ROUTES.profil,
      params: {
        id: pub.uid, // identifiant de l'auteur
        pubId: pub.id, // NOUVEAU : identifiant de la publication (pour la supprimer)
        nom: pub.nom ?? "",
        photo: "", // la photo est chargée par la carte, pas passée en paramètre
        matiere: pub.matiere ?? "",
        niveau: texteNiveau(pub.niveau),
        lieu: pub.lieu ?? "",
        bio: pub.presentation ?? "",

        // --- Le reste de la publication ---
        type: pub.type ?? "", // "service" ou "demande"
        tarif: pub.tarif ?? "",
        remuneration: enTexte(pub.remuneration),
        lieuTravail: enTexte(pub.lieuTravail),
        experience: pub.experience ?? "", // présent seulement pour un service
        precisions: pub.precisions ?? "", // présent seulement pour une demande
      },
    });
  }

  function allerAuChatBot() {
    router.push(ROUTES.chatBot);
  }

  function ouvrirParametres() {
    router.push(ROUTES.parametres);
  }

  function ouvrirMessages() {
    router.push(ROUTES.messages);
  }

  // Au clic sur "Publier" :
  // - accompagnateur -> /Publier_service
  // - parent / élève / étudiant -> /Publier_Demande
  async function ouvrirPublier() {
    const route = await getRoutePublier();
    router.push(route as any);
  }

  function ouvrirNotification() {
    router.push(ROUTES.notification);
  }

  function ouvrirMonProfil() {
    router.push(ROUTES.monProfil);
  }

  return (
    // On protège seulement le haut, les côtés (encoche en paysage) :
    // le bas est géré à la main sur la barre de navigation.
    <SafeAreaView style={styles.conteneur} edges={["top", "left", "right"]}>
      {/* ---------- Colonne principale (centrée et limitée sur tablette) ---------- */}
      <View style={[styles.colonne, barreLaterale && { maxWidth: "100%" }]}>
        {/* ---------- En-tête : logo + bouton paramètres ---------- */}
        <View style={styles.entete}>
          <Text style={styles.logo} maxFontSizeMultiplier={GROSSISSEMENT_MAX}>
            {barreLaterale ? (
              "Accueil"
            ) : (
              <>
                Teach<Text style={styles.logoTrait}>-</Text>Me
              </>
            )}
          </Text>
          <TouchableOpacity hitSlop={12} onPress={ouvrirParametres}>
            <Ionicons name="settings-outline" size={t(22)} color="#000000" />
          </TouchableOpacity>
        </View>

        {/* ---------- Barre de recherche ---------- */}
        <View
          style={[styles.barreRecherche, barreLaterale && { maxWidth: 640 }]}
        >
          <Ionicons name="search" size={t(20)} color={GRIS} />
          <TextInput
            style={styles.champRecherche}
            value={recherche}
            onChangeText={setRecherche}
            placeholder="Rechercher sur Teach-Me"
            placeholderTextColor={GRIS}
            maxFontSizeMultiplier={GROSSISSEMENT_MAX}
          />
        </View>

        {/* ---------- Liste des publications (services et demandes) ---------- */}
        <ScrollView
          style={styles.contenu}
          // Le bas de la liste laisse la place du bouton flottant
          contentContainerStyle={
            barreLaterale
              ? {
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: ESPACE_GRILLE,
                  padding: ESPACE_GRILLE,
                  paddingBottom: 40,
                }
              : { paddingBottom: t(90) }
          }
          showsVerticalScrollIndicator={false}
          // Permet de toucher une carte même si le clavier est ouvert
          keyboardShouldPersistTaps="handled"
        >
          {publicationsFiltrees.length === 0 ? (
            <Text style={styles.vide}>
              {publications.length === 0
                ? "Aucune publication pour le moment."
                : "Aucun résultat pour cette recherche."}
            </Text>
          ) : (
            publicationsFiltrees.map((pub) => (
              <CartePublication
                key={pub.id}
                pub={pub}
                styles={styles}
                t={t}
                grille={barreLaterale}
                largeurCarte={largeurCarte}
                onPress={() => ouvrirProfil(pub)}
              />
            ))
          )}
        </ScrollView>
      </View>

      {/* ---------- Bouton flottant : redirige vers le chatbot ----------
          Il se place toujours juste au-dessus de la barre du bas. */}
      <TouchableOpacity
        style={[
          styles.boutonFlottant,
          { bottom: hauteurBarre + 16 },
          // Sur le site web grand écran, l'assistant est dans le menu latéral
          barreLaterale && { display: "none" },
        ]}
        activeOpacity={0.85}
        onPress={allerAuChatBot}
      >
        <Image
          source={ICONE_BOUTON_FLOTTANT}
          style={styles.imageBoutonFlottant}
          resizeMode="contain"
        />
      </TouchableOpacity>

      {/* ---------- Barre de navigation du bas ---------- */}
      <View
        style={[
          styles.barreNavigation,
          // Respecte la barre de gestes (iPhone) et les boutons (Android)
          { paddingBottom: Math.max(insets.bottom, 12) + t(4) },
          // Site web grand écran : le menu latéral remplace la barre du bas
          barreLaterale && { display: "none" },
        ]}
        // On mesure la hauteur réelle pour placer le bouton flottant
        onLayout={(e) => setHauteurBarre(e.nativeEvent.layout.height)}
      >
        {ONGLETS.map((onglet) => {
          const estActif = ongletActif === onglet.cle;

          return (
            // flex: 1 : les 5 onglets se partagent la largeur à égalité,
            // même sur un tout petit écran.
            <TouchableOpacity
              key={onglet.cle}
              style={styles.onglet}
              onPress={() => {
                if (onglet.cle === "Messages") {
                  ouvrirMessages();
                } else if (onglet.cle === "Publier") {
                  ouvrirPublier();
                } else if (onglet.cle === "Notification") {
                  ouvrirNotification();
                } else if (onglet.cle === "Profil") {
                  ouvrirMonProfil();
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
                  size={t(26)}
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
                maxFontSizeMultiplier={GROSSISSEMENT_MAX}
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

// Les styles sont créés par une fonction : toutes les tailles passent par
// t(), qui adapte la valeur à la largeur de l'écran.
function creerStyles(echelle: number) {
  const t = (valeur: number) => Math.round(valeur * echelle);

  return StyleSheet.create({
    conteneur: {
      flex: 1,
      backgroundColor: "#FFFFFF",
    },

    // Colonne principale : prend tout l'espace au-dessus de la barre du bas,
    // centrée et limitée en largeur sur tablette.
    colonne: {
      flex: 1,
      width: "100%",
      maxWidth: LARGEUR_MAX_CONTENU,
      alignSelf: "center",
    },

    // --- En-tête ---
    entete: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: t(20),
      marginTop: t(16),
      marginBottom: t(14),
    },
    logo: {
      fontSize: t(30),
      fontWeight: "800",
      color: BLEU,
    },
    logoTrait: {
      color: BLEU,
    },

    // --- Barre de recherche ---
    barreRecherche: {
      flexDirection: "row",
      alignItems: "center",
      gap: t(10),
      marginHorizontal: t(20),
      borderWidth: 1.5,
      borderColor: "#000000",
      borderRadius: 30,
      backgroundColor: "#EEF1FD",
      paddingHorizontal: t(16),
      height: t(50),
    },
    champRecherche: {
      flex: 1,
      fontSize: t(14),
      fontWeight: "600",
      color: GRIS,
      height: t(50),
    },

    // --- Contenu principal ---
    contenu: {
      flex: 1,
      marginTop: t(18),
      borderTopWidth: 1,
      borderTopColor: "#E0E0E0",
    },
    // Message affiché quand il n'y a aucune publication ou aucun résultat
    vide: {
      textAlign: "center",
      color: GRIS,
      marginTop: t(40),
      fontSize: t(15),
    },

    // --- Ligne Accompagnateur (style liste, séparateur gris fin) ---
    carteAccompagnateur: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: t(14),
      paddingHorizontal: t(20),
      paddingVertical: t(16),
      borderBottomWidth: 1,
      borderBottomColor: "#E0E0E0", // trait gris fin entre les profils
    },
    photoAccompagnateur: {
      width: t(72),
      height: t(72),
      borderRadius: t(72) / 2, // photo ronde
      backgroundColor: "#B7BEEB",
    },
    photoPlaceholder: {
      width: t(72),
      height: t(72),
      borderRadius: t(72) / 2,
      backgroundColor: "#B7BEEB",
      alignItems: "center",
      justifyContent: "center",
    },
    infosAccompagnateur: {
      flex: 1,
    },
    nomAccompagnateur: {
      flexShrink: 1, // les noms longs ne poussent pas l'étiquette hors de l'écran
      fontSize: t(18),
      fontWeight: "700",
      color: "#1A1A1A",
    },
    matiereAccompagnateur: {
      fontSize: t(16),
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
    lieuAccompagnateur: {
      flex: 1,
      fontSize: t(14),
      fontWeight: "600",
      color: "#7A7A7A",
    },

    // --- Étiquette Service / Demande ---
    ligneNom: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
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
      fontSize: t(11),
      fontWeight: "700",
    },
    etiquetteTexteService: {
      color: BLEU,
    },
    etiquetteTexteDemande: {
      color: "#C2580A",
    },

    // --- Bouton flottant ---
    // (la position "bottom" est ajoutée dans le composant, selon la
    // hauteur réelle de la barre du bas)
    boutonFlottant: {
      position: "absolute",
      right: t(20),
      width: t(56),
      height: t(56),
      borderRadius: t(56) / 2,
      backgroundColor: BLEU,
      overflow: "hidden",
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.25,
      shadowRadius: 5,
      elevation: 6,
    },
    imageBoutonFlottant: {
      width: "110%",
      height: "100%",
      marginTop: t(15),
    },

    // --- Barre de navigation du bas ---
    // (le paddingBottom est ajouté dans le composant, selon la zone de
    // sécurité de l'appareil)
    barreNavigation: {
      flexDirection: "row",
      alignItems: "center",
      borderTopWidth: 1,
      borderTopColor: "#E5E5E5",
      paddingTop: t(10),
      backgroundColor: "#FFFFFF",
    },
    // flex: 1 : chaque onglet prend 1/5 de la largeur
    onglet: {
      flex: 1,
      alignItems: "center",
    },
    libelleOnglet: {
      fontSize: t(11),
      fontWeight: "400",
      color: "#000000",
      marginTop: 2,
    },
    libelleOngletActif: {
      color: BLEU,
    },

    // Point rouge sur les icônes Notification et Messages
    pointRouge: {
      position: "absolute",
      top: -2,
      right: -2,
      width: t(11),
      height: t(11),
      borderRadius: t(11) / 2,
      backgroundColor: "#E53935",
      borderWidth: 1.5,
      borderColor: "#FFFFFF", // petit contour blanc pour bien le détacher
    },
  });
}
