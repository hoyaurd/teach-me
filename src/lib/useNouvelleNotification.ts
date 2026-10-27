// useNotifications.ts
// Deux hooks pour les points rouges de la barre du bas :
// - useNouvelleNotification : point sur l'icône "Notification"
//   (demande reçue en attente, ou réponse à ma demande pas encore vue).
// - useNouveauMessage : point sur l'icône "Messages"
//   (un message reçu que je n'ai pas encore lu : "nonLuPar" = mon uid).
// En plus du point rouge, une notification du téléphone s'affiche
// ("1 nouvelle notification" / "1 nouveau message").

import { getAuth, onAuthStateChanged } from "firebase/auth";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { useEffect, useRef, useState } from "react";
import { db } from "./firebase";
import { demanderPermission, envoyerNotification } from "./notification";

// ---------- Petit hook utilitaire ----------
// Envoie une notification quand "actif" passe de false à true
// (c'est-à-dire quand le point rouge vient d'apparaître).
function useNotifierQuandActif(actif: boolean, texte: string) {
  const avant = useRef(false);

  useEffect(() => {
    if (actif && !avant.current) {
      envoyerNotification(texte);
    }
    avant.current = actif;
  }, [actif, texte]);
}

// ---------- Point rouge de l'icône Notification ----------
export function useNouvelleNotification(): boolean {
  const [demandeEnAttente, setDemandeEnAttente] = useState(false);
  const [reponseNonVue, setReponseNonVue] = useState(false);

  // Demande l'autorisation d'afficher des notifications au démarrage
  useEffect(() => {
    demanderPermission();
  }, []);

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

  const aUneNotification = demandeEnAttente || reponseNonVue;

  // Notification du téléphone quand le point rouge apparaît
  useNotifierQuandActif(aUneNotification, "1 nouvelle notification");

  return aUneNotification;
}

// ---------- Point rouge de l'icône Messages ----------
export function useNouveauMessage(): boolean {
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

  // Notification du téléphone quand le point rouge apparaît
  useNotifierQuandActif(messageNonLu, "1 nouveau message");

  return messageNonLu;
}
