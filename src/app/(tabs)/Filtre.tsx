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

// Même bleu que le reste de l'app. Change juste cette valeur si besoin.
const BLEU = "#2E3FCB";
const GRIS = "#8A8A8A";

// Liste des filtres disponibles. Chaque filtre a une clé unique (utilisée
// dans le code) et un libellé (affiché à l'écran).
const FILTRES_DISPONIBLES = [
  { cle: "service_pedagogique", label: "Service pédagogique" },
  { cle: "demande_accompagnement", label: "Demande d'accompagnement" },
  { cle: "en_ligne", label: "En ligne" },
  { cle: "en_presentiel", label: "En présentiel" },
  { cle: "a_domicile", label: "À domicile" },
  { cle: "Bas_prix", label: "Bas prix" },
  { cle: "prix_eleve", label: "Prix élevé" },
];

export default function EcranFiltre() {
  const router = useRouter();

  // Tableau des clés actuellement cochées, ex: ["en_ligne", "a_domicile"]
  const [filtresSelectionnes, setFiltresSelectionnes] = useState([]);

  // Coche/décoche un filtre quand on clique dessus
  function basculerFiltre(cle) {
    setFiltresSelectionnes(
      (filtresActuels) =>
        filtresActuels.includes(cle)
          ? filtresActuels.filter((f) => f !== cle) // déjà coché -> on l'enlève
          : [...filtresActuels, cle], // pas coché -> on l'ajoute
    );
  }

  // Décoche tous les filtres
  function reinitialiserFiltres() {
    setFiltresSelectionnes([]);
  }

  // Applique les filtres choisis et revient à l'écran précédent.
  // On renvoie la liste des filtres via les params de navigation, pour
  // que l'écran d'accueil puisse les récupérer avec useLocalSearchParams().
  function appliquerFiltres() {
    router.navigate({
      pathname: "Acceuil",
      params: { filtres: JSON.stringify(filtresSelectionnes) },
    });
  }

  return (
    <SafeAreaView style={styles.conteneur}>
      {/* ---------- En-tête ---------- */}
      <View style={styles.entete}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="arrow-back" size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.titre}>Filtres</Text>
        <TouchableOpacity onPress={reinitialiserFiltres} hitSlop={10}>
          <Text style={styles.reinitialiser}>Réinitialiser</Text>
        </TouchableOpacity>
      </View>

      {/* ---------- Liste des filtres à cocher ---------- */}
      <ScrollView
        style={styles.contenu}
        contentContainerStyle={styles.listeContenu}
        showsVerticalScrollIndicator={false}
      >
        {FILTRES_DISPONIBLES.map((filtre) => {
          const estCoche = filtresSelectionnes.includes(filtre.cle);

          return (
            <TouchableOpacity
              key={filtre.cle}
              style={styles.ligneFiltre}
              activeOpacity={0.7}
              onPress={() => basculerFiltre(filtre.cle)}
            >
              <Text style={styles.labelFiltre}>{filtre.label}</Text>

              {/* Case à cocher */}
              <View
                style={[
                  styles.caseACocher,
                  estCoche && styles.caseACocherCochee,
                ]}
              >
                {estCoche && (
                  <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ---------- Bouton Appliquer ---------- */}
      <View style={styles.piedDePage}>
        <TouchableOpacity
          style={styles.boutonAppliquer}
          activeOpacity={0.8}
          onPress={appliquerFiltres}
        >
          <Text style={styles.texteBoutonAppliquer}>
            Appliquer{" "}
            {filtresSelectionnes.length > 0
              ? `(${filtresSelectionnes.length})`
              : ""}
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
    marginBottom: 20,
  },
  titre: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1A1A1A",
  },
  reinitialiser: {
    fontSize: 13,
    fontWeight: "700",
    color: BLEU,
  },

  // --- Liste des filtres ---
  contenu: {
    flex: 1,
  },
  listeContenu: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  ligneFiltre: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#EEEEEE",
  },
  labelFiltre: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1A1A1A",
  },
  caseACocher: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: GRIS,
    alignItems: "center",
    justifyContent: "center",
  },
  caseACocherCochee: {
    backgroundColor: BLEU,
    borderColor: BLEU,
  },

  // --- Pied de page ---
  piedDePage: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    paddingTop: 10,
  },
  boutonAppliquer: {
    backgroundColor: BLEU,
    borderRadius: 30,
    paddingVertical: 15,
    alignItems: "center",
  },
  texteBoutonAppliquer: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
});
