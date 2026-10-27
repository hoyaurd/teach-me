// src/lib/Profil.ts
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "./firebase";

// ⚠️ À ADAPTER : le nom de ta collection Firestore, exactement le même
// que dans la fonction creerProfil (fichier utilisateurs.ts).
const COLLECTION = "utilisateurs";

// ⚠️ À ADAPTER : le nom du champ qui contient le type de profil.
const CHAMP_TYPE = "typeProfil";

// Lit le type de profil de l'utilisateur connecté dans Firestore.
// Retourne "accompagnateur", "parent", "eleve", "etudiant" ou null.
export async function getTypeProfil(): Promise<string | null> {
  try {
    const user = auth.currentUser;
    console.log("[Publier] utilisateur connecté :", user?.uid);

    if (!user) return null;

    const snap = await getDoc(doc(db, COLLECTION, user.uid));
    console.log("[Publier] document existe ?", snap.exists());

    if (!snap.exists()) return null;

    // Affiche tous les champs du document pour vérifier leurs noms
    console.log("[Publier] données du document :", snap.data());

    return snap.data()[CHAMP_TYPE] ?? null;
  } catch (erreur) {
    // Une erreur Firestore (règles de sécurité, etc.) s'affiche ici
    console.log("[Publier] ERREUR :", erreur);
    return null;
  }
}

// Choisit la page de publication selon le profil.
// accompagnateur -> /Publier_service, tous les autres -> /Publier_Demande
export async function getRoutePublier(): Promise<string> {
  const type = await getTypeProfil();
  console.log("[Publier] type de profil lu :", type);

  const estAccompagnateur = type === "accompagnateur";

  return estAccompagnateur ? "/Publier_service" : "/Publier_Demande";
}
