import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
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

// --- Adresse de l'API d'estimation (le fichier api_estimation.py) ---
// Émulateur Android : http://10.0.2.2:5000
// Vrai téléphone    : http://IP-DE-TON-PC:5000
//   (dans PowerShell, tape "ipconfig" et regarde la ligne "Adresse IPv4")
// Le PC et le téléphone doivent être sur le même Wi-Fi.
const URL_API = "http://10.0.2.2:5000";

// --- Tarifs horaires proposés (FCFA) ---
// Ce sont EXACTEMENT les tranches que le modèle connaît.
const TARIFS_HORAIRES = ["0 - 50 000", "50 000 - 100 000", "100 000 - 150 000"];

// --- Matières proposées ---
// Ce sont les matières que le modèle connaît.
const MATIERES = [
  "Anglais",
  "Français",
  "Informatique",
  "Mathématiques",
  "Physique-Chimie",
  "SVT",
];

// --- Moyens de paiement proposés (sélection multiple) ---
const TYPE_DE_REMUNERATION = ["Espèces", "Mobile Money"];

// --- Lieux de travail proposés (sélection multiple) ---
const LIEUX_DE_TRAVAIL = ["En ligne", "Présentiel"];

// --- Niveaux enseignés proposés (sélection multiple) ---
// Adapte cette liste si tu veux d'autres niveaux (système ivoirien par défaut).
const NIVEAUX_ENSEIGNES = [
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
  "Tous",
];

// --- Liste déroulante à choix UNIQUE (aucune dépendance externe) ---
// Utilisée pour la matière et le tarif horaire. Le champ ressemble à un TextInput ;
// au clic, une modale s'ouvre avec les choix possibles.
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
// Utilisée pour "Mode de travail", "Lieu de travail" et "Niveau enseigné".
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

