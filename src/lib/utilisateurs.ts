// src/lib/utilisateurs.ts
// Fonctions pour créer, lire et modifier le profil d'un utilisateur
// dans la base Firestore (collection "utilisateurs").

import {
  collection, // NOUVEAU : pour désigner la collection entière
  doc,
  getDoc,
  getDocs, // NOUVEAU : pour lire plusieurs documents
  limit, // NOUVEAU : pour limiter le nombre de résultats
  query, // NOUVEAU : pour construire une recherche
  serverTimestamp,
  setDoc,
  updateDoc,
  where, // NOUVEAU : pour filtrer (telephone == ...)
} from "firebase/firestore";
import { db } from "./firebase";

// Les 4 types de profil possibles
export type TypeProfil = "eleve" | "etudiant" | "parent" | "accompagnateur";

// La forme d'un profil utilisateur
export type Utilisateur = {
  uid: string;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  lieu: string;
  typeProfil: TypeProfil;
  photoUrl: string;
};

// ---------------------------------------------------------------
// 1) CRÉER un profil (à appeler juste après l'inscription)
// ---------------------------------------------------------------
export async function creerProfil(donnees: Utilisateur) {
  // doc(db, "collection", "identifiant") : l'identifiant est l'uid du compte
  const reference = doc(db, "utilisateurs", donnees.uid);

  await setDoc(reference, {
    ...donnees,
    dateCreation: serverTimestamp(), // date et heure données par Firebase
  });
}

// ---------------------------------------------------------------
// 2) LIRE un profil à partir de l'uid
// ---------------------------------------------------------------
export async function lireProfil(uid: string): Promise<Utilisateur | null> {
  const reference = doc(db, "utilisateurs", uid);
  const resultat = await getDoc(reference);

  // Si le document n'existe pas, on renvoie null
  if (!resultat.exists()) return null;

  return resultat.data() as Utilisateur;
}

// ---------------------------------------------------------------
// 3) MODIFIER un profil (seulement les champs donnés)
// ---------------------------------------------------------------
export async function modifierProfil(
  uid: string,
  changements: Partial<Utilisateur>,
) {
  const reference = doc(db, "utilisateurs", uid);
  await updateDoc(reference, changements);
}

// ---------------------------------------------------------------
// 4) NOUVEAU : VÉRIFIER si un numéro de téléphone est déjà utilisé
// ---------------------------------------------------------------
// Renvoie true si un utilisateur possède déjà ce numéro, sinon false.
export async function telephoneExiste(telephone: string): Promise<boolean> {
  // On cherche dans "utilisateurs" les documents dont "telephone" est égal
  // au numéro donné. limit(1) : un seul résultat suffit pour savoir.
  const recherche = query(
    collection(db, "utilisateurs"),
    where("telephone", "==", telephone),
    limit(1),
  );

  const resultat = await getDocs(recherche);

  // resultat.empty = true quand rien n'a été trouvé
  return !resultat.empty;
}
