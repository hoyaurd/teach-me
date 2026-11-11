import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
// NOUVEAU : fonction qui enregistre la publication dans Firestore
import { creerPublication } from "../../lib/publications";
import { alerte } from "../../lib/alerte";

// --- Budget horaire proposé (ce que l'utilisateur est prêt à payer) ---
const TARIFS_HORAIRES = [
  "0 – 50 000 FCFA",
  "50 000 – 100 000 FCFA",
  "100 000 – 150 000 FCFA",
  "150 000 – 200 000 FCFA",
  "200 000 – 300 000 FCFA",
  "300 000 – 500 000 FCFA",
  "500 000 – 750 000 FCFA",
  "750 000 – 1 000 000 FCFA",
  "Plus de 1 000 000 FCFA",
];

// --- Type de rémunération souhaité (sélection multiple) ---
const TYPE_DE_REMUNERATION = [
  "Par séance",
  "Par heure",
  "Par mois",
  "Par année",
  "Tous",
];

// --- Lieu de cours souhaité (sélection multiple) ---
const LIEUX_DE_TRAVAIL = ["En ligne", "En présentiel", "Tous"];

// --- Niveau concerné (choix UNIQUE : c'est le niveau de l'élève / étudiant) ---
const NIVEAUX = [
  "CP1",
  "CP2",
  "CE1",
  "CE2",
  "CM1",
  "CM2",
  "6ème",
  "5ème",
  "4ème",
  "3ème",
  "2nde A",
  "2nde C",
  "1ère A",
  "1ère D",
  "1ère C",
  "Terminale A",
  "Terminale D",
  "Terminale C",
  "Licence 1",
  "Licence 2",
  "Licence 3",
  "Master 1",
  "Master 2",
];

// --- Liste déroulante à choix UNIQUE (aucune dépendance externe) ---
// Utilisée pour le niveau et le budget horaire. Le champ ressemble à un
// TextInput ; au clic, une modale s'ouvre avec les choix possibles.
type DropdownProps = {
  placeholder: string;
  value: string;
  options: string[];
  onSelect: (value: string) => void;
};

function Dropdown({ placeholder, value, options, onSelect }: DropdownProps) {
  const [visible, setVisible] = useState(false);

  return (
    <>
      <TouchableOpacity style={styles.input} onPress={() => setVisible(true)}>
        <Text style={value ? styles.inputTexte : styles.inputPlaceholder}>
          {value || placeholder}
        </Text>
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalFond}
          activeOpacity={1}
          onPress={() => setVisible(false)}
        >
          <View style={styles.modalContenu}>
            <FlatList
              data={options}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.optionLigne}
                  onPress={() => {
                    onSelect(item);
                    setVisible(false);
                  }}
                >
                  <Text style={styles.optionTexte}>{item}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

// --- Liste déroulante à CASES A COCHER (choix multiple) ---
// Utilisée pour "Type de rémunération" et "Lieu de cours souhaité".
// `values` est un tableau des éléments cochés ; `onChange` reçoit le
// nouveau tableau à chaque coche/décoche. Un bouton "Valider" ferme la modale.
type MultiSelectDropdownProps = {
  placeholder: string;
  values: string[];
  options: string[];
  onChange: (values: string[]) => void;
};

