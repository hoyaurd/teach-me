// src/lib/firebase.ts
// Connexion à Firebase, utilisée par tous les écrans de l'app :
// - auth : connexion / inscription des utilisateurs
// - db   : base de données Firestore (profils, demandes...)

import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Les clés viennent du fichier .env (à la racine du projet, à côté de package.json)
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// DIAGNOSTIC : si une clé est vide, le terminal affiche laquelle.
// (Si rien ne s'affiche, les clés sont bien lues.)
const manquantes = Object.entries(firebaseConfig)
  .filter(([, valeur]) => !valeur)
  .map(([nom]) => nom);
if (manquantes.length > 0) {
  console.error(
    "Clés Firebase manquantes dans le .env :",
    manquantes.join(", "),
  );
}

// On évite de créer l'app deux fois (rechargement rapide d'Expo)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);
