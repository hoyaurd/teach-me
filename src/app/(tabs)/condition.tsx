import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// Couleur principale de l'app (bleu Teach-Me). Change juste cette valeur
// si tu veux ajuster le bleu partout d'un coup.
const BLEU = "#2E3FCB";
const GRIS = "#4A4A4A";

// Date de dernière mise à jour affichée en haut de la page.
// Pense à la changer à chaque modification des conditions.
const DERNIERE_MAJ = "11 septembre 2026";

// Chaque section : un titre et un tableau de paragraphes
const SECTIONS = [
  {
    titre: "1. Acceptation des conditions",
    paragraphes: [
      "En créant un compte ou en utilisant l'application Teach-Me, vous acceptez sans réserve les présentes conditions d'utilisation. Si vous n'acceptez pas ces conditions, merci de ne pas utiliser l'application.",
    ],
  },
  {
    titre: "2. Description du service",
    paragraphes: [
      "Teach-Me est une application de mise en relation entre élèves, étudiants, parents et accompagnateurs pédagogiques (enseignants, répétiteurs, formateurs), du primaire jusqu'à l'université (Licence 1 à Master 2).",
      "Teach-Me agit uniquement en tant qu'intermédiaire technique permettant la mise en relation entre utilisateurs. Teach-Me n'emploie pas les accompagnateurs pédagogiques présents sur la plateforme et ne dispense elle-même aucun cours.",
    ],
  },
  {
    titre: "3. Compte utilisateur",
    paragraphes: [
      "Chaque utilisateur (parent, élève, étudiant ou accompagnateur) doit créer un compte avec des informations exactes et à jour. L'utilisateur est responsable de la confidentialité de ses identifiants et de toute activité effectuée depuis son compte.",
    ],
  },
  {
    titre: "4. Paiement et Mobile Money",
    paragraphes: [
      "Les demandes envoyées ou acceptées sur Teach-Me peuvent être payantes et s'effectuent via Mobile Money (Orange Money, MTN Money, Moov Money, Wave). L'utilisateur est seul responsable de l'exactitude des informations de paiement qu'il renseigne.",
      "Teach-Me n'est pas un opérateur de Mobile Money et décline toute responsabilité en cas de dysfonctionnement, retard ou erreur imputable à un opérateur tiers.",
    ],
  },
  {
    titre: "5. Abonnement Premium",
    paragraphes: [
      "Teach-Me propose un mode Premium payant, donnant accès à des demandes illimitées. L'abonnement Premium ne garantit ni la disponibilité d'un accompagnateur, ni la qualité de l'accompagnement obtenu, ni un résultat scolaire ou académique particulier.",
    ],
  },
  {
    titre: "6. Limitation de responsabilité",
    paragraphes: [
      "L'équipe Teach-Me n'est en aucun cas responsable des échanges, engagements, paiements directs ou litiges intervenant entre les utilisateurs (parents, élèves, étudiants et accompagnateurs), que ceux-ci soient ou non liés à une option Premium.",
      "Teach-Me ne pourra être tenue responsable de la qualité pédagogique des accompagnateurs, du comportement des utilisateurs, des résultats scolaires obtenus, ni d'un quelconque dommage direct ou indirect résultant de l'utilisation de l'application.",
      "L'application est fournie « en l'état », sans garantie de disponibilité continue ou d'absence d'erreurs.",
    ],
  },
  {
    titre: "7. Propriété intellectuelle",
    paragraphes: [
      "Le nom, le logo et l'ensemble des contenus de l'application Teach-Me sont la propriété de l'équipe Teach-Me et ne peuvent être reproduits sans autorisation préalable.",
    ],
  },
  {
    titre: "8. Résiliation",
    paragraphes: [
      "Teach-Me se réserve le droit de suspendre ou de supprimer tout compte ne respectant pas les présentes conditions, sans préavis en cas de manquement grave.",
    ],
  },
  {
    titre: "9. Modification des conditions",
    paragraphes: [
      "Teach-Me peut modifier les présentes conditions à tout moment. Les utilisateurs seront informés de toute modification importante via l'application.",
    ],
  },
  {
    titre: "10. Contact",
    paragraphes: [
      "Pour toute question relative à ces conditions d'utilisation, vous pouvez contacter l'équipe Teach-Me depuis la section « Aide » de l'application.",
    ],
  },
];

