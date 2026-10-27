// src/lib/auth.ts
// Fonctions d'authentification : inscription, connexion, déconnexion.
// Chaque fonction renvoie { erreur } : null si tout s'est bien passé,
// sinon un message en français prêt à afficher à l'utilisateur.

import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
} from "firebase/auth";
import { auth } from "./firebase";

// Transforme le code d'erreur de Firebase en message compréhensible
function messageErreur(code: string): string {
  switch (code) {
    case "auth/email-already-in-use":
      return "Cet email est déjà utilisé.";
    case "auth/invalid-email":
      return "L'adresse email n'est pas valide.";
    case "auth/weak-password":
      return "Le mot de passe doit contenir au moins 6 caractères.";
    case "auth/invalid-credential":
    case "auth/user-not-found":
    case "auth/wrong-password":
      return "Email ou mot de passe incorrect.";
    case "auth/network-request-failed":
      return "Pas de connexion internet.";
    case "auth/too-many-requests":
      return "Trop de tentatives. Réessaie plus tard.";
    default:
      return "Une erreur est survenue. Réessaie.";
  }
}

// Crée un compte. Renvoie aussi l'identifiant (uid) du nouvel utilisateur,
// dont on aura besoin pour enregistrer son profil dans Firestore.
export async function inscrire(email: string, motDePasse: string) {
  try {
    const resultat = await createUserWithEmailAndPassword(
      auth,
      email.trim(),
      motDePasse,
    );
    return { uid: resultat.user.uid, erreur: null };
  } catch (e: any) {
    return { uid: null, erreur: messageErreur(e.code) };
  }
}

// Connecte un utilisateur qui a déjà un compte.
export async function connecter(email: string, motDePasse: string) {
  try {
    await signInWithEmailAndPassword(auth, email.trim(), motDePasse);
    return { erreur: null };
  } catch (e: any) {
    return { erreur: messageErreur(e.code) };
  }
}

// Déconnecte l'utilisateur (à brancher sur le bouton "Se déconnecter").
export async function deconnecter() {
  await signOut(auth);
}