export default function BioAccompagnateurScreen() {
  // Hook de navigation Expo Router : permet de rediriger l'utilisateur.
  const router = useRouter();

  // --- Champs du formulaire de bio ---
  const [presentation, setPresentation] = useState(""); // texte libre, la "bio" principale
  const [matiereEnseignee, setMatiereEnseignee] = useState(""); // choisie dans la liste déroulante
  const [niveauEnseigne, setNiveauEnseigne] = useState<string[]>([]); // cases cochées (plusieurs niveaux possibles)
  const [tarifHoraire, setTarifHoraire] = useState(""); // choisi dans la liste déroulante
  const [experience, setExperience] = useState(""); // diplômes / années d'expérience
  const [modeDeTravail, setModeDeTravail] = useState<string[]>([]); // cases cochées (plusieurs choix possibles)
  const [lieuDeTravail, setLieuDeTravail] = useState<string[]>([]); // cases cochées (plusieurs choix possibles)

  // true pendant l'enregistrement (désactive le bouton)
  const [loading, setLoading] = useState(false);

  // --- Estimation du prix par le modèle ---
  const [estimation, setEstimation] = useState(""); // ex : "50 000 - 100 000"
  const [estimationEnCours, setEstimationEnCours] = useState(false);

  // À chaque fois que l'accompagnateur change un choix, on redemande
  // l'estimation à l'API. Si l'API ne répond pas, ce n'est pas grave :
  // le formulaire marche quand même, on affiche juste "indisponible".
  useEffect(() => {
    // Sans matière ni niveau, on ne demande rien
    if (!matiereEnseignee || niveauEnseigne.length === 0) {
      setEstimation("");
      return;
    }

    let annule = false; // devient true si les choix changent entre-temps
    const controleur = new AbortController();
    const minuteur = setTimeout(() => controleur.abort(), 5000); // 5 s max

    setEstimationEnCours(true);
    fetch(`${URL_API}/estimer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        matiere: matiereEnseignee,
        niveau: niveauEnseigne,
        lieuTravail: lieuDeTravail,
        remuneration: modeDeTravail,
      }),
      signal: controleur.signal,
    })
      .then((reponse) => reponse.json())
      .then((data) => {
        if (!annule) setEstimation(data.tranche ?? "");
      })
      .catch(() => {
        if (!annule) setEstimation(""); // API éteinte, pas de réseau...
      })
      .finally(() => {
        clearTimeout(minuteur);
        if (!annule) setEstimationEnCours(false);
      });

    // Nettoyage : on annule l'ancienne demande si un choix change
    return () => {
      annule = true;
      controleur.abort();
      clearTimeout(minuteur);
    };
  }, [matiereEnseignee, niveauEnseigne, lieuDeTravail, modeDeTravail]);

  // --- Validation puis enregistrement dans Firestore ---
  const handleSave = async () => {
    if (!presentation.trim()) {
      alerte("Champ manquant", "La présentation est obligatoire.");
      return;
    }

    if (!matiereEnseignee.trim()) {
      alerte("Champ manquant", "La matière enseignée est obligatoire.");
      return;
    }

    try {
      setLoading(true);

      // On utilise les mêmes noms de champs (matiere, niveau, tarif)
      // pour les services ET les demandes : l'accueil les affiche pareil.
      await creerPublication("service", {
        presentation: presentation.trim(),
        matiere: matiereEnseignee.trim(),
        niveau: niveauEnseigne, // tableau
        tarif: tarifHoraire,
        experience: experience.trim(),
        remuneration: modeDeTravail, // tableau
        lieuTravail: lieuDeTravail, // tableau
      });

      // L'alerte s'affiche seulement si l'enregistrement a réussi,
      // puis on redirige vers l'accueil quand l'utilisateur appuie sur "OK".
      alerte("Succès", "Publication réussie !", [
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
        <Text style={styles.titre}>Publier un service d'accompagnement</Text>

        {/* Présentation / bio principale */}
        <Text style={styles.label}>Présentation</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Parle un peu de toi : ton parcours, ta méthode d'enseignement, ce qui te motive..."
          placeholderTextColor="#9AA0C4"
          value={presentation}
          onChangeText={setPresentation}
          multiline
          numberOfLines={5}
        />

        {/* Matière enseignée (liste déroulante, choix unique) */}
        <Text style={styles.label}>Matière enseignée</Text>
        <Dropdown
          placeholder="Choisir une matière"
          value={matiereEnseignee}
          options={MATIERES}
          onSelect={setMatiereEnseignee}
        />

        {/* Niveau enseigné (cases à cocher) */}
        <Text style={styles.label}>Niveau enseigné</Text>
        <MultiSelectDropdown
          placeholder="Choisir un ou plusieurs niveaux"
          values={niveauEnseigne}
          options={NIVEAUX_ENSEIGNES}
          onChange={setNiveauEnseigne}
        />

        {/* Expérience / diplômes */}
        <Text style={styles.label}>Expérience / Diplômes</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Ex : Licence en Mathématiques, 3 ans d'expérience en soutien scolaire"
          placeholderTextColor="#9AA0C4"
          value={experience}
          onChangeText={setExperience}
          multiline
          numberOfLines={3}
        />

        {/* Type de rémunération (cases à cocher) */}
        <Text style={styles.label}>Type de rémunération</Text>
        <MultiSelectDropdown
          placeholder="Choisir un ou plusieurs types"
          values={modeDeTravail}
          options={TYPE_DE_REMUNERATION}
          onChange={setModeDeTravail}
        />

        {/* Lieu de travail (cases à cocher) */}
        <Text style={styles.label}>Lieu de travail</Text>
        <MultiSelectDropdown
          placeholder="Choisir un ou plusieurs lieux"
          values={lieuDeTravail}
          options={LIEUX_DE_TRAVAIL}
          onChange={setLieuDeTravail}
        />

        {/* Prix conseillé par le modèle : visible dès que la matière et
            le niveau sont choisis */}
        {matiereEnseignee && niveauEnseigne.length > 0 ? (
          <View style={styles.estimationBoite}>
            <View style={styles.estimationTitreLigne}>
              <Ionicons name="bulb-outline" size={18} color="#3B45D1" />
              <Text style={styles.estimationTitre}>Prix conseillé</Text>
            </View>
            <Text style={styles.estimationValeur}>
              {estimationEnCours
                ? "Calcul en cours..."
                : estimation
                  ? `${estimation} FCFA`
                  : "Estimation indisponible pour le moment"}
            </Text>
          </View>
        ) : null}

        {/* Tarif horaire (liste déroulante, choix unique) */}
        <Text style={styles.label}>Tarif horaire (FCFA)</Text>
        <Dropdown
          placeholder="Choisir un tarif"
          value={tarifHoraire}
          options={TARIFS_HORAIRES}
          onSelect={setTarifHoraire}
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
  // --- Encadré "Prix conseillé" ---
  estimationBoite: {
    marginTop: 24,
    borderWidth: 1.5,
    borderColor: "#3B45D1",
    borderRadius: 14,
    padding: 16,
    backgroundColor: "#fff",
  },
  estimationTitreLigne: {
    flexDirection: "row",
    alignItems: "center",
  },
  estimationTitre: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: "700",
    color: "#3B45D1",
  },
  estimationValeur: {
    marginTop: 6,
    fontSize: 18,
    fontWeight: "bold",
    color: "#2E3AC0",
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
