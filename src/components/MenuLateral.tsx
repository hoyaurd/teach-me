// src/components/MenuLateral.tsx
//
// Menu à gauche du site web (PC et tablette). Il remplace la barre du bas.
// Il n'est utilisé que sur le web (voir app/(tabs)/_layout.web.tsx) :
// le téléphone garde sa barre du bas.
//
// - La page active est surlignée en bleu.
// - Les points rouges (nouveau message / nouvelle notification) sont conservés.
// - "Publier" ouvre la bonne page selon le profil (comme sur mobile).

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { getRoutePublier } from "../lib/Profil";
import { LARGEUR_MENU } from "../lib/useBarreLaterale";
import {
  useNouveauMessage,
  useNouvelleNotification,
} from "../lib/useNouvelleNotification";

const BLEU = "#2E3FCB";
const FOND_ACTIF = "#EEF1FD";
const FOND_SURVOL = "#F4F5FA";

// Image du bouton "Assistant" (la même que le bouton flottant du mobile)
const ICONE_ASSISTANT = require("../../assets/images/icone-bouton-flottant.png");

type Entree = {
  cle: string;
  label: string;
  icone: string;
  iconeActif: string;
  // Page ouverte au clic (null = calculée au clic, pour "Publier")
  route: string | null;
  // Pages (en minuscules) pour lesquelles cette entrée est surlignée
  actives: string[];
};

const PRINCIPAL: Entree[] = [
  {
    cle: "Accueil",
    label: "Accueil",
    icone: "home-outline",
    iconeActif: "home",
    route: "/Acceuil",
    actives: ["/acceuil", "/detail_profil", "/filtre"],
  },
  {
    cle: "Messages",
    label: "Messages",
    icone: "chatbubble-ellipses-outline",
    iconeActif: "chatbubble-ellipses",
    route: "/Messages",
    actives: ["/messages", "/discussion"],
  },
  {
    cle: "Publier",
    label: "Publier",
    icone: "add-circle-outline",
    iconeActif: "add-circle",
    route: null,
    actives: ["/publier_service", "/publier_demande"],
  },
  {
    cle: "Notification",
    label: "Notification",
    icone: "notifications-outline",
    iconeActif: "notifications",
    route: "/Notification",
    actives: ["/notification"],
  },
  {
    cle: "Profil",
    label: "Profil",
    icone: "person-outline",
    iconeActif: "person",
    route: "/Profil",
    actives: ["/profil", "/modifier_profile"],
  },
];

const SECONDAIRE: Entree[] = [
  {
    cle: "Assistant",
    label: "Assistant IA",
    icone: "",
    iconeActif: "",
    route: "/Chat_Bot",
    actives: ["/chat_bot", "/historique ia"],
  },
  {
    cle: "Parametres",
    label: "Paramètres",
    icone: "settings-outline",
    iconeActif: "settings",
    route: "/Parametres",
    actives: ["/parametres", "/a_propos"],
  },
];

export default function MenuLateral({ route }: { route: string }) {
  const router = useRouter();

  // Points rouges (false = ils n'envoient pas de notification en plus :
  // c'est déjà fait par les écrans)
  const aNouvelleNotif = useNouvelleNotification(false);
  const aNouveauMessage = useNouveauMessage(false);

  async function aller(entree: Entree) {
    // Déjà sur la page principale de cette entrée : rien à faire
    if (route === entree.actives[0]) return;
    if (entree.cle === "Publier" && entree.actives.includes(route)) return;

    if (entree.route === null) {
      const routePublier = await getRoutePublier();
      router.push(routePublier as any);
    } else {
      router.push(entree.route as any);
    }
  }

  function ligne(entree: Entree) {
    const actif = entree.actives.includes(route);
    const pastille =
      !actif &&
      ((entree.cle === "Notification" && aNouvelleNotif) ||
        (entree.cle === "Messages" && aNouveauMessage));

    return (
      <Pressable
        key={entree.cle}
        accessibilityRole="button"
        accessibilityLabel={entree.label}
        onPress={() => aller(entree)}
        style={(etat: any) => [
          styles.ligne,
          etat.hovered && { backgroundColor: FOND_SURVOL },
          actif && { backgroundColor: FOND_ACTIF },
          { cursor: "pointer" } as any,
        ]}
      >
        <View>
          {entree.cle === "Assistant" ? (
            <Image
              source={ICONE_ASSISTANT}
              style={styles.iconeAssistant}
              resizeMode="cover"
            />
          ) : (
            <Ionicons
              name={(actif ? entree.iconeActif : entree.icone) as any}
              size={24}
              color={actif ? BLEU : "#1A1A1A"}
            />
          )}
          {pastille && <View style={styles.pointRouge} />}
        </View>
        <Text style={[styles.libelle, actif && styles.libelleActif]}>
          {entree.label}
        </Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.menu}>
      {/* Logo : ramène à l'accueil */}
      <Pressable
        onPress={() => route !== "/acceuil" && router.push("/Acceuil" as any)}
        style={{ cursor: "pointer" } as any}
      >
        <Text style={styles.logo}>Teach-Me</Text>
      </Pressable>

      <View style={styles.groupe}>{PRINCIPAL.map(ligne)}</View>

      <View style={{ flex: 1 }} />

      <View style={styles.separateur} />
      <View style={styles.groupe}>{SECONDAIRE.map(ligne)}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  menu: {
    width: LARGEUR_MENU,
    backgroundColor: "#FFFFFF",
    borderRightWidth: 1,
    borderRightColor: "#E5E7EB",
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  logo: {
    fontSize: 28,
    fontWeight: "800",
    color: BLEU,
    paddingHorizontal: 12,
    marginBottom: 24,
  },
  groupe: {
    gap: 4,
  },
  ligne: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  libelle: {
    fontSize: 16,
    color: "#1A1A1A",
  },
  libelleActif: {
    color: BLEU,
    fontWeight: "700",
  },
  separateur: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 12,
  },
  iconeAssistant: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: BLEU,
  },
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
