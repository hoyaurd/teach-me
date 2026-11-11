// useNouvelleNotification.ts
// Deux hooks pour les points rouges de la barre du bas :
// - useNouvelleNotification : point sur l'icône "Notification"
//   (demande reçue en attente, ou réponse à ma demande pas encore vue).
// - useNouveauMessage : point sur l'icône "Messages"
//   (un message reçu que je n'ai pas encore lu : "nonLuPar" = mon uid).
//
// NOUVEAU : ces hooks n'affichent PLUS de notification du téléphone.
// Ils gèrent seulement les points rouges. Les notifications du téléphone
// viennent uniquement du push (envoyerPush, appelé à l'envoi d'un message
// ou d'une demande). Avant, chaque écran affichait sa propre notification
// locale en plus du push : un seul message en produisait plusieurs.

import { getAuth, onAuthStateChanged } from "firebase/auth";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "./firebase";
import { demanderPermission } from "./notification";

// ---------- Point rouge de l'icône Notification ----------
// Le paramètre "notifier" est gardé pour ne pas casser les écrans qui
// l'utilisent déjà. Il sert seulement à demander la permission au démarrage.
export function useNouvelleNotification(notifier: boolean = true): boolean {
  const [demandeEnAttente, setDemandeEnAttente] = useState(false);
  const [reponseNonVue, setReponseNonVue] = useState(false);

  // Demande l'autorisation d'afficher des notifications au démarrage
  useEffect(() => {
    if (notifier) demanderPermission();
  }, [notifier]);

  useEffect(() => {
    let arreterEcouteurs: () => void = () => {};

    // Se déclenche au démarrage, à la connexion et à la déconnexion
    const arreterAuth = onAuthStateChanged(getAuth(), (moi) => {
      // On arrête toujours les anciens écouteurs d'abord
      arreterEcouteurs();
      arreterEcouteurs = () => {};

      // Pas connecté : on remet tout à zéro et on n'écoute rien
      if (!moi) {
        setDemandeEnAttente(false);
        setReponseNonVue(false);
        return;
      }

      // Cas 1 : demandes qui me sont adressées et qui attendent ma réponse
      const arreterRecues = onSnapshot(
        query(collection(db, "demandes"), where("aId", "==", moi.uid)),
        (snapshot) =>
          setDemandeEnAttente(
            snapshot.docs.some((d) => d.data().statut === "en_attente"),
          ),
        (erreur) => console.log("Erreur notification (reçues) :", erreur),
      );

      // Cas 2 : l'autre a répondu à ma demande et je ne l'ai pas encore vue
      const arreterEnvoyees = onSnapshot(
        query(collection(db, "demandes"), where("deId", "==", moi.uid)),
        (snapshot) =>
          setReponseNonVue(
            snapshot.docs.some(
              (d) =>
                d.data().statut !== "en_attente" &&
                d.data().reponseVue === false,
            ),
          ),
        (erreur) => console.log("Erreur notification (envoyées) :", erreur),
      );

      arreterEcouteurs = () => {
        arreterRecues();
        arreterEnvoyees();
      };
    });

    return () => {
      arreterAuth();
      arreterEcouteurs();
    };
  }, []);

  // Point rouge seulement (plus de notification locale ici)
  return demandeEnAttente || reponseNonVue;
}

// ---------- Point rouge de l'icône Messages ----------
// Le paramètre est gardé pour la compatibilité, mais il ne sert plus.
export function useNouveauMessage(_notifier: boolean = true): boolean {
  const [messageNonLu, setMessageNonLu] = useState(false);

  useEffect(() => {
    let arreterEcouteur: () => void = () => {};

    const arreterAuth = onAuthStateChanged(getAuth(), (moi) => {
      arreterEcouteur();
      arreterEcouteur = () => {};

      if (!moi) {
        setMessageNonLu(false);
        return;
      }

      // Mes conversations : "nonLuPar" = mon uid -> j'ai un message non lu
      arreterEcouteur = onSnapshot(
        query(
          collection(db, "conversations"),
          where("participants", "array-contains", moi.uid),
        ),
        (snapshot) =>
          setMessageNonLu(
            snapshot.docs.some((d) => d.data().nonLuPar === moi.uid),
          ),
        (erreur) => console.log("Erreur notification (messages) :", erreur),
      );
    });

    return () => {
      arreterAuth();
      arreterEcouteur();
    };
  }, []);

  // Point rouge seulement (plus de notification locale ici)
  return messageNonLu;
}
