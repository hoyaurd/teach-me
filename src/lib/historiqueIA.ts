// src/lib/historiqueIA.ts
// Enregistre un échange (question + réponse) avec le chatbot
// dans la collection Firestore "historique_ia".
//
// Utilisation dans Chat_Bot, juste après avoir reçu la réponse :
//   enregistrerEchange(texteQuestion, texteReponse);

import { getAuth } from "firebase/auth";
import { addDoc, collection } from "firebase/firestore";
import { db } from "./firebase";

export async function enregistrerEchange(question: string, reponse: string) {
  try {
    // Utilisateur connecté (sinon on n'enregistre rien)
    const user = getAuth().currentUser;
    if (!user) return;

    await addDoc(collection(db, "historique_ia"), {
      uid: user.uid, // à qui appartient l'échange
      question,
      reponse,
      creeLe: Date.now(), // date en millisecondes (simple à trier)
    });
  } catch (erreur) {
    // Une erreur d'historique ne doit jamais bloquer le chatbot
    console.log("Erreur enregistrement historique IA :", erreur);
  }
}
