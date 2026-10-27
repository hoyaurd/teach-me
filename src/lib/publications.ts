// src/lib/publications.ts
import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "./firebase";

// Une publication est soit un "service" (publié par un accompagnateur),
// soit une "demande" (publiée par un parent / élève / étudiant).
export type TypePublication = "service" | "demande";

// Enregistre une publication dans la collection "publications".
// "champs" = les informations du formulaire (présentation, matière, niveau...).
export async function creerPublication(
  type: TypePublication,
  champs: Record<string, any>,
) {
  const user = auth.currentUser;
  if (!user) throw new Error("Utilisateur non connecté");

  // On lit le profil de l'auteur pour copier son nom et son lieu
  // dans la publication (la photo, elle, n'est PAS copiée : trop lourde).
  const snap = await getDoc(doc(db, "utilisateurs", user.uid));
  const profil: any = snap.exists() ? snap.data() : {};

  await addDoc(collection(db, "publications"), {
    ...champs, // d'abord les champs du formulaire...
    uid: user.uid, // ...puis les champs "sécurisés" qui ne peuvent pas être écrasés
    type,
    nom: `${profil.prenom ?? ""} ${profil.nom ?? ""}`.trim(),
    lieu: profil.lieu ?? "",
    creeLe: serverTimestamp(), // date de création, sert à trier l'accueil
  });
}