function MultiSelectDropdown({
  placeholder,
  values,
  options,
  onChange,
}: MultiSelectDropdownProps) {
  const [visible, setVisible] = useState(false);

  // Si on clique sur "Tous", il devient seul sélectionné (et décoche tout
  // le reste). Si on clique sur une autre option, "Tous" est retiré s'il
  // était coché, pour rester cohérent avec ce qu'on a réellement sélectionné.
  const toggleOption = (item: string) => {
    if (item === "Tous") {
      onChange(values.includes("Tous") ? [] : ["Tous"]);
      return;
    }

    const sansTous = values.filter((v) => v !== "Tous");
    if (sansTous.includes(item)) {
      onChange(sansTous.filter((v) => v !== item));
    } else {
      onChange([...sansTous, item]);
    }
  };

  return (
    <>
      <TouchableOpacity style={styles.input} onPress={() => setVisible(true)}>
        <Text
          style={
            values.length > 0 ? styles.inputTexte : styles.inputPlaceholder
          }
        >
          {values.length > 0 ? values.join(", ") : placeholder}
        </Text>
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalFond}
          activeOpacity={1}
          onPress={() => setVisible(false)}
        >
          <View style={styles.modalContenu}>
            <FlatList
              data={options}
              keyExtractor={(item) => item}
              renderItem={({ item }) => {
                const coche = values.includes(item);
                return (
                  <TouchableOpacity
                    style={styles.optionLigne}
                    onPress={() => toggleOption(item)}
                  >
                    <View style={styles.checkboxLigne}>
                      <View
                        style={[styles.checkbox, coche && styles.checkboxCoche]}
                      >
                        {coche && (
                          <Text style={styles.checkboxCoche_texte}>✓</Text>
                        )}
                      </View>
                      <Text style={styles.optionTexte}>{item}</Text>
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
            <TouchableOpacity
              style={styles.boutonValider}
              onPress={() => setVisible(false)}
            >
              <Text style={styles.boutonValiderTexte}>Valider</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

export default function BesoinParentEleveScreen() {
  // Hook de navigation Expo Router : permet de rediriger l'utilisateur.
  const router = useRouter();

  // --- Champs du formulaire de besoin ---
  const [presentation, setPresentation] = useState(""); // texte libre : décrit le besoin
  const [matiereRecherchee, setMatiereRecherchee] = useState(""); // texte libre, matière(s) recherchée(s)
  const [niveau, setNiveau] = useState(""); // choix unique : niveau de l'élève / étudiant
  const [budgetHoraire, setBudgetHoraire] = useState(""); // choisi dans la liste déroulante
  const [precisions, setPrecisions] = useState(""); // infos complémentaires (objectifs, disponibilités...)
  const [typeRemuneration, setTypeRemuneration] = useState<string[]>([]); // cases cochées
  const [lieuDeTravail, setLieuDeTravail] = useState<string[]>([]); // cases cochées

  // true pendant l'enregistrement (désactive le bouton)
  const [loading, setLoading] = useState(false);

  // --- Validation puis enregistrement dans Firestore ---
  const handleSave = async () => {
    if (!presentation.trim()) {
      alerte("Champ manquant", "La présentation est obligatoire.");
      return;
    }

    if (!matiereRecherchee.trim()) {
      alerte("Champ manquant", "La matière recherchée est obligatoire.");
      return;
    }

    try {
      setLoading(true);

      await creerPublication("demande", {
        presentation: presentation.trim(),
        matiere: matiereRecherchee.trim(),
        niveau, // texte (choix unique)
        tarif: budgetHoraire,
        precisions: precisions.trim(),
        remuneration: typeRemuneration, // tableau
        lieuTravail: lieuDeTravail, // tableau
      });

      // L'alerte s'affiche seulement si l'enregistrement a réussi,
      // puis on redirige vers l'accueil quand l'utilisateur appuie sur "OK".
      alerte("Succès", "Votre recherche a été publiée !", [
        {
          text: "OK",
          onPress: () => router.push("/Acceuil"),
        },
      ]);
    } catch (erreur) {
      console.log("Erreur publication :", erreur);
      alerte("Erreur", "Impossible de publier. Réessaie.");
    } finally {
      setLoading(false); // on réactive le bouton dans tous les cas
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#fff" }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* ---------- Croix de fermeture, sert de bouton retour ---------- */}
      <TouchableOpacity
        style={styles.boutonFermer}
        hitSlop={10}
        onPress={() => router.back()}
      >
        <Ionicons name="close" size={26} color="#5B5F76" />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.titre}>Publier demande d'accompagnement</Text>

        {/* Présentation / description du besoin */}
        <Text style={styles.label}>Présentation</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Décris ton besoin : pourquoi tu cherches un accompagnateur, tes objectifs..."
          placeholderTextColor="#9AA0C4"
          value={presentation}
          onChangeText={setPresentation}
          multiline
          numberOfLines={5}
        />

        {/* Matière recherchée (texte libre) */}
        <Text style={styles.label}>Matière recherchée</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex : Mathématiques, Physique,.."
          placeholderTextColor="#9AA0C4"
          value={matiereRecherchee}
          onChangeText={setMatiereRecherchee}
        />

        {/* Niveau (choix unique) */}
        <Text style={styles.label}>Niveau</Text>
        <Dropdown
          placeholder="Choisir un niveau"
          value={niveau}
          options={NIVEAUX}
          onSelect={setNiveau}
        />

        {/* Budget horaire (liste déroulante, choix unique) */}
        <Text style={styles.label}>Budget horaire</Text>
        <Dropdown
          placeholder="Choisir un budget"
          value={budgetHoraire}
          options={TARIFS_HORAIRES}
          onSelect={setBudgetHoraire}
        />

        {/* Précisions complémentaires */}
        <Text style={styles.label}>Précisions</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Ex : disponible les week-ends, besoin de préparer un examen..."
          placeholderTextColor="#9AA0C4"
          value={precisions}
          onChangeText={setPrecisions}
          multiline
          numberOfLines={3}
        />

        {/* Type de rémunération souhaité (cases à cocher) */}
        <Text style={styles.label}>Type de rémunération souhaité</Text>
        <MultiSelectDropdown
          placeholder="Choisir un ou plusieurs types"
          values={typeRemuneration}
          options={TYPE_DE_REMUNERATION}
          onChange={setTypeRemuneration}
        />

        {/* Lieu de cours souhaité (cases à cocher) */}
        <Text style={styles.label}>Lieu de cours souhaité</Text>
        <MultiSelectDropdown
          placeholder="Choisir un ou plusieurs lieux"
          values={lieuDeTravail}
          options={LIEUX_DE_TRAVAIL}
          onChange={setLieuDeTravail}
        />

        {/* Bouton d'enregistrement */}
        <TouchableOpacity
          style={[styles.bouton, loading && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={loading}
        >
          <Text style={styles.boutonTexte}>
            {loading ? "Publication..." : "Publier"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 40,
    backgroundColor: "#fff",
    flexGrow: 1,
  },
  boutonFermer: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EEF0FD",
  },
  titre: {
    marginTop: 50,
    fontSize: 20,
    fontWeight: "bold",
    color: "#5B5F76",
  },
  label: {
    fontSize: 15,
    fontWeight: "700",
    color: "#5B5F76",
    marginTop: 16,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1.5,
    borderColor: "#3B45D1",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    backgroundColor: "#EEF0FD",
    justifyContent: "center",
  },
  inputTexte: {
    fontSize: 15,
    color: "#3A3F55",
  },
  inputPlaceholder: {
    fontSize: 15,
    color: "#9AA0C4",
  },
  textArea: {
    minHeight: 110,
    textAlignVertical: "top",
  },
  bouton: {
    marginTop: 32,
    backgroundColor: "#2E3AC0",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    shadowColor: "#2E3AC0",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  boutonTexte: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
  },
  // --- Styles de la fenêtre modale (listes déroulantes) ---
  modalFond: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    paddingHorizontal: 30,
  },
  modalContenu: {
    backgroundColor: "#fff",
    borderRadius: 14,
    maxHeight: 700,
    paddingVertical: 8,
  },
  optionLigne: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF0FD",
  },
  optionTexte: {
    fontSize: 15,
    color: "#3A3F55",
  },
  // --- Styles des cases à cocher (choix multiple) ---
  checkboxLigne: {
    flexDirection: "row",
    alignItems: "center",
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: "#3B45D1",
    marginRight: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxCoche: {
    backgroundColor: "#2E3AC0",
  },
  checkboxCoche_texte: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "bold",
  },
  boutonValider: {
    marginTop: 6,
    marginHorizontal: 12,
    marginBottom: 8,
    backgroundColor: "#2E3AC0",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  boutonValiderTexte: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
});