export default function EcranConditionsUtilisation() {
  const router = useRouter();

  // L'utilisateur doit cocher la case avant de pouvoir appuyer sur "Accepter"
  const [caseCochee, setCaseCochee] = useState(false);

  function accepterConditions() {
    // TODO: enregistrer l'acceptation des conditions (date, version) dans
    // le state global / contexte d'inscription, puis continuer le parcours
    router.push("/Acceuil");
  }

  return (
    <SafeAreaView style={styles.conteneur}>
      {/* ---------- En-tête : retour + titre ---------- */}
      <View style={styles.entete}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="arrow-back" size={26} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.titreEntete}>Conditions d'utilisation</Text>
        {/* Vue vide pour équilibrer la flèche retour et centrer le titre */}
        <View style={{ width: 26 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.contenuScroll}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.maj}>Dernière mise à jour : {DERNIERE_MAJ}</Text>

        {SECTIONS.map((section) => (
          <View key={section.titre} style={styles.section}>
            <Text style={styles.titreSection}>{section.titre}</Text>
            {section.paragraphes.map((paragraphe, index) => (
              <Text key={index} style={styles.paragraphe}>
                {paragraphe}
              </Text>
            ))}
          </View>
        ))}
      </ScrollView>

      {/* ---------- Case à cocher + bouton Accepter (fixe en bas) ---------- */}
      <View style={styles.piedDePage}>
        <TouchableOpacity
          style={styles.ligneCase}
          activeOpacity={0.7}
          onPress={() => setCaseCochee(!caseCochee)}
        >
          <View
            style={[styles.caseACocher, caseCochee && styles.caseACocherCochee]}
          >
            {caseCochee && (
              <Ionicons name="checkmark" size={16} color="#FFFFFF" />
            )}
          </View>
          <Text style={styles.texteCase}>
            J'ai lu et j'accepte les conditions d'utilisation
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.boutonPrincipal,
            !caseCochee && styles.boutonDesactive,
          ]}
          onPress={accepterConditions}
          disabled={!caseCochee}
        >
          <Text style={styles.texteBoutonPrincipal}>
            Accepter les conditions d'utilisation
          </Text>
        </TouchableOpacity>
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
  entete: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginTop: 50,
    marginBottom: 16,
  },
  titreEntete: {
    fontSize: 18,
    fontWeight: "700",
    color: "#000000",
  },

  // --- Contenu ---
  scroll: {
    flex: 1,
  },
  contenuScroll: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  maj: {
    fontSize: 13,
    fontWeight: "600",
    color: GRIS,
    marginBottom: 20,
  },

  // --- Sections ---
  section: {
    marginBottom: 22,
  },
  titreSection: {
    fontSize: 17,
    fontWeight: "700",
    color: BLEU,
    marginBottom: 8,
  },
  paragraphe: {
    fontSize: 15,
    lineHeight: 22,
    color: GRIS,
    marginBottom: 10,
  },

  // --- Pied de page : case à cocher + bouton Accepter ---
  piedDePage: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: "#E5E5E5",
    backgroundColor: "#FFFFFF",
  },
  ligneCase: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  caseACocher: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: BLEU,
    backgroundColor: "#EEF1FD",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  caseACocherCochee: {
    backgroundColor: BLEU,
  },
  texteCase: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: GRIS,
  },
  boutonPrincipal: {
    backgroundColor: BLEU,
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: "center",
    shadowColor: BLEU,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  boutonDesactive: {
    opacity: 0.5,
  },
  texteBoutonPrincipal: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 16,
    textAlign: "center",
  },
});
